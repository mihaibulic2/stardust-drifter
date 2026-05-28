// Pure weapon math: spread angles, effective fire rate, missile lock selection,
// ultimate meter. No state mutation — gameState consumes these to build entities.
import { BLASTER, MISSILE, ULTIMATE } from './entities.js';
import { angleDiff } from './vec2.js';

// Bullet angles for a given spread tier, centered on `baseAngle`.
// tier 0 -> 1 bullet, tier 1 -> 3-way, tier 2 -> 5-way.
export function spreadAngles(baseAngle, tier) {
  const t = Math.max(0, Math.min(BLASTER.MAX_SPREAD_TIER, tier | 0));
  const gap = (BLASTER.SPREAD_DEG * Math.PI) / 180;
  if (t === 0) return [baseAngle];
  if (t === 1) return [baseAngle - gap, baseAngle, baseAngle + gap];
  return [baseAngle - 2 * gap, baseAngle - gap, baseAngle, baseAngle + gap, baseAngle + 2 * gap];
}

export function effectiveFireRate(hasRapid) {
  return BLASTER.FIRE_RATE * (hasRapid ? BLASTER.RAPID_MULT : 1);
}

// Choose the nearest enemy within the frontal aim cone & range. Returns enemy or null.
export function selectMissileTarget(ship, aimAngle, enemies) {
  const cone = (MISSILE.LOCK_CONE_DEG * Math.PI) / 180 / 2;
  const range2 = MISSILE.LOCK_RANGE * MISSILE.LOCK_RANGE;
  let best = null;
  let bestD = Infinity;
  for (const e of enemies) {
    const dx = e.x - ship.x;
    const dy = e.y - ship.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > range2) continue;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, aimAngle)) > cone) continue;
    if (d2 < bestD) {
      bestD = d2;
      best = e;
    }
  }
  return best;
}

export function chargeMeter(meter, amount) {
  return Math.max(0, Math.min(ULTIMATE.MAX, meter + amount));
}

export function canFireUltimate(meter) {
  return meter >= ULTIMATE.MAX;
}

// Is enemy within the ultimate's forward arc + range from the ship?
export function inUltimateArc(ship, aimAngle, e) {
  const dx = e.x - ship.x;
  const dy = e.y - ship.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > ULTIMATE.RANGE * ULTIMATE.RANGE) return false;
  const ang = Math.atan2(dy, dx);
  const half = (ULTIMATE.ARC_DEG * Math.PI) / 180 / 2;
  return Math.abs(angleDiff(ang, aimAngle)) <= half;
}
