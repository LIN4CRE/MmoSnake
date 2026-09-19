/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  VolumeX,
  Music,
  Sliders,
  ZoomIn,
  Keyboard,
  RotateCcw,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export function SettingsOverlay() {
  const {
    isSettingsOpen,
    setSettingsOpen,
    isMuted,
    toggleMute,
    sfxVolume,
    setSfxVolume,
    musicVolume,
    setMusicVolume,
    cameraZoom,
    setCameraZoom,
  } = useGameStore();

  if (!isSettingsOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-zinc-900/95 border border-white/20 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400">
                <Sliders size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Audio & Display Settings</h2>
                <p className="text-xs text-white/50">Tune sound effects, synth music, and camera view</p>
              </div>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Master Audio Mute Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-white">
                  {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-emerald-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Master Sound</div>
                  <div className="text-[11px] text-white/50">{isMuted ? 'All sounds muted' : 'Audio enabled'}</div>
                </div>
              </div>
              <button
                onClick={toggleMute}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                  isMuted
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isMuted ? 'MUTED' : 'ACTIVE'}
              </button>
            </div>

            {/* SFX Volume Slider */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-white/90 font-bold">
                  <Volume2 size={15} className="text-yellow-400" />
                  <span>SFX VOLUME</span>
                </div>
                <span className="text-white font-bold">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={isMuted}
                value={sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="w-full accent-yellow-400 h-1.5 bg-black/60 rounded-lg cursor-pointer disabled:opacity-30"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Synthwave Music Volume Slider */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-white/90 font-bold">
                  <Music size={15} className="text-pink-400" />
                  <span>SYNTH BGM VOLUME</span>
                </div>
                <span className="text-white font-bold">{Math.round(musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={isMuted}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full accent-pink-400 h-1.5 bg-black/60 rounded-lg cursor-pointer disabled:opacity-30"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>Off</span>
                <span>Ambient</span>
                <span>Max</span>
              </div>
            </div>

            {/* Camera Zoom Level */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-white/90 font-bold">
                  <ZoomIn size={15} className="text-cyan-400" />
                  <span>CAMERA ZOOM LEVEL</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{cameraZoom.toFixed(2)}x</span>
                  {cameraZoom !== 1.0 && (
                    <button
                      onClick={() => setCameraZoom(1.0)}
                      title="Reset to default zoom"
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={cameraZoom}
                onChange={(e) => setCameraZoom(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-black/60 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>0.70x (Close-Up)</span>
                <span>1.0x (Standard)</span>
                <span>1.50x (Wide Field)</span>
              </div>
            </div>

            {/* Quick Controls Reference */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono text-white/70 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-white/90">
                <Keyboard size={13} className="text-white/50" />
                <span>KEYBOARD CONTROLS</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div><span className="text-white font-bold">A / D / Arrows:</span> Turn Snake</div>
                <div><span className="text-white font-bold">SPACE / Shift:</span> Speed Boost</div>
                <div><span className="text-white font-bold">E Key:</span> Open Emotes Menu</div>
                <div><span className="text-white font-bold">M Key:</span> Quick Mute Audio</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-full py-3 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 transition-all active:scale-98 shadow-lg"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
