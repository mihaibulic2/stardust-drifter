// Pure scoring: combo multiplier, kill value, bonuses, high-score & extra lives.
import { EXTRA_LIFE_EVERY } from './entities.js';

export const COMBO_CAP = 5;
export const COMBO_STEP = 5; // kills per +1 multiplier
export const NO_HIT_BONUS = 500;

// Multiplier from a running combo count: 1 + floor(count/5), capped at 5.
export function comboMultiplier(comboCount) {
  return Math.min(COMBO_CAP, 1 + Math.floor(comboCount / COMBO_STEP));
}

// Points awarded for a kill given the combo count BEFORE this kill is added.
export function scoreForKill(baseScore, comboCount) {
  return baseScore * comboMultiplier(comboCount);
}

// 1-based sector number -> wave clear bonus.
export function waveClearBonus(sectorNumber) {
  return 250 * sectorNumber;
}

export function isNewHighScore(score, previous) {
  return score > previous;
}

// How many extra-life thresholds have been crossed moving from oldScore->newScore.
// Returns the count of +1s to grant and the next threshold to watch.
export function extraLivesCrossed(oldScore, newScore, every = EXTRA_LIFE_EVERY) {
  const before = Math.floor(oldScore / every);
  const after = Math.floor(newScore / every);
  return Math.max(0, after - before);
}
