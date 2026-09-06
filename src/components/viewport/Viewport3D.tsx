import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { WallMesh } from './WallMesh';
import { FloorMesh } from './FloorMesh';
import { getFloorTexture } from '../../lib/textures';

const GRID_SIZE = 20;

/** Floor with real procedural concrete texture. */
function TexturedFloor({ bounds }: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } }) {
  const floorTex = getFloorTexture();
  floorTex.repeat.set(4, 4);
  floorTex.needsUpdate = true;

  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={floorTex} color="#ffffff" roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

export function Viewport3D() {
  const { plan, modelSettings, stressResults } = useAppStore();

  // Convert 2D plan to 3D coordinates
  const wallMeshes = useMemo(() => {
    return plan.walls.map((wall) => ({
      id: wall.id,
      start: {
        x: wall.start.x / GRID_SIZE,
        y: 0,
        z: wall.start.y / GRID_SIZE,
      },
      end: {
        x: wall.end.x / GRID_SIZE,
        y: 0,
        z: wall.end.y / GRID_SIZE,
      },
      height: modelSettings.wallHeight,
      thickness: wall.thickness,
      material: wall.material,
    }));
  }, [plan.walls, modelSettings.wallHeight]);

  // Map stress results to walls for colored overlay in 3D
  const stressByWall = useMemo(() => {
    const map = new Map<string, number>();
    stressResults.forEach((r) => map.set(r.elementId, r.stressLevel));
    return map;
  }, [stressResults]);

  // Calculate floor bounds
  const floorBounds = useMemo(() => {
    if (plan.walls.length === 0) {
      return { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    plan.walls.forEach((wall) => {
      const x1 = wall.start.x / GRID_SIZE;
      const z1 = wall.start.y / GRID_SIZE;
      const x2 = wall.end.x / GRID_SIZE;
      const z2 = wall.end.y / GRID_SIZE;

      minX = Math.min(minX, x1, x2);
      maxX = Math.max(maxX, x1, x2);
      minZ = Math.min(minZ, z1, z2);
      maxZ = Math.max(maxZ, z1, z2);
    });

    return { minX: minX - 1, maxX: maxX + 1, minZ: minZ - 1, maxZ: maxZ + 1 };
  }, [plan.walls]);

  return (
    <motion.div
      className="flex-1 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0f1a' }}
      >
        <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00d4ff" />

        {/* Environment */}
        <fog attach="fog" args={['#0a0f1a', 30, 80]} />

        <Suspense fallback={null}>
          {/* Grid */}
          <Grid
            args={[100, 100]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#1a2436"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#00d4ff"
            fadeDistance={50}
            fadeStrength={1}
            followCamera
          />

          {/* Ground plane */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.01, 0]}
            receiveShadow
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial
              color="#0a0f1a"
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* Walls */}
          {wallMeshes.map((wall) => (
            <WallMesh key={wall.id} {...wall} stress={stressByWall.get(wall.id) || 0} />
          ))}

          {/* Floor */}
          {plan.walls.length > 0 && (
            <>
              <TexturedFloor bounds={floorBounds} />
              <FloorMesh
                minX={floorBounds.minX}
                maxX={floorBounds.maxX}
                minZ={floorBounds.minZ}
                maxZ={floorBounds.maxZ}
              />
            </>
          )}

          {/* Room indicators */}
          {plan.rooms.map((room) => {
            const center = room.points.reduce(
              (acc, p) => ({
                x: acc.x + p.x / GRID_SIZE / room.points.length,
                z: acc.z + p.y / GRID_SIZE / room.points.length,
              }),
              { x: 0, z: 0 }
            );

            return (
              <group key={room.id} position={[center.x, 0.1, center.z]}>
                <mesh>
                  <sphereGeometry args={[0.1, 16, 16]} />
                  <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.5} />
                </mesh>
              </group>
            );
          })}
        </Suspense>

        {/* Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Post-processing */}
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* Loading indicator */}
      {plan.walls.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan/10 flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-8 h-8 text-cyan/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No building elements yet</p>
            <p className="text-xs text-gray-500 mt-1">Switch to 2D mode to start drawing</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
