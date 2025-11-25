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
 * Procedural Road Surface - Custom ribbon geometry that lies flat on the ground
 * Uses ribbon algorithm: creates left/right vertices for each point
 */
function ProceduralRoad() {
  const { telemetryData } = useRaceStore();

  const roadGeometry = useMemo(() => {
    if (!telemetryData || telemetryData.length < 2) {
      return null;
    }

    const roadWidth = 10; // 10 meters wide
    const roadHeight = 0.1; // Slightly above ground
    const worldUp = new THREE.Vector3(0, 1, 0);

    // Create vertices array
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    // Check if track is closed (loop)
    const firstPoint = new THREE.Vector3(telemetryData[0].x, roadHeight, telemetryData[0].z);
    const lastPoint = new THREE.Vector3(
      telemetryData[telemetryData.length - 1].x,
      roadHeight,
      telemetryData[telemetryData.length - 1].z
    );
    const isClosed = firstPoint.distanceTo(lastPoint) < 100 && telemetryData.length > 10;

    // Process each point to create left and right vertices
    for (let i = 0; i < telemetryData.length; i++) {
      const currentPoint = new THREE.Vector3(
        telemetryData[i].x,
        roadHeight,
        telemetryData[i].z
      );

      // Calculate forward vector (direction to next point)
      let forward: THREE.Vector3;
      if (i < telemetryData.length - 1) {
        const nextPoint = new THREE.Vector3(
          telemetryData[i + 1].x,
          roadHeight,
          telemetryData[i + 1].z
        );
        forward = new THREE.Vector3().subVectors(nextPoint, currentPoint).normalize();
      } else if (isClosed) {
        // For last point in closed loop, use direction to first point
        forward = new THREE.Vector3().subVectors(firstPoint, currentPoint).normalize();
      } else {
        // For last point in open track, use previous forward vector
        const prevPoint = new THREE.Vector3(
          telemetryData[i - 1].x,
          roadHeight,
          telemetryData[i - 1].z
        );
        forward = new THREE.Vector3().subVectors(currentPoint, prevPoint).normalize();
      }

      // Calculate right vector (perpendicular to forward, on XZ plane)
      const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();

      // Create left and right vertices
      const leftVertex = new THREE.Vector3()
        .copy(currentPoint)
        .addScaledVector(right, roadWidth / 2);
      const rightVertex = new THREE.Vector3()
        .copy(currentPoint)
        .addScaledVector(right, -roadWidth / 2);

      // Add vertices (left vertex, then right vertex)
      vertices.push(leftVertex.x, leftVertex.y, leftVertex.z);
      vertices.push(rightVertex.x, rightVertex.y, rightVertex.z);

      // Add normals (pointing up)
      normals.push(0, 1, 0);
      normals.push(0, 1, 0);
    }

    // Create triangles (quads) connecting segments
    for (let i = 0; i < telemetryData.length - 1; i++) {
      const baseIndex = i * 2; // Each point has 2 vertices (left, right)

      // First triangle: left(i) -> right(i) -> left(i+1)
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);

      // Second triangle: right(i) -> right(i+1) -> left(i+1)
      indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
    }

    // Close the loop if it's a closed track
    if (isClosed) {
      const lastBaseIndex = (telemetryData.length - 1) * 2;
      const firstBaseIndex = 0;

      // First triangle: left(last) -> right(last) -> left(first)
      indices.push(lastBaseIndex, lastBaseIndex + 1, firstBaseIndex);

      // Second triangle: right(last) -> right(first) -> left(first)
      indices.push(lastBaseIndex + 1, firstBaseIndex + 1, firstBaseIndex);
    }

    // Create BufferGeometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

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
 * Uses same ribbon algorithm as road, but wider
 */
function ProceduralCurbs() {
  const { telemetryData } = useRaceStore();

  const curbGeometry = useMemo(() => {
    if (!telemetryData || telemetryData.length < 3) {
      return null;
    }

    const curbWidth = 12; // Slightly wider than road (10m)
    const curbHeight = 0.15; // Slightly above road
    const worldUp = new THREE.Vector3(0, 1, 0);
    const angleThreshold = 0.3; // Radians (~17 degrees) - sharp turn threshold

    // Find sharp turn segments
    const sharpTurnIndices: number[] = [];
    for (let i = 1; i < telemetryData.length - 1; i++) {
      const p1 = new THREE.Vector3(telemetryData[i - 1].x, curbHeight, telemetryData[i - 1].z);
      const p2 = new THREE.Vector3(telemetryData[i].x, curbHeight, telemetryData[i].z);
      const p3 = new THREE.Vector3(telemetryData[i + 1].x, curbHeight, telemetryData[i + 1].z);
      
      const angle = calculateAngle(p1, p2, p3);
      if (angle < Math.PI - angleThreshold) {
        sharpTurnIndices.push(i);
      }
    }

    if (sharpTurnIndices.length === 0) {
      return null;
    }

    // Create vertices and indices for all curb segments
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    let vertexOffset = 0;

    // Process each sharp turn segment
    sharpTurnIndices.forEach((turnIndex) => {
      const segmentStart = Math.max(0, turnIndex - 5); // Include a few points before/after
      const segmentEnd = Math.min(telemetryData.length - 1, turnIndex + 5);

      for (let i = segmentStart; i <= segmentEnd; i++) {
        const currentPoint = new THREE.Vector3(
          telemetryData[i].x,
          curbHeight,
          telemetryData[i].z
        );

        // Calculate forward vector
        let forward: THREE.Vector3;
        if (i < telemetryData.length - 1) {
          const nextPoint = new THREE.Vector3(
            telemetryData[i + 1].x,
            curbHeight,
            telemetryData[i + 1].z
          );
          forward = new THREE.Vector3().subVectors(nextPoint, currentPoint).normalize();
        } else {
          const prevPoint = new THREE.Vector3(
            telemetryData[i - 1].x,
            curbHeight,
            telemetryData[i - 1].z
          );
          forward = new THREE.Vector3().subVectors(currentPoint, prevPoint).normalize();
        }

        // Calculate right vector
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();

        // Create left and right vertices
        const leftVertex = new THREE.Vector3()
          .copy(currentPoint)
          .addScaledVector(right, curbWidth / 2);
        const rightVertex = new THREE.Vector3()
          .copy(currentPoint)
          .addScaledVector(right, -curbWidth / 2);

        vertices.push(leftVertex.x, leftVertex.y, leftVertex.z);
        vertices.push(rightVertex.x, rightVertex.y, rightVertex.z);
        normals.push(0, 1, 0);
        normals.push(0, 1, 0);
      }

      // Create triangles for this segment
      const segmentLength = segmentEnd - segmentStart;
      for (let i = 0; i < segmentLength; i++) {
        const baseIndex = vertexOffset + i * 2;

        // First triangle
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        // Second triangle
        indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
      }

      vertexOffset += (segmentLength + 1) * 2;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [telemetryData]);

  if (!curbGeometry) {
    return null;
  }

  return (
    <mesh geometry={curbGeometry}>
      <meshStandardMaterial
        color="#ff0000"
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
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

    // Map telemetry data to 3D points - EXACT same path as road
    const positions: number[] = [];
    const colors: number[] = [];

    telemetryData.forEach((point) => {
      // Add position [x, y, z] - elevated slightly above road surface
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
