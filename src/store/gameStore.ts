/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, GameNotification, PowerUpType } from '../shared/types';
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

export interface GameOverSummary {
  orbsCollected: number;
  finalScore: number;
  killerName?: string;
  killerColor?: string;
  obstacleName?: string;
  timestamp: number;
}

interface GameStore {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  customization: SnakeCustomization;
  isMuted: boolean;
  sfxVolume: number;
  musicVolume: number;
  cameraZoom: number;
  isColorPickerOpen: boolean;
  isSettingsOpen: boolean;
  isEmoteMenuOpen: boolean;
  notifications: GameNotification[];
  boostState: BoostState;
  activePowerUp: { type: PowerUpType; timeLeft: number } | null;
  recentPlayerEmotes: Record<string, { emoji: string; timestamp: number }>;
  gameOverSummary: GameOverSummary | null;

  connect: () => void;
  joinGame: () => void;
  setCustomization: (custom: Partial<SnakeCustomization>) => void;
  setColorPickerOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setEmoteMenuOpen: (open: boolean) => void;
  toggleMute: () => void;
  setSfxVolume: (vol: number) => void;
  setMusicVolume: (vol: number) => void;
  setCameraZoom: (zoom: number) => void;
  addNotification: (notification: GameNotification) => void;
  removeNotification: (id: string) => void;
  setBoostState: (state: BoostState) => void;
  setActivePowerUp: (pu: { type: PowerUpType; timeLeft: number } | null) => void;
  clearGameOverSummary: () => void;
  sendPlayerState: (data: any) => void;
  sendCollectOrb: (orbId: string) => void;
  sendCollectPowerUp: (powerUpId: string) => void;
  sendEmote: (emoji: string) => void;
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

function getSavedZoom(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('neon_snake_zoom');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val)) return Math.max(0.7, Math.min(1.6, val));
    }
  }
  return 1.0;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: null,
  playerId: null,
  customization: getSavedCustomization(),
  isMuted: soundManager.getIsMuted(),
  sfxVolume: soundManager.getSfxVolume(),
  musicVolume: soundManager.getMusicVolume(),
  cameraZoom: getSavedZoom(),
  isColorPickerOpen: false,
  isSettingsOpen: false,
  isEmoteMenuOpen: false,
  notifications: [],
  boostState: {
    isAvailable: true,
    isActive: false,
    timeLeft: 0,
    cooldownLeft: 0,
  },
  activePowerUp: null,
  recentPlayerEmotes: {},
  gameOverSummary: null,

  setColorPickerOpen: (isColorPickerOpen) => set({ isColorPickerOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setEmoteMenuOpen: (isEmoteMenuOpen) => set({ isEmoteMenuOpen }),

  toggleMute: () => {
    const isMuted = soundManager.toggleMute();
    set({ isMuted });
  },

  setSfxVolume: (sfxVolume) => {
    soundManager.setSfxVolume(sfxVolume);
    set({ sfxVolume });
  },

  setMusicVolume: (musicVolume) => {
    soundManager.setMusicVolume(musicVolume);
    set({ musicVolume });
  },

  setCameraZoom: (cameraZoom) => {
    set({ cameraZoom });
    if (typeof window !== 'undefined') {
      localStorage.setItem('neon_snake_zoom', String(cameraZoom));
    }
  },

  setBoostState: (boostState) => set({ boostState }),
  setActivePowerUp: (activePowerUp) => set({ activePowerUp }),
  clearGameOverSummary: () => set({ gameOverSummary: null }),

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

    socket.on('power_up_collected', (data: { id: string; type: PowerUpType; x: number; y: number; collectorId: string; collectorName: string }) => {
      emitOrbParticles(data.x, data.y, data.type === 'invincibility' ? '#ffd700' : '#bd93f9');
      if (data.collectorId === get().playerId) {
        soundManager.playPowerupCollect(data.type);
        set({ activePowerUp: { type: data.type, timeLeft: 8.0 } });
      }
    });

    socket.on('player_emote', (data: { playerId: string; emoji: string; timestamp: number }) => {
      const nextEmotes = { ...get().recentPlayerEmotes, [data.playerId]: { emoji: data.emoji, timestamp: data.timestamp } };
      set({ recentPlayerEmotes: nextEmotes });
      soundManager.playEmote();
    });

    socket.on('game_over_summary', (data: GameOverSummary) => {
      set({ gameOverSummary: data, activePowerUp: null });
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
      set({ gameOverSummary: null, activePowerUp: null });
      // Also ensure background synth music starts when joining game
      soundManager.startMusic();
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

  sendCollectPowerUp: (powerUpId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('collect_power_up', powerUpId);
    }
  },

  sendEmote: (emoji) => {
    const { socket } = get();
    if (socket) {
      socket.emit('send_emote', emoji);
    }
  },
}));
