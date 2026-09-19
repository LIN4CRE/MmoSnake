/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Web Audio API Synth Sound System

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private comboCount: number = 0;
  private lastOrbTime: number = 0;

  constructor() {
    // Check saved mute preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neon_snake_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('neon_snake_muted', String(this.isMuted));
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Play crisp ascending chime for orb collection
  public playOrbCollect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = Date.now();
    if (now - this.lastOrbTime < 800) {
      this.comboCount = (this.comboCount + 1) % 8;
    } else {
      this.comboCount = 0;
    }
    this.lastOrbTime = now;

    // Pentatonic scale notes (C5 to C7)
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const baseFreq = scale[this.comboCount] || 523.25;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Primary bell tone (Sine)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    // Slight pitch bend upward gives that classic coin/orb pop
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, t + 0.08);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(gain);

    // Harmonic sparkle overtone
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(baseFreq * 2.0, t);
    overtone.frequency.exponentialRampToValueAtTime(baseFreq * 2.05, t + 0.05);

    overtoneGain.gain.setValueAtTime(0.001, t);
    overtoneGain.gain.linearRampToValueAtTime(0.1, t + 0.01);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    overtone.connect(overtoneGain);

    // Master filter to soften high frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4500, t);

    gain.connect(filter);
    overtoneGain.connect(filter);
    filter.connect(ctx.destination);

    osc.start(t);
    overtone.start(t);
    osc.stop(t + 0.28);
    overtone.stop(t + 0.2);
  }

  // Play dramatic descending power-down / game over crash sound
  public playGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Sub-bass oscillator (Sawtooth -> filter drop)
    const osc1 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain1 = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(280, t);
    osc1.frequency.exponentialRampToValueAtTime(42, t + 0.85);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.9);

    gain1.gain.setValueAtTime(0.01, t);
    gain1.gain.linearRampToValueAtTime(0.35, t + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);

    // Distortion/noise burst for explosion impact
    const bufferSize = ctx.sampleRate * 0.25;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(150, t + 0.25);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc1.start(t);
    whiteNoise.start(t);
    osc1.stop(t + 1.0);
    whiteNoise.stop(t + 0.35);
  }
}

export const soundManager = new SoundSystem();
