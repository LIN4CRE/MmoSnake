/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Zap, Swords, AlertTriangle, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export function GameOverSummaryOverlay() {
  const { gameOverSummary, joinGame, clearGameOverSummary } = useGameStore();

  // Press SPACE or ENTER to respawn immediately
  useEffect(() => {
    if (!gameOverSummary) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        joinGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOverSummary, joinGame]);

  if (!gameOverSummary) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25 }}
          className="bg-zinc-950/95 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.25)] relative overflow-hidden text-center"
        >
          {/* Top glow flare */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-600/20 blur-3xl rounded-full pointer-events-none" />

          {/* Skull Icon Header */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <Skull size={32} />
          </div>

          <div className="inline-block px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs font-mono font-bold uppercase mb-2">
            Combat Report
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-1">YOU WERE ELIMINATED</h2>

          {/* Collision Reason Card */}
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
            <span className="text-[10px] font-mono font-bold uppercase text-white/50 tracking-wider block mb-1.5">
              CAUSE OF DESTRUCTION
            </span>

            {gameOverSummary.killerName ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0">
                  <Swords size={18} />
                </div>
                <div>
                  <div className="text-xs text-white/70 font-mono">Head-on collision with:</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs inline-block shrink-0"
                      style={{ backgroundColor: gameOverSummary.killerColor || '#ff7eb3' }}
                    />
                    <strong
                      className="text-sm font-black tracking-wide"
                      style={{ color: gameOverSummary.killerColor || '#ff7eb3' }}
                    >
                      {gameOverSummary.killerName}
                    </strong>
                  </div>
                </div>
              </div>
            ) : gameOverSummary.obstacleName ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div className="text-xs text-white/70 font-mono">Crashed directly into:</div>
                  <strong className="text-sm font-black text-orange-300 tracking-wide mt-0.5 block">
                    {gameOverSummary.obstacleName}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-zinc-800 border border-white/10 text-white/70 shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <div className="text-xs text-white/70 font-mono">Fatal boundary impact:</div>
                  <strong className="text-sm font-black text-white/90 tracking-wide mt-0.5 block">
                    Arena Perimeter Grid Barrier
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black/60 p-3.5 rounded-2xl border border-yellow-400/20 flex flex-col items-center">
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Zap size={11} className="text-yellow-400 fill-yellow-400" /> Orbs Collected
              </span>
              <span className="text-2xl font-black text-yellow-300 font-mono">
                {gameOverSummary.orbsCollected || 0}
              </span>
            </div>

            <div className="bg-black/60 p-3.5 rounded-2xl border border-white/10 flex flex-col items-center">
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Trophy size={11} className="text-pink-400" /> Final Score / Length
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {Math.floor(gameOverSummary.finalScore || 10)}
              </span>
            </div>
          </div>

          {/* Action Respawn Button */}
          <button
            onClick={() => joinGame()}
            className="w-full py-4 bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl hover:brightness-110 transition-all active:scale-98 shadow-[0_0_25px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            <span>RESPAWN NOW (SPACE)</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
