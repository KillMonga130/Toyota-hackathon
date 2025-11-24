import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GhostCarProps {
  data: Array<{
    position: [number, number, number];
    relativeTime: number;
  }>;
  currentTime?: number;
}

export default function GhostCar({ data, currentTime = 0 }: GhostCarProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!meshRef.current || data.length === 0) return;

    // Find current frame based on time
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
          color="#333" 
          roughness={0.2} 
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Tail Lights */}
      <pointLight distance={20} intensity={1} color="red" position={[0.6, 0.6, -2.2]} />
      <pointLight distance={20} intensity={1} color="red" position={[-0.6, 0.6, -2.2]} />

      {/* Brake Light Glow */}
      <mesh position={[0, 0.6, -2.15]}>
        <boxGeometry args={[1.4, 0.1, 0.1]} />
        <meshBasicMaterial color="#ff0000" toneMapped={false} />
      </mesh>
    </group>
  );
}

