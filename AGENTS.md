# AGENTS.md — Stardust Drifter

> Working notes for any agent (or human) hacking on this project. This file is the
> single source of truth for "what is this and how is it built." `CLAUDE.md` is a
> symlink to this file.

## What this is

**Stardust Drifter** is a cozy-cool 3D space shooter built with **three.js** + **Vite**,
meant to be run locally (not hosted). You pilot the little neon ship *Mochi* with WASD +
mouse, blast/dodge "Husks," collect Starseeds, grab power-ups, and relight 5 constellations
across a gentle, well-developed story narrated by your companion AI **PIXL**. Aesthetic:
"kawaii spacecore" — modern HDR bloom + neon, softened with pastels and cuteness.

## Run it

```bash
npm install      # one time
npm run dev      # opens http://localhost:5173 in your browser — just play
npm test         # run the Vitest unit suite (pure game logic)
npm run build    # production build into dist/
```

Requires Node 18+ (developed on Node 20). No other setup, no asset downloads — all
art is generated procedurally in code and all audio is synthesized with WebAudio.

## Controls

- **WASD** — thrust (strafe-style on the play plane)
- **Mouse** — aim heading; ship banks toward aim
- **Left click / Space** — primary blaster (hold to autofire)
- **Right click / Shift** — homing missile (limited ammo, regenerates)
- **E** — Ultimate beam (when the meter is full)
- **P / Esc** — pause · **Enter** — start / advance dialogue

## Architecture (read `docs/03-architecture.md` for the full picture)

**The core rule: `src/core/` is pure** — no three.js, no DOM, no `window`, no
`Math.random`/`Date.now`. It's a deterministic simulation `step(state, input, dt)`.
Everything testable lives there. The renderer/UI/audio are "dumb" layers that read
core state and draw/play it.

```
src/
  core/     PURE game logic (unit-tested):
            vec2, rng, entities, weapons, spawn, collision, powerups,
            scoring, levels, gameState (the reducer), content/story
  render/   three.js: renderer+bloom, scene, pools, factories, particles, palette, view
  ui/       DOM overlay: hud, screens, pixl (companion dialogue)
  audio/    WebAudio synthesized SFX + generative music
  input.js  keyboard/mouse -> neutral Input object
  main.js   wires it all together + runs the rAF loop
tests/      Vitest specs mirroring src/core
docs/       product brief, story bible, architecture, game systems
```

Frame loop: `input -> core.step -> view.syncFromState -> hud/pixl.update -> audio(events) -> render`.
`step` emits transient `state.events` (sfx/explosion/pickup/...) consumed each frame.

## Conventions

- Gameplay math is 2D `(x, y)`; core-`y` maps to world-`z` (the XZ plane). Camera is a
  tilted 3/4 view.
- Tunable constants live next to their system (`entities.js`, `levels.js`).
- Keep `src/core` import-clean: it must run in plain Node for tests. If a test needs a
  browser API, the design is wrong — move logic into core, keep effects in the layers.
- Add a failing Vitest spec before changing core behavior (TDD).

## Docs

- `docs/01-product-brief.md` — vision, pillars, scope, "done" definition
- `docs/02-story-bible.md` — full PIXL dialogue & narrative
- `docs/03-architecture.md` — module map & data flow
- `docs/04-game-systems.md` — exact rules the core implements & tests verify

## Verification

- `npm test` — the pure-core unit suite (66 specs, all green).
- `scripts/smoke.mjs` — an optional end-to-end browser check that loads the built
  game in headless Chromium, plays through the intro, fights, fires a missile,
  pauses/resumes and asserts zero runtime errors. It needs Playwright:
  `npm i -D playwright && npx playwright install chromium`, then
  `npm run build && npm run preview -- --port 4173` in one shell and
  `node scripts/smoke.mjs` in another. (Headless Chromium throttles rAF to ~4fps,
  so the script gates on an in-page frame counter — not wall-clock.)

## Status

v1: 5 sectors, lives/score/combo/levels/power-ups, story, start/pause/win/gameover
screens, synthesized audio, pure-core unit suite. See `docs/01` for the done checklist.
