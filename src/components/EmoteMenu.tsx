/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

const EMOTE_OPTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '💀', label: 'Skull' },
  { emoji: '👑', label: 'Crown' },
  { emoji: '⚡', label: 'Volt' },
  { emoji: '👻', label: 'Ghost' },
  { emoji: '🐍', label: 'Snake' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '😎', label: 'Cool' },
  { emoji: '🛡️', label: 'Shield' },
  { emoji: '💔', label: 'Rip' },
  { emoji: '💥', label: 'Boom' },
  { emoji: '💫', label: 'Dizzy' },
];

export function EmoteMenu() {
  const { isEmoteMenuOpen, setEmoteMenuOpen, sendEmote, gameState, playerId } = useGameStore();
  const menuRef = useRef<HTMLDivElement>(null);

  const isAlive = Boolean(playerId && gameState?.players[playerId]?.state === 'alive');

  // Keyboard shortcut: Press 'E' to toggle emote menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'e' || e.key === 'E') && isAlive) {
        // Only toggle if not typing in an input
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          setEmoteMenuOpen(!isEmoteMenuOpen);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAlive, isEmoteMenuOpen, setEmoteMenuOpen]);

  const handleSelectEmote = (emoji: string) => {
    sendEmote(emoji);
    setEmoteMenuOpen(false);
  };

  if (!isAlive) return null;

  return (
    <div className="relative pointer-events-auto">
      {/* Floating Emote Button Trigger */}
      <button
        onClick={() => setEmoteMenuOpen(!isEmoteMenuOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full border backdrop-blur-md text-xs font-mono font-bold transition-all shadow-xl hover:scale-105 active:scale-95 ${
          isEmoteMenuOpen
            ? 'bg-pink-500/30 text-pink-300 border-pink-400 shadow-[0_0_15px_rgba(255,126,179,0.4)]'
            : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80 hover:text-white'
        }`}
        title="Trigger Visual Emote (Press E)"
      >
        <Smile size={16} className="text-yellow-400" />
        <span className="hidden sm:inline">Emote</span>
        <span className="text-[10px] px-1 py-0.2 bg-white/10 rounded font-mono text-white/60">E</span>
      </button>

      {/* Emotes Palette Popup */}
      <AnimatePresence>
        {isEmoteMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-12 left-0 sm:left-auto sm:right-0 bg-zinc-900/95 border border-white/20 rounded-2xl p-3 shadow-2xl backdrop-blur-xl w-64 z-40"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                <span>💬</span> Snake Emotes
              </span>
              <button
                onClick={() => setEmoteMenuOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {EMOTE_OPTIONS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleSelectEmote(item.emoji)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/25 transition-transform hover:scale-115 active:scale-95 group"
                  title={item.label}
                >
                  <span className="text-2xl leading-none transition-transform group-hover:scale-110">
                    {item.emoji}
                  </span>
                  <span className="text-[9px] font-mono text-white/40 mt-1 uppercase tracking-tighter truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
