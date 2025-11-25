import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SpotLight } from '@react-three/drei';
import { useRaceStore } from '../store/raceStore';
import * as THREE from 'three';

let frameAccumulator = 0;

/**
 * Enhanced Ghost Car with realistic GR86-style model
 * Features: Detailed body, dynamic brake lights, headlights with spotlights, smooth animation
 */
export default function EnhancedGhostCar() {
  const groupRef = useRef<THREE.Group>(null);
  const frontLeftWheelRef = useRef<THREE.Group>(null);
  const frontRightWheelRef = useRef<THREE.Group>(null);
  const rearLeftWheelRef = useRef<THREE.Group>(null);
  const rearRightWheelRef = useRef<THREE.Group>(null);
  const leftTailLightRef = useRef<THREE.Mesh>(null);
  const rightTailLightRef = useRef<THREE.Mesh>(null);
  const leftHeadlightRef = useRef<THREE.Mesh>(null);
  const rightHeadlightRef = useRef<THREE.Mesh>(null);
  
  const {
    telemetryData,
    currentFrameIndex,
    isPlaying,
    setCurrentFrameIndex,
    playbackSpeed,
  } = useRaceStore();

  useFrame((state, delta) => {
    if (!groupRef.current || telemetryData.length === 0) return;

    const currentFrame = telemetryData[currentFrameIndex];
    if (!currentFrame) return;

    // Smooth position interpolation (Lerp)
    const targetPosition = new THREE.Vector3(currentFrame.x, 0.5, currentFrame.z);
    groupRef.current.position.lerp(targetPosition, 0.2);

    // Smooth rotation interpolation
    const nextFrameIndex = currentFrameIndex + 1;
    if (nextFrameIndex < telemetryData.length) {
      const nextFrame = telemetryData[nextFrameIndex];
      const direction = new THREE.Vector3(
        nextFrame.x - currentFrame.x,
        0,
        nextFrame.z - currentFrame.z
      ).normalize();
      
      const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction
      );
      groupRef.current.quaternion.slerp(targetQuaternion, 0.2);
    }

    // Wheel spin animation based on speed
    const speed = currentFrame.speed || 0;
    const wheelRotationSpeed = (speed / 100) * delta * 10; // Rotate based on speed
    
    if (frontLeftWheelRef.current) {
      frontLeftWheelRef.current.rotation.x += wheelRotationSpeed;
    }
    if (frontRightWheelRef.current) {
      frontRightWheelRef.current.rotation.x += wheelRotationSpeed;
    }
    if (rearLeftWheelRef.current) {
      rearLeftWheelRef.current.rotation.x += wheelRotationSpeed;
    }
    if (rearRightWheelRef.current) {
      rearRightWheelRef.current.rotation.x += wheelRotationSpeed;
    }

    // Dynamic brake lights - glow when braking
    const brakePressure = (currentFrame.brakeFront || 0) + (currentFrame.brakeRear || 0);
    const brakeIntensity = brakePressure > 5 ? 3.0 : 0.5; // Bright when braking, dim otherwise
    
    if (leftTailLightRef.current) {
      const material = leftTailLightRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = brakeIntensity;
    }
    if (rightTailLightRef.current) {
      const material = rightTailLightRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = brakeIntensity;
    }

    // Increment frame based on playback speed
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

  const carColor = '#DC2626'; // Toyota GR Red
  const wheelColor = '#1a1a1a';
  const glassColor = '#0a0a0a';

  return (
    <group ref={groupRef}>
      {/* Main Chassis - Low, wide sports coupe body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.8, 0.5, 4.2]} />
        <meshStandardMaterial
          color={carColor}
          metalness={0.6}
          roughness={0.2}
          emissive={carColor}
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Hood - Front section */}
      <mesh position={[0, 0.6, 1.4]}>
        <boxGeometry args={[1.6, 0.15, 1.0]} />
        <meshStandardMaterial
          color={carColor}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Cabin - Angled windshield area */}
      <mesh position={[0, 0.85, 0.2]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.4, 0.4, 1.2]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.7}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Rear Spoiler - Distinct wing */}
      <mesh position={[0, 1.1, -1.9]}>
        <boxGeometry args={[1.6, 0.25, 0.15]} />
        <meshStandardMaterial
          color={carColor}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
      {/* Spoiler supports */}
      <mesh position={[0.7, 0.9, -1.9]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color={carColor} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[-0.7, 0.9, -1.9]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color={carColor} metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Front Left Wheel */}
      <group ref={frontLeftWheelRef} position={[1.1, 0.2, 1.3]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Front Right Wheel */}
      <group ref={frontRightWheelRef} position={[-1.1, 0.2, 1.3]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear Left Wheel */}
      <group ref={rearLeftWheelRef} position={[1.1, 0.2, -1.3]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear Right Wheel */}
      <group ref={rearRightWheelRef} position={[-1.1, 0.2, -1.3]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Headlights with Spotlights */}
      <group>
        <mesh ref={leftHeadlightRef} position={[0.6, 0.5, 2.1]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffaa"
            emissiveIntensity={2}
          />
        </mesh>
        <SpotLight
          position={[0.6, 0.5, 2.1]}
          angle={0.4}
          penumbra={0.5}
          intensity={3}
          distance={80}
          castShadow
        />
      </group>

      <group>
        <mesh ref={rightHeadlightRef} position={[-0.6, 0.5, 2.1]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffaa"
            emissiveIntensity={2}
          />
        </mesh>
        <SpotLight
          position={[-0.6, 0.5, 2.1]}
          angle={0.4}
          penumbra={0.5}
          intensity={3}
          distance={80}
          castShadow
        />
      </group>

      {/* Taillights - Dynamic brake lights */}
      <mesh ref={leftTailLightRef} position={[0.6, 0.4, -2.1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={0.5} // Will be updated dynamically
        />
      </mesh>

      <mesh ref={rightTailLightRef} position={[-0.6, 0.4, -2.1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={0.5} // Will be updated dynamically
        />
      </mesh>

      {/* Side mirrors */}
      <mesh position={[1.0, 0.7, 0.8]}>
        <boxGeometry args={[0.1, 0.08, 0.15]} />
        <meshStandardMaterial color={carColor} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[-1.0, 0.7, 0.8]}>
        <boxGeometry args={[0.1, 0.08, 0.15]} />
        <meshStandardMaterial color={carColor} metalness={0.6} roughness={0.2} />
      </mesh>
    </group>
  );
}
