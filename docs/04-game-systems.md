# STARDUST DRIFTER — Game Systems (the rules, precisely)

This is the spec the pure `src/core` implements and that the unit tests verify.
All numbers are tunable constants in `src/core/entities.js` / `levels.js`.

---

## Units & frame model

- Distances in world units (wu). The play field is ~`[-46,46]` x by `[-30,30]` z.
- `step(state, input, dt)` advances by `dt` seconds. The loop clamps `dt ≤ 1/30`.
- Velocities in wu/s, fire rates in shots/s, durations in seconds.

## Entities (logical shape)

```
ship    { x,y, vx,vy, angle, radius, hp, maxHp, invuln }   // hp = shield points
bullet  { id, x,y, vx,vy, radius, dmg, life, friendly }
missile { id, x,y, vx,vy, radius, dmg, life, targetId, friendly }
enemy   { id, type, x,y, vx,vy, radius, hp, maxHp, fireCd, score, behavior }
seed    { id, x,y, vx,vy, radius, value }                   // Starseed pickup
power   { id, kind, x,y, vx,vy, radius, life }
particle(render-only; spawned from events)
```

Every moving entity is a circle (center + radius) → uniform collision.

## Ship / movement

- Thrust accelerates: `v += thrustDir * ACCEL * dt`, `ACCEL ≈ 110`.
- Damping each step: `v *= DAMP^dt` (`DAMP ≈ 0.12` per second → snappy stop).
- Max speed clamp `≈ 34 wu/s` (higher while boosting).
- `angle` eases toward aim direction (for banking visuals); aiming is instantaneous
  for firing direction.
- Soft bounds: outside the field, apply a restoring acceleration toward center.

## Weapons

### Primary blaster
- Fires while `firePrimary` held, gated by `fireCd` (cadence = `1/fireRate`).
- Base `fireRate = 6/s`, bullet speed `70`, dmg `1`.
- **Spread tiers** (from power-up): tier0 = 1 bullet; tier1 = 3-way (±10°);
  tier2 = 5-way (±10°, ±20°). Spread tier capped at 2.
- **Rapid fire** power-up multiplies fireRate ×1.8 for its duration.

### Homing missiles
- Secondary. Ammo `= 5`, regenerates 1 every `4s` up to max.
- On fire, locks the nearest enemy within a 60° frontal cone; steers toward it
  (turn rate limited), dmg `4`, larger blast (small splash radius `6`).
- If target dies/leaves, missile flies straight until `life` expires.

### Ultimate beam
- A meter `0..100`. Builds `+CHARGE_PER_KILL (=7)` per kill and via Overcharge power-up.
- At `≥100`, pressing `ultimate` fires a sweeping beam: clears all bullets on screen
  and deals heavy damage (`dmg 8`) to every enemy in a wide forward arc. Resets meter.

## Enemies (archetypes)

| type      | hp | score | behavior                                                        |
|-----------|----|-------|----------------------------------------------------------------|
| mote      | 1  | 50    | drifts slowly toward ship; no fire. (Sector 1 fodder)          |
| swarmer   | 2  | 80    | fast, weaves, occasional single shot                           |
| spitter   | 3  | 120   | keeps distance, fires aimed bullets on a cadence               |
| splitter  | 4  | 150   | on death spawns 2 motes (Sector 3+)                            |
| mirror    | 5  | 200   | periodic shield (invuln) windows; must time shots (Sector 4+)  |
| boss/husk | big| 1500  | multi-phase: rings of bullets, charges, weak-point core        |

- Enemy bullets: speed `26–34`, dmg `1` (removes 1 shield/heart on hit through shield).
- Behaviors are pure functions `(enemy, ship, dt, rng) -> {vx, vy, wantsFire}`.

## Collision (all circle-vs-circle)

- friendly bullet/missile ↔ enemy → damage enemy; remove bullet (missiles splash).
- enemy/enemy-bullet ↔ ship → if `ship.invuln<=0` and no active Shield power-up:
  ship loses 1 hp; if hp hits 0 → lose a life, reset shields, grant brief invuln,
  reset combo. Otherwise just brief invuln + knockback.
- ship ↔ seed → collect (score + meter? no — seeds give score & progress).
- ship ↔ power → apply power-up.
- ship ↔ asteroid (Sector 2) → damage like an enemy hit; asteroids are destructible.

## Lives & shields

- `lives` starts at `START_LIVES = 3`. Shown as hearts.
- `ship.maxHp = 3` shield points (small pips under the hearts). Losing all shields =
  losing one life; shields refill on respawn.
- Respawn: brief `invuln` (≈1.5s, ship blinks), positioned at field center, combo reset.
- **Game over** when `lives < 0` (i.e., you lose your last life). Phase → `gameover`.

## Extra lives

- Every `EXTRA_LIFE_EVERY = 5000` score → +1 life (tracked by `nextExtraLifeAt`).
- Rare `1up` power-up also grants +1 life. Lives capped at `MAX_LIVES = 6`.

## Scoring & combo

- Kill → `enemy.score`. Seed pickup → `seed.value (=25)`. 
- **Combo multiplier:** starts at ×1. Each kill raises a `comboCount`; the multiplier
  = `1 + floor(comboCount / 5)` capped at ×5. Getting hit resets combo to 0.
- Applied score = `base * multiplier`.
- **Wave-clear bonus:** `+250 * sectorIndex`. **No-hit wave bonus:** `+500` if you
  took no damage during that wave.
- High score persisted in localStorage (`stardust.highscore`). Core exposes a pure
  `isNewHighScore(score, prev)`.

## Power-ups

| kind        | duration | effect                                                    |
|-------------|----------|-----------------------------------------------------------|
| rapid       | 8s       | fireRate ×1.8                                             |
| spread      | —        | +1 spread tier (permanent within the run, capped at 2)   |
| shield      | 6s       | full damage immunity bubble                               |
| magnet      | 10s      | seeds steer toward the ship                               |
| overcharge  | instant  | ultimate meter → 100                                      |
| oneup       | instant  | +1 life (rare)                                            |

- Timed effects live in `state.effects` as `{kind, remaining}`; `step` decrements them.
- Drop logic: each enemy has a small drop chance; bosses guarantee drops. Drop kind is
  weighted (commons: rapid/shield/magnet; rare: spread/overcharge; very rare: oneup).

## Level / sector progression

- 5 sectors. Each = ordered list of **waves**; a wave is a set of spawn instructions
  `{type, count, interval, delay, pattern}`. Last wave of each sector is a boss/mini-boss
  (sectors 3 & 5 have real bosses; others have a heavy "elite" wave).
- A wave is **clear** when all its enemies are dead AND its spawns are exhausted.
- A sector is **clear** when all waves are clear → phase `cleared` → relight VFX +
  story outro beat → next sector intro → `playing`. After sector 5 → `win`.
- Difficulty scaling baked into wave defs (more enemies, tighter intervals, tougher
  archetypes per sector).

## Phase machine (`state.phase`)

```
title ──confirm──► story(introN) ──confirm──► playing
playing ──clear sector──► cleared(vfx) ──auto──► story(outroN)
story(outroN) ──confirm──► story(intro N+1) ... or ──► win (after sector 5)
playing ──lose last life──► gameover ──confirm──► title (or retry sector)
any ──pause──► paused ──pause──► (resume previous)
```

## Events (for render/audio/test)

`step` appends to `state.events` (cleared each frame after consumption):
`{type:'sfx', name}`, `{type:'explosion', x,y, color, size}`, `{type:'pickup', kind}`,
`{type:'relight'}`, `{type:'hit'}`, `{type:'bark', text}` (PIXL combat lines).

## What the unit tests must cover

1. `vec2`/`rng` math correctness & determinism.
2. Ship movement: accel, damping, max-speed clamp, soft bounds restore.
3. Blaster cadence & spread-tier bullet counts/angles; rapid-fire multiplier.
4. Missile lock selection (nearest in cone) & ammo regen.
5. Ultimate meter charge per kill, fire gating at 100, reset.
6. Collision predicates (overlap true/false at boundary).
7. Damage → shield loss → life loss → invuln → game over transition.
8. Scoring table, combo multiplier ramp/cap/reset, wave & no-hit bonuses.
9. Extra-life thresholds and cap.
10. Power-up application + timed-effect expiry.
11. Spawner emits correct counts/timing; wave-clear & sector-clear detection.
12. Phase machine transitions incl. win after sector 5 and gameover.
13. High-score compare + (mockable) persistence boundary.
