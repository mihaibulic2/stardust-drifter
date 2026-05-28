// Logical entity factories + tunable constants. No rendering concerns here —
// just numbers and plain objects the simulation operates on.

export const FIELD = { minX: -46, maxX: 46, minY: -30, maxY: 30 };

export const SHIP = {
  ACCEL: 110,
  DAMP: 0.12, // remaining fraction of velocity per second (lower = snappier stop)
  MAX_SPEED: 34,
  RADIUS: 1.5,
  MAX_HP: 3, // shield pips
  INVULN_TIME: 1.5,
  TURN_RATE: 12, // rad/s for visual banking ease
};

export const START_LIVES = 3;
export const MAX_LIVES = 6;
export const EXTRA_LIFE_EVERY = 5000;

export const BLASTER = {
  FIRE_RATE: 6, // shots/s
  SPEED: 70,
  RADIUS: 0.6,
  DMG: 1,
  LIFE: 1.4, // seconds
  SPREAD_DEG: 10, // angular gap between spread bullets
  MAX_SPREAD_TIER: 2,
  RAPID_MULT: 1.8,
};

export const MISSILE = {
  MAX_AMMO: 5,
  REGEN_TIME: 4, // seconds per missile
  SPEED: 46,
  RADIUS: 0.9,
  DMG: 4,
  LIFE: 3.0,
  TURN_RATE: 3.2, // rad/s homing
  LOCK_CONE_DEG: 60,
  LOCK_RANGE: 80,
  SPLASH: 6,
  COOLDOWN: 0.35,
};

export const ULTIMATE = {
  MAX: 100,
  CHARGE_PER_KILL: 7,
  DMG: 8,
  ARC_DEG: 120, // forward arc affected
  RANGE: 90,
};

export const ENEMY_BULLET = { SPEED: 30, RADIUS: 0.7, DMG: 1, LIFE: 4 };

// Enemy archetypes. `behavior` is dispatched in behaviors.js.
export const ENEMY_TYPES = {
  mote: { hp: 1, score: 50, radius: 1.4, speed: 6, behavior: 'drift', fireRate: 0 },
  swarmer: { hp: 2, score: 80, radius: 1.3, speed: 16, behavior: 'weave', fireRate: 0.25 },
  spitter: { hp: 3, score: 120, radius: 1.6, speed: 9, behavior: 'kite', fireRate: 0.8 },
  splitter: { hp: 4, score: 150, radius: 1.9, speed: 8, behavior: 'drift', fireRate: 0 },
  asteroid: { hp: 3, score: 30, radius: 2.4, speed: 5, behavior: 'drift', fireRate: 0 },
  mirror: { hp: 5, score: 200, radius: 1.7, speed: 11, behavior: 'kite', fireRate: 0.6 },
  miniboss: { hp: 60, score: 1200, radius: 4.5, speed: 7, behavior: 'boss', fireRate: 1.4 },
  boss: { hp: 140, score: 3000, radius: 6.5, speed: 6, behavior: 'boss', fireRate: 1.8 },
};

export const SEED = { RADIUS: 1.0, VALUE: 25, SPEED: 4, LIFE: 18, MAGNET_ACCEL: 90 };
export const POWER = { RADIUS: 1.3, LIFE: 16, SPEED: 3 };

// --- factories -------------------------------------------------------------
// All factories take an explicit id so id allocation stays deterministic in
// gameState (state.nextId), never relying on globals.

export function makeShip() {
  return {
    x: 0,
    y: 8,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // facing "up" the screen (toward -y / far)
    radius: SHIP.RADIUS,
    hp: SHIP.MAX_HP,
    maxHp: SHIP.MAX_HP,
    invuln: 0,
  };
}

export function makeBullet(id, x, y, vx, vy, opts = {}) {
  return {
    id,
    x,
    y,
    vx,
    vy,
    radius: opts.radius ?? BLASTER.RADIUS,
    dmg: opts.dmg ?? BLASTER.DMG,
    life: opts.life ?? BLASTER.LIFE,
  };
}

export function makeEnemyBullet(id, x, y, vx, vy) {
  return { id, x, y, vx, vy, radius: ENEMY_BULLET.RADIUS, dmg: ENEMY_BULLET.DMG, life: ENEMY_BULLET.LIFE };
}

export function makeMissile(id, x, y, vx, vy, targetId = null) {
  return {
    id,
    x,
    y,
    vx,
    vy,
    radius: MISSILE.RADIUS,
    dmg: MISSILE.DMG,
    life: MISSILE.LIFE,
    targetId,
  };
}

export function makeEnemy(id, type, x, y, opts = {}) {
  const t = ENEMY_TYPES[type];
  if (!t) throw new Error(`unknown enemy type: ${type}`);
  const hp = opts.hp ?? t.hp;
  return {
    id,
    type,
    x,
    y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    radius: t.radius,
    hp,
    maxHp: hp,
    score: t.score,
    behavior: t.behavior,
    fireRate: t.fireRate,
    fireCd: opts.fireCd ?? 0.6,
    shieldT: 0, // mirror shield phase timer
    shielded: false,
    age: 0,
  };
}

export function makeSeed(id, x, y, vx = 0, vy = 0) {
  return { id, x, y, vx, vy, radius: SEED.RADIUS, value: SEED.VALUE, life: SEED.LIFE };
}

export function makePower(id, kind, x, y, vx = 0, vy = 0) {
  return { id, kind, x, y, vx, vy, radius: POWER.RADIUS, life: POWER.LIFE };
}
