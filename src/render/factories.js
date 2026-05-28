// Mesh builders. Shapes are intentionally rounded and glowy (kawaii spacecore):
// neon emissive materials + little eyes on the enemies for cuteness.
import * as THREE from 'three';
import { SHIP_COLORS, PICKUP_COLORS } from './palette.js';

// ---- shared geometries (built once, reused via per-mesh materials) ----
const G = {
  cone: new THREE.ConeGeometry(1.1, 3.0, 18),
  wing: new THREE.BoxGeometry(2.2, 0.25, 1.0),
  fin: new THREE.BoxGeometry(0.25, 0.6, 1.4),
  sphere: new THREE.SphereGeometry(1, 18, 14),
  smallSphere: new THREE.SphereGeometry(1, 12, 10),
  ico: new THREE.IcosahedronGeometry(1, 0),
  ico1: new THREE.IcosahedronGeometry(1, 1),
  tetra: new THREE.TetrahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.18, 10, 28),
  capsule: new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
};

const std = (color, emissive, intensity = 1.4, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.1,
    ...extra,
  });

const basic = (color, opts = {}) =>
  new THREE.MeshBasicMaterial({ color, toneMapped: true, ...opts });

// Two big shiny eyes + pupils on top of an enemy, so it reads cute from the
// tilted top-down camera.
function addEyes(group, scale = 1) {
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.2 });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x241a33 });
  const sheen = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(G.smallSphere, eyeWhite);
    eye.scale.setScalar(0.32 * scale);
    eye.position.set(side * 0.42 * scale, 0.72 * scale, 0.55 * scale);
    const p = new THREE.Mesh(G.smallSphere, pupil);
    p.scale.setScalar(0.16 * scale);
    p.position.set(side * 0.42 * scale, 0.78 * scale, 0.78 * scale);
    const s = new THREE.Mesh(G.smallSphere, sheen);
    s.scale.setScalar(0.06 * scale);
    s.position.set(side * 0.36 * scale, 0.86 * scale, 0.9 * scale);
    group.add(eye, p, s);
  }
}

// ---------------------------------------------------------------- ship ----
export function makeShip() {
  const g = new THREE.Group();

  const hull = new THREE.Mesh(G.cone, std(SHIP_COLORS.body, SHIP_COLORS.bodyEmissive, 1.1));
  hull.rotation.z = -Math.PI / 2; // point the cone along +X (forward)
  g.add(hull);

  const wingMat = std(SHIP_COLORS.trim, SHIP_COLORS.trim, 1.0);
  const wl = new THREE.Mesh(G.wing, wingMat);
  wl.position.set(-0.3, 0, 0);
  wl.rotation.y = 0.12;
  g.add(wl);

  const finMat = std(SHIP_COLORS.bodyEmissive, SHIP_COLORS.bodyEmissive, 1.2);
  const fin = new THREE.Mesh(G.fin, finMat);
  fin.position.set(-1.0, 0.3, 0);
  g.add(fin);

  const core = new THREE.Mesh(G.smallSphere, basic(SHIP_COLORS.core));
  core.scale.setScalar(0.5);
  core.position.set(0.1, 0.25, 0);
  g.add(core);

  // engine glow (a sprite that the view pulses while thrusting)
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: SHIP_COLORS.thrust, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  glow.scale.set(3, 3, 1);
  glow.position.set(-1.6, 0, 0);
  glow.name = 'thrust';
  g.add(glow);

  g.userData.core = core;
  return g;
}

// --------------------------------------------------------------- enemies ----
const ENEMY_GEO = {
  mote: G.ico1,
  swarmer: G.tetra,
  spitter: G.octa,
  splitter: G.ico,
  asteroid: G.dodeca,
  mirror: G.ico1,
  miniboss: G.ico1,
  boss: G.ico1,
};

export function makeEnemy(type, palette) {
  const g = new THREE.Group();
  const geo = ENEMY_GEO[type] || G.ico;
  const colorMain = type === 'asteroid' ? 0x8a7aa0 : palette.enemy;
  const emis = type === 'asteroid' ? 0x4a3a5a : palette.enemy;

  const body = new THREE.Mesh(geo, std(colorMain, emis, type === 'asteroid' ? 0.5 : 1.4, { flatShading: true }));
  const r = enemyVisualRadius(type);
  body.scale.setScalar(r);
  g.add(body);
  g.userData.body = body;

  // glowing core
  const core = new THREE.Mesh(G.smallSphere, basic(palette.enemyCore));
  core.scale.setScalar(r * 0.4);
  g.add(core);

  if (type !== 'asteroid') addEyes(g, r * 0.7 + 0.5);

  if (type === 'boss' || type === 'miniboss') {
    const ring = new THREE.Mesh(G.torus, basic(palette.accent, { transparent: true, opacity: 0.8 }));
    ring.scale.setScalar(r * 1.5);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.userData.ring = ring;
  }

  if (type === 'mirror') {
    const bubble = new THREE.Mesh(
      G.sphere,
      new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.8, transparent: true, opacity: 0.0, roughness: 0, metalness: 0.6 })
    );
    bubble.scale.setScalar(r * 1.7);
    bubble.name = 'shield';
    g.add(bubble);
    g.userData.shield = bubble;
  }

  return g;
}

export function enemyVisualRadius(type) {
  switch (type) {
    case 'boss': return 6.5;
    case 'miniboss': return 4.5;
    case 'splitter': return 1.9;
    case 'asteroid': return 2.4;
    case 'spitter': return 1.6;
    case 'mirror': return 1.7;
    case 'swarmer': return 1.3;
    default: return 1.4;
  }
}

// ------------------------------------------------------------ projectiles ----
export function makeBullet() {
  const g = new THREE.Mesh(G.capsule, basic(0xa0f0ff));
  g.material.color = new THREE.Color(0xb6f0ff);
  g.rotation.z = Math.PI / 2;
  return g;
}

export function makeEnemyBullet(palette) {
  const m = new THREE.Mesh(G.smallSphere, basic(palette.accent));
  m.scale.setScalar(0.7);
  return m;
}

export function makeMissile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.cone, basic(0xff9ed8));
  body.rotation.z = -Math.PI / 2;
  body.scale.set(0.5, 0.5, 0.5);
  g.add(body);
  return g;
}

// ---------------------------------------------------------------- pickups ----
export function makeSeed() {
  const m = new THREE.Mesh(G.octa, basic(PICKUP_COLORS.seed));
  m.scale.setScalar(0.9);
  return m;
}

export function makePower(kind) {
  const g = new THREE.Group();
  const color = PICKUP_COLORS[kind] || 0xffffff;
  const shell = new THREE.Mesh(G.ico1, std(color, color, 1.6, { transparent: true, opacity: 0.95 }));
  shell.scale.setScalar(1.2);
  g.add(shell);
  const ring = new THREE.Mesh(G.torus, basic(0xffffff, { transparent: true, opacity: 0.5 }));
  ring.scale.setScalar(1.5);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  g.userData.shell = shell;
  g.userData.kind = kind;
  return g;
}

export { G };
