/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Shuffle, ArrowLeftRight, Sparkles, Palette } from 'lucide-react';

export const NEON_PRESETS = [
  { name: 'Vibrant Pink', hex: '#ff7eb3' },
  { name: 'Electric Cyan', hex: '#8be9fd' },
  { name: 'Neon Green', hex: '#50fa7b' },
  { name: 'Electric Purple', hex: '#bd93f9' },
  { name: 'Solar Orange', hex: '#ffb86c' },
  { name: 'Cyber Yellow', hex: '#f1fa8c' },
  { name: 'Ruby Crimson', hex: '#ff5555' },
  { name: 'Matrix Mint', hex: '#00f5d4' },
  { name: 'Deep Violet', hex: '#7928ca' },
  { name: 'Plasma Blue', hex: '#3b82f6' },
];

interface ColorPickerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  headColor: string;
  tailColor: string;
  playerName: string;
  onSave: (headColor: string, tailColor: string, name: string) => void;
}

export function ColorPickerOverlay({
  isOpen,
  onClose,
  headColor: initialHead,
  tailColor: initialTail,
  playerName: initialName,
  onSave,
}: ColorPickerOverlayProps) {
  const [headColor, setHeadColor] = useState(initialHead);
  const [tailColor, setTailColor] = useState(initialTail);
  const [name, setName] = useState(initialName);

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = headColor;
    setHeadColor(tailColor);
    setTailColor(temp);
  };

  const handleRandomize = () => {
    const r1 = NEON_PRESETS[Math.floor(Math.random() * NEON_PRESETS.length)].hex;
    let r2 = NEON_PRESETS[Math.floor(Math.random() * NEON_PRESETS.length)].hex;
    if (r1 === r2) {
      r2 = NEON_PRESETS[(NEON_PRESETS.indexOf(NEON_PRESETS.find(p => p.hex === r1)!) + 3) % NEON_PRESETS.length].hex;
    }
    setHeadColor(r1);
    setTailColor(r2);
  };

  const handleApply = () => {
    onSave(headColor, tailColor, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-zinc-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl text-white flex flex-col gap-5 overflow-hidden"
      >
        {/* Glow ambient background based on chosen colors */}
        <div
          className="absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: headColor }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: tailColor }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">CUSTOMIZE SNAKE</h2>
              <p className="text-xs text-white/50">Pick custom neon colors for head & tail segments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Snake Preview */}
        <div className="relative z-10 bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
          <span className="text-[11px] font-mono tracking-wider uppercase text-white/50">Live Snake Preview</span>
          
          <div className="flex items-center justify-center gap-1.5 py-2 px-4">
            {/* Head segment */}
            <div
              className="w-9 h-9 rounded-full relative flex items-center justify-center shadow-lg transition-transform hover:scale-110"
              style={{
                backgroundColor: headColor,
                boxShadow: `0 0 16px ${headColor}88`,
              }}
            >
              {/* Eyes */}
              <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white shadow-xs">
                <div className="w-1 h-1 rounded-full bg-black ml-0.5 mt-0.5" />
              </div>
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow-xs">
                <div className="w-1 h-1 rounded-full bg-black ml-0.5 mt-0.5" />
              </div>
            </div>

            {/* Body / Tail gradient segments */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((t, idx) => {
              return (
                <div
                  key={idx}
                  className="w-7 h-7 rounded-full shadow-md transition-colors duration-200"
                  style={{
                    backgroundColor: idx < 2 ? headColor : tailColor,
                    opacity: 0.95 - idx * 0.08,
                    boxShadow: `0 0 10px ${idx < 2 ? headColor : tailColor}66`,
                    transform: `scale(${1 - idx * 0.07})`,
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-white/70">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: headColor }} />
              Head: <strong className="uppercase">{headColor}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tailColor }} />
              Tail: <strong className="uppercase">{tailColor}</strong>
            </span>
          </div>
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <label className="text-xs font-bold text-white/70 tracking-wide uppercase">Pilot Name</label>
          <input
            type="text"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter snake name..."
            className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 font-mono transition-colors"
          />
        </div>

        {/* Head Color Selector */}
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white/70 tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: headColor }} />
              Head Segment Color
            </label>
            <label className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white cursor-pointer font-mono">
              <span>Custom Hex</span>
              <input
                type="color"
                value={headColor}
                onChange={(e) => setHeadColor(e.target.value)}
                className="w-6 h-6 rounded-md border border-white/20 bg-transparent cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {NEON_PRESETS.map((preset) => {
              const isSelected = headColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={`head-${preset.hex}`}
                  type="button"
                  title={preset.name}
                  onClick={() => setHeadColor(preset.hex)}
                  className={`relative h-8 rounded-xl transition-all duration-150 flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: preset.hex,
                    boxShadow: isSelected ? `0 0 12px ${preset.hex}` : undefined,
                  }}
                >
                  {isSelected && <Check size={14} className="text-black font-black drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tail Color Selector */}
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white/70 tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tailColor }} />
              Tail / Body Segments Color
            </label>
            <label className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white cursor-pointer font-mono">
              <span>Custom Hex</span>
              <input
                type="color"
                value={tailColor}
                onChange={(e) => setTailColor(e.target.value)}
                className="w-6 h-6 rounded-md border border-white/20 bg-transparent cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {NEON_PRESETS.map((preset) => {
              const isSelected = tailColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={`tail-${preset.hex}`}
                  type="button"
                  title={preset.name}
                  onClick={() => setTailColor(preset.hex)}
                  className={`relative h-8 rounded-xl transition-all duration-150 flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: preset.hex,
                    boxShadow: isSelected ? `0 0 12px ${preset.hex}` : undefined,
                  }}
                >
                  {isSelected && <Check size={14} className="text-black font-black drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions & Controls */}
        <div className="flex items-center justify-between gap-3 pt-2 relative z-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSwap}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white/90 transition-colors"
            >
              <ArrowLeftRight size={14} />
              <span>Swap</span>
            </button>
            <button
              type="button"
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white/90 transition-colors"
            >
              <Shuffle size={14} />
              <span>Randomize</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent hover:bg-white/10 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-xs font-black transition-transform active:scale-95 shadow-lg"
            >
              <Sparkles size={14} />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
