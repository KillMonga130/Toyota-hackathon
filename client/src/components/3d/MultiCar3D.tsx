import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CarData {
  position: [number, number, number];
  relativeTime: number;
  speed?: number;
  vehicleId: string;
}

interface MultiCar3DProps {
  carsData: Map<string, CarData[]>;
  currentTime: number;
  colors: Map<string, string>;
}

export default function MultiCar3D({ carsData, currentTime, colors }: MultiCar3DProps) {
  return (
    <>
      {Array.from(carsData.entries()).map(([vehicleId, data]) => {
        const color = colors.get(vehicleId) || '#333';

        return (
          <Car3D
            key={vehicleId}
            data={data}
            currentTime={currentTime}
            color={color}
            vehicleId={vehicleId}
          />
        );
      })}
    </>
  );
}

interface Car3DProps {
  data: CarData[];
  currentTime: number;
  color: string;
  vehicleId: string;
}

function Car3D({ data, currentTime, color }: Car3DProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!meshRef.current || data.length === 0) return;

    // Find current frame
    let frameIndex = 0;
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i].relativeTime <= currentTime && data[i + 1].relativeTime > currentTime) {
        frameIndex = i;
        break;
      }
    }

    const currentPoint = data[frameIndex];
    const nextPoint = data[frameIndex + 1];

    if (currentPoint && nextPoint) {
      const duration = nextPoint.relativeTime - currentPoint.relativeTime;
      const elapsed = currentTime - currentPoint.relativeTime;
      const alpha = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;

      const p1 = new THREE.Vector3(...currentPoint.position);
      const p2 = new THREE.Vector3(...nextPoint.position);
      meshRef.current.position.lerpVectors(p1, p2, alpha);
      if (alpha < 1) {
        meshRef.current.lookAt(p2);
      }
    } else if (currentPoint) {
      meshRef.current.position.set(...currentPoint.position);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Chassis */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.8, 0.6, 4.2]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.2} 
          metalness={0.8}
        />
      </mesh>

      {/* Tail Lights */}
      <pointLight distance={20} intensity={1} color="red" position={[0.6, 0.6, -2.2]} />
      <pointLight distance={20} intensity={1} color="red" position={[-0.6, 0.6, -2.2]} />

      {/* Number Label */}
      <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 0.5]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  );
}


