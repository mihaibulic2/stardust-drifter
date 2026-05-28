// Pure power-up definitions and application. Timed effects are tracked in
// state.effects as { kind, remaining }. Instant ones act immediately.
import { MAX_LIVES, ULTIMATE, BLASTER } from './entities.js';

export const POWERUPS = {
  rapid: { timed: true, duration: 8 },
  spread: { timed: false }, // permanent tier bump (capped)
  shield: { timed: true, duration: 6 },
  magnet: { timed: true, duration: 10 },
  overcharge: { timed: false },
  oneup: { timed: false },
};

export const POWERUP_KINDS = Object.keys(POWERUPS);

// Drop weighting: commons frequent, rares scarce, oneup very scarce.
const DROP_WEIGHTS = [
  ['rapid', 26],
  ['shield', 22],
  ['magnet', 20],
  ['spread', 14],
  ['overcharge', 14],
  ['oneup', 4],
];
const DROP_TOTAL = DROP_WEIGHTS.reduce((s, [, w]) => s + w, 0);

export function weightedDropKind(rng) {
  let r = rng.next() * DROP_TOTAL;
  for (const [kind, w] of DROP_WEIGHTS) {
    if (r < w) return kind;
    r -= w;
  }
  return DROP_WEIGHTS[0][0];
}

export function hasEffect(state, kind) {
  return state.effects.some((e) => e.kind === kind && e.remaining > 0);
}

export function effectRemaining(state, kind) {
  const e = state.effects.find((x) => x.kind === kind);
  return e ? e.remaining : 0;
}

// Apply a power-up to state (mutates). Returns the kind applied.
export function applyPowerup(state, kind) {
  const def = POWERUPS[kind];
  if (!def) return null;

  switch (kind) {
    case 'spread':
      state.spreadTier = Math.min(BLASTER.MAX_SPREAD_TIER, state.spreadTier + 1);
      break;
    case 'overcharge':
      state.ultimate = ULTIMATE.MAX;
      break;
    case 'oneup':
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
      break;
    default: {
      // timed effect: refresh or add
      const existing = state.effects.find((e) => e.kind === kind);
      if (existing) existing.remaining = def.duration;
      else state.effects.push({ kind, remaining: def.duration });
    }
  }
  return kind;
}

// Decrement timed effects (mutates), dropping expired ones.
export function tickEffects(state, dt) {
  for (const e of state.effects) e.remaining -= dt;
  state.effects = state.effects.filter((e) => e.remaining > 0);
}
