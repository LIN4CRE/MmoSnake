/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Web Audio API Synth Sound System

class SoundSystem {
  private ctx: AudioContext | null = null;
  private sfxGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.75;
  private musicVolume: number = 0.45;
  private comboCount: number = 0;
  private lastOrbTime: number = 0;
  private isMusicPlaying: boolean = false;
  private musicTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('neon_snake_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';

      const savedSfx = localStorage.getItem('neon_snake_sfx_vol');
      if (savedSfx !== null) {
        const val = parseFloat(savedSfx);
        if (!isNaN(val)) this.sfxVolume = Math.max(0, Math.min(1, val));
      }

      const savedMusic = localStorage.getItem('neon_snake_music_vol');
      if (savedMusic !== null) {
        const val = parseFloat(savedMusic);
        if (!isNaN(val)) this.musicVolume = Math.max(0, Math.min(1, val));
      }
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGainNode = this.ctx.createGain();
        this.musicGainNode = this.ctx.createGain();

        this.updateGainLevels();

        this.sfxGainNode.connect(this.ctx.destination);
        this.musicGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private updateGainLevels() {
    if (!this.ctx) return;
    const effectiveSfx = this.isMuted ? 0 : this.sfxVolume;
    const effectiveMusic = this.isMuted ? 0 : this.musicVolume;

    if (this.sfxGainNode) {
      this.sfxGainNode.gain.setValueAtTime(effectiveSfx, this.ctx.currentTime);
    }
    if (this.musicGainNode) {
      this.musicGainNode.gain.setValueAtTime(effectiveMusic, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('neon_snake_muted', String(this.isMuted));
    }
    this.updateGainLevels();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('neon_snake_sfx_vol', String(this.sfxVolume));
    }
    this.updateGainLevels();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('neon_snake_music_vol', String(this.musicVolume));
    }
    this.updateGainLevels();
    if (this.musicVolume > 0 && !this.isMusicPlaying && !this.isMuted) {
      this.startMusic();
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  // Generative Synthwave Ambient Music Loop
  public startMusic() {
    if (this.isMusicPlaying) return;
    this.initCtx();
    if (!this.ctx || !this.musicGainNode) return;

    this.isMusicPlaying = true;
    let step = 0;
    // Cyber chords progression: Am9 -> Fmaj7 -> Cmaj7 -> Gsus4
    const chords = [
      [220, 261.63, 329.63, 392], // A3, C4, E4, G4
      [174.61, 220, 261.63, 329.63], // F3, A3, C4, E4
      [130.81, 164.81, 196, 246.94], // C3, E3, G3, B3
      [196, 246.94, 293.66, 392], // G3, B3, D4, G4
    ];

    const playStep = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGainNode) return;
      const ctx = this.ctx;
      const chordIndex = Math.floor(step / 4) % chords.length;
      const chord = chords[chordIndex];
      const root = chord[0];
      const note = chord[step % chord.length];
      const t = ctx.currentTime;

      // Soft pad note on chord change
      if (step % 4 === 0) {
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq * 0.5, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, t);

          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.035, t + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGainNode!);

          osc.start(t);
          osc.stop(t + 2.9);
        });
      }

      // Synth arp plink
      const arpOsc = ctx.createOscillator();
      const arpGain = ctx.createGain();
      const arpFilter = ctx.createBiquadFilter();

      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(note * 2, t);

      arpFilter.type = 'lowpass';
      arpFilter.frequency.setValueAtTime(1200, t);

      arpGain.gain.setValueAtTime(0.001, t);
      arpGain.gain.linearRampToValueAtTime(0.045, t + 0.02);
      arpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      arpGain.connect(this.musicGainNode!);

      arpOsc.start(t);
      arpOsc.stop(t + 0.4);

      step = (step + 1) % (chords.length * 4);
      this.musicTimer = setTimeout(playStep, 450);
    };

    playStep();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
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
    filter.connect(this.sfxGainNode || ctx.destination);

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
    const dest = this.sfxGainNode || ctx.destination;

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
    gain1.connect(dest);

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
    noiseGain.connect(dest);

    osc1.start(t);
    whiteNoise.start(t);
    osc1.stop(t + 1.0);
    whiteNoise.stop(t + 0.35);
  }

  // Play futuristic speed boost ignition whoosh
  public playBoostActivate() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.sfxGainNode || ctx.destination;

    // Upward pitch bend laser warp
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.35);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Play boost ready double-blip
  public playBoostReady() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.sfxGainNode || ctx.destination;

    [0, 0.08].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 880 : 1320, t + delay);

      gain.gain.setValueAtTime(0.001, t + delay);
      gain.gain.linearRampToValueAtTime(0.12, t + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.12);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + delay);
      osc.stop(t + delay + 0.14);
    });
  }

  // Play heroic milestone, kill, crash, or system notification chime
  public playNotification(type: 'kill' | 'milestone' | 'crash' | 'system' = 'milestone') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.sfxGainNode || ctx.destination;

    const freqs =
      type === 'kill'
        ? [440, 554.37, 659.25, 880] // Major fanfare
        : type === 'milestone'
        ? [523.25, 659.25, 783.99, 1046.5] // Bright sparkling chord
        : type === 'crash'
        ? [330, 293.66, 246.94] // Minor fall
        : [587.33, 880]; // Gentle dual bell

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.001, t + delay);
      gain.gain.linearRampToValueAtTime(0.14, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.4);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t + delay);
      osc.stop(t + delay + 0.45);
    });
  }

  // Play specialized power-up pickup fanfare
  public playPowerupCollect(type: 'invincibility' | 'ghost') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.sfxGainNode || ctx.destination;

    if (type === 'invincibility') {
      // Golden power arpeggio (C5, G5, C6, E6)
      const freqs = [523.25, 783.99, 1046.5, 1318.51];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.06);

        gain.gain.setValueAtTime(0.001, t + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.18, t + i * 0.06 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.45);
      });
    } else {
      // Ghost Mode ethereal warp sweep
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.2);
      osc.frequency.exponentialRampToValueAtTime(330, t + 0.5);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(2400, t + 0.25);
      filter.frequency.linearRampToValueAtTime(400, t + 0.5);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + 0.6);
    }
  }

  // Play playful emote blip
  public playEmote() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.sfxGainNode || ctx.destination;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.12);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.22);
  }
}

export const soundManager = new SoundSystem();
