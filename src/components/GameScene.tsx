/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState } from '../store/gameStore';
import {
  WORLD_SIZE,
  TURN_SPEED,
  BOOST_SPEED,
  BASE_SPEED,
  BOOST_DURATION,
  BOOST_COOLDOWN,
  STATIC_OBSTACLES,
} from '../shared/types';
import * as THREE from 'three';
import { Sphere } from '@react-three/drei';
import { ParticleSystem, emitOrbParticles } from './ParticleSystem';
import { soundManager } from '../utils/audio';
import { AnimatedGrid } from './AnimatedGrid';
import { Obstacles } from './Obstacles';

const localCollectedOrbs = new Set<string>();

function Snake({
  playerId,
  headColor,
  tailColor,
  isLocal,
}: {
  playerId: string;
  headColor: string;
  tailColor: string;
  isLocal: boolean;
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{x: number, y: number}[]>([]);

  const headColorObj = useMemo(() => new THREE.Color(), []);
  const tailColorObj = useMemo(() => new THREE.Color(), []);
  const segmentColorObj = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    
    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headRef.current.visible = false;
      return;
    }
    
    headRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);
    
    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({ 
        x: player.segments[idx]?.x || 0, 
        y: player.segments[idx]?.y || 0 
      });
    }

    headColorObj.set(headColor);
    tailColorObj.set(tailColor);

    for (let i = 0; i < count; i++) {
      let targetX = player.segments[i].x;
      let targetY = player.segments[i].y;
      
      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 10) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 15;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }
      
      if (i === 0) {
        headRef.current.position.set(curr.x, curr.y, 0.5);
      } else {
        dummy.position.set(curr.x, curr.y, 0.5);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);

        // Smooth color transition from head color to tail color along the body
        const ratio = count > 2 ? (i - 1) / (count - 2) : 1;
        segmentColorObj.copy(headColorObj).lerp(tailColorObj, ratio);
        bodyRef.current.setColorAt(i - 1, segmentColorObj);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor) {
      bodyRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <Sphere ref={headRef} castShadow receiveShadow args={[0.8, 16, 16]}>
        <meshStandardMaterial
          color={headColor}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
              totalEmissiveRadiance += diffuseColor.rgb * (0.4 + fresnel * 3.0);
              `
            );
          }}
        />
      </Sphere>
      <instancedMesh ref={bodyRef} args={[null as any, null as any, 2000]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
              totalEmissiveRadiance += diffuseColor.rgb * (0.4 + fresnel * 1.5);
              `
            );
          }}
        />
      </instancedMesh>
    </group>
  );
}

function Orbs() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;

    let i = 0;
    for (const orbId in gs.orbs) {
      if (localCollectedOrbs.has(orbId)) continue;
      const orb = gs.orbs[orbId];
      dummy.position.set(orb.x, orb.y, 0.5);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      colorObj.set(orb.color);
      meshRef.current.setColorAt(i, colorObj);
      i++;
    }
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, 1000]} castShadow receiveShadow frustumCulled={false}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        roughness={0.4}
        metalness={0.1}
        toneMapped={false}
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            totalEmissiveRadiance += diffuseColor.rgb * 2.5;
            `
          );
        }}
      />
    </instancedMesh>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb } = useGameStore();
  const { camera } = useThree();
  const inputs = useRef({ left: false, right: false, boost: false });
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());

  const localPlayerRef = useRef<{
    active: boolean;
    segments: {x: number, y: number}[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
  }>({
    active: false,
    segments: [],
    score: 10,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
  });

  const boostRef = useRef<{
    isActive: boolean;
    timeLeft: number;
    cooldownLeft: number;
    lastUiSync: number;
  }>({
    isActive: false,
    timeLeft: 0,
    cooldownLeft: 0,
    lastUiSync: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !inputs.current.left) {
        inputs.current.left = true;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !inputs.current.right) {
        inputs.current.right = true;
      }
      if (
        (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === 'Shift') &&
        !inputs.current.boost
      ) {
        inputs.current.boost = true;
        // Trigger temporary speed boost if available
        if (
          !boostRef.current.isActive &&
          boostRef.current.cooldownLeft <= 0 &&
          localPlayerRef.current.active
        ) {
          boostRef.current.isActive = true;
          boostRef.current.timeLeft = BOOST_DURATION;
          soundManager.playBoostActivate();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && inputs.current.left) {
        inputs.current.left = false;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && inputs.current.right) {
        inputs.current.right = false;
      }
      if (
        (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === 'Shift') &&
        inputs.current.boost
      ) {
        inputs.current.boost = false;
      }
    };

    const handleBlur = () => {
      inputs.current = { left: false, right: false, boost: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;
    
    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      
      // Initialize from server if not active
      if (!localPlayerRef.current.active && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
        boostRef.current.isActive = false;
        boostRef.current.timeLeft = 0;
        boostRef.current.cooldownLeft = 0;
      }

      if (!localPlayerRef.current.active) return;

      // Local steering
      if (inputs.current.left) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
      if (inputs.current.right) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
      
      // Speed boost timer and cooldown mechanic
      if (boostRef.current.isActive) {
        boostRef.current.timeLeft -= delta;
        localPlayerRef.current.isBoosting = true;
        if (boostRef.current.timeLeft <= 0) {
          boostRef.current.isActive = false;
          boostRef.current.timeLeft = 0;
          boostRef.current.cooldownLeft = BOOST_COOLDOWN;
          localPlayerRef.current.isBoosting = false;
        }
      } else {
        localPlayerRef.current.isBoosting = false;
        if (boostRef.current.cooldownLeft > 0) {
          const prevCooldown = boostRef.current.cooldownLeft;
          boostRef.current.cooldownLeft -= delta;
          if (prevCooldown > 0 && boostRef.current.cooldownLeft <= 0) {
            boostRef.current.cooldownLeft = 0;
            soundManager.playBoostReady();
          }
        }
      }

      // Sync boost state to store periodically for UI HUD
      const nowTime = performance.now();
      if (nowTime - boostRef.current.lastUiSync > 80) {
        boostRef.current.lastUiSync = nowTime;
        useGameStore.getState().setBoostState({
          isAvailable: !boostRef.current.isActive && boostRef.current.cooldownLeft <= 0,
          isActive: boostRef.current.isActive,
          timeLeft: Math.max(0, boostRef.current.timeLeft),
          cooldownLeft: Math.max(0, boostRef.current.cooldownLeft),
        });
      }

      const speed = localPlayerRef.current.isBoosting ? BOOST_SPEED : BASE_SPEED;
      
      const head = { ...localPlayerRef.current.segments[0] };
      head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

      // Boundary check
      const boundary = WORLD_SIZE / 2;
      if (head.x < -boundary) head.x = -boundary;
      if (head.x > boundary) head.x = boundary;
      if (head.y < -boundary) head.y = -boundary;
      if (head.y > boundary) head.y = boundary;

      localPlayerRef.current.segments.unshift(head);

      // Trail boost particles
      if (localPlayerRef.current.isBoosting && Math.random() < 0.35) {
        emitOrbParticles(
          head.x - Math.cos(localPlayerRef.current.currentAngle) * 1.2,
          head.y - Math.sin(localPlayerRef.current.currentAngle) * 1.2,
          serverPlayer.headColor || '#00f5d4'
        );
      }

      const targetLength = Math.floor(localPlayerRef.current.score);
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      // Check orb collisions
      for (const orbId in gs.orbs) {
        if (localCollectedOrbs.has(orbId)) continue;
        const orb = gs.orbs[orbId];
        const dx = head.x - orb.x;
        const dy = head.y - orb.y;
        if (dx * dx + dy * dy < 4) {
          localPlayerRef.current.score += orb.value;
          localCollectedOrbs.add(orbId);
          // Visual and auditory feedback for collecting orb
          emitOrbParticles(orb.x, orb.y, orb.color);
          soundManager.playOrbCollect();
          delete gs.orbs[orbId]; // predict locally
          sendCollectOrb(orbId);
        }
      }

      // Cleanup localCollectedOrbs occasionally
      if (Math.random() < 0.05) {
        for (const id of localCollectedOrbs) {
          if (!gs.orbs[id]) localCollectedOrbs.delete(id);
        }
      }

      // Check obstacle collisions
      let collided = false;
      let collisionCause: { killerId?: string; obstacleId?: string } | undefined = undefined;

      for (const obs of STATIC_OBSTACLES) {
        const halfW = obs.width / 2 + 0.6;
        const halfH = obs.height / 2 + 0.6;
        if (Math.abs(head.x - obs.x) < halfW && Math.abs(head.y - obs.y) < halfH) {
          collided = true;
          collisionCause = { obstacleId: obs.id };
          break;
        }
      }

      // Check player collisions
      if (!collided) {
        for (const otherId in gs.players) {
          if (otherId === playerId) continue;
          const other = gs.players[otherId];
          if (other.state !== 'alive') continue;
          for (const seg of other.segments) {
            const dx = head.x - seg.x;
            const dy = head.y - seg.y;
            if (dx * dx + dy * dy < 2.25) {
              collided = true;
              collisionCause = { killerId: otherId };
              break;
            }
          }
          if (collided) break;
        }
      }

      if (collided) {
        // Game-over sound effect
        soundManager.playGameOver();

        // Burst particles along dying snake
        localPlayerRef.current.segments.forEach((seg, idx) => {
          if (idx % 2 === 0) {
            emitOrbParticles(
              seg.x,
              seg.y,
              idx % 4 === 0 ? (serverPlayer.headColor || '#ff7eb3') : (serverPlayer.tailColor || '#bd93f9')
            );
          }
        });

        localPlayerRef.current.active = false;
        boostRef.current.isActive = false;
        boostRef.current.timeLeft = 0;
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: false,
          state: 'dead',
          cause: collisionCause
        });
        return;
      }

      // Overwrite global state for local rendering
      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;

      // Send state to server at 20Hz
      const now = Date.now();
      if (now - localPlayerRef.current.lastSendTime > 50) {
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'alive'
        });
        localPlayerRef.current.lastSendTime = now;
      }

      const targetZ = Math.min(45, Math.max(20, 20 + localPlayerRef.current.score * 0.2));
      
      // Smooth camera follow predicted head
      camera.position.x += (head.x - camera.position.x) * 10 * delta;
      camera.position.y += (head.y - camera.position.y) * 10 * delta;
      camera.position.z += (targetZ - camera.position.z) * 4 * delta;
      camera.lookAt(camera.position.x, camera.position.y, 0);

      // Make the directional light follow the camera to keep shadows crisp
      if (lightRef.current) {
        lightRef.current.position.set(camera.position.x + 10, camera.position.y - 10, 30);
        lightTarget.position.set(camera.position.x, camera.position.y, 0);
      }
    } else {
      localPlayerRef.current.active = false;
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-bias={-0.001}
      />
      <primitive object={lightTarget} />

      {/* Animated Pulsing Futuristic Neon Background Grid */}
      <AnimatedGrid />

      {/* Static Wall Obstacles */}
      <Obstacles />

      <Orbs />

      <ParticleSystem />

      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <Snake
            key={player.id}
            playerId={player.id}
            headColor={player.headColor || player.color || '#ff7eb3'}
            tailColor={player.tailColor || player.color || '#bd93f9'}
            isLocal={player.id === playerId}
          />
        );
      })}
    </>
  );
}
