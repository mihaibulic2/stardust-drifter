// The pure simulation reducer. createGame() builds state; step(state, input, dt)
// advances it deterministically. No three.js / DOM / Math.random / Date here.
import { makeRng } from './rng.js';
import {
  FIELD,
  SHIP,
  BLASTER,
  MISSILE,
  ULTIMATE,
  ENEMY_BULLET,
  START_LIVES,
  MAX_LIVES,
  makeShip,
  makeBullet,
  makeEnemyBullet,
  makeMissile,
  makeEnemy,
  makeSeed,
  makePower,
} from './entities.js';
import { clamp, rotateToward } from './vec2.js';
import { hit } from './collision.js';
import {
  spreadAngles,
  effectiveFireRate,
  selectMissileTarget,
  chargeMeter,
  canFireUltimate,
  inUltimateArc,
} from './weapons.js';
import {
  scoreForKill,
  waveClearBonus,
  NO_HIT_BONUS,
  extraLivesCrossed,
  isNewHighScore,
} from './scoring.js';
import { applyPowerup, tickEffects, hasEffect, weightedDropKind } from './powerups.js';
import { buildWaveSchedule, spawnPosition } from './spawn.js';
import { updateEnemy } from './behaviors.js';
import { SECTORS, SECTOR_COUNT, getSector, isLastWave, sectorStory } from './levels.js';
import { WIN, GAME_OVER, BARKS } from './content/story.js';

export const PHASES = {
  TITLE: 'title',
  STORY: 'story',
  PLAYING: 'playing',
  CLEARED: 'cleared',
  WON: 'won',
  GAMEOVER: 'gameover',
  PAUSED: 'paused',
};

export const EMPTY_INPUT = {
  thrust: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  firePrimary: false,
  fireMissile: false,
  ultimate: false,
  pause: false,
  confirm: false,
};

export function createGame(opts = {}) {
  const seed = opts.seed ?? 12345;
  const state = {
    seed,
    rng: makeRng(seed),
    phase: PHASES.TITLE,
    prevPhase: PHASES.TITLE,
    t: 0,
    // run-level
    lives: START_LIVES,
    score: 0,
    highScore: opts.highScore ?? 0,
    combo: 0,
    spreadTier: 0,
    ultimate: 0,
    // sector/wave
    sectorIndex: 0,
    waveIndex: 0,
    schedule: [],
    scheduleCursor: 0,
    waveClock: 0,
    waveTookDamage: false,
    relightT: 0,
    sectorReached: 1,
    // entities
    ship: makeShip(),
    aimAngle: -Math.PI / 2,
    bullets: [],
    ebullets: [],
    missiles: [],
    enemies: [],
    seeds: [],
    powers: [],
    effects: [],
    // weapon timers
    blasterCd: 0,
    missileAmmo: MISSILE.MAX_AMMO,
    missileRegen: 0,
    missileCd: 0,
    // misc
    nextId: 1,
    events: [],
    barkCd: 0,
    story: null,
    latch: { confirm: false, pause: false, missile: false, ultimate: false },
    newHigh: false,
  };
  return state;
}

// ----- run / sector / story flow ------------------------------------------

function resetRun(state) {
  state.lives = START_LIVES;
  state.score = 0;
  state.combo = 0;
  state.spreadTier = 0;
  state.ultimate = 0;
  state.sectorIndex = 0;
  state.sectorReached = 1;
  state.newHigh = false;
  resetShipAndField(state);
}

function resetShipAndField(state) {
  state.ship = makeShip();
  state.aimAngle = -Math.PI / 2;
  state.bullets = [];
  state.ebullets = [];
  state.missiles = [];
  state.enemies = [];
  state.seeds = [];
  state.powers = [];
  state.effects = [];
  state.blasterCd = 0;
  state.missileAmmo = MISSILE.MAX_AMMO;
  state.missileRegen = 0;
  state.missileCd = 0;
}

function currentSector(state) {
  return SECTORS[state.sectorIndex];
}

export function loadWave(state) {
  const sector = currentSector(state);
  const wave = sector.waves[state.waveIndex];
  state.schedule = buildWaveSchedule(wave);
  state.scheduleCursor = 0;
  state.waveClock = 0;
  state.waveTookDamage = false;
}

// Begin actually playing the current sector (after its intro).
export function enterSector(state) {
  resetShipAndField(state);
  state.waveIndex = 0;
  state.sectorReached = Math.max(state.sectorReached, currentSector(state).number);
  loadWave(state);
  state.phase = PHASES.PLAYING;
  state.events.push({ type: 'sector', number: currentSector(state).number, paletteId: currentSector(state).paletteId });
}

function enterStory(state, kind, lines, sectorNumber) {
  state.story = { kind, lines, index: 0, sector: sectorNumber ?? null };
  state.phase = PHASES.STORY;
  state.events.push({ type: 'sfx', name: 'ui' });
}

function enterSectorIntro(state, sectorIndex) {
  state.sectorIndex = sectorIndex;
  const sector = currentSector(state);
  enterStory(state, 'intro', sectorStory(sector.number).intro, sector.number);
}

function enterCleared(state) {
  state.phase = PHASES.CLEARED;
  state.relightT = 2.6;
  state.ebullets = [];
  state.enemies = [];
  state.events.push({ type: 'relight' });
  state.events.push({ type: 'sfx', name: 'relight' });
  pushBark(state, 'relight', true);
}

function enterGameOver(state) {
  state.phase = PHASES.GAMEOVER;
  commitHighScore(state);
  state.story = { kind: 'gameover', lines: GAME_OVER, index: 0 };
  state.events.push({ type: 'sfx', name: 'gameover' });
}

// Record whether this run set a new high score, and persist it into highScore.
function commitHighScore(state) {
  state.newHigh = isNewHighScore(state.score, state.highScore);
  if (state.newHigh) state.highScore = state.score;
}

function startRun(state) {
  resetRun(state);
  enterSectorIntro(state, 0);
}

// Decide what happens when a story sequence finishes.
function resolveStory(state) {
  const kind = state.story.kind;
  if (kind === 'intro') {
    enterSector(state);
  } else if (kind === 'outro') {
    if (state.sectorIndex >= SECTOR_COUNT - 1) {
      // final outro -> victory message
      commitHighScore(state);
      enterStory(state, 'win', WIN);
    } else {
      enterSectorIntro(state, state.sectorIndex + 1);
    }
  } else if (kind === 'win') {
    state.phase = PHASES.WON;
    state.story = null;
  }
}

// ----- helpers -------------------------------------------------------------

function addScore(state, amount) {
  const old = state.score;
  state.score += amount;
  const extra = extraLivesCrossed(old, state.score);
  if (extra > 0) {
    state.lives = Math.min(MAX_LIVES, state.lives + extra);
    state.events.push({ type: 'sfx', name: 'oneup' });
    pushBark(state, 'oneup', true);
  }
}

function pushBark(state, category, force = false) {
  if (!force && state.barkCd > 0) return;
  const lines = BARKS[category];
  if (!lines || !lines.length) return;
  const text = lines[state.rng.int(0, lines.length - 1)];
  state.events.push({ type: 'bark', text });
  state.barkCd = 2.0;
}

function spawnExplosion(state, x, y, size, color) {
  state.events.push({ type: 'explosion', x, y, size, color });
}

// ----- the public step -----------------------------------------------------

export function step(state, input = EMPTY_INPUT, dt = 1 / 60) {
  state.events = [];
  if (dt > 1 / 30) dt = 1 / 30; // clamp to avoid tunneling
  state.t += dt;
  if (state.barkCd > 0) state.barkCd -= dt;

  // edge-triggered inputs
  const l = state.latch;
  const edge = {
    confirm: input.confirm && !l.confirm,
    pause: input.pause && !l.pause,
    missile: input.fireMissile && !l.missile,
    ultimate: input.ultimate && !l.ultimate,
  };
  l.confirm = input.confirm;
  l.pause = input.pause;
  l.missile = input.fireMissile;
  l.ultimate = input.ultimate;

  switch (state.phase) {
    case PHASES.TITLE:
      if (edge.confirm) startRun(state);
      break;
    case PHASES.STORY:
      if (edge.confirm) {
        state.story.index++;
        if (state.story.index >= state.story.lines.length) resolveStory(state);
        else state.events.push({ type: 'sfx', name: 'ui' });
      }
      break;
    case PHASES.CLEARED:
      state.relightT -= dt;
      if (state.relightT <= 0) {
        const sector = currentSector(state);
        enterStory(state, 'outro', sectorStory(sector.number).outro, sector.number);
      }
      break;
    case PHASES.PLAYING:
      if (edge.pause) {
        state.prevPhase = PHASES.PLAYING;
        state.phase = PHASES.PAUSED;
        state.events.push({ type: 'sfx', name: 'ui' });
      } else {
        stepPlaying(state, input, dt, edge);
      }
      break;
    case PHASES.PAUSED:
      if (edge.pause) {
        state.phase = state.prevPhase;
        state.events.push({ type: 'sfx', name: 'ui' });
      }
      break;
    case PHASES.WON:
      if (edge.confirm) {
        state.phase = PHASES.TITLE;
      }
      break;
    case PHASES.GAMEOVER:
      if (state.story && state.story.index < state.story.lines.length - 1 && edge.confirm) {
        state.story.index++;
      } else if (edge.confirm) {
        startRun(state); // retry from the beginning, keep high score
      }
      break;
    default:
      break;
  }
  return state;
}

// ----- the playing simulation ---------------------------------------------

function stepPlaying(state, input, dt, edge) {
  tickEffects(state, dt);
  updateShip(state, input, dt);
  handleFiring(state, input, dt, edge);
  regenMissiles(state, dt);
  updateBullets(state, dt);
  updateEnemyBullets(state, dt);
  updateMissiles(state, dt);
  updateEnemies(state, dt);
  updatePickups(state, dt);
  runSpawner(state, dt);

  collideFriendlyVsEnemies(state);
  resolveEnemyDeaths(state);
  collidePickups(state);
  collideShip(state);
  resolveEnemyDeaths(state); // ram damage may have finished one off

  if (state.ship.invuln > 0) state.ship.invuln -= dt;

  checkWaveClear(state);
}

function updateShip(state, input, dt) {
  const s = state.ship;
  s.vx += input.thrust.x * SHIP.ACCEL * dt;
  s.vy += input.thrust.y * SHIP.ACCEL * dt;
  const f = Math.pow(SHIP.DAMP, dt);
  s.vx *= f;
  s.vy *= f;
  const sp = Math.hypot(s.vx, s.vy);
  if (sp > SHIP.MAX_SPEED) {
    const k = SHIP.MAX_SPEED / sp;
    s.vx *= k;
    s.vy *= k;
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  applySoftBounds(s, dt);

  // aim: instantaneous fire direction; ship.angle eases for banking visuals
  if (input.aim && (input.aim.x !== 0 || input.aim.y !== 0)) {
    state.aimAngle = Math.atan2(input.aim.y, input.aim.x);
  }
  s.angle = rotateToward(s.angle, state.aimAngle, SHIP.TURN_RATE * dt);
}

function applySoftBounds(s, dt) {
  const margin = 8;
  const k = 80;
  if (s.x < FIELD.minX + margin) s.vx += k * dt * ((FIELD.minX + margin - s.x) / margin);
  if (s.x > FIELD.maxX - margin) s.vx -= k * dt * ((s.x - (FIELD.maxX - margin)) / margin);
  if (s.y < FIELD.minY + margin) s.vy += k * dt * ((FIELD.minY + margin - s.y) / margin);
  if (s.y > FIELD.maxY - margin) s.vy -= k * dt * ((s.y - (FIELD.maxY - margin)) / margin);
  s.x = clamp(s.x, FIELD.minX, FIELD.maxX);
  s.y = clamp(s.y, FIELD.minY, FIELD.maxY);
}

function handleFiring(state, input, dt, edge) {
  const s = state.ship;
  state.blasterCd -= dt;
  if (input.firePrimary && state.blasterCd <= 0) {
    const rate = effectiveFireRate(hasEffect(state, 'rapid'));
    state.blasterCd = 1 / rate;
    for (const a of spreadAngles(state.aimAngle, state.spreadTier)) {
      const vx = Math.cos(a) * BLASTER.SPEED;
      const vy = Math.sin(a) * BLASTER.SPEED;
      const bx = s.x + Math.cos(a) * (s.radius + 0.5);
      const by = s.y + Math.sin(a) * (s.radius + 0.5);
      state.bullets.push(makeBullet(state.nextId++, bx, by, vx, vy));
    }
    state.events.push({ type: 'sfx', name: 'laser' });
  }

  state.missileCd -= dt;
  if (edge.missile && state.missileAmmo > 0 && state.missileCd <= 0) {
    state.missileAmmo--;
    state.missileCd = MISSILE.COOLDOWN;
    const target = selectMissileTarget(s, state.aimAngle, state.enemies);
    const vx = Math.cos(state.aimAngle) * MISSILE.SPEED;
    const vy = Math.sin(state.aimAngle) * MISSILE.SPEED;
    state.missiles.push(makeMissile(state.nextId++, s.x, s.y, vx, vy, target ? target.id : null));
    state.events.push({ type: 'sfx', name: 'missile' });
  }

  if (edge.ultimate && canFireUltimate(state.ultimate)) {
    fireUltimate(state);
  }
}

function fireUltimate(state) {
  const s = state.ship;
  state.ultimate = 0;
  state.ebullets = [];
  for (const e of state.enemies) {
    if (inUltimateArc(s, state.aimAngle, e)) e.hp -= ULTIMATE.DMG;
  }
  state.events.push({ type: 'ultimate', x: s.x, y: s.y, angle: state.aimAngle });
  state.events.push({ type: 'sfx', name: 'ultimate' });
  resolveEnemyDeaths(state);
}

function regenMissiles(state, dt) {
  if (state.missileAmmo >= MISSILE.MAX_AMMO) {
    state.missileRegen = 0;
    return;
  }
  state.missileRegen += dt;
  if (state.missileRegen >= MISSILE.REGEN_TIME) {
    state.missileRegen -= MISSILE.REGEN_TIME;
    state.missileAmmo = Math.min(MISSILE.MAX_AMMO, state.missileAmmo + 1);
  }
}

function offscreen(x, y, pad = 14) {
  return x < FIELD.minX - pad || x > FIELD.maxX + pad || y < FIELD.minY - pad || y > FIELD.maxY + pad;
}

function updateBullets(state, dt) {
  const out = [];
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life > 0 && !offscreen(b.x, b.y)) out.push(b);
  }
  state.bullets = out;
}

function updateEnemyBullets(state, dt) {
  const out = [];
  for (const b of state.ebullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life > 0 && !offscreen(b.x, b.y)) out.push(b);
  }
  state.ebullets = out;
}

function updateMissiles(state, dt) {
  const out = [];
  for (const m of state.missiles) {
    const target = m.targetId != null ? state.enemies.find((e) => e.id === m.targetId) : null;
    if (target) {
      const desired = Math.atan2(target.y - m.y, target.x - m.x);
      const cur = Math.atan2(m.vy, m.vx);
      const next = rotateToward(cur, desired, MISSILE.TURN_RATE * dt);
      m.vx = Math.cos(next) * MISSILE.SPEED;
      m.vy = Math.sin(next) * MISSILE.SPEED;
    } else {
      m.targetId = null;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.life -= dt;
    if (m.life > 0 && !offscreen(m.x, m.y)) out.push(m);
  }
  state.missiles = out;
}

function updateEnemies(state, dt) {
  const survivors = [];
  for (const e of state.enemies) {
    const wantsFire = updateEnemy(e, state.ship, dt, state.rng);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (wantsFire) enemyFire(state, e);
    // remove enemies that escape far past the bottom (no score, but lets waves clear)
    if (e.y > FIELD.maxY + 16 && e.behavior !== 'boss') continue;
    survivors.push(e);
  }
  state.enemies = survivors;
}

function enemyFire(state, e) {
  const s = state.ship;
  if (e.behavior === 'boss') {
    // radial ring
    const n = e.type === 'boss' ? 14 : 10;
    const base = Math.atan2(s.y - e.y, s.x - e.x);
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      state.ebullets.push(
        makeEnemyBullet(state.nextId++, e.x, e.y, Math.cos(a) * ENEMY_BULLET.SPEED, Math.sin(a) * ENEMY_BULLET.SPEED)
      );
    }
  } else {
    const a = Math.atan2(s.y - e.y, s.x - e.x);
    state.ebullets.push(
      makeEnemyBullet(state.nextId++, e.x, e.y, Math.cos(a) * ENEMY_BULLET.SPEED, Math.sin(a) * ENEMY_BULLET.SPEED)
    );
  }
  state.events.push({ type: 'sfx', name: 'efire' });
}

function updatePickups(state, dt) {
  const magnet = hasEffect(state, 'magnet');
  const s = state.ship;
  const seedsOut = [];
  for (const seed of state.seeds) {
    if (magnet) {
      const dx = s.x - seed.x;
      const dy = s.y - seed.y;
      const d = Math.hypot(dx, dy) || 1;
      seed.vx += (dx / d) * 90 * dt;
      seed.vy += (dy / d) * 90 * dt;
    }
    seed.vx *= Math.pow(0.5, dt);
    seed.vy *= Math.pow(0.5, dt);
    seed.x += seed.vx * dt;
    seed.y += seed.vy * dt;
    seed.life -= dt;
    if (seed.life > 0) seedsOut.push(seed);
  }
  state.seeds = seedsOut;

  const powersOut = [];
  for (const p of state.powers) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.5, dt);
    p.vy *= Math.pow(0.5, dt);
    p.life -= dt;
    if (p.life > 0) powersOut.push(p);
  }
  state.powers = powersOut;
}

function runSpawner(state, dt) {
  state.waveClock += dt;
  while (state.scheduleCursor < state.schedule.length && state.schedule[state.scheduleCursor].at <= state.waveClock) {
    const sp = state.schedule[state.scheduleCursor];
    const pos = spawnPositionSafe(state, sp);
    const e = makeEnemy(state.nextId++, sp.type, pos.x, pos.y, { vx: pos.vx, vy: pos.vy });
    state.enemies.push(e);
    if (sp.type === 'boss' || sp.type === 'miniboss') {
      pushBark(state, 'boss', true);
      state.events.push({ type: 'sfx', name: 'bossEnter' });
    }
    state.scheduleCursor++;
  }
}

function spawnPositionSafe(state, sp) {
  return spawnPosition(sp.pattern, sp.idx, sp.total, state.rng);
}

// ----- collisions ----------------------------------------------------------

function collideFriendlyVsEnemies(state) {
  // bullets
  for (const b of state.bullets) {
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      if (!hit(b, e)) continue;
      if (e.shielded) {
        state.events.push({ type: 'block', x: b.x, y: b.y });
      } else {
        e.hp -= b.dmg;
        state.events.push({ type: 'spark', x: b.x, y: b.y });
      }
      b.life = -1; // consume
      break;
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // missiles (with splash)
  for (const m of state.missiles) {
    let detonated = false;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      if (!hit(m, e)) continue;
      if (!e.shielded) e.hp -= m.dmg;
      detonated = true;
      break;
    }
    if (detonated) {
      // splash regardless of shield
      for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - m.x;
        const dy = e.y - m.y;
        if (dx * dx + dy * dy <= MISSILE.SPLASH * MISSILE.SPLASH) e.hp -= 2;
      }
      spawnExplosion(state, m.x, m.y, 1.4, 'pink');
      state.events.push({ type: 'sfx', name: 'explosion' });
      m.life = -1;
    }
  }
  state.missiles = state.missiles.filter((m) => m.life > 0);
}

function resolveEnemyDeaths(state) {
  const survivors = [];
  for (const e of state.enemies) {
    if (e.hp > 0) {
      survivors.push(e);
      continue;
    }
    // killed
    addScore(state, scoreForKill(e.score, state.combo));
    state.combo += 1;
    if (state.combo > 0 && state.combo % 5 === 0) pushBark(state, 'combo');
    state.ultimate = chargeMeter(state.ultimate, ULTIMATE.CHARGE_PER_KILL);
    spawnExplosion(state, e.x, e.y, e.radius, 'enemy');
    state.events.push({ type: 'sfx', name: 'explosion' });

    if (e.type === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const ang = (i / 2) * Math.PI * 2 + 0.4;
        survivors.push(
          makeEnemy(state.nextId++, 'mote', e.x, e.y, { vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8 })
        );
      }
    }
    maybeDrop(state, e);
    // boss death is a big set-piece beat
    if (e.behavior === 'boss') state.events.push({ type: 'bossDown', x: e.x, y: e.y });
  }
  state.enemies = survivors;
}

function maybeDrop(state, e) {
  const isBoss = e.type === 'boss' || e.type === 'miniboss';
  if (isBoss) {
    const n = e.type === 'boss' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const kind = weightedDropKind(state.rng);
      state.powers.push(
        makePower(state.nextId++, kind, e.x + state.rng.range(-3, 3), e.y + state.rng.range(-3, 3))
      );
    }
    // bosses also gift a 1up sometimes
    if (state.rng.chance(0.5)) state.powers.push(makePower(state.nextId++, 'oneup', e.x, e.y + 2));
    return;
  }
  // small chance of a starseed and/or a power-up
  if (state.rng.chance(0.45)) {
    state.seeds.push(makeSeed(state.nextId++, e.x, e.y, state.rng.range(-3, 3), state.rng.range(-3, 3)));
  }
  if (state.rng.chance(0.12)) {
    const kind = weightedDropKind(state.rng);
    state.powers.push(makePower(state.nextId++, kind, e.x, e.y));
  }
}

function collidePickups(state) {
  const s = state.ship;
  for (const seed of state.seeds) {
    if (seed.life <= 0) continue;
    if (hit(s, seed)) {
      addScore(state, seed.value);
      seed.life = -1;
      state.events.push({ type: 'pickup', kind: 'seed' });
      state.events.push({ type: 'sfx', name: 'seed' });
    }
  }
  state.seeds = state.seeds.filter((x) => x.life > 0);

  for (const p of state.powers) {
    if (p.life <= 0) continue;
    if (hit(s, p)) {
      applyPowerup(state, p.kind);
      p.life = -1;
      state.events.push({ type: 'pickup', kind: p.kind });
      state.events.push({ type: 'sfx', name: 'power' });
      pushBark(state, p.kind === 'oneup' ? 'oneup' : 'power', true);
    }
  }
  state.powers = state.powers.filter((x) => x.life > 0);
}

function collideShip(state) {
  const s = state.ship;
  if (s.invuln > 0 || hasEffect(state, 'shield')) return;

  for (const b of state.ebullets) {
    if (hit(s, b)) {
      b.life = -1;
      damageShip(state, b.dmg);
      break;
    }
  }
  state.ebullets = state.ebullets.filter((b) => b.life > 0);

  if (s.invuln > 0) return; // a hit above may have granted invuln
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (hit(s, e)) {
      e.hp -= 1; // ram chips the enemy
      damageShip(state, 1);
      break;
    }
  }
}

function damageShip(state, dmg) {
  const s = state.ship;
  s.hp -= dmg;
  state.combo = 0;
  state.waveTookDamage = true;
  s.invuln = 0.7;
  state.events.push({ type: 'hit', x: s.x, y: s.y });
  state.events.push({ type: 'sfx', name: 'hit' });
  if (s.hp <= 0) {
    loseLife(state);
  } else {
    pushBark(state, 'hit');
  }
}

function loseLife(state) {
  const s = state.ship;
  state.lives -= 1;
  spawnExplosion(state, s.x, s.y, 3, 'ship');
  state.events.push({ type: 'sfx', name: 'playerDown' });
  state.events.push({ type: 'shake', power: 1 });
  if (state.lives <= 0) {
    enterGameOver(state);
  } else {
    s.hp = s.maxHp;
    s.x = 0;
    s.y = 8;
    s.vx = 0;
    s.vy = 0;
    s.invuln = SHIP.INVULN_TIME;
    if (state.lives === 1) pushBark(state, 'low', true);
  }
}

function checkWaveClear(state) {
  const spawnsExhausted = state.scheduleCursor >= state.schedule.length;
  if (!spawnsExhausted) return;
  if (state.enemies.length > 0) return;

  const sector = currentSector(state);
  addScore(state, waveClearBonus(sector.number));
  if (!state.waveTookDamage) {
    addScore(state, NO_HIT_BONUS);
    state.events.push({ type: 'noHitBonus' });
  }
  state.events.push({ type: 'waveClear' });

  if (isLastWave(sector, state.waveIndex)) {
    enterCleared(state);
  } else {
    state.waveIndex++;
    loadWave(state);
  }
}

// ----- test / external helpers --------------------------------------------

// Jump straight into playing a given sector (1-based). Used by tests and "skip".
export function createPlaying(opts = {}) {
  const state = createGame(opts);
  state.sectorIndex = (opts.sector ?? 1) - 1;
  enterSector(state);
  return state;
}

export { currentSector, getSector };
