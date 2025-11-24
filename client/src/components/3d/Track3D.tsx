import { useMemo } from 'react';
import * as THREE from 'three';

interface Track3DProps {
  data: Array<{
    position: [number, number, number];
    relativeTime: number;
  }>;
}

export default function Track3D({ data }: Track3DProps) {
  const { geometry, lineGeometry } = useMemo(() => {
    if (data.length === 0) return { geometry: null, lineGeometry: null };

    const points = data.map(p => new THREE.Vector3(...p.position));
    const curve = new THREE.CatmullRomCurve3(points, false);

    const shape = new THREE.Shape();
    shape.moveTo(-5, 0);
    shape.lineTo(-5, 0.2);
    shape.lineTo(5, 0.2);
    shape.lineTo(5, 0);
    shape.lineTo(-5, 0);

    const extrudeSettings = {
      steps: Math.min(points.length * 2, 1000),
      bevelEnabled: false,
      extrudePath: curve
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(Math.min(points.length * 5, 5000))
    );

    return { geometry, lineGeometry };
  }, [data]);

  if (!geometry) return null;

  return (
    <group>
      {/* Road Surface */}
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Center Line */}
      {lineGeometry && (
        <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: '#00ffff', linewidth: 2 }))} />
      )}
    </group>
  );
}

