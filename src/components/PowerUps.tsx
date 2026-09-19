/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { PowerUp } from '../shared/types';

function PowerUpItem({ item }: { item: PowerUp }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const isInvincible = item.type === 'invincibility';
  const primaryColor = isInvincible ? '#ffd700' : '#c084fc';
  const emissiveColor = isInvincible ? '#ffb703' : '#a855f7';

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Smooth floating bob
    groupRef.current.position.z = 0.8 + Math.sin(time * 3.0 + item.x) * 0.25;

    // Spin core and orbiting ring
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 2.0;
      coreRef.current.rotation.x += delta * 1.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 2.5;
      ringRef.current.rotation.x = Math.sin(time * 2.0) * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={[item.x, item.y, 0.8]}>
      {/* Dynamic Light Source */}
      <pointLight color={primaryColor} intensity={3.5} distance={7} />

      {/* Orbiting Energy Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.1, 0.08, 16, 32]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={3.0}
          roughness={0.1}
          metalness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Central Rotating Power Core */}
      <mesh ref={coreRef} castShadow>
        {isInvincible ? (
          <octahedronGeometry args={[0.7, 0]} />
        ) : (
          <icosahedronGeometry args={[0.7, 0]} />
        )}
        <meshStandardMaterial
          color={primaryColor}
          emissive={emissiveColor}
          emissiveIntensity={2.5}
          roughness={0.15}
          metalness={0.8}
          wireframe={!isInvincible}
          toneMapped={false}
        />
      </mesh>

      {/* Outer Glow Shell */}
      <mesh>
        <sphereGeometry args={[0.85, 16, 16]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.25}
          wireframe
        />
      </mesh>

      {/* Holographic 3D Floating Pill Label */}
      <Html position={[0, 0, 1.4]} center distanceFactor={25} zIndexRange={[100, 0]}>
        <div
          className="pointer-events-none select-none px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md"
          style={{
            background: isInvincible ? 'rgba(255, 215, 0, 0.18)' : 'rgba(192, 132, 252, 0.18)',
            border: `1px solid ${isInvincible ? '#ffd700' : '#c084fc'}`,
            color: isInvincible ? '#ffeaa7' : '#e9d5ff',
            boxShadow: `0 0 14px ${isInvincible ? 'rgba(255,215,0,0.45)' : 'rgba(192,132,252,0.45)'}`,
          }}
        >
          <span>{isInvincible ? '🛡️' : '👻'}</span>
          <span>{isInvincible ? 'Invincible' : 'Ghost Mode'}</span>
        </div>
      </Html>
    </group>
  );
}

export function PowerUps() {
  const gameState = useGameStore((state) => state.gameState);
  if (!gameState?.powerUps) return null;

  return (
    <group>
      {Object.values(gameState.powerUps).map((item) => (
        <PowerUpItem key={item.id} item={item} />
      ))}
    </group>
  );
}
