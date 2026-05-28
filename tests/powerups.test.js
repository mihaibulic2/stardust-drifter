import { describe, it, expect } from 'vitest';
import {
  applyPowerup,
  tickEffects,
  hasEffect,
  effectRemaining,
  weightedDropKind,
  POWERUP_KINDS,
} from '../src/core/powerups.js';
import { BLASTER, MAX_LIVES, ULTIMATE } from '../src/core/entities.js';
import { makeRng } from '../src/core/rng.js';

function baseState() {
  return { effects: [], spreadTier: 0, ultimate: 0, lives: 3 };
}

describe('powerups: application', () => {
  it('spread bumps the tier and caps it', () => {
    const s = baseState();
    applyPowerup(s, 'spread');
    expect(s.spreadTier).toBe(1);
    applyPowerup(s, 'spread');
    applyPowerup(s, 'spread');
    expect(s.spreadTier).toBe(BLASTER.MAX_SPREAD_TIER);
  });

  it('overcharge fills the ultimate meter instantly', () => {
    const s = baseState();
    applyPowerup(s, 'overcharge');
    expect(s.ultimate).toBe(ULTIMATE.MAX);
  });

  it('oneup adds a life and respects the cap', () => {
    const s = baseState();
    applyPowerup(s, 'oneup');
    expect(s.lives).toBe(4);
    s.lives = MAX_LIVES;
    applyPowerup(s, 'oneup');
    expect(s.lives).toBe(MAX_LIVES);
  });

  it('timed effects register and expire', () => {
    const s = baseState();
    applyPowerup(s, 'rapid');
    expect(hasEffect(s, 'rapid')).toBe(true);
    const dur = effectRemaining(s, 'rapid');
    expect(dur).toBeGreaterThan(0);
    tickEffects(s, dur + 0.01);
    expect(hasEffect(s, 'rapid')).toBe(false);
  });

  it('re-picking a timed effect refreshes its duration', () => {
    const s = baseState();
    applyPowerup(s, 'shield');
    tickEffects(s, 3);
    const mid = effectRemaining(s, 'shield');
    applyPowerup(s, 'shield');
    expect(effectRemaining(s, 'shield')).toBeGreaterThan(mid);
    // still only one shield effect tracked
    expect(s.effects.filter((e) => e.kind === 'shield')).toHaveLength(1);
  });
});

describe('powerups: drops', () => {
  it('always returns a valid kind', () => {
    const rng = makeRng(3);
    for (let i = 0; i < 500; i++) {
      expect(POWERUP_KINDS).toContain(weightedDropKind(rng));
    }
  });

  it('is deterministic per seed', () => {
    const a = makeRng(11);
    const b = makeRng(11);
    expect(weightedDropKind(a)).toBe(weightedDropKind(b));
  });
});
