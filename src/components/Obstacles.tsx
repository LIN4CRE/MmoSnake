/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useMemo } from 'react';
import * as THREE from 'three';
import { STATIC_OBSTACLES, Obstacle } from '../shared/types';

function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  const { x, y, width, height, depth, color = '#00f5d4' } = obstacle;

  const edgeGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth);
    return new THREE.EdgesGeometry(box);
  }, [width, height, depth]);

  return (
    <group position={[x, y, depth / 2]}>
      {/* Monolith Main Core */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#07090e"
          roughness={0.15}
          metalness={0.85}
        />
      </mesh>

      {/* Cyber Neon Wireframe Edge Trim */}
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color={color} linewidth={2} toneMapped={false} />
      </lineSegments>

      {/* Emissive Top Crest Plate */}
      <mesh position={[0, 0, depth / 2 + 0.01]}>
        <planeGeometry args={[Math.max(0.2, width - 0.3), Math.max(0.2, height - 0.3)]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.8}
          roughness={0.1}
          metalness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Ground Neon Reflection / Energy Field */}
      <mesh position={[0, 0, -depth / 2 + 0.02]} receiveShadow>
        <planeGeometry args={[width + 1.2, height + 1.2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function Obstacles() {
  return (
    <group>
      {STATIC_OBSTACLES.map((obstacle) => (
        <ObstacleMesh key={obstacle.id} obstacle={obstacle} />
      ))}
    </group>
  );
}
