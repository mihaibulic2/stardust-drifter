import { describe, it, expect } from 'vitest';
import {
  createGame,
  createPlaying,
  step,
  PHASES,
  EMPTY_INPUT,
} from '../src/core/gameState.js';
import { makeEnemy, makeBullet, SHIP, MISSILE, ULTIMATE, FIELD } from '../src/core/entities.js';
import { applyPowerup } from '../src/core/powerups.js';
import { SECTORS } from '../src/core/levels.js';

const lastWaveIndex = (s) => SECTORS[s.sectorIndex].waves.length - 1;

const input = (over = {}) => ({ ...EMPTY_INPUT, ...over, thrust: { ...EMPTY_INPUT.thrust, ...(over.thrust || {}) }, aim: { ...EMPTY_INPUT.aim, ...(over.aim || {}) } });

// Isolate combat: stop the spawner and clear the field so only what we add exists.
function isolate(state) {
  state.schedule = [];
  state.scheduleCursor = 0;
  state.enemies = [];
  state.bullets = [];
  state.ebullets = [];
  return state;
}

// One discrete button "press" = edge on, then edge off (two steps).
function press(state, key) {
  step(state, input({ [key]: true }));
  step(state, input({ [key]: false }));
}

describe('phase machine', () => {
  it('starts on the title screen', () => {
    expect(createGame().phase).toBe(PHASES.TITLE);
  });

  it('title -> confirm -> intro story -> confirm through lines -> playing', () => {
    const s = createGame();
    press(s, 'confirm'); // title -> story
    expect(s.phase).toBe(PHASES.STORY);
    expect(s.story.kind).toBe('intro');
    const lines = s.story.lines.length;
    for (let i = 0; i < lines; i++) press(s, 'confirm');
    expect(s.phase).toBe(PHASES.PLAYING);
  });

  it('pause toggles in and out of play', () => {
    const s = createPlaying();
    press(s, 'pause');
    expect(s.phase).toBe(PHASES.PAUSED);
    press(s, 'pause');
    expect(s.phase).toBe(PHASES.PLAYING);
  });
});

describe('ship movement', () => {
  it('thrust accelerates the ship', () => {
    const s = isolate(createPlaying());
    const y0 = s.ship.y;
    for (let i = 0; i < 20; i++) step(s, input({ thrust: { x: 0, y: 1 } }));
    expect(s.ship.y).toBeGreaterThan(y0);
  });

  it('respects the max-speed clamp', () => {
    const s = isolate(createPlaying());
    for (let i = 0; i < 200; i++) step(s, input({ thrust: { x: 1, y: 1 } }));
    expect(Math.hypot(s.ship.vx, s.ship.vy)).toBeLessThanOrEqual(SHIP.MAX_SPEED + 1e-6);
  });

  it('keeps the ship inside the field bounds', () => {
    const s = isolate(createPlaying());
    s.ship.x = 999;
    s.ship.y = 999;
    step(s, input());
    expect(s.ship.x).toBeLessThanOrEqual(FIELD.maxX);
    expect(s.ship.y).toBeLessThanOrEqual(FIELD.maxY);
  });
});

describe('weapons in the sim', () => {
  it('primary blaster respects fire cadence', () => {
    const s = isolate(createPlaying());
    step(s, input({ firePrimary: true })); // fires once
    step(s, input({ firePrimary: true })); // still cooling down
    expect(s.bullets.length).toBe(1);
  });

  it('spread tier 2 fires five bullets at once', () => {
    const s = isolate(createPlaying());
    s.spreadTier = 2;
    step(s, input({ firePrimary: true }));
    expect(s.bullets.length).toBe(5);
  });

  it('missiles consume ammo and lock the enemy ahead', () => {
    const s = isolate(createPlaying());
    s.enemies = [makeEnemy(s.nextId++, 'mote', s.ship.x, s.ship.y - 12)]; // dead ahead (-y)
    step(s, input({ fireMissile: true }));
    expect(s.missiles.length).toBe(1);
    expect(s.missileAmmo).toBe(MISSILE.MAX_AMMO - 1);
    expect(s.missiles[0].targetId).toBe(s.enemies[0].id);
  });

  it('ultimate fires only when full, clears the meter, and hits enemies ahead', () => {
    const s = isolate(createPlaying());
    s.ultimate = ULTIMATE.MAX;
    s.enemies = [makeEnemy(s.nextId++, 'mote', s.ship.x, s.ship.y - 10)];
    step(s, input({ ultimate: true }));
    // meter was spent (the kill recharges it a little, but it's no longer full)
    expect(s.ultimate).toBeLessThan(ULTIMATE.MAX);
    expect(s.enemies.length).toBe(0); // mote destroyed by the beam
  });
});

describe('combat: damage, score, combo', () => {
  it('a friendly bullet kills an enemy and awards combo-scaled score', () => {
    const s = isolate(createPlaying());
    const target = makeEnemy(s.nextId++, 'mote', 0, 0); // hp 1, score 50
    const guard = makeEnemy(s.nextId++, 'mote', 40, -20); // keeps wave from clearing
    s.enemies = [target, guard];
    s.bullets = [makeBullet(s.nextId++, 0, 0, 0, 0)];
    step(s, input());
    expect(s.score).toBe(50);
    expect(s.combo).toBe(1);
    expect(s.enemies.find((e) => e.id === target.id)).toBeUndefined();
  });

  it('getting hit resets the combo', () => {
    const s = isolate(createPlaying());
    s.combo = 7;
    // a spitter (hp 3) overlaps the ship: the ram hurts us but doesn't kill it,
    // so the only combo effect is the reset from getting hit.
    s.enemies = [makeEnemy(s.nextId++, 'spitter', s.ship.x, s.ship.y)];
    step(s, input());
    expect(s.combo).toBe(0);
  });

  it('a shield power-up prevents damage', () => {
    const s = isolate(createPlaying());
    applyPowerup(s, 'shield');
    const hp0 = s.ship.hp;
    s.enemies = [makeEnemy(s.nextId++, 'mote', s.ship.x, s.ship.y)];
    step(s, input());
    expect(s.ship.hp).toBe(hp0);
  });

  it('invulnerability prevents damage', () => {
    const s = isolate(createPlaying());
    s.ship.invuln = 1;
    const hp0 = s.ship.hp;
    s.enemies = [makeEnemy(s.nextId++, 'mote', s.ship.x, s.ship.y)];
    step(s, input());
    expect(s.ship.hp).toBe(hp0);
  });
});

describe('lives & game over', () => {
  it('losing all shields costs a life and respawns with invulnerability', () => {
    const s = isolate(createPlaying());
    s.lives = 3;
    s.ship.hp = 1;
    s.enemies = [makeEnemy(s.nextId++, 'mote', s.ship.x, s.ship.y)];
    step(s, input());
    expect(s.lives).toBe(2);
    expect(s.ship.hp).toBe(s.ship.maxHp);
    expect(s.ship.invuln).toBeGreaterThan(0);
  });

  it('losing the last life ends the game', () => {
    const s = isolate(createPlaying());
    s.lives = 1;
    s.ship.hp = 1;
    s.enemies = [makeEnemy(s.nextId++, 'mote', s.ship.x, s.ship.y)];
    step(s, input());
    expect(s.phase).toBe(PHASES.GAMEOVER);
  });
});

describe('wave & sector progression', () => {
  it('clearing a non-final wave grants clear + no-hit bonus and advances the wave', () => {
    const s = isolate(createPlaying()); // sector 1, wave 0 (not last)
    expect(s.waveIndex).toBe(0);
    step(s, input()); // schedule empty + no enemies -> wave clear
    expect(s.score).toBe(250 + 500); // waveClearBonus(1) + NO_HIT_BONUS
    expect(s.waveIndex).toBe(1);
    expect(s.phase).toBe(PHASES.PLAYING);
  });

  it('clearing the final wave triggers the relight/cleared phase', () => {
    const s = createPlaying();
    s.waveIndex = lastWaveIndex(s);
    isolate(s);
    step(s, input());
    expect(s.phase).toBe(PHASES.CLEARED);
  });
});

describe('full playthrough reaches victory', () => {
  it('clearing every sector ends on the WON screen', () => {
    const s = createPlaying({ sector: 1 });
    let guard = 0;
    while (s.phase !== PHASES.WON && guard++ < 2000) {
      if (s.phase === PHASES.PLAYING) {
        isolate(s);
        step(s, input());
      } else if (s.phase === PHASES.CLEARED) {
        step(s, input()); // count down the relight timer
      } else if (s.phase === PHASES.STORY) {
        press(s, 'confirm');
      } else {
        step(s, input());
      }
    }
    expect(s.phase).toBe(PHASES.WON);
    expect(s.sectorReached).toBe(5);
  });
});
