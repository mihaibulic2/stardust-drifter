// Wave scheduling + spawn positioning. Pure: given a wave def, produce a sorted
// list of timed spawn instructions; given a pattern, produce a spawn position.
import { FIELD, ENEMY_TYPES } from './entities.js';

// Flatten a wave's entries into [{ at, type, pattern, idx, total }] sorted by time.
export function buildWaveSchedule(wave) {
  const out = [];
  for (const entry of wave.entries) {
    const delay = entry.delay ?? 0;
    const interval = entry.interval ?? 0.6;
    const pattern = entry.pattern ?? 'top';
    for (let i = 0; i < entry.count; i++) {
      out.push({ at: delay + i * interval, type: entry.type, pattern, idx: i, total: entry.count });
    }
  }
  out.sort((a, b) => a.at - b.at);
  return out;
}

// Total enemies a wave will emit.
export function waveSpawnCount(wave) {
  return wave.entries.reduce((s, e) => s + e.count, 0);
}

// Spawn position + initial velocity by pattern. Enemies generally enter from the
// far edge (-y) and drift inward. rng makes random patterns deterministic per seed.
export function spawnPosition(pattern, idx, total, rng) {
  const w = FIELD.maxX - FIELD.minX;
  switch (pattern) {
    case 'top': {
      // evenly spaced across the top, entering downward
      const t = total > 1 ? idx / (total - 1) : 0.5;
      const x = FIELD.minX + 6 + t * (w - 12);
      return { x, y: FIELD.minY - 2, vx: 0, vy: 6 };
    }
    case 'sides': {
      const left = idx % 2 === 0;
      const y = FIELD.minY + 6 + rng.range(0, 18);
      return left
        ? { x: FIELD.minX - 2, y, vx: 8, vy: 0 }
        : { x: FIELD.maxX + 2, y, vx: -8, vy: 0 };
    }
    case 'ring': {
      // around a point near top-center, used for elite/boss escorts
      const a = (idx / Math.max(1, total)) * Math.PI * 2;
      const cx = 0;
      const cy = FIELD.minY + 8;
      const r = 10;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0 };
    }
    case 'boss': {
      return { x: 0, y: FIELD.minY - 4, vx: 0, vy: 4 };
    }
    case 'random':
    default: {
      const x = rng.range(FIELD.minX + 5, FIELD.maxX - 5);
      return { x, y: FIELD.minY - rng.range(2, 10), vx: rng.range(-3, 3), vy: rng.range(4, 8) };
    }
  }
}

// Sanity guard used by tests: every entry type must be a real archetype.
export function validateWave(wave) {
  for (const e of wave.entries) {
    if (!ENEMY_TYPES[e.type]) throw new Error(`wave references unknown type: ${e.type}`);
    if (!(e.count > 0)) throw new Error(`wave entry needs positive count`);
  }
  return true;
}
