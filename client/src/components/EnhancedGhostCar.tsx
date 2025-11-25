import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRaceStore } from '../store/raceStore';
import * as THREE from 'three';

let frameAccumulator = 0;

/**
 * Enhanced Ghost Car with realistic 3D model
 * Features: Detailed body, wheels, spoiler, better materials
 */
export default function EnhancedGhostCar() {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const {
    telemetryData,
    currentFrameIndex,
    isPlaying,
    setCurrentFrameIndex,
  } = useRaceStore();

  useFrame((state, delta) => {
    if (!groupRef.current || telemetryData.length === 0) return;

    const currentFrame = telemetryData[currentFrameIndex];
    if (!currentFrame) return;

    // Smooth position interpolation
    const nextFrameIndex = currentFrameIndex + 1;
    if (nextFrameIndex < telemetryData.length) {
      const nextFrame = telemetryData[nextFrameIndex];
      const t = 0.1; // Interpolation factor
      groupRef.current.position.lerp(
        new THREE.Vector3(currentFrame.x, 0.5, currentFrame.z),
        t
      );

      // Smooth rotation
      const direction = new THREE.Vector3(
        nextFrame.x - currentFrame.x,
        0,
        nextFrame.z - currentFrame.z
      ).normalize();
      const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction
      );
      groupRef.current.quaternion.slerp(targetQuaternion, 0.1);
    } else {
      groupRef.current.position.set(currentFrame.x, 0.5, currentFrame.z);
    }

    // Animate wheels based on speed
    if (bodyRef.current) {
      const speed = currentFrame.speed || 0;
      const wheelRotation = (speed / 100) * delta * 10;
      bodyRef.current.rotation.y += wheelRotation * 0.01;
    }

    // Increment frame
    if (isPlaying && currentFrameIndex < telemetryData.length - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    }
  });

  if (telemetryData.length === 0) {
    return null;
  }

  const carColor = '#DC2626'; // Toyota GR Red
  const wheelColor = '#1a1a1a';
  const windowColor = '#0a0a0a';

  return (
    <group ref={groupRef}>
      {/* Main Body */}
      <mesh ref={bodyRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1.8, 0.6, 4.2]} />
        <meshStandardMaterial
          color={carColor}
          metalness={0.8}
          roughness={0.2}
          emissive={carColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Hood */}
      <mesh position={[0, 0.7, 1.2]}>
        <boxGeometry args={[1.6, 0.2, 1.2]} />
        <meshStandardMaterial color={carColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 0.8, 0.3]}>
        <boxGeometry args={[1.4, 0.3, 0.8]} />
        <meshStandardMaterial
          color={windowColor}
          transparent
          opacity={0.3}
          roughness={0.1}
        />
      </mesh>

      {/* Rear Spoiler */}
      <mesh position={[0, 1.1, -1.8]}>
        <boxGeometry args={[1.6, 0.3, 0.2]} />
        <meshStandardMaterial color={carColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      {/* Wheels */}
      <group position={[1.1, 0.2, 1.3]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
      </group>
      <group position={[-1.1, 0.2, 1.3]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
      </group>
      <group position={[1.1, 0.2, -1.3]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
      </group>
      <group position={[-1.1, 0.2, -1.3]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
      </group>

      {/* Headlights */}
      <mesh position={[0.6, 0.5, 2.1]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffaa"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[-0.6, 0.5, 2.1]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffaa"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Tail Lights */}
      <mesh position={[0.6, 0.4, -2.1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={1.5}
        />
      </mesh>
      <mesh position={[-0.6, 0.4, -2.1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

