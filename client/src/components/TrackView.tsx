import { useMemo } from 'react';
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useRaceStore } from '../store/raceStore';
import EnhancedGhostCar from './EnhancedGhostCar';
import CameraController, { CameraMode } from './CameraController';
import TireMarks from './TireMarks';
import Dashboard from './Dashboard';
import * as THREE from 'three';

/**
 * Interpolates a value between two colors based on a ratio
 * @param ratio 0-1 value (0 = minColor, 1 = maxColor)
 * @param minColor RGB array [r, g, b] for minimum value (red = slow)
 * @param maxColor RGB array [r, g, b] for maximum value (green = fast)
 * @returns RGB array [r, g, b]
 */
function interpolateColor(
  ratio: number,
  minColor: [number, number, number] = [1, 0, 0], // Red
  maxColor: [number, number, number] = [0, 1, 0] // Green
): [number, number, number] {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return [
    minColor[0] + (maxColor[0] - minColor[0]) * clampedRatio,
    minColor[1] + (maxColor[1] - minColor[1]) * clampedRatio,
    minColor[2] + (maxColor[2] - minColor[2]) * clampedRatio,
  ];
}

/**
 * Calculates the angle between three points (for detecting sharp turns)
 */
function calculateAngle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
  const v1 = new THREE.Vector3().subVectors(p1, p2).normalize();
  const v2 = new THREE.Vector3().subVectors(p3, p2).normalize();
  return Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));
}

/**
 * Procedural Road Surface - Extruded geometry along the track path
 */
function ProceduralRoad() {
  const { telemetryData, visualizationMode } = useRaceStore();

  const roadGeometry = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) {
      return null;
    }

    // Create points array from telemetry data
    const points: THREE.Vector3[] = telemetryData.map((point) => 
      new THREE.Vector3(point.x, 0.1, point.z)
    );

    if (points.length < 2) return null;

    // Create Catmull-Rom curve for smooth path
    const curve = new THREE.CatmullRomCurve3(points, true); // closed loop
    const curvePoints = curve.getPoints(points.length * 2); // More points for smoother curve

    // Create road cross-section shape (10 meters wide, flat)
    const roadWidth = 10;
    const roadShape = new THREE.Shape();
    roadShape.moveTo(-roadWidth / 2, 0);
    roadShape.lineTo(roadWidth / 2, 0);
    roadShape.lineTo(roadWidth / 2, -0.1);
    roadShape.lineTo(-roadWidth / 2, -0.1);
    roadShape.lineTo(-roadWidth / 2, 0);

    // Extrude the shape along the curve
    const extrudeSettings = {
      steps: curvePoints.length,
      bevelEnabled: false,
      extrudePath: curve,
    };

    const geometry = new THREE.ExtrudeGeometry(roadShape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2); // Rotate to lay flat
    geometry.translate(0, 0.1, 0); // Slight elevation

    return geometry;
  }, [telemetryData]);

  if (!roadGeometry) {
    return null;
  }

  return (
    <mesh geometry={roadGeometry} receiveShadow>
      <meshStandardMaterial
        color="#2a2a2a"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

/**
 * Procedural Curbs - Rumble strips at high curvature points
 */
function ProceduralCurbs() {
  const { telemetryData } = useRaceStore();

  const curbMeshes = useMemo(() => {
    if (!telemetryData || telemetryData.length < 3) {
      return [];
    }

    const curbs: React.ReactElement[] = [];
    const points = telemetryData.map((point) => 
      new THREE.Vector3(point.x, 0.15, point.z)
    );

    const angleThreshold = 0.3; // Radians (~17 degrees) - sharp turn threshold
    const curbWidth = 12; // Slightly wider than road
    const curbHeight = 0.1;

    // Check each segment for high curvature
    for (let i = 1; i < points.length - 1; i++) {
      const angle = calculateAngle(points[i - 1], points[i], points[i + 1]);
      
      if (angle < Math.PI - angleThreshold) { // Sharp turn detected
        const p1 = points[i - 1];
        const p2 = points[i];
        const p3 = points[i + 1];
        
        // Create curb segment
        const direction = new THREE.Vector3().subVectors(p3, p1).normalize();
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        
        // Create curb geometry (striped red and white)
        const curbShape = new THREE.Shape();
        curbShape.moveTo(-curbWidth / 2, 0);
        curbShape.lineTo(curbWidth / 2, 0);
        curbShape.lineTo(curbWidth / 2, curbHeight);
        curbShape.lineTo(-curbWidth / 2, curbHeight);
        curbShape.lineTo(-curbWidth / 2, 0);

        const curve = new THREE.CatmullRomCurve3([p1, p2, p3]);
        const extrudeSettings = {
          steps: 10,
          bevelEnabled: false,
          extrudePath: curve,
        };

        const geometry = new THREE.ExtrudeGeometry(curbShape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, 0.15, 0);

        // Create striped material (red and white)
        const stripeCount = 5;
        const stripeWidth = curbWidth / stripeCount;
        
        curbs.push(
          <mesh key={`curb-${i}`} geometry={geometry} position={[0, 0, 0]}>
            <meshStandardMaterial
              color="#ff0000"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
        );
      }
    }

    return curbs;
  }, [telemetryData]);

  if (curbMeshes.length === 0) {
    return null;
  }

  return <>{curbMeshes}</>;
}

/**
 * Speed/Input colored line overlay on the road
 */
function TrackLine() {
  const { telemetryData, visualizationMode } = useRaceStore();

  const geometry = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) {
      return null;
    }

    // Map telemetry data to 3D points [x, 0, z]
    const positions: number[] = [];
    const colors: number[] = [];

    telemetryData.forEach((point) => {
      // Add position [x, 0, z]
      positions.push(point.x, 0.12, point.z);

      let r: number, g: number, b: number;

      if (visualizationMode === 'input') {
        // Input Mode: Red = Braking, Green = Throttle, Gray = Coasting
        const brakePressure = (point.brakeFront || 0) + (point.brakeRear || 0);
        const throttle = point.throttle || 0;
        
        if (brakePressure > 0.1) {
          // Braking: Red intensity based on brake pressure (0-100 bar)
          const brakeIntensity = Math.min(brakePressure / 100, 1);
          r = brakeIntensity;
          g = 0;
          b = 0;
        } else if (throttle > 5) {
          // Throttle: Green intensity based on throttle position (0-100%)
          const throttleIntensity = Math.min(throttle / 100, 1);
          r = 0;
          g = throttleIntensity;
          b = 0;
        } else {
          // Coasting: Gray (no input)
          r = 0.3;
          g = 0.3;
          b = 0.3;
        }
      } else {
        // Speed Mode: Red (1, 0, 0) = 0 km/h, Green (0, 1, 0) = 200 km/h
        const speed = point.speed || 0;
        // Normalize speed to 0-1 range (0 km/h = 0, 200 km/h = 1)
        const normalizedSpeed = Math.min(speed / 200, 1);
        [r, g, b] = interpolateColor(normalizedSpeed);
      }
      
      colors.push(r, g, b);
    });

    // Create buffer geometry
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geom;
  }, [telemetryData, visualizationMode]);

  if (!geometry) {
    return null;
  }

  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 }))} />
  );
}

/**
 * Ground Plane with grass texture
 */
function GroundPlane() {
  return (
    <>
      {/* Main ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[5000, 5000, 50, 50]} />
        <meshStandardMaterial
          color="#1a3a1a"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      
      {/* Grid pattern overlay */}
      <gridHelper args={[5000, 200, '#2a4a2a', '#1a3a1a']} position={[0, 0.01, 0]} />
    </>
  );
}

/**
 * Main TrackView component
 * Displays the racing track in 3D with procedural road generation
 */
export default function TrackView() {
  const { telemetryData, cameraMode } = useRaceStore();

  if (!telemetryData || telemetryData.length === 0) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center">
        <div className="text-text-secondary">
          No telemetry data loaded. Load a CSV file to visualize the track.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background relative">
      <Canvas
        camera={{ position: [0, 500, 0], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        shadows
      >
        {/* Environment & Lighting */}
        <Sky
          distance={450000}
          sunPosition={[0, 1, 0]}
          inclination={0}
          azimuth={0.25}
          turbidity={10}
          rayleigh={2}
        />
        <Environment preset="sunset" />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0, 20, 0]} intensity={0.5} />

        {/* Ground Plane with grass texture */}
        <GroundPlane />

        {/* Orbit Controls (only active in orbit mode) */}
        {cameraMode === 'orbit' && (
          <OrbitControls
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={2000}
          />
        )}

        {/* Camera Controller */}
        <CameraController mode={cameraMode as CameraMode} />

        {/* Procedural Road Surface */}
        <ProceduralRoad />

        {/* Procedural Curbs at sharp turns */}
        <ProceduralCurbs />

        {/* Speed/Input colored line overlay */}
        <TrackLine />
        
        {/* Tire Marks */}
        <TireMarks />
        
        {/* Enhanced Ghost Car */}
        <EnhancedGhostCar />

        {/* Post-Processing Effects */}
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.9} />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>
      </Canvas>
      
      {/* Telemetry Dashboard Overlay */}
      <Dashboard />
    </div>
  );
}
