import * as THREE from 'three';

interface FloorMeshProps {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function FloorMesh({ minX, maxX, minZ, maxZ }: FloorMeshProps) {
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <group position={[centerX, 0, centerZ]}>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#111827"
          transparent
          opacity={0.9}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Floor grid pattern */}
      <gridHelper
        args={[Math.max(width, depth), Math.max(width, depth), '#00d4ff', '#1a2436']}
        position={[0, 0.01, 0]}
      />

      {/* Floor border glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[width + 0.1, depth + 0.1]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
