/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import {
  GameState,
  Player,
  Orb,
  PowerUp,
  PowerUpType,
  STATIC_OBSTACLES,
  POWERUP_DURATION,
  POWERUP_DESPAWN_TIME,
  MAX_ACTIVE_POWERUPS,
  WORLD_SIZE,
  BASE_SPEED,
  BOOST_SPEED,
  TICK_RATE,
  MAX_ORBS,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  TURN_SPEED,
} from './src/shared/types.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

// SQLite Persistent Leaderboard
const db = new Database('./leaderboard.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    orbs_collected INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    head_color TEXT NOT NULL,
    tail_color TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default competitive leaderboard entries if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM leaderboard');
const rowCount = (countStmt.get() as { count: number }).count;
if (rowCount === 0) {
  const insertSeed = db.prepare(`
    INSERT INTO leaderboard (id, name, orbs_collected, score, head_color, tail_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const starters = [
    { id: 'bot-1', name: 'CyberViper', orbs: 45, score: 55, head: '#ff7eb3', tail: '#bd93f9' },
    { id: 'bot-2', name: 'NeonSerpent', orbs: 34, score: 44, head: '#50fa7b', tail: '#8be9fd' },
    { id: 'bot-3', name: 'QuantumWorm', orbs: 26, score: 36, head: '#8be9fd', tail: '#ff7eb3' },
    { id: 'bot-4', name: 'SolarPython', orbs: 18, score: 28, head: '#ffb86c', tail: '#f1fa8c' },
    { id: 'bot-5', name: 'GlitchCobra', orbs: 12, score: 22, head: '#f1fa8c', tail: '#50fa7b' },
  ];
  for (const s of starters) {
    insertSeed.run(s.id, s.name, s.orbs, s.score, s.head, s.tail);
  }
}

const upsertScore = db.prepare(`
  INSERT INTO leaderboard (id, name, orbs_collected, score, head_color, tail_color, updated_at)
  VALUES (@id, @name, @orbs_collected, @score, @head_color, @tail_color, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    orbs_collected = MAX(leaderboard.orbs_collected, excluded.orbs_collected),
    score = MAX(leaderboard.score, excluded.score),
    head_color = excluded.head_color,
    tail_color = excluded.tail_color,
    updated_at = CURRENT_TIMESTAMP
`);

const getTop5Query = db.prepare(`
  SELECT id, name, orbs_collected as orbsCollected, score, head_color as headColor, tail_color as tailColor
  FROM leaderboard
  ORDER BY orbs_collected DESC
  LIMIT 5
`);

const COLORS = [
  '#ff7eb3', // vibrant pink
  '#ffb86c', // vibrant orange
  '#f1fa8c', // vibrant yellow
  '#50fa7b', // vibrant green
  '#8be9fd', // vibrant blue
  '#bd93f9', // vibrant purple
];

const totalOrbsStmt = db.prepare('SELECT COALESCE(SUM(orbs_collected), 0) as total FROM leaderboard');
const dbTotalOrbs = (totalOrbsStmt.get() as { total: number })?.total || 0;

const state: GameState = {
  players: {},
  orbs: {},
  powerUps: {},
  leaderboard: [],
  totalOrbsCollected: Math.max(120, dbTotalOrbs),
};

function spawnOrb(x?: number, y?: number, value = 1, color?: string, force = false) {
  if (!force && Object.keys(state.orbs).length >= MAX_ORBS) return;
  const id = uuidv4();
  state.orbs[id] = {
    id,
    x: x ?? (Math.random() - 0.5) * WORLD_SIZE,
    y: y ?? (Math.random() - 0.5) * WORLD_SIZE,
    value,
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

function spawnPowerUp(forcedType?: PowerUpType, forcedX?: number, forcedY?: number) {
  if (Object.keys(state.powerUps).length >= MAX_ACTIVE_POWERUPS) return;
  const id = uuidv4();
  const type: PowerUpType = forcedType ?? (Math.random() < 0.5 ? 'invincibility' : 'ghost');

  let x = forcedX ?? (Math.random() - 0.5) * (WORLD_SIZE - 30);
  let y = forcedY ?? (Math.random() - 0.5) * (WORLD_SIZE - 30);

  // Avoid spawning directly inside an obstacle
  let safe = true;
  for (const obs of STATIC_OBSTACLES) {
    if (Math.abs(x - obs.x) < obs.width / 2 + 3.0 && Math.abs(y - obs.y) < obs.height / 2 + 3.0) {
      safe = false;
      break;
    }
  }
  if (!safe && forcedX === undefined) {
    x = x > 0 ? x - 15 : x + 15;
    y = y > 0 ? y - 15 : y + 15;
  }

  const now = Date.now();
  state.powerUps[id] = {
    id,
    type,
    x,
    y,
    duration: POWERUP_DURATION,
    spawnedAt: now,
    expiresAt: now + POWERUP_DESPAWN_TIME,
  };
}

// Initial orbs
for (let i = 0; i < 150; i++) {
  spawnOrb();
}

// Initial powerups
spawnPowerUp('invincibility', -25, 25);
spawnPowerUp('ghost', 25, -25);

let snakeCounter = 1;

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', (customData?: { name?: string; headColor?: string; tailColor?: string }) => {
    const rawName = customData?.name?.trim();
    const name = rawName && rawName.length > 0 ? rawName.slice(0, 16) : `Snake-${snakeCounter++}`;
    const headColor = customData?.headColor || COLORS[Math.floor(Math.random() * COLORS.length)];
    const tailColor = customData?.tailColor || COLORS[Math.floor(Math.random() * COLORS.length)];

    const startX = (Math.random() - 0.5) * (WORLD_SIZE - 20);
    const startY = (Math.random() - 0.5) * (WORLD_SIZE - 20);
    const angle = Math.random() * Math.PI * 2;

    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
        y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
      });
    }

    state.players[socket.id] = {
      id: socket.id,
      name,
      color: headColor,
      headColor,
      tailColor,
      segments,
      score: INITIAL_LENGTH,
      orbsCollected: 0,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
    };

    // Record player into persistent database
    upsertScore.run({
      id: socket.id,
      name,
      orbs_collected: 0,
      score: INITIAL_LENGTH,
      head_color: headColor,
      tail_color: tailColor,
    });

    socket.emit('init', socket.id);
  });

  socket.on('update_customization', (custom: { name?: string; headColor?: string; tailColor?: string }) => {
    const player = state.players[socket.id];
    if (player) {
      if (custom.name && custom.name.trim()) {
        player.name = custom.name.trim().slice(0, 16);
      }
      if (custom.headColor) {
        player.headColor = custom.headColor;
        player.color = custom.headColor;
      }
      if (custom.tailColor) {
        player.tailColor = custom.tailColor;
      }
      upsertScore.run({
        id: player.id,
        name: player.name,
        orbs_collected: player.orbsCollected || 0,
        score: Math.floor(player.score),
        head_color: player.headColor,
        tail_color: player.tailColor,
      });
    }
  });

  socket.on('update_state', (data: {
    segments: any[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    state: string;
    activePowerUp?: { type: PowerUpType; timeLeft: number } | null;
    cause?: { killerId?: string; obstacleId?: string };
  }) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = data.currentAngle;
      player.isBoosting = data.isBoosting;
      if (data.activePowerUp !== undefined) {
        player.activePowerUp = data.activePowerUp;
      }
      
      if (data.state === 'dead') {
        player.state = 'dead';
        player.activePowerUp = null;

        // Persist final score upon death
        upsertScore.run({
          id: player.id,
          name: player.name,
          orbs_collected: player.orbsCollected || 0,
          score: Math.floor(player.score),
          head_color: player.headColor,
          tail_color: player.tailColor,
        });

        // Drop orbs along body
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) {
            spawnOrb(seg.x, seg.y, 1, i % 4 === 0 ? player.headColor : player.tailColor, true);
          }
        });

        let killerName: string | undefined = undefined;
        let killerColor: string | undefined = undefined;
        let obstacleName: string | undefined = undefined;

        // Emit death / kill notification
        if (data.cause?.killerId && state.players[data.cause.killerId]) {
          const killer = state.players[data.cause.killerId];
          killerName = killer.name;
          killerColor = killer.headColor || '#ff7eb3';
          io.emit('game_notification', {
            id: uuidv4(),
            type: 'kill',
            title: 'ELIMINATION',
            message: `${killer.name} eliminated ${player.name}!`,
            color: killerColor,
            timestamp: Date.now(),
          });
        } else if (data.cause?.obstacleId) {
          obstacleName = 'Neon Barrier Wall';
          io.emit('game_notification', {
            id: uuidv4(),
            type: 'crash',
            title: 'BARRIER CRASH',
            message: `${player.name} collided with a neon wall obstacle!`,
            color: '#ff5555',
            timestamp: Date.now(),
          });
        }

        // Send detailed game-over summary to the player
        socket.emit('game_over_summary', {
          orbsCollected: player.orbsCollected || 0,
          finalScore: Math.floor(player.score),
          killerName,
          killerColor,
          obstacleName,
          timestamp: Date.now(),
        });
      }
    }
  });

  socket.on('collect_orb', (orbId: string) => {
    const orb = state.orbs[orbId];
    if (orb) {
      delete state.orbs[orbId];
      state.totalOrbsCollected = (state.totalOrbsCollected || 0) + (orb.value || 1);
      const player = state.players[socket.id];
      if (player && player.state === 'alive') {
        const prevOrbs = player.orbsCollected || 0;
        player.orbsCollected = prevOrbs + (orb.value || 1);
        upsertScore.run({
          id: player.id,
          name: player.name,
          orbs_collected: player.orbsCollected,
          score: Math.floor(player.score),
          head_color: player.headColor,
          tail_color: player.tailColor,
        });

        // Check milestones
        const milestones = [10, 25, 50, 100, 150, 200];
        for (const m of milestones) {
          if (prevOrbs < m && player.orbsCollected >= m) {
            io.emit('game_notification', {
              id: uuidv4(),
              type: 'milestone',
              title: 'ORB MILESTONE',
              message: `${player.name} collected ${m} orbs!`,
              color: '#00f5d4',
              timestamp: Date.now(),
            });
            break;
          }
        }
      }
      // Broadcast orb collection event for sound and particle feedback across clients
      io.emit('orb_collected', {
        id: orbId,
        x: orb.x,
        y: orb.y,
        color: orb.color,
        collectorId: socket.id,
      });
    }
  });

  socket.on('collect_power_up', (powerUpId: string) => {
    const pu = state.powerUps[powerUpId];
    if (pu) {
      delete state.powerUps[powerUpId];
      const player = state.players[socket.id];
      if (player && player.state === 'alive') {
        player.activePowerUp = {
          type: pu.type,
          timeLeft: pu.duration,
        };

        io.emit('power_up_collected', {
          id: powerUpId,
          type: pu.type,
          x: pu.x,
          y: pu.y,
          collectorId: socket.id,
          collectorName: player.name,
        });

        io.emit('game_notification', {
          id: uuidv4(),
          type: 'milestone',
          title: pu.type === 'invincibility' ? 'INVINCIBILITY SHIELD' : 'GHOST MODE',
          message:
            pu.type === 'invincibility'
              ? `${player.name} activated Golden Invincibility!`
              : `${player.name} activated Ghost Mode (pass through walls)!`,
          color: pu.type === 'invincibility' ? '#ffd700' : '#bd93f9',
          timestamp: Date.now(),
        });
      }
    }
  });

  socket.on('send_emote', (emoji: string) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      const cleanEmoji = typeof emoji === 'string' ? emoji.slice(0, 8) : '🔥';
      const timestamp = Date.now();
      player.activeEmote = { emoji: cleanEmoji, timestamp };
      io.emit('player_emote', {
        playerId: socket.id,
        emoji: cleanEmoji,
        timestamp,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const player = state.players[socket.id];
    if (player) {
      upsertScore.run({
        id: player.id,
        name: player.name,
        orbs_collected: player.orbsCollected || 0,
        score: Math.floor(player.score),
        head_color: player.headColor,
        tail_color: player.tailColor,
      });
      if (player.state === 'alive') {
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) {
            spawnOrb(seg.x, seg.y, 1, i % 4 === 0 ? player.headColor : player.tailColor, true);
          }
        });
      }
      delete state.players[socket.id];
    }
  });
});

// Game Loop
setInterval(() => {
  // Update players (for boosting orb drops)
  for (const id in state.players) {
    const player = state.players[id];
    if (player.state === 'alive' && player.isBoosting) {
      if (Math.random() < 0.1 && player.segments.length > 0) {
        const tail = player.segments[player.segments.length - 1];
        spawnOrb(tail.x, tail.y, 1, player.tailColor || player.color, true);
      }
    }
  }

  // Spawn random orbs
  if (Math.random() < 0.2) {
    spawnOrb();
  }

  // Manage power-ups: cleanup expired and periodically spawn new ones
  const nowLoop = Date.now();
  for (const pid in state.powerUps) {
    if (nowLoop > state.powerUps[pid].expiresAt) {
      delete state.powerUps[pid];
    }
  }
  if (Object.keys(state.powerUps).length < MAX_ACTIVE_POWERUPS && Math.random() < 0.03) {
    spawnPowerUp();
  }

  // Update persistent top 5 leaderboard based on collected orb count
  const top5 = getTop5Query.all() as {
    id: string;
    name: string;
    orbsCollected: number;
    score: number;
    headColor: string;
    tailColor: string;
  }[];

  state.leaderboard = top5.map((p) => {
    const livePlayer = state.players[p.id];
    return {
      id: p.id,
      name: livePlayer ? livePlayer.name : p.name,
      orbsCollected: livePlayer ? Math.max(livePlayer.orbsCollected || 0, p.orbsCollected) : p.orbsCollected,
      score: livePlayer ? Math.floor(livePlayer.score) : p.score,
      headColor: livePlayer?.headColor || p.headColor || '#ff7eb3',
      tailColor: livePlayer?.tailColor || p.tailColor || '#bd93f9',
      color: livePlayer?.headColor || p.headColor || '#ff7eb3',
      isAlive: livePlayer?.state === 'alive',
    };
  });

  // Broadcast state
  io.emit('state', state);

}, 1000 / TICK_RATE);

async function startServer() {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // REST endpoint for leaderboard if queried directly
  app.get('/api/leaderboard', (req, res) => {
    const top5 = getTop5Query.all();
    res.json({ top5 });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
