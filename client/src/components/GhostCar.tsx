import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRaceStore } from '../store/raceStore';
import * as THREE from 'three';

/**
 * GhostCar component that animates along the track based on telemetry data
 * Uses currentFrameIndex from the store to determine position
 */
let frameAccumulator = 0;

export default function GhostCar() {
  const groupRef = useRef<THREE.Group>(null);
  const {
    telemetryData,
    currentFrameIndex,
    isPlaying,
    setCurrentFrameIndex,
    playbackSpeed,
  } = useRaceStore();

  useFrame(() => {
    if (!groupRef.current || telemetryData.length === 0) return;

    // Get current frame data
    const currentFrame = telemetryData[currentFrameIndex];
    
    if (!currentFrame) return;

    // Update position from current frame
    groupRef.current.position.set(currentFrame.x, 0, currentFrame.z);

    // Calculate rotation to face the next frame's position
    const nextFrameIndex = currentFrameIndex + 1;
    if (nextFrameIndex < telemetryData.length) {
      const nextFrame = telemetryData[nextFrameIndex];
      // Look directly at the next frame's position
      const lookAtPoint = new THREE.Vector3(nextFrame.x, 0, nextFrame.z);
      groupRef.current.lookAt(lookAtPoint);
    }

    // If playing, increment frame index based on playback speed
    if (isPlaying) {
      frameAccumulator += playbackSpeed;
      if (frameAccumulator >= 1) {
        const framesToSkip = Math.floor(frameAccumulator);
        frameAccumulator -= framesToSkip;
        const newIndex = Math.min(currentFrameIndex + framesToSkip, telemetryData.length - 1);
        setCurrentFrameIndex(newIndex);
      }
    } else {
      frameAccumulator = 0;
    }
  });

  if (telemetryData.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Simple blue box representing the car */}
      <mesh>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}

