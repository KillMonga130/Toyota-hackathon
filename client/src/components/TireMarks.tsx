import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRaceStore } from '../store/raceStore';
import * as THREE from 'three';

/**
 * Tire marks that appear when braking or sliding
 */
export default function TireMarks() {
  const marksRef = useRef<THREE.Group>(null);
  const { telemetryData, currentFrameIndex } = useRaceStore();

  const marks = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) return [];

    const tireMarks: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      intensity: number;
    }> = [];

    telemetryData.forEach((point, i) => {
      const brakePressure = (point.brakeFront || 0) + (point.brakeRear || 0);
      const lateralG = Math.abs(point.accelLateral || 0);
      
      // Create tire marks when braking hard or sliding
      if (brakePressure > 50 || lateralG > 0.8) {
        tireMarks.push({
          position: [point.x, 0.01, point.z],
          rotation: [0, Math.atan2(point.x, point.z), 0],
          intensity: Math.min((brakePressure / 100) + (lateralG / 1.5), 1),
        });
      }
    });

    return tireMarks;
  }, [telemetryData]);

  if (marks.length === 0) return null;

  return (
    <group ref={marksRef}>
      {marks.map((mark, i) => (
        <mesh
          key={i}
          position={mark.position}
          rotation={mark.rotation}
        >
          <planeGeometry args={[0.3, 0.1]} />
          <meshStandardMaterial
            color="#1a1a1a"
            transparent
            opacity={mark.intensity * 0.6}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

