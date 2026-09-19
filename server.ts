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

const state: GameState = {
  players: {},
  orbs: {},
  leaderboard: [],
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

// Initial orbs
for (let i = 0; i < 150; i++) {
  spawnOrb();
}

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

  socket.on('update_state', (data: { segments: any[]; score: number; currentAngle: number; isBoosting: boolean; state: string }) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = data.currentAngle;
      player.isBoosting = data.isBoosting;
      
      if (data.state === 'dead') {
        player.state = 'dead';
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
      }
    }
  });

  socket.on('collect_orb', (orbId: string) => {
    const orb = state.orbs[orbId];
    if (orb) {
      delete state.orbs[orbId];
      const player = state.players[socket.id];
      if (player && player.state === 'alive') {
        player.orbsCollected = (player.orbsCollected || 0) + (orb.value || 1);
        upsertScore.run({
          id: player.id,
          name: player.name,
          orbs_collected: player.orbsCollected,
          score: Math.floor(player.score),
          head_color: player.headColor,
          tail_color: player.tailColor,
        });
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
