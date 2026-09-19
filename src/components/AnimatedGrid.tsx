/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD_SIZE } from '../shared/types';
import { useGameStore } from '../store/gameStore';

export const THEME_PALETTES = [
  {
    name: 'Cyber Cobalt',
    highlight: '#00f5d4',
    line: '#1e40af',
    cell: '#07152b',
    light: '#7dd3fc',
  },
  {
    name: 'Synthwave Magenta',
    highlight: '#ff7eb3',
    line: '#7928ca',
    cell: '#1f0a2d',
    light: '#f472b6',
  },
  {
    name: 'Solar Amber',
    highlight: '#ffb86c',
    line: '#d97706',
    cell: '#2c1808',
    light: '#fde047',
  },
  {
    name: 'Toxic Emerald',
    highlight: '#50fa7b',
    line: '#059669',
    cell: '#062817',
    light: '#86efac',
  },
  {
    name: 'Hyper Blue',
    highlight: '#8be9fd',
    line: '#3b82f6',
    cell: '#091c3e',
    light: '#93c5fd',
  },
];

export function getWorldColors(totalOrbs: number) {
  const normalized = (totalOrbs / 50); // shifts every 50 total orbs
  const phaseIndex = Math.floor(normalized) % THEME_PALETTES.length;
  const nextIndex = (phaseIndex + 1) % THEME_PALETTES.length;
  const progress = normalized - Math.floor(normalized);

  const curr = THEME_PALETTES[phaseIndex];
  const next = THEME_PALETTES[nextIndex];

  return {
    curr,
    next,
    progress,
    currentName: curr.name,
    phaseNumber: (Math.floor(normalized) % THEME_PALETTES.length) + 1,
  };
}

export function AnimatedGrid() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const totalOrbsCollected = useGameStore((state) => state.gameState?.totalOrbsCollected || 0);

  const targetHighlight = useMemo(() => new THREE.Color(), []);
  const targetLine = useMemo(() => new THREE.Color(), []);
  const targetCell = useMemo(() => new THREE.Color(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorCell: { value: new THREE.Color('#07152b') },
      uColorLine: { value: new THREE.Color('#1e40af') },
      uColorHighlight: { value: new THREE.Color('#00f5d4') },
      uWorldSize: { value: WORLD_SIZE },
    }),
    []
  );

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColorCell;
    uniform vec3 uColorLine;
    uniform vec3 uColorHighlight;
    uniform float uWorldSize;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vec2 pos = vWorldPosition.xy;

      // Primary 1-unit grid
      vec2 grid1 = abs(fract(pos - 0.5) - 0.5) / fwidth(pos);
      float line1 = 1.0 - min(min(grid1.x, grid1.y), 1.0);

      // Major 10-unit section grid
      vec2 grid10 = abs(fract(pos / 10.0 - 0.5) - 0.5) / fwidth(pos / 10.0);
      float line10 = 1.0 - min(min(grid10.x, grid10.y), 1.0);

      // Radial pulsing wave expanding from arena center
      float distFromCenter = length(pos);
      float pulseWave = sin(distFromCenter * 0.12 - uTime * 2.0) * 0.5 + 0.5;
      pulseWave = pow(pulseWave, 3.0); // Make wave peak sharp and defined

      // Subtle directional drifting energy wave
      float driftWave = sin((pos.x + pos.y) * 0.05 + uTime * 0.8) * 0.5 + 0.5;

      // Base cyber floor color dynamically derived from active world palette
      vec3 finalColor = uColorCell;

      // Blend secondary grid lines
      finalColor = mix(finalColor, uColorLine, line1 * 0.45);

      // Blend major section grid lines with pulse
      vec3 activeLine10Color = mix(uColorHighlight, uColorLine * 1.5, driftWave);
      float majorBrightness = 0.5 + pulseWave * 0.6;
      finalColor = mix(finalColor, activeLine10Color * majorBrightness, line10 * 0.85);

      // Intersecting nodes flash on major grid intersections
      float nodePoints = smoothstep(0.7, 0.99, line10);
      finalColor += uColorHighlight * nodePoints * (0.4 + pulseWave * 0.8);

      // Outer arena boundary vignette / fade
      float borderDist = max(abs(pos.x), abs(pos.y)) / (uWorldSize * 0.5);
      float edgeGlow = smoothstep(0.95, 1.0, borderDist);
      finalColor = mix(finalColor, vec3(1.0, 0.2, 0.5), edgeGlow * 0.9);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;

      // Calculate dynamic color blend based on total collective orbs
      const { curr, next, progress } = getWorldColors(totalOrbsCollected);
      targetHighlight.set(curr.highlight).lerp(new THREE.Color(next.highlight), progress);
      targetLine.set(curr.line).lerp(new THREE.Color(next.line), progress);
      targetCell.set(curr.cell).lerp(new THREE.Color(next.cell), progress);

      // Smooth transition to target color
      materialRef.current.uniforms.uColorHighlight.value.lerp(targetHighlight, delta * 2.5);
      materialRef.current.uniforms.uColorLine.value.lerp(targetLine, delta * 2.5);
      materialRef.current.uniforms.uColorCell.value.lerp(targetCell, delta * 2.5);
    }
  });

  return (
    <group position={[0, 0, -0.15]}>
      <mesh receiveShadow>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE, 1, 1]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
