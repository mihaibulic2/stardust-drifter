import { describe, it, expect } from 'vitest';
import {
  spreadAngles,
  effectiveFireRate,
  selectMissileTarget,
  chargeMeter,
  canFireUltimate,
  inUltimateArc,
} from '../src/core/weapons.js';
import { BLASTER, ULTIMATE } from '../src/core/entities.js';

describe('weapons: spread', () => {
  it('tier 0 fires a single bullet straight ahead', () => {
    const a = spreadAngles(0, 0);
    expect(a).toHaveLength(1);
    expect(a[0]).toBe(0);
  });

  it('tier 1 fires 3 symmetric bullets', () => {
    const a = spreadAngles(0, 1);
    expect(a).toHaveLength(3);
    expect(a[1]).toBe(0);
    expect(a[0]).toBeCloseTo(-a[2]); // symmetric
  });

  it('tier 2 fires 5 bullets', () => {
    expect(spreadAngles(0, 2)).toHaveLength(5);
  });

  it('caps tier at the configured max', () => {
    expect(spreadAngles(0, 99)).toHaveLength(5);
  });
});

describe('weapons: fire rate', () => {
  it('rapid fire multiplies the base rate', () => {
    expect(effectiveFireRate(false)).toBe(BLASTER.FIRE_RATE);
    expect(effectiveFireRate(true)).toBeCloseTo(BLASTER.FIRE_RATE * BLASTER.RAPID_MULT);
  });
});

describe('weapons: missile lock', () => {
  const ship = { x: 0, y: 0 };
  it('picks the nearest enemy inside the frontal cone', () => {
    const enemies = [
      { id: 1, x: 30, y: 0 }, // far, dead ahead (aim = 0 rad = +x)
      { id: 2, x: 10, y: 0 }, // near, dead ahead -> should win
      { id: 3, x: 0, y: 40 }, // off to the side (outside cone)
    ];
    const t = selectMissileTarget(ship, 0, enemies);
    expect(t.id).toBe(2);
  });

  it('returns null when nothing is in cone/range', () => {
    const enemies = [{ id: 9, x: 0, y: 50 }];
    expect(selectMissileTarget(ship, 0, enemies)).toBe(null);
  });

  it('ignores enemies beyond lock range', () => {
    const enemies = [{ id: 1, x: 999, y: 0 }];
    expect(selectMissileTarget(ship, 0, enemies)).toBe(null);
  });
});

describe('weapons: ultimate meter', () => {
  it('charges and clamps to MAX', () => {
    expect(chargeMeter(0, 10)).toBe(10);
    expect(chargeMeter(95, 20)).toBe(ULTIMATE.MAX);
    expect(chargeMeter(10, -50)).toBe(0);
  });

  it('only fireable at full', () => {
    expect(canFireUltimate(ULTIMATE.MAX - 1)).toBe(false);
    expect(canFireUltimate(ULTIMATE.MAX)).toBe(true);
  });

  it('arc test includes enemies ahead within range, excludes behind/far', () => {
    const ship = { x: 0, y: 0 };
    expect(inUltimateArc(ship, 0, { x: 10, y: 0 })).toBe(true); // ahead
    expect(inUltimateArc(ship, 0, { x: -10, y: 0 })).toBe(false); // behind
    expect(inUltimateArc(ship, 0, { x: ULTIMATE.RANGE + 5, y: 0 })).toBe(false); // too far
  });
});
