import { describe, it, expect } from 'vitest';
import * as V from '../src/core/vec2.js';

describe('vec2', () => {
  it('adds, subtracts, scales', () => {
    expect(V.add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(V.sub({ x: 5, y: 5 }, { x: 1, y: 2 })).toEqual({ x: 4, y: 3 });
    expect(V.scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 });
  });

  it('computes length and distance', () => {
    expect(V.len({ x: 3, y: 4 })).toBe(5);
    expect(V.dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(V.dist2({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });

  it('normalizes (and handles zero safely)', () => {
    const n = V.normalize({ x: 0, y: 10 });
    expect(n.x).toBeCloseTo(0);
    expect(n.y).toBeCloseTo(1);
    expect(V.normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('clamps magnitude', () => {
    const c = V.clampLen({ x: 10, y: 0 }, 4);
    expect(V.len(c)).toBeCloseTo(4);
    // already short -> unchanged
    expect(V.clampLen({ x: 1, y: 0 }, 4)).toEqual({ x: 1, y: 0 });
  });

  it('fromAngle / angleOf round-trip', () => {
    const a = 0.7;
    expect(V.angleOf(V.fromAngle(a))).toBeCloseTo(a);
  });

  it('angleDiff returns shortest signed difference', () => {
    expect(V.angleDiff(0.1, -0.1)).toBeCloseTo(0.2);
    // wrap-around: just under +PI vs just over -PI should be small
    const d = V.angleDiff(Math.PI - 0.05, -Math.PI + 0.05);
    expect(Math.abs(d)).toBeLessThan(0.2);
  });

  it('rotateToward clamps the step and snaps when close', () => {
    expect(V.rotateToward(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(V.rotateToward(0, 0.1, 0.25)).toBeCloseTo(0.1); // within step -> snap
    expect(V.rotateToward(0, -1, 0.25)).toBeCloseTo(-0.25);
  });

  it('clamp helper', () => {
    expect(V.clamp(5, 0, 3)).toBe(3);
    expect(V.clamp(-5, 0, 3)).toBe(0);
    expect(V.clamp(2, 0, 3)).toBe(2);
  });
});
