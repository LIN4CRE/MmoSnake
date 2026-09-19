/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type GameState = {
  players: Record<string, Player>;
  orbs: Record<string, Orb>;
  leaderboard: LeaderboardEntry[];
};

export type PlayerState = 'alive' | 'dead' | 'spectating';

export type Player = {
  id: string;
  name: string;
  color: string;
  headColor: string;
  tailColor: string;
  segments: { x: number; y: number }[];
  score: number;
  orbsCollected: number;
  isBoosting: boolean;
  state: PlayerState;
  currentAngle: number;
  inputs: { left: boolean; right: boolean; boost: boolean };
};

export type Orb = {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  orbsCollected: number;
  score: number;
  headColor: string;
  tailColor: string;
  color: string;
  isAlive?: boolean;
};

export type Obstacle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  color?: string;
};

export type GameNotification = {
  id: string;
  type: 'kill' | 'milestone' | 'crash' | 'system';
  title: string;
  message: string;
  color?: string;
  timestamp: number;
};

export const WORLD_SIZE = 150;
export const BASE_SPEED = 15;
export const BOOST_SPEED = 32;
export const BOOST_DURATION = 3.0; // seconds of active boost
export const BOOST_COOLDOWN = 6.0; // seconds of cooldown
export const TICK_RATE = 60; // 60 updates per second
export const ORB_SPAWN_RATE = 0.1; // Orbs per tick
export const MAX_ORBS = 300;
export const INITIAL_LENGTH = 10;
export const SEGMENT_SPACING = 0.5;
export const TURN_SPEED = Math.PI * 3; // Radians per second

// Strategic static wall obstacles arranged across the neon grid arena
export const STATIC_OBSTACLES: Obstacle[] = [
  // Central Core Pillars
  { id: 'core-nw', x: -16, y: 16, width: 4, height: 4, depth: 3, color: '#00f5d4' },
  { id: 'core-ne', x: 16, y: 16, width: 4, height: 4, depth: 3, color: '#00f5d4' },
  { id: 'core-sw', x: -16, y: -16, width: 4, height: 4, depth: 3, color: '#00f5d4' },
  { id: 'core-se', x: 16, y: -16, width: 4, height: 4, depth: 3, color: '#00f5d4' },

  // Inner Cardinal Cross-Barriers
  { id: 'barrier-n', x: 0, y: 36, width: 22, height: 3, depth: 3, color: '#ff7eb3' },
  { id: 'barrier-s', x: 0, y: -36, width: 22, height: 3, depth: 3, color: '#ff7eb3' },
  { id: 'barrier-w', x: -36, y: 0, width: 3, height: 22, depth: 3, color: '#ff7eb3' },
  { id: 'barrier-e', x: 36, y: 0, width: 3, height: 22, depth: 3, color: '#ff7eb3' },

  // Quadrant L-Chicanes
  { id: 'chicane-nw-h', x: -45, y: 45, width: 16, height: 3, depth: 3, color: '#8be9fd' },
  { id: 'chicane-nw-v', x: -52, y: 38, width: 3, height: 16, depth: 3, color: '#8be9fd' },

  { id: 'chicane-ne-h', x: 45, y: 45, width: 16, height: 3, depth: 3, color: '#8be9fd' },
  { id: 'chicane-ne-v', x: 52, y: 38, width: 3, height: 16, depth: 3, color: '#8be9fd' },

  { id: 'chicane-sw-h', x: -45, y: -45, width: 16, height: 3, depth: 3, color: '#8be9fd' },
  { id: 'chicane-sw-v', x: -52, y: -38, width: 3, height: 16, depth: 3, color: '#8be9fd' },

  { id: 'chicane-se-h', x: 45, y: -45, width: 16, height: 3, depth: 3, color: '#8be9fd' },
  { id: 'chicane-se-v', x: 52, y: -38, width: 3, height: 16, depth: 3, color: '#8be9fd' },
];
