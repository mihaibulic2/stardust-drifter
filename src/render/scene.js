// Scene, camera, lighting, starfield and the dreamy nebula backdrop.
import * as THREE from 'three';
import { FIELD } from '../core/entities.js';
import { getPalette } from './palette.js';

const CAMERA_ELEVATION = (62 * Math.PI) / 180; // angle above the play plane
const FOV = 50;

// soft radial sprite texture, reused for nebulae, glows and particles
function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07061a);
  scene.fog = new THREE.FogExp2(0x0b0a22, 0.0065);

  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 2000);

  // lighting: soft fill so standard materials keep form; bloom does the glow.
  const hemi = new THREE.HemisphereLight(0xbfc4ff, 0x2a1a3a, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.6);
  key.position.set(10, 30, 20);
  scene.add(key);
  const rim = new THREE.PointLight(0xff9ed8, 0.6, 200);
  rim.position.set(0, 14, 8);
  scene.add(rim);

  // --- starfield (twinkling Points) ---
  const starCount = 1400;
  const sPos = new Float32Array(starCount * 3);
  const sPhase = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 320;
    sPos[i * 3 + 1] = -8 - Math.random() * 60; // below the play plane, in the distance
    sPos[i * 3 + 2] = (Math.random() - 0.5) * 260 - 40;
    sPhase[i] = Math.random() * Math.PI * 2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const starMat = new THREE.PointsMaterial({
    size: 1.1,
    map: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xcdd6ff,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // --- nebula: a handful of huge soft additive sprites we tint per sector ---
  const nebulaTex = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const nebula = new THREE.Group();
  const nebulaSprites = [];
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.SpriteMaterial({
      map: nebulaTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.42,
    });
    const sp = new THREE.Sprite(mat);
    const scale = 55 + Math.random() * 80;
    sp.scale.set(scale, scale, 1);
    sp.position.set((Math.random() - 0.5) * 220, -20 - Math.random() * 30, -60 - Math.random() * 120);
    sp.userData.drift = 2 + Math.random() * 3;
    sp.userData.baseX = sp.position.x;
    nebula.add(sp);
    nebulaSprites.push(sp);
  }
  scene.add(nebula);

  // soft glowing "heart-star" far in the distance (relights at sector clear)
  const heartMat = new THREE.SpriteMaterial({
    map: nebulaTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.0,
    color: 0xfff0c0,
  });
  const heartStar = new THREE.Sprite(heartMat);
  heartStar.scale.set(40, 40, 1);
  heartStar.position.set(0, 6, -150);
  scene.add(heartStar);

  fitCamera(camera);

  return {
    scene,
    camera,
    stars,
    starPhase: sPhase,
    starGeo,
    nebulaSprites,
    heartStar,
    radialTexture,
    applyPalette(paletteId) {
      const p = getPalette(paletteId);
      scene.background = new THREE.Color(p.bg);
      scene.fog.color = new THREE.Color(p.fog);
      starMat.color = new THREE.Color(p.star);
      nebulaSprites.forEach((sp, i) => sp.material.color = new THREE.Color(p.nebula[i % p.nebula.length]));
    },
    resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      fitCamera(camera);
    },
  };
}

// Position the camera at a fixed elevation, far enough back to frame the whole
// play field on any aspect ratio (so nothing ever clips off-screen).
function fitCamera(camera) {
  const margin = 8;
  const hw = (FIELD.maxX - FIELD.minX) / 2 + margin;
  const hd = (FIELD.maxY - FIELD.minY) / 2 + margin;
  const vHalf = (FOV * Math.PI) / 180 / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const dForWidth = hw / Math.tan(hHalf);
  const dForDepth = hd / Math.tan(vHalf);
  const dist = Math.max(dForWidth, dForDepth) * 1.05;

  const targetZ = -2;
  camera.position.set(0, Math.sin(CAMERA_ELEVATION) * dist, targetZ + Math.cos(CAMERA_ELEVATION) * dist);
  camera.lookAt(0, 0, targetZ);
}

export function updateBackdrop(world, t, dt) {
  // twinkle stars
  const pos = world.starGeo.attributes.position;
  // (we keep positions; twinkle via material — cheap: pulse overall opacity)
  world.stars.material.opacity = 0.7 + Math.sin(t * 1.5) * 0.12;
  world.stars.material.transparent = true;
  // drift nebulae gently
  for (const sp of world.nebulaSprites) {
    sp.position.x = sp.userData.baseX + Math.sin(t * 0.05 * sp.userData.drift) * 6;
  }
  void pos;
  void dt;
}
