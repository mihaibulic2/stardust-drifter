// Pure enemy behavior. updateEnemy mutates the enemy's velocity and returns
// whether it wants to fire this step. Movement integration happens in gameState.
import { FIELD } from './entities.js';

// Keep an enemy gently inside the field horizontally (soft nudge).
function softBoundX(e) {
  if (e.x < FIELD.minX) e.vx += 14 * 0.016;
  if (e.x > FIELD.maxX) e.vx -= 14 * 0.016;
}

export function updateEnemy(e, ship, dt, rng) {
  e.age += dt;
  let wantsFire = false;
  const dx = ship.x - e.x;
  const dy = ship.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;
  const speed = enemySpeed(e);

  switch (e.behavior) {
    case 'drift': {
      // slow homing toward the ship
      e.vx += nx * speed * 0.6 * dt;
      e.vy += ny * speed * 0.6 * dt;
      damp(e, 0.6, dt);
      break;
    }
    case 'weave': {
      // fast, sinusoidal sideways weave while advancing
      const weave = Math.sin(e.age * 3 + e.id) * speed * 0.8;
      e.vx = nx * speed + -ny * weave * 0.1;
      e.vy = ny * speed + nx * weave * 0.1;
      if (e.fireRate > 0) wantsFire = tickFire(e, dt, rng);
      break;
    }
    case 'kite': {
      // keep a preferred distance; strafe sideways; fire aimed shots
      const want = 22;
      const along = d > want ? 1 : -0.6;
      e.vx = nx * speed * along - ny * speed * 0.5;
      e.vy = ny * speed * along + nx * speed * 0.5;
      wantsFire = tickFire(e, dt, rng);
      break;
    }
    case 'boss': {
      // hover near top, sweep side to side, fire frequently
      const targetY = FIELD.minY + 9;
      e.vy = (targetY - e.y) * 0.8;
      e.vx = Math.sin(e.age * 0.7) * speed * 1.6;
      wantsFire = tickFire(e, dt, rng);
      break;
    }
    default:
      break;
  }

  // mirror enemies phase a shield on/off
  if (e.type === 'mirror') {
    e.shieldT -= dt;
    if (e.shieldT <= 0) {
      e.shielded = !e.shielded;
      e.shieldT = e.shielded ? 1.6 : 2.2;
    }
  }

  softBoundX(e);
  return wantsFire;
}

function enemySpeed(e) {
  // base speed from the type table is stamped via behavior tuning; we read radius-
  // independent speed from a small lookup keyed by behavior to keep this pure.
  return e._speed ?? (e._speed = baseSpeed(e));
}

function baseSpeed(e) {
  switch (e.type) {
    case 'mote':
      return 6;
    case 'swarmer':
      return 16;
    case 'spitter':
      return 9;
    case 'splitter':
      return 8;
    case 'asteroid':
      return 5;
    case 'mirror':
      return 11;
    case 'miniboss':
      return 7;
    case 'boss':
      return 6;
    default:
      return 8;
  }
}

function damp(e, perSec, dt) {
  const f = Math.pow(perSec, dt);
  e.vx *= f;
  e.vy *= f;
}

// Returns true exactly on the steps the enemy should fire, based on fireRate.
function tickFire(e, dt, rng) {
  if (e.fireRate <= 0) return false;
  e.fireCd -= dt;
  if (e.fireCd <= 0) {
    e.fireCd = (1 / e.fireRate) * rng.range(0.8, 1.2);
    return true;
  }
  return false;
}
