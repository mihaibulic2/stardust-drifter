import { describe, it, expect } from 'vitest';
import {
  comboMultiplier,
  scoreForKill,
  waveClearBonus,
  isNewHighScore,
  extraLivesCrossed,
  COMBO_CAP,
} from '../src/core/scoring.js';

describe('scoring: combo multiplier', () => {
  it('starts at x1 and ramps every 5 kills', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(10)).toBe(3);
  });

  it('caps at the configured maximum', () => {
    expect(comboMultiplier(1000)).toBe(COMBO_CAP);
  });
});

describe('scoring: kill value', () => {
  it('multiplies base score by the current combo multiplier', () => {
    expect(scoreForKill(100, 0)).toBe(100); // x1
    expect(scoreForKill(100, 5)).toBe(200); // x2
    expect(scoreForKill(100, 25)).toBe(500); // x6 requested -> capped at x5 -> 500
  });
});

describe('scoring: bonuses', () => {
  it('wave clear bonus scales with sector number', () => {
    expect(waveClearBonus(1)).toBe(250);
    expect(waveClearBonus(3)).toBe(750);
  });
});

describe('scoring: high score', () => {
  it('detects strictly greater scores', () => {
    expect(isNewHighScore(100, 90)).toBe(true);
    expect(isNewHighScore(90, 90)).toBe(false);
    expect(isNewHighScore(80, 90)).toBe(false);
  });
});

describe('scoring: extra lives', () => {
  it('counts thresholds crossed between two scores', () => {
    expect(extraLivesCrossed(0, 4999)).toBe(0);
    expect(extraLivesCrossed(0, 5000)).toBe(1);
    expect(extraLivesCrossed(4999, 10001)).toBe(2);
    expect(extraLivesCrossed(5000, 5001)).toBe(0);
  });
});
