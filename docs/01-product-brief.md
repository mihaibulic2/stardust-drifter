# STARDUST DRIFTER — Product Brief

> A cozy-cool 3D space shooter where you relight a dying galaxy, one constellation
> at a time, with the help of a tiny holographic companion named **PIXL**.

---

## 1. One-liner

Pilot the **Mochi**, a sleek little neon starfighter, through a galaxy where the
stars are going quiet. Blast, dodge, and collect **Starseeds** to relight the
constellations — while your AI companion PIXL slowly remembers who she used to be.

## 2. Vibe / Tone

**"Kawaii Spacecore."** Two feelings held at once:

- **Cool & modern:** HDR bloom, volumetric neon glow, smooth bezier camera moves,
  particle trails, depth-of-field-style fog, juicy screen shake, a synthwave-meets-
  lo-fi soundscape. Absolutely *not* retro/pixelated. Think Apple-keynote-clean meets
  *No Man's Sky* light.
- **Cute & adorable:** soft pastel nebulae (cotton-candy pinks, mint, periwinkle),
  a chibi companion who blinks and bounces, sparkle pickups, enemies that are more
  "grumpy space dust bunnies" than monsters, hearts for lives, little victory wiggles.

The intended reaction: *"oh my gosh it's so pretty AND so cute."*

## 3. Target player

- Casual-to-mid players who want something beautiful and chill but with real arcade
  punch when they want it.
- Sessions of 5–20 minutes. Pick up and play.
- Plays on a laptop with keyboard. No install beyond Node.

## 4. Core fantasy

You are a *lamplighter for the stars*. The galaxy is lonely and dimming; you bring
warmth and light back to it. The combat is the obstacle; the **relighting** is the
reward — every cleared sector visibly blooms back to color.

## 5. Pillars (every decision serves these)

1. **It should feel good to move.** Responsive WASD flight, momentum, a satisfying
   boost. Movement alone is fun.
2. **It should be gorgeous in motion.** Light, bloom, color, particles. Screenshots
   should look like wallpaper.
3. **It should be warm.** PIXL talks to you. The story is gentle and earned. Winning
   feels like healing something, not just scoring.
4. **It should be fair & readable.** Cute does not mean confusing. Threats are clearly
   telegraphed; the player always understands why they got hit.

## 6. Core loop

```
Enter sector  ->  Waves of enemies spawn  ->  Shoot / dodge / collect Starseeds & power-ups
      ^                                                        |
      |                                                        v
  Next sector  <-  Sector relights (story beat from PIXL)  <-  Clear all waves / beat boss
```

## 7. Progression

- **5 Sectors (levels)**, each a themed constellation with its own palette & enemies:
  1. **The Hush** (periwinkle) — tutorial calm, drifting dust-motes.
  2. **Cinder Reef** (warm coral/orange) — faster swarmers, asteroid hazards.
  3. **The Lull** (mint/teal) — splitting enemies, first mini-boss.
  4. **Glasswake** (lavender/magenta) — mirror/shielded foes, crystal field.
  5. **The Last Ember** (gold/white) — finale, full boss, story climax.
- Each sector ends with a **boss or set-piece** and a **story beat**.
- Difficulty scales: enemy count, speed, fire rate, and new enemy archetypes.

## 8. Scoring, lives, points

- **Score:** per kill (varies by enemy), Starseed pickups, wave-clear bonus,
  no-hit wave bonus, and a combo multiplier that builds as you kill without being hit.
- **Lives:** start with 3 (shown as hearts). Lose one when shields break. Extra life
  at score thresholds (e.g. every 5,000) and as a rare power-up.
- **High score** persisted locally (localStorage) so there's a reason to replay.

## 9. Power-ups (drop from enemies / Starseed caches)

| Power-up      | Icon idea     | Effect                                            |
|---------------|---------------|---------------------------------------------------|
| Rapid Fire    | pink bolt     | +fire rate for a duration                         |
| Spread Shot   | trefoil       | primary fires 3-way then 5-way (stacks one tier)  |
| Shield        | bubble        | temporary invulnerability bubble                  |
| Magnet        | heart-magnet  | pulls Starseeds toward you                        |
| Overcharge    | star          | instantly fills the ultimate beam meter           |
| 1-Up          | big heart     | +1 life (rare)                                    |

## 10. Controls

- **WASD** — thrust (W/S forward-back along facing, A/D strafe) on the gameplay plane.
- **Mouse** — aim ship heading (twin-stick feel); ship banks toward aim.
- **Left click / Space** — primary blaster (hold to autofire).
- **Right click / Shift** — fire homing missile (limited ammo, regenerates).
- **E** — release charged Ultimate Beam when meter is full.
- **P / Esc** — pause. **Enter** — advance dialogue / start.

(Pure-keyboard fallback: arrow keys aim if no mouse movement.)

## 11. Companion: PIXL

A palm-sized holographic sprite (think a glowing origami fox-cat) that lives in the
HUD corner. She:
- Narrates the story between sectors and reacts in-combat ("ooh, nice combo!",
  "careful — incoming!").
- Has her own arc: she boots up not remembering why she exists, and across the 5
  sectors recovers fragments of memory tied to each relit constellation. The twist
  (kept gentle, not grim) lands in the finale.

## 12. Failure & restart

- Lose all lives → soft game-over ("the light went out... let's try again, okay?").
  Shows score, high score, sector reached. One click to restart from current sector
  or from the start (player choice). Never punishing or shaming — it's cozy.

## 13. Out of scope (v1)

- Multiplayer, accounts, online leaderboards, mobile/touch, controller support,
  procedural infinite mode. (All noted as nice future ideas.)

## 14. Definition of "done & polished"

- Runs with `npm install && npm run dev`, no console errors, 60fps on a modern laptop.
- All 5 sectors playable start-to-finish, with the full story.
- Lives/score/levels/power-ups all functional and visible in the HUD.
- Pure game-logic layer covered by passing unit tests (`npm test`).
- Looks genuinely beautiful and cute in screenshots.
- Has a pause menu, a start screen, and a game-over screen.
