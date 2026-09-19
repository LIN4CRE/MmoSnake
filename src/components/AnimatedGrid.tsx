/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD_SIZE } from '../shared/types';

export function AnimatedGrid() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorCell: { value: new THREE.Color('#0d1b3e') },
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

      // Base cyber floor color
      vec3 finalColor = vec3(0.02, 0.03, 0.05);

      // Blend secondary grid lines (subtle dark cyan/blue)
      finalColor = mix(finalColor, uColorLine, line1 * 0.45);

      // Blend major section grid lines with pulse
      vec3 activeLine10Color = mix(uColorHighlight, vec3(0.3, 0.6, 1.0), driftWave);
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
