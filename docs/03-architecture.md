# STARDUST DRIFTER — Architecture

## Guiding principle: pure core, dumb renderer

The single most important decision: **all game rules live in a pure, framework-free
`src/core/` layer that knows nothing about three.js, the DOM, or `window`.** The
renderer reads core state and draws it. This makes the rules:

- **Unit-testable** without a browser/WebGL (true TDD with Vitest in Node).
- **Deterministic** — the simulation takes `(state, input, dt)` and returns new state.
- **Replaceable** — we could swap three.js for anything; the game still works.

```
┌──────────────────────────────────────────────────────────────┐
│ main.js  (the only file that wires everything; runs the loop)  │
└───────────────┬───────────────────────────┬──────────────────┘
                │                            │
        reads input from              steps the sim
                │                            │
        ┌───────▼────────┐          ┌────────▼─────────┐
        │ src/ui (DOM)   │          │ src/core (PURE)  │  ← unit tested
        │  HUD, screens, │          │  state, systems, │
        │  PIXL dialogue │          │  math, content   │
        └───────▲────────┘          └────────┬─────────┘
                │                            │
        reads state to draw        provides state snapshot
                │                            │
        ┌───────┴────────┐          ┌────────▼─────────┐
        │ src/render     │◄─────────│   (state)        │
        │ three.js scene │          └──────────────────┘
        │ bloom, meshes  │
        └────────────────┘
        ┌────────────────┐
        │ src/audio      │  WebAudio SFX/music (synthesized, no asset files)
        └────────────────┘
```

## Module map

### `src/core/` — pure logic (no imports from three/DOM)
- `vec2.js` — tiny 2D vector helpers (game plays on the XZ plane, so 2D math drives it).
- `rng.js` — seedable PRNG (mulberry32) so tests are deterministic and gameplay can be seeded.
- `entities.js` — factory + constants for ship, bullets, missiles, enemies, starseeds, powerups, particles (logical only — position/velocity/radius/hp/type).
- `weapons.js` — fire logic: blaster cadence, spread tiers, missile lock/ammo, ultimate charge.
- `spawn.js` — wave definitions per sector and the spawner that emits enemies over time.
- `collision.js` — circle-vs-circle broadphase + resolution helpers (pure predicates).
- `powerups.js` — power-up definitions, application, and timed-effect bookkeeping.
- `scoring.js` — points table, combo multiplier, life thresholds, high-score compare.
- `levels.js` — sector definitions (palette ids, wave lists, boss, story beat keys).
- `gameState.js` — the reducer: `createGame()`, `step(state, input, dt)`, phase machine
  (`title → story → playing → cleared → story → ... → win | gameover`).
- `content/story.js` — all PIXL dialogue (imported from story bible), keyed by beat.
- `index.js` — re-exports the public core API.

### `src/render/` — three.js (imports three)
- `renderer.js` — WebGLRenderer + EffectComposer (UnrealBloom) setup, resize.
- `scene.js` — camera, lights, starfield, nebula backdrop, fog.
- `pools.js` — object pools mapping core entity ids → meshes (no per-frame allocation).
- `factories.js` — mesh/material builders for ship, enemies, projectiles, pickups.
- `particles.js` — GPU-ish particle bursts (Points) for explosions, thrust, sparkles.
- `palette.js` — per-sector color palettes (pastel/neon), shared by render + UI.
- `view.js` — top-level: `syncFromState(state, dt)` reconciles meshes with core state.

### `src/ui/` — DOM overlay (no three)
- `hud.js` — hearts (lives), score, combo, sector name, ultimate meter, powerup timers.
- `screens.js` — title, story/dialogue panel (PIXL portrait + typewriter), pause, win, gameover.
- `pixl.js` — the animated companion portrait + typewriter dialogue driver.

### `src/audio/` 
- `sound.js` — WebAudio context, synthesized SFX (laser, hit, explosion, pickup, ui),
  and a simple generative lo-fi music bed. Respects a mute toggle. No external files.

### `src/input.js`
- Maps keyboard/mouse events into the neutral `Input` object the core consumes
  (`{ thrust:{x,y}, aim:{x,y}, firePrimary, fireMissile, ultimate, pause, confirm }`).

## The frame loop (in `main.js`)

```
requestAnimationFrame loop:
  dt = clamp(now - last, 0, 1/30)          // clamp to avoid tunneling on tab-switch
  input = inputManager.snapshot()
  state = core.step(state, input, dt)       // pure: returns next state
  view.syncFromState(state, dt)             // three.js draws
  hud.update(state); pixl.update(state)      // DOM overlay
  audio.handleEvents(state.events)           // play queued one-shot sfx
  renderer.render()
```

`core.step` also produces a transient `state.events` array (e.g.
`{type:'explosion', x, z, color}`, `{type:'sfx', name:'laser'}`) that the render/audio
layers consume each frame and that tests can assert on directly.

## Coordinate system

- Gameplay happens on the **XZ plane** (y≈0). Camera looks down at a slight tilt
  (≈55°) for a modern 3/4 view with parallax depth, not a flat top-down.
- Core math is 2D `(x, y)` where core-`y` maps to world-`z`. Keeps the sim simple and
  testable while the view gets full 3D flair (banking, depth, particles in 3D).
- Play field is a soft-bounded rectangle; the ship is gently pushed back in-bounds
  (no hard walls — feels nicer).

## Determinism & testing seam

- `createGame({ seed })` seeds the RNG. Given the same seed + same input sequence,
  `step` is fully deterministic → spawn/collision/scoring all unit-testable.
- No `Date.now()`/`Math.random()` inside `src/core` (only the seeded RNG). Time is
  passed in as `dt`. This is what lets the test suite be reliable.

## Performance choices

- Object pooling in `render/pools.js` — meshes are reused, never created per frame.
- Particles via `THREE.Points` with a capped budget.
- Single bloom pass tuned for the pastel-neon look.
- Entity caps per type so worst-case wave counts stay at 60fps.
