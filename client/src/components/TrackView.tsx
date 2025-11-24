import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRaceStore } from '../store/raceStore';
import GhostCar from './GhostCar';
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
 * Track visualization component that displays the racing line with speed-based coloring
 */
function TrackLine() {
  const { telemetryData } = useRaceStore();

  const geometry = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) {
      return null;
    }

    // Map telemetry data to 3D points [x, 0, z]
    const positions: number[] = [];
    const colors: number[] = [];

    telemetryData.forEach((point) => {
      // Add position [x, 0, z]
      positions.push(point.x, 0, point.z);

      // Generate vertex color based on speed
      // Red (1, 0, 0) = 0 km/h, Green (0, 1, 0) = 200 km/h
      const speed = point.speed || 0;
      // Normalize speed to 0-1 range (0 km/h = 0, 200 km/h = 1)
      const normalizedSpeed = Math.min(speed / 200, 1);
      const [r, g, b] = interpolateColor(normalizedSpeed);
      colors.push(r, g, b);
    });

    // Create buffer geometry
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geom;
  }, [telemetryData]);

  if (!geometry) {
    return null;
  }

  return (
    <line geometry={geometry}>
      <lineBasicMaterial vertexColors={true} />
    </line>
  );
}

/**
 * Main TrackView component
 * Displays the racing track in 3D with speed-based coloring
 */
export default function TrackView() {
  const { telemetryData } = useRaceStore();

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
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Grid Helper - positioned at y=-1 so track floats above it */}
        <gridHelper args={[2000, 100]} position={[0, -1, 0]} />

        {/* Orbit Controls with damping for smooth feel */}
        <OrbitControls
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={2000}
        />

        {/* Track Line with speed-based coloring */}
        <TrackLine />
        
        {/* Ghost Car that animates along the track */}
        <GhostCar />
      </Canvas>
      
      {/* Telemetry Dashboard Overlay */}
      <Dashboard />
    </div>
  );
}

