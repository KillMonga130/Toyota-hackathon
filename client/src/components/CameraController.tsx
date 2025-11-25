import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRaceStore } from '../store/raceStore';
import * as THREE from 'three';

export type CameraMode = 'orbit' | 'chase' | 'cockpit' | 'tv' | 'follow';

interface CameraControllerProps {
  mode: CameraMode;
}

export default function CameraController({ mode }: CameraControllerProps) {
  const { camera } = useThree();
  const { telemetryData, currentFrameIndex } = useRaceStore();
  const cameraRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!telemetryData || telemetryData.length === 0) return;
    const currentFrame = telemetryData[currentFrameIndex];
    if (!currentFrame) return;

    const carPos = new THREE.Vector3(currentFrame.x, 0.5, currentFrame.z);
    const nextFrame = telemetryData[Math.min(currentFrameIndex + 1, telemetryData.length - 1)];
    const carDirection = new THREE.Vector3(
      nextFrame.x - currentFrame.x,
      0,
      nextFrame.z - currentFrame.z
    ).normalize();

    switch (mode) {
      case 'chase': {
        // Chase camera: Behind and above the car
        const offset = new THREE.Vector3(0, 8, 15);
        offset.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            carDirection
          )
        );
        const targetPos = carPos.clone().add(offset);
        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(carPos.clone().add(carDirection.clone().multiplyScalar(5)));
        break;
      }

      case 'cockpit': {
        // Cockpit camera: Inside the car, first-person view
        const offset = new THREE.Vector3(0, 0.8, 0.5);
        offset.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            carDirection
          )
        );
        camera.position.copy(carPos.clone().add(offset));
        const lookAhead = carPos.clone().add(carDirection.clone().multiplyScalar(20));
        camera.lookAt(lookAhead);
        break;
      }

      case 'tv': {
        // TV camera: Side view, following the car
        const sideOffset = new THREE.Vector3(10, 5, 0);
        const perpDirection = new THREE.Vector3(-carDirection.z, 0, carDirection.x);
        const targetPos = carPos.clone().add(
          perpDirection.multiplyScalar(10).add(new THREE.Vector3(0, 5, 0))
        );
        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(carPos);
        break;
      }

      case 'follow': {
        // Follow camera: Above and slightly ahead
        const offset = new THREE.Vector3(0, 12, 8);
        offset.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            carDirection
          )
        );
        const targetPos = carPos.clone().add(offset);
        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(carPos);
        break;
      }

      case 'orbit':
      default:
        // Orbit camera: User-controlled (handled by OrbitControls)
        break;
    }
  });

  return null;
}

