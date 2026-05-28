import { describe, it, expect } from 'vitest';
import { overlap, hit } from '../src/core/collision.js';

describe('collision', () => {
  it('detects overlapping circles', () => {
    expect(overlap(0, 0, 1, 1, 0, 1)).toBe(true); // centers 1 apart, radii sum 2
  });

  it('rejects separated circles', () => {
    expect(overlap(0, 0, 1, 5, 0, 1)).toBe(false);
  });

  it('treats exact boundary contact as a hit', () => {
    // distance 2, radii sum 2 -> touching
    expect(overlap(0, 0, 1, 2, 0, 1)).toBe(true);
    // distance just over -> miss
    expect(overlap(0, 0, 1, 2.0001, 0, 1)).toBe(false);
  });

  it('hit() works on entity objects', () => {
    const a = { x: 0, y: 0, radius: 2 };
    const b = { x: 3, y: 0, radius: 2 };
    const c = { x: 10, y: 0, radius: 1 };
    expect(hit(a, b)).toBe(true);
    expect(hit(a, c)).toBe(false);
  });
});
