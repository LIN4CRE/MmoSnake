/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Trophy,
  Palette,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Flame,
  Swords,
  AlertTriangle,
  Bell,
  Gauge,
  ShieldAlert,
  Settings,
  Shield,
  Ghost,
  Globe,
} from 'lucide-react';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { SettingsOverlay } from './SettingsOverlay';
import { GameOverSummaryOverlay } from './GameOverSummaryOverlay';
import { EmoteMenu } from './EmoteMenu';
import { BOOST_DURATION, BOOST_COOLDOWN, POWER_UP_DURATION } from '../shared/types';
import { getWorldColors } from './AnimatedGrid';

export function UI() {
  const {
    gameState,
    playerId,
    joinGame,
    customization,
    setCustomization,
    isMuted,
    toggleMute,
    isColorPickerOpen,
    setColorPickerOpen,
    isSettingsOpen,
    setSettingsOpen,
    notifications,
    boostState,
    activePowerUp,
  } = useGameStore();

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleSaveCustomization = (headColor: string, tailColor: string, name: string) => {
    setCustomization({ headColor, tailColor, name });
  };

  const top5 = gameState?.leaderboard?.slice(0, 5) || [];
  const isUserInTop5 = top5.some((e) => e.id === playerId);

  const totalOrbsCollected = gameState?.totalOrbsCollected || 0;
  const { currentName, phaseNumber } = getWorldColors(totalOrbsCollected);

  // Calculate boost gauge percentages
  const activePercent = boostState.isActive
    ? Math.max(0, Math.min(100, (boostState.timeLeft / BOOST_DURATION) * 100))
    : 0;

  const cooldownPercent = boostState.cooldownLeft > 0
    ? Math.max(0, Math.min(100, ((BOOST_COOLDOWN - boostState.cooldownLeft) / BOOST_COOLDOWN) * 100))
    : 100;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20 overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto relative">
        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl sm:text-3xl font-black text-white tracking-tighter"
              style={{ textShadow: '0 0 16px rgba(255,255,255,0.45)' }}
            >
              NEON<span className="text-pink-400">.</span>SNAKE
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white/80 border border-white/10">
              MMO ARENA
            </span>
          </div>

          {/* Dynamic World Atmosphere Status Tag */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-black/40 backdrop-blur-md border border-white/10 text-white/75">
              <Globe size={11} className="text-cyan-400" />
              <span>World Tier {phaseNumber}:</span>
              <strong className="text-white">{currentName}</strong>
              <span className="text-white/40">•</span>
              <span className="text-yellow-300 font-bold">{totalOrbsCollected} Orbs</span>
            </div>
          </div>

          {isAlive && (
            <div className="flex items-center gap-2.5 mt-0.5">
              <div className="flex items-center gap-1.5 text-sm font-mono text-white/90 font-bold bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10">
                <Flame size={14} className="text-orange-400" />
                <span>Length:</span>
                <span className="text-white">{Math.floor(player.score)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-mono text-emerald-300 font-bold bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-emerald-500/30">
                <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                <span>Orbs:</span>
                <span className="text-white">{player.orbsCollected || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls Hint */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex gap-2 opacity-80 pointer-events-none hidden lg:flex">
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">A</span>
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">D</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Turn</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">SPACE</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Speed Boost</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">E</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Emotes</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 z-10">
          {/* Customise Color Picker Trigger */}
          <button
            onClick={() => setColorPickerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/15 transition-transform hover:scale-105 active:scale-95 shadow-lg"
            title="Customize Snake Colors"
          >
            <Palette size={15} className="text-pink-400" />
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full border border-white/30 shadow-xs"
                style={{ backgroundColor: customization.headColor }}
              />
              <span
                className="w-3 h-3 rounded-full border border-white/30 shadow-xs -ml-1.5"
                style={{ backgroundColor: customization.tailColor }}
              />
            </div>
            <span className="hidden sm:inline">Customize</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/15 transition-colors shadow-lg"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>

          {/* Settings Overlay Button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/15 transition-transform hover:scale-105 active:scale-95 shadow-lg"
            title="Audio & View Settings"
          >
            <Settings size={16} className="text-cyan-400" />
          </button>

          {/* New Tab */}
          <button
            onClick={handleOpenNewTab}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold transition-colors shadow-lg"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">New Tab</span>
          </button>
        </div>
      </div>

      {/* In-Game Notification System Feed */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-30 max-w-md w-full px-4">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-xl border shadow-2xl text-xs font-mono font-medium max-w-full ${
                notif.type === 'kill'
                  ? 'bg-red-950/80 border-red-500/40 text-red-200'
                  : notif.type === 'milestone'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : notif.type === 'crash'
                  ? 'bg-orange-950/80 border-orange-500/40 text-orange-200'
                  : 'bg-zinc-900/85 border-white/20 text-white'
              }`}
            >
              <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
                {notif.type === 'kill' && <Swords size={16} className="text-red-400" />}
                {notif.type === 'milestone' && <Trophy size={16} className="text-yellow-400" />}
                {notif.type === 'crash' && <AlertTriangle size={16} className="text-orange-400" />}
                {notif.type === 'system' && <Bell size={16} className="text-cyan-400" />}
              </div>

              <div className="flex flex-col truncate">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                  {notif.title}
                </span>
                <span className="text-xs font-bold text-white tracking-tight truncate">
                  {notif.message}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Persistent In-Game Leaderboard Overlay (Top 5 Orb Count) */}
      {gameState && top5.length > 0 && (
        <div className="absolute top-24 right-4 w-72 bg-black/65 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-2xl pointer-events-auto transition-all">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400 fill-yellow-400/20" />
              <h2 className="text-xs font-black tracking-wider uppercase text-white/90">TOP 5 ORB MASTERS</h2>
            </div>
            <span className="text-[10px] font-mono text-yellow-400/90 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
              ORBS
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {top5.map((entry, i) => {
              const isMe = entry.id === playerId;
              const rankMedals = ['🥇', '🥈', '🥉'];
              const rankBadgeClass =
                i === 0
                  ? 'text-amber-300 font-bold bg-amber-500/10 border-amber-500/30'
                  : i === 1
                  ? 'text-slate-300 font-bold bg-slate-400/10 border-slate-400/30'
                  : i === 2
                  ? 'text-orange-300 font-bold bg-orange-600/10 border-orange-600/30'
                  : 'text-white/60 bg-white/5 border-white/10';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                    isMe
                      ? 'bg-white/15 border border-white/30 shadow-md scale-[1.02]'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate max-w-[170px]">
                    {/* Rank Indicator */}
                    <div
                      className={`w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-mono border shrink-0 ${rankBadgeClass}`}
                    >
                      {rankMedals[i] || i + 1}
                    </div>

                    {/* Dual-color avatar */}
                    <div className="relative flex items-center shrink-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: entry.headColor || entry.color }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-white/40 shadow-xs -ml-1.5"
                        style={{ backgroundColor: entry.tailColor || entry.color }}
                      />
                      {entry.isAlive && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-black animate-pulse" />
                      )}
                    </div>

                    {/* Name */}
                    <div className="truncate flex items-center gap-1">
                      <span
                        className="font-bold truncate"
                        style={{ color: entry.headColor || entry.color }}
                      >
                        {entry.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-mono uppercase bg-white text-black font-black px-1 rounded-sm">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Orbs count */}
                  <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-yellow-300 bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/15">
                    <Zap size={11} className="fill-yellow-400" />
                    <span>{entry.orbsCollected || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Player stats reminder if alive but not in top 5 */}
          {isAlive && !isUserInTop5 && (
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/70">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Your Orbs:
              </span>
              <strong className="text-yellow-300 flex items-center gap-1 font-bold">
                <Zap size={11} className="fill-yellow-400" />
                {player.orbsCollected || 0} orbs
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Bottom HUD: Active Power-Ups, Speed Boost Gauge & Emote Menu */}
      <div className="pointer-events-auto flex flex-col items-center gap-3 mb-2 z-20">
        {/* Active Power-Up Banner */}
        <AnimatePresence>
          {isAlive && activePowerUp && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-xl border shadow-2xl min-w-[260px] ${
                activePowerUp.type === 'invincibility'
                  ? 'bg-amber-950/80 border-amber-400/80 shadow-[0_0_25px_rgba(255,215,0,0.4)]'
                  : 'bg-purple-950/80 border-purple-400/80 shadow-[0_0_25px_rgba(192,132,252,0.4)]'
              }`}
            >
              <div
                className={`p-2 rounded-xl text-white ${
                  activePowerUp.type === 'invincibility'
                    ? 'bg-amber-500/20 text-yellow-300'
                    : 'bg-purple-500/20 text-purple-300'
                }`}
              >
                {activePowerUp.type === 'invincibility' ? <Shield size={18} /> : <Ghost size={18} />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between text-xs font-mono font-black">
                  <span
                    className={
                      activePowerUp.type === 'invincibility' ? 'text-yellow-300' : 'text-purple-300'
                    }
                  >
                    {activePowerUp.type === 'invincibility' ? 'INVINCIBILITY SHIELD' : 'GHOST MODE (WALL PASS)'}
                  </span>
                  <span className="text-white font-mono">{activePowerUp.timeLeft.toFixed(1)}s</span>
                </div>

                <div className="w-full h-1.5 bg-black/60 rounded-full mt-1.5 overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      activePowerUp.type === 'invincibility'
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-300 shadow-[0_0_8px_#ffd700]'
                        : 'bg-gradient-to-r from-purple-400 to-fuchsia-300 shadow-[0_0_8px_#c084fc]'
                    }`}
                    style={{ width: `${Math.min(100, (activePowerUp.timeLeft / POWER_UP_DURATION) * 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Temporary Speed Boost Gauge & Emote Controller row */}
        {isAlive && (
          <div className="flex items-center gap-3">
            {/* Emote Button & Menu */}
            <EmoteMenu />

            {/* Speed Boost Widget */}
            <div
              className={`flex flex-col gap-1.5 px-4 py-2.5 rounded-2xl backdrop-blur-xl border transition-all duration-300 shadow-2xl min-w-[240px] ${
                boostState.isActive
                  ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_25px_rgba(0,245,212,0.4)] scale-105'
                  : boostState.cooldownLeft > 0
                  ? 'bg-zinc-950/80 border-white/10 opacity-90'
                  : 'bg-black/60 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,245,212,0.2)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5">
                  <Gauge
                    size={15}
                    className={
                      boostState.isActive
                        ? 'text-cyan-300 animate-spin'
                        : boostState.cooldownLeft > 0
                        ? 'text-white/40'
                        : 'text-cyan-400'
                    }
                  />
                  <span className="uppercase tracking-wider">
                    {boostState.isActive
                      ? 'BOOST ACTIVE'
                      : boostState.cooldownLeft > 0
                      ? 'RECHARGING'
                      : 'BOOST READY'}
                  </span>
                </div>

                <span className="text-[11px]">
                  {boostState.isActive ? (
                    <strong className="text-cyan-300">{boostState.timeLeft.toFixed(1)}s</strong>
                  ) : boostState.cooldownLeft > 0 ? (
                    <span className="text-white/50">{boostState.cooldownLeft.toFixed(1)}s</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md bg-cyan-400/20 text-cyan-300 text-[10px] border border-cyan-400/30">
                      SPACE
                    </span>
                  )}
                </span>
              </div>

              {/* Gauge Progress Bar */}
              <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 relative">
                {boostState.isActive ? (
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-white transition-all duration-75 rounded-full shadow-[0_0_8px_#00f5d4]"
                    style={{ width: `${activePercent}%` }}
                  />
                ) : (
                  <div
                    className={`h-full transition-all duration-100 rounded-full ${
                      boostState.cooldownLeft > 0
                        ? 'bg-white/30'
                        : 'bg-cyan-400 shadow-[0_0_6px_#00f5d4]'
                    }`}
                    style={{ width: `${cooldownPercent}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menus (Join / Respawn fallback if no summary overlay) */}
      <AnimatePresence>
        {!player && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/65 backdrop-blur-md"
          >
            <div className="bg-zinc-900/95 p-8 rounded-3xl border border-white/15 shadow-2xl max-w-md w-full flex flex-col items-center gap-6 relative overflow-hidden">
              {/* Subtle ambient lighting */}
              <div
                className="absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: customization.headColor }}
              />
              <div
                className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: customization.tailColor }}
              />

              <div className="text-center relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-white/90 text-xs font-mono font-bold uppercase mb-2">
                  <Sparkles size={13} className="text-pink-400" />
                  Multiplayer Grid
                </div>
                <h2 className="text-3xl font-black text-white mb-1.5 tracking-tight">JOIN ARENA</h2>
                <p className="text-white/60 text-xs max-w-xs mx-auto mb-2">
                  Collect orbs to grow, hunt random Power-Ups (Invincibility & Ghost Mode), and communicate with player emotes.
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
                  <ShieldAlert size={14} className="text-cyan-400 shrink-0" />
                  <span>Beware static obstacles & walls!</span>
                </div>
              </div>

              {/* Snake Preview & Customization Selector Card */}
              <div className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 relative z-10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60">Pilot: <strong className="text-white font-bold">{customization.name}</strong></span>
                  <button
                    onClick={() => setColorPickerOpen(true)}
                    className="flex items-center gap-1.5 text-pink-400 hover:text-pink-300 font-bold transition-colors"
                  >
                    <Palette size={14} />
                    <span>Customize</span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <div
                        className="w-7 h-7 rounded-full shadow-md relative flex items-center justify-center border border-white/40"
                        style={{ backgroundColor: customization.headColor, boxShadow: `0 0 10px ${customization.headColor}88` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white ml-1 -mt-1" />
                      </div>
                      <div
                        className="w-5 h-5 rounded-full shadow-xs -ml-1 border border-white/30"
                        style={{ backgroundColor: customization.tailColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full shadow-xs -ml-1 opacity-70 border border-white/20"
                        style={{ backgroundColor: customization.tailColor }}
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-mono text-white/50 uppercase">Snake Schema</span>
                      <span className="text-xs font-bold text-white/90">
                        {customization.headColor} / {customization.tailColor}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setColorPickerOpen(true)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={joinGame}
                className="w-full py-4 bg-white text-black font-black text-base rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-xl relative z-10 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                <span>ENTER ARENA</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brief Game Over UI Notification Overlay with Collision & Orb Stats */}
      <GameOverSummaryOverlay />

      {/* Custom Color Picker Overlay Modal */}
      <ColorPickerOverlay
        isOpen={isColorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        headColor={customization.headColor}
        tailColor={customization.tailColor}
        playerName={customization.name}
        onSave={handleSaveCustomization}
      />

      {/* Settings Overlay for Volume & Camera Zoom */}
      <SettingsOverlay />
    </div>
  );
}



