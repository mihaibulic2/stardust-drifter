// Lightweight CPU particle system (one THREE.Points, additive). Used for
// explosions, pickup sparkles, thrust trails and the relight burst.
import * as THREE from 'three';

export function createParticles(scene, texture, max = 3000) {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  for (let i = 0; i < max; i++) positions[i * 3 + 1] = -9999; // park offscreen

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.7,
    map: texture,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const P = new Array(max);
  for (let i = 0; i < max; i++) P[i] = { alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, r: 1, g: 1, b: 1, drag: 1 };
  let cursor = 0;

  const tmp = new THREE.Color();

  function alloc() {
    for (let n = 0; n < max; n++) {
      const i = (cursor + n) % max;
      if (!P[i].alive) {
        cursor = (i + 1) % max;
        return P[i];
      }
    }
    cursor = (cursor + 1) % max;
    return P[cursor];
  }

  function burst(x, y, z, opts = {}) {
    const count = opts.count ?? 16;
    const speed = opts.speed ?? 14;
    const life = opts.life ?? 0.7;
    const spread = opts.spread ?? Math.PI * 2;
    const dir = opts.dir ?? 0;
    const up = opts.up ?? 6;
    const intensity = opts.intensity ?? 2.2;
    tmp.set(opts.color ?? 0xffffff);
    for (let i = 0; i < count; i++) {
      const p = alloc();
      const a = dir + (Math.random() - 0.5) * spread;
      const sp = speed * (0.4 + Math.random() * 0.6);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = Math.cos(a) * sp;
      p.vz = Math.sin(a) * sp;
      p.vy = (Math.random() - 0.3) * up;
      p.t = 0;
      p.life = life * (0.7 + Math.random() * 0.6);
      p.drag = opts.drag ?? 1.5;
      p.r = tmp.r * intensity;
      p.g = tmp.g * intensity;
      p.b = tmp.b * intensity;
    }
  }

  function update(dt) {
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;
    for (let i = 0; i < max; i++) {
      const p = P[i];
      const o = i * 3;
      if (!p.alive) {
        col[o] = col[o + 1] = col[o + 2] = 0;
        continue;
      }
      p.t += dt;
      if (p.t >= p.life) {
        p.alive = false;
        pos[o + 1] = -9999;
        col[o] = col[o + 1] = col[o + 2] = 0;
        continue;
      }
      const f = Math.pow(0.0001, dt / Math.max(0.001, 1 / p.drag)); // velocity drag
      p.vx *= f;
      p.vy *= f;
      p.vz *= f;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = 1 - p.t / p.life; // fade
      pos[o] = p.x;
      pos[o + 1] = p.y;
      pos[o + 2] = p.z;
      col[o] = p.r * k;
      col[o + 1] = p.g * k;
      col[o + 2] = p.b * k;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  return { burst, update, points };
}
