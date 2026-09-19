/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ParticleEvent {
  x: number;
  y: number;
  color: string;
}

// Global emitter for particle bursts so any component can trigger particles
type ParticleListener = (event: ParticleEvent) => void;
const listeners = new Set<ParticleListener>();

export function emitOrbParticles(x: number, y: number, color: string) {
  listeners.forEach((listener) => listener({ x, y, color }));
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: THREE.Color;
  life: number;
  maxLife: number;
  baseScale: number;
}

interface Shockwave {
  x: number;
  y: number;
  color: THREE.Color;
  scale: number;
  maxScale: number;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 600;
const MAX_SHOCKWAVES = 40;

export function ParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ringMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dummyRing = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  const particles = useRef<Particle[]>([]);
  const shockwaves = useRef<Shockwave[]>([]);

  useMemo(() => {
    const handleBurst: ParticleListener = ({ x, y, color }) => {
      const c = new THREE.Color(color);
      
      // Spawn 18-24 sparkling particles
      const count = 20;
      for (let i = 0; i < count; i++) {
        if (particles.current.length >= MAX_PARTICLES) {
          particles.current.shift(); // recycle oldest
        }
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        const vz = (Math.random() - 0.2) * 6;

        particles.current.push({
          x,
          y,
          z: 0.5 + (Math.random() - 0.5) * 0.2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz,
          color: c.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2),
          life: 0,
          maxLife: 0.45 + Math.random() * 0.35,
          baseScale: 0.16 + Math.random() * 0.18,
        });
      }

      // Spawn shockwave ring
      if (shockwaves.current.length >= MAX_SHOCKWAVES) {
        shockwaves.current.shift();
      }
      shockwaves.current.push({
        x,
        y,
        color: c.clone(),
        scale: 0.2,
        maxScale: 2.8,
        life: 0,
        maxLife: 0.38,
      });
    };

    listeners.add(handleBurst);
    return () => {
      listeners.delete(handleBurst);
    };
  }, []);

  useFrame((_, delta) => {
    // 1. Update & render particles
    if (meshRef.current) {
      const activeParticles: Particle[] = [];
      let idx = 0;

      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        p.life += delta;

        if (p.life < p.maxLife) {
          activeParticles.push(p);

          // Apply drag
          p.vx *= Math.pow(0.88, delta * 60);
          p.vy *= Math.pow(0.88, delta * 60);
          p.vz *= Math.pow(0.88, delta * 60);

          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;

          const progress = p.life / p.maxLife;
          const currentScale = Math.max(0.001, p.baseScale * (1 - progress));

          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.set(currentScale, currentScale, currentScale);
          dummy.updateMatrix();

          meshRef.current.setMatrixAt(idx, dummy.matrix);
          meshRef.current.setColorAt(idx, p.color);
          idx++;
        }
      }

      particles.current = activeParticles;
      meshRef.current.count = idx;
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // 2. Update & render shockwave rings
    if (ringMeshRef.current) {
      const activeWaves: Shockwave[] = [];
      let ringIdx = 0;

      for (let i = 0; i < shockwaves.current.length; i++) {
        const w = shockwaves.current[i];
        w.life += delta;

        if (w.life < w.maxLife) {
          activeWaves.push(w);
          const progress = w.life / w.maxLife;
          const scale = w.scale + (w.maxScale - w.scale) * Math.sin((progress * Math.PI) / 2);

          dummyRing.position.set(w.x, w.y, 0.4);
          dummyRing.scale.set(scale, scale, 1);
          dummyRing.updateMatrix();

          ringMeshRef.current.setMatrixAt(ringIdx, dummyRing.matrix);
          colorObj.copy(w.color).multiplyScalar(1 - progress);
          ringMeshRef.current.setColorAt(ringIdx, colorObj);
          ringIdx++;
        }
      }

      shockwaves.current = activeWaves;
      ringMeshRef.current.count = ringIdx;
      ringMeshRef.current.instanceMatrix.needsUpdate = true;
      if (ringMeshRef.current.instanceColor) {
        ringMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* Particle Instanced Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[null as any, null as any, MAX_PARTICLES]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          roughness={0.1}
          metalness={0.9}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              totalEmissiveRadiance += diffuseColor.rgb * 3.5;
              `
            );
          }}
        />
      </instancedMesh>

      {/* Shockwave Rings Instanced Mesh */}
      <instancedMesh
        ref={ringMeshRef}
        args={[null as any, null as any, MAX_SHOCKWAVES]}
        frustumCulled={false}
      >
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
