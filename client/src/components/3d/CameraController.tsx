import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type CameraMode = 'free' | 'follow' | 'overhead' | 'chase';

interface CameraControllerProps {
  mode: CameraMode;
  targetPosition?: [number, number, number];
  targetRotation?: number;
}

export default function CameraController({ 
  mode, 
  targetPosition = [0, 0, 0],
  targetRotation = 0 
}: CameraControllerProps) {
  const { camera } = useThree();
  const cameraRef = useRef<THREE.Camera>(camera);

  useFrame(() => {
    if (mode === 'follow' && targetPosition) {
      // Follow car from behind
      const offset = new THREE.Vector3(
        Math.sin(targetRotation) * 15,
        8,
        Math.cos(targetRotation) * 15
      );
      const target = new THREE.Vector3(...targetPosition);
      const desiredPosition = target.clone().add(offset);
      
      camera.position.lerp(desiredPosition, 0.1);
      camera.lookAt(target);
    } else if (mode === 'overhead') {
      // Overhead view
      camera.position.lerp(new THREE.Vector3(targetPosition[0], 50, targetPosition[2]), 0.1);
      camera.lookAt(new THREE.Vector3(...targetPosition));
    } else if (mode === 'chase') {
      // Chase cam
      const offset = new THREE.Vector3(
        Math.sin(targetRotation) * 8,
        3,
        Math.cos(targetRotation) * 8
      );
      const target = new THREE.Vector3(...targetPosition);
      const desiredPosition = target.clone().add(offset);
      
      camera.position.lerp(desiredPosition, 0.15);
      camera.lookAt(target);
    }
  });

  return null;
}

