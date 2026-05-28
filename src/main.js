// Entry point: builds the world + UI, translates raw input into the core's
// neutral Input each frame, runs the deterministic sim, and renders.
import './styles.css';
import * as THREE from 'three';
import { createGame, step } from './core/gameState.js';
import { createScene, updateBackdrop } from './render/scene.js';
import { createRenderer } from './render/renderer.js';
import { createView } from './render/view.js';
import { createAudio } from './audio/sound.js';
import { createInput } from './input.js';
import { createHud } from './ui/hud.js';
import { createScreens } from './ui/screens.js';
import { createCompanion } from './ui/pixl.js';

const HS_KEY = 'stardust.highscore';

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');

const world = createScene();
const { composer, resize: resizeRenderer } = createRenderer(canvas, world.scene, world.camera);
const audio = createAudio();
const screens = createScreens(uiRoot, { onMute: () => audio.toggleMute() });
const view = createView(world, { onFlash: (a) => screens.flash(a) });
const hud = createHud(uiRoot);
const pixl = createCompanion(uiRoot);

const inputMgr = createInput();
inputMgr.onGesture(() => audio.resume());

// load + seed the game
let storedHigh = parseInt(localStorage.getItem(HS_KEY) || '0', 10) || 0;
const state = createGame({ highScore: storedHigh, seed: 0xc0ffee });
view.setPaletteImmediate('periwinkle');
view.syncCameraBase();

// ----- resize -----
function onResize() {
  resizeRenderer();
  world.resize();
  view.syncCameraBase();
}
window.addEventListener('resize', onResize);

// ----- mouse aim: unproject the pointer onto the play plane (y = 0) -----
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();
const ndc = new THREE.Vector2();

function buildInput() {
  const snap = inputMgr.snapshot();
  const k = (code) => snap.isDown(code);
  const thrust = {
    x: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0),
    y: (k('KeyS') || k('ArrowDown') ? 1 : 0) - (k('KeyW') || k('ArrowUp') ? 1 : 0),
  };

  let aim = { x: 0, y: 0 };
  if (snap.pointer.moved) {
    ndc.set(snap.pointer.ndcX, snap.pointer.ndcY);
    raycaster.setFromCamera(ndc, world.camera);
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      const dx = hitPoint.x - state.ship.x;
      const dy = hitPoint.z - state.ship.y;
      if (Math.hypot(dx, dy) > 0.6) aim = { x: dx, y: dy };
    }
  }

  return {
    thrust,
    aim,
    firePrimary: snap.leftDown || k('Space'),
    fireMissile: snap.rightDown || k('ShiftLeft') || k('ShiftRight'),
    ultimate: k('KeyE'),
    pause: k('KeyP') || k('Escape'),
    confirm: k('Enter') || k('Space'),
  };
}

// ----- main loop -----
let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;

  const input = buildInput();
  step(state, input, dt);
  window.__stardust.frames++;
  window.__stardust.lastInput = input;

  if (state.highScore > storedHigh) {
    storedHigh = state.highScore;
    try {
      localStorage.setItem(HS_KEY, String(storedHigh));
    } catch (e) {
      /* localStorage may be unavailable; ignore */
    }
  }

  audio.handleEvents(state.events);
  view.update(state, input, dt);
  updateBackdrop(world, now / 1000, dt);
  hud.update(state);
  pixl.update(state, dt);
  screens.update(state, dt);

  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// expose for debugging in the console (handy, harmless)
// exposed for debugging in the console + the headless smoke test (harmless)
window.__stardust = { state, world, frames: 0, lastInput: null };
