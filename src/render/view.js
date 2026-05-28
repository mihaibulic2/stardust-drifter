// Reconciles the pure core state with three.js meshes every frame, plays the
// particle/camera effects driven by state.events, and animates the ship.
import * as THREE from 'three';
import {
  makeShip,
  makeEnemy,
  makeBullet,
  makeEnemyBullet,
  makeMissile,
  makeSeed,
  makePower,
} from './factories.js';
import { createPool } from './pools.js';
import { createParticles } from './particles.js';
import { getPalette } from './palette.js';
import { PHASES } from '../core/gameState.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const PLAY_PHASES = new Set([PHASES.PLAYING, PHASES.PAUSED, PHASES.CLEARED]);

export function createView(world, opts = {}) {
  const { scene, camera } = world;
  const onFlash = opts.onFlash || (() => {});
  const particles = createParticles(
    scene,
    world.radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)')
  );

  let palette = getPalette('periwinkle');

  const ship = makeShip();
  scene.add(ship);
  ship.visible = false;
  const thrustGlow = ship.getObjectByName('thrust');

  const bulletPool = createPool(scene, makeBullet);
  const ebulletPool = createPool(scene, () => makeEnemyBullet(palette));
  const missilePool = createPool(scene, makeMissile);
  const seedPool = createPool(scene, makeSeed);
  const enemyPools = new Map();
  const powerPools = new Map();
  const enemyPool = (type) => {
    if (!enemyPools.has(type)) enemyPools.set(type, createPool(scene, () => makeEnemy(type, palette)));
    return enemyPools.get(type);
  };
  const powerPool = (kind) => {
    if (!powerPools.has(kind)) powerPools.set(kind, createPool(scene, () => makePower(kind)));
    return powerPools.get(kind);
  };

  const active = {
    bullets: new Map(),
    ebullets: new Map(),
    missiles: new Map(),
    enemies: new Map(),
    seeds: new Map(),
    powers: new Map(),
  };

  let camBase = camera.position.clone();
  let shake = 0;
  let dt = 1 / 60;
  let t = 0;
  let relightAnim = 0;

  function acquireFrom(pool) {
    const m = pool.acquire();
    m.userData.__pool = pool;
    return m;
  }
  function releaseMesh(m) {
    if (m.userData.__pool) m.userData.__pool.release(m);
  }

  function syncList(list, map, acquire, update) {
    const seen = new Set();
    for (const e of list) {
      let m = map.get(e.id);
      if (!m) {
        m = acquire(e);
        map.set(e.id, m);
      }
      update(m, e);
      seen.add(e.id);
    }
    for (const [id, m] of map) {
      if (!seen.has(id)) {
        releaseMesh(m);
        map.delete(id);
      }
    }
  }

  function colorFor(tag) {
    switch (tag) {
      case 'enemy': return palette.enemy;
      case 'ship': return 0xff9ed8;
      case 'pink': return 0xff9ed8;
      default: return 0xffffff;
    }
  }

  function rebuildPaletteDependentPools() {
    for (const p of enemyPools.values()) p.dispose();
    enemyPools.clear();
    active.enemies.clear();
    for (const p of powerPools.values()) p.dispose();
    powerPools.clear();
    active.powers.clear();
    ebulletPool.dispose();
    active.ebullets.clear();
  }

  function handleEvents(state) {
    for (const ev of state.events) {
      switch (ev.type) {
        case 'explosion':
          particles.burst(ev.x, 0.5, ev.y, {
            count: Math.round(14 + ev.size * 5),
            speed: 12 + ev.size * 2,
            life: 0.8,
            color: colorFor(ev.color),
            intensity: 2.4,
          });
          shake += clamp(ev.size * 0.18, 0.1, 1.2);
          break;
        case 'spark':
          particles.burst(ev.x, 0.4, ev.y, { count: 6, speed: 9, life: 0.35, color: 0xffffff, intensity: 2.0 });
          break;
        case 'block':
          particles.burst(ev.x, 0.4, ev.y, { count: 5, speed: 7, life: 0.3, color: palette.accent, intensity: 1.6 });
          break;
        case 'hit':
          shake += 0.6;
          particles.burst(ev.x, 0.5, ev.y, { count: 12, speed: 10, life: 0.5, color: 0xffd0e0, intensity: 2.2 });
          break;
        case 'shake':
          shake += ev.power || 0.5;
          break;
        case 'pickup':
          particles.burst(ship.position.x, 0.6, ship.position.z, { count: 14, speed: 8, life: 0.6, color: 0xfff0a8, intensity: 2.4 });
          break;
        case 'ultimate':
          shake += 1.0;
          onFlash(0.5);
          particles.burst(ship.position.x, 0.6, ship.position.z, {
            count: 90,
            speed: 40,
            life: 0.6,
            color: 0xb6f0ff,
            dir: ev.angle,
            spread: (120 * Math.PI) / 180,
            intensity: 2.6,
            drag: 1.0,
          });
          break;
        case 'relight':
          relightAnim = 1.6;
          shake += 0.6;
          onFlash(0.35);
          particles.burst(0, 0, -10, { count: 120, speed: 26, life: 1.4, color: 0xfff0c0, up: 14, intensity: 2.6, drag: 0.8 });
          break;
        case 'bossDown':
          shake += 1.4;
          onFlash(0.5);
          particles.burst(ev.x, 0.6, ev.y, { count: 140, speed: 32, life: 1.2, color: 0xfff0c0, intensity: 2.8 });
          break;
        case 'sector':
          palette = getPalette(ev.paletteId);
          world.applyPalette(ev.paletteId);
          rebuildPaletteDependentPools();
          break;
        default:
          break;
      }
    }
  }

  function updateShip(state, input) {
    const s = state.ship;
    const show = PLAY_PHASES.has(state.phase);
    if (!show) {
      ship.visible = false;
      return;
    }
    ship.position.set(s.x, 0, s.y);
    ship.rotation.y = -s.angle;
    // gentle banking wobble from velocity
    ship.rotation.z = clamp(-s.vx * 0.012, -0.4, 0.4);
    ship.rotation.x = clamp(s.vy * 0.012, -0.35, 0.35);

    // invulnerability blink
    const blink = s.invuln > 0 && Math.floor(t * 18) % 2 === 0;
    ship.visible = !blink;

    // thrust glow + trail
    const thrustAmt = Math.min(1, Math.hypot(input.thrust.x, input.thrust.y));
    if (thrustGlow) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 30);
      thrustGlow.material.opacity = 0.35 + thrustAmt * (0.5 + pulse * 0.2);
      const sc = 2.4 + thrustAmt * 1.6;
      thrustGlow.scale.set(sc, sc, 1);
    }
    if (thrustAmt > 0.2 && Math.random() < 0.8) {
      const back = -s.angle;
      particles.burst(s.x - Math.cos(s.angle) * 1.6, 0.2, s.y - Math.sin(s.angle) * 1.6, {
        count: 2,
        speed: 6,
        life: 0.4,
        color: 0xffb3e6,
        dir: Math.PI + Math.atan2(s.vy, s.vx),
        spread: 0.8,
        intensity: 2.0,
        up: 2,
      });
      void back;
    }
    if (ship.userData.core) ship.userData.core.material.color.setHex(0xa0f0ff);
  }

  function updateEnemyMesh(m, e) {
    m.position.set(e.x, 0, e.y);
    if (m.userData.body) {
      m.userData.body.rotation.y += dt * 1.2;
      m.userData.body.rotation.x += dt * 0.6;
    }
    if (m.userData.ring) m.userData.ring.rotation.z += dt * 1.5;
    if (m.userData.shield) {
      const target = e.shielded ? 0.55 : 0.0;
      const mat = m.userData.shield.material;
      mat.opacity += (target - mat.opacity) * Math.min(1, dt * 10);
    }
    // hit flash: brighten briefly when hp dropped (tracked via userData)
    if (m.userData.hp == null) m.userData.hp = e.hp;
    if (e.hp < m.userData.hp) m.userData.flash = 1;
    m.userData.hp = e.hp;
    if (m.userData.flash > 0 && m.userData.body) {
      m.userData.body.material.emissiveIntensity = 1.4 + m.userData.flash * 2.2;
      m.userData.flash = Math.max(0, m.userData.flash - dt * 4);
    }
  }

  return {
    particles,
    syncCameraBase() {
      camBase = camera.position.clone();
    },
    setPaletteImmediate(id) {
      palette = getPalette(id);
      world.applyPalette(id);
      rebuildPaletteDependentPools();
    },
    update(state, input, frameDt) {
      dt = frameDt;
      t += frameDt;

      handleEvents(state);

      // ship
      updateShip(state, input);

      // projectiles & entities
      syncList(state.bullets, active.bullets, () => acquireFrom(bulletPool), (m, e) => {
        m.position.set(e.x, 0, e.y);
        m.rotation.y = -Math.atan2(e.vy, e.vx);
      });
      syncList(state.ebullets, active.ebullets, () => acquireFrom(ebulletPool), (m, e) => {
        m.position.set(e.x, 0, e.y);
        if (m.userData.pc !== palette) {
          m.material.color.setHex(palette.accent);
          m.userData.pc = palette;
        }
      });
      syncList(state.missiles, active.missiles, () => acquireFrom(missilePool), (m, e) => {
        m.position.set(e.x, 0, e.y);
        m.rotation.y = -Math.atan2(e.vy, e.vx);
        if (Math.random() < 0.8) {
          particles.burst(e.x, 0.2, e.y, { count: 1, speed: 3, life: 0.3, color: 0xff9ed8, intensity: 1.8 });
        }
      });
      syncList(state.enemies, active.enemies, (e) => acquireFrom(enemyPool(e.type)), updateEnemyMesh);
      syncList(state.seeds, active.seeds, () => acquireFrom(seedPool), (m, e) => {
        m.position.set(e.x, 0.3 + Math.sin(t * 4 + e.id) * 0.3, e.y);
        m.rotation.y += dt * 3;
      });
      syncList(state.powers, active.powers, (p) => acquireFrom(powerPool(p.kind)), (m, e) => {
        m.position.set(e.x, 0.4 + Math.sin(t * 3 + e.id) * 0.4, e.y);
        if (m.userData.shell) m.userData.shell.rotation.y += dt * 2;
        m.rotation.z += dt * 1.2;
      });

      // particles
      particles.update(frameDt);

      // heart-star relight glow
      if (relightAnim > 0) {
        relightAnim = Math.max(0, relightAnim - frameDt);
        const k = Math.sin((1 - relightAnim / 1.6) * Math.PI);
        world.heartStar.material.opacity = clamp(k, 0, 1) * 0.9;
      } else if (world.heartStar.material.opacity > 0) {
        world.heartStar.material.opacity *= Math.pow(0.2, frameDt);
      }

      // camera shake
      shake = Math.max(0, shake - frameDt * 3.5);
      const sx = (Math.random() - 0.5) * shake * 1.4;
      const sy = (Math.random() - 0.5) * shake * 1.4;
      camera.position.set(camBase.x + sx, camBase.y + sy, camBase.z);
    },
  };
}
