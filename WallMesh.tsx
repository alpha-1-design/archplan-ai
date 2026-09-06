import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Material } from '../../types';
import { getMaterialTexture } from '../../lib/textures';

interface WallMeshProps {
  id?: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  height: number;
  thickness: number;
  material: Material;
  stress?: number; // 0..1 — colors the wall red when critical
}

const baseColors: Record<Material, string> = {
  concrete: '#9aa1a9',
  brick: '#a5543a',
  wood: '#8a6536',
  glass: '#aee9ff',
  steel: '#aeb8c4',
};

const materialProps: Record<Material, { metalness: number; roughness: number; transparent: boolean; opacity: number }> = {
  concrete: { metalness: 0.02, roughness: 0.92, transparent: false, opacity: 1 },
  brick: { metalness: 0.0, roughness: 0.96, transparent: false, opacity: 1 },
  wood: { metalness: 0.0, roughness: 0.82, transparent: false, opacity: 1 },
  glass: { metalness: 0.05, roughness: 0.08, transparent: true, opacity: 0.45 },
  steel: { metalness: 0.9, roughness: 0.28, transparent: false, opacity: 1 },
};

const repeatScale: Record<Material, [number, number]> = {
  concrete: [1.5, 1.5],
  brick: [2, 2],
  wood: [1, 1.5],
  glass: [1, 1],
  steel: [1.5, 1],
};

export function WallMesh({ start, end, height, thickness, material, stress = 0 }: WallMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { position, rotation, length } = useMemo(() => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    return {
      position: { x: (start.x + end.x) / 2, y: height / 2, z: (start.z + end.z) / 2 },
      rotation: { x: 0, y: -angle, z: 0 },
      length,
    };
  }, [start, end, height]);

  const texture = useMemo(() => {
    const tex = getMaterialTexture(material);
    tex.repeat.set(repeatScale[material][0] * Math.max(0.5, length / 5), repeatScale[material][1] * Math.max(0.5, height / 3));
    tex.needsUpdate = true;
    return tex;
  }, [material, length, height]);

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = hovered || stress > 0.6 ? 1.02 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const props = materialProps[material];
  const stressColor = stress > 0.6 ? new THREE.Color('#ff4757') : new THREE.Color('#2ed573');

  return (
    <group position={[position.x, position.y, position.z]} rotation={[rotation.x, rotation.y, rotation.z]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[length, height, thickness]} />
        <meshStandardMaterial
          map={material === 'glass' ? undefined : texture}
          color={hovered ? '#00d4ff' : stress > 0 ? '#ffffff' : baseColors[material]}
          metalness={props.metalness}
          roughness={props.roughness}
          transparent={props.transparent}
          opacity={props.opacity}
          emissive={hovered ? '#00d4ff' : stress > 0 ? stressColor : '#000000'}
          emissiveIntensity={hovered ? 0.25 : stress > 0 ? stress * 0.55 : 0}
          envMapIntensity={0.6}
        />
      </mesh>

      {/* Edge glow */}
      <mesh>
        <boxGeometry args={[length + 0.02, height + 0.02, thickness + 0.02]} />
        <meshBasicMaterial
          color={stress > 0 ? stressColor : '#00d4ff'}
          transparent
          opacity={hovered ? 0.12 : stress > 0 ? stress * 0.25 : 0}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}