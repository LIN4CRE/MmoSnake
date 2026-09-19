/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, GameNotification } from '../shared/types';
import { emitOrbParticles } from '../components/ParticleSystem';
import { soundManager } from '../utils/audio';

export interface SnakeCustomization {
  name: string;
  headColor: string;
  tailColor: string;
}

export interface BoostState {
  isAvailable: boolean;
  isActive: boolean;
  timeLeft: number;
  cooldownLeft: number;
}

interface GameStore {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  customization: SnakeCustomization;
  isMuted: boolean;
  isColorPickerOpen: boolean;
  notifications: GameNotification[];
  boostState: BoostState;
  connect: () => void;
  joinGame: () => void;
  setCustomization: (custom: Partial<SnakeCustomization>) => void;
  setColorPickerOpen: (open: boolean) => void;
  toggleMute: () => void;
  addNotification: (notification: GameNotification) => void;
  removeNotification: (id: string) => void;
  setBoostState: (state: BoostState) => void;
  sendPlayerState: (data: any) => void;
  sendCollectOrb: (orbId: string) => void;
}

export const globalGameState: { current: GameState | null } = { current: null };
let lastUiUpdate = 0;

function getSavedCustomization(): SnakeCustomization {
  const defaultCustom: SnakeCustomization = {
    name: 'NeonSnake',
    headColor: '#ff7eb3',
    tailColor: '#bd93f9',
  };
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('snake_customization');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || defaultCustom.name,
          headColor: parsed.headColor || defaultCustom.headColor,
          tailColor: parsed.tailColor || defaultCustom.tailColor,
        };
      }
    } catch {
      // fallback
    }
  }
  return defaultCustom;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: null,
  playerId: null,
  customization: getSavedCustomization(),
  isMuted: soundManager.getIsMuted(),
  isColorPickerOpen: false,
  notifications: [],
  boostState: {
    isAvailable: true,
    isActive: false,
    timeLeft: 0,
    cooldownLeft: 0,
  },

  setColorPickerOpen: (isColorPickerOpen) => set({ isColorPickerOpen }),

  toggleMute: () => {
    const isMuted = soundManager.toggleMute();
    set({ isMuted });
  },

  setBoostState: (boostState) => set({ boostState }),

  addNotification: (notification) => {
    const current = get().notifications;
    const next = [notification, ...current.filter((n) => n.id !== notification.id).slice(0, 3)];
    set({ notifications: next });
    setTimeout(() => {
      get().removeNotification(notification.id);
    }, 4200);
  },

  removeNotification: (id) => {
    set({ notifications: get().notifications.filter((n) => n.id !== id) });
  },

  setCustomization: (partial) => {
    const updated = { ...get().customization, ...partial };
    set({ customization: updated });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('snake_customization', JSON.stringify(updated));
      } catch {}
    }
    const { socket } = get();
    if (socket) {
      socket.emit('update_customization', updated);
    }
  },

  connect: () => {
    if (get().socket) return;
    
    const socket = io();

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('init', (id: string) => {
      set({ playerId: id });
    });

    socket.on('orb_collected', (data: { id: string; x: number; y: number; color: string; collectorId: string }) => {
      emitOrbParticles(data.x, data.y, data.color);
      // Play sound if collector was our snake
      if (data.collectorId === get().playerId) {
        soundManager.playOrbCollect();
      }
    });

    socket.on('game_notification', (data: GameNotification) => {
      get().addNotification(data);
      soundManager.playNotification(data.type);
    });

    socket.on('state', (state: GameState) => {
      globalGameState.current = state;
      const now = Date.now();
      if (now - lastUiUpdate > 100) { // Throttle React updates to 10Hz
        set({ gameState: state });
        lastUiUpdate = now;
      }
    });

    set({ socket });
  },

  joinGame: () => {
    const { socket, customization } = get();
    if (socket) {
      socket.emit('join', customization);
    }
  },

  sendPlayerState: (data) => {
    const { socket } = get();
    if (socket) {
      socket.emit('update_state', data);
    }
  },

  sendCollectOrb: (orbId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('collect_orb', orbId);
    }
  },
}));
