// The heads-up display: hearts (lives), shield pips, score, combo, sector name,
// ultimate meter, missile ammo, and the relight banner.
import { el } from './dom.js';
import { comboMultiplier } from '../core/scoring.js';
import { SECTORS } from '../core/levels.js';
import { MISSILE, SHIP } from '../core/entities.js';
import { PHASES } from '../core/gameState.js';

const SHOW_PHASES = new Set([PHASES.PLAYING, PHASES.CLEARED, PHASES.PAUSED]);

export function createHud(root) {
  const hud = el('div');
  hud.id = 'hud';

  // top center
  const top = el('div', 'hud-top');
  const sector = el('div', 'hud-sector', '');
  const score = el('div', 'hud-score', '0');
  const high = el('div', 'hud-high', '');
  const combo = el('div', 'hud-combo', '');
  top.append(sector, score, combo, high);

  // left: hearts + pips
  const left = el('div', 'panel hud-left');
  const hearts = el('div', 'hearts', '');
  const pips = el('div', 'pips');
  const pipEls = [];
  for (let i = 0; i < SHIP.MAX_HP; i++) {
    const p = el('div', 'pip');
    pipEls.push(p);
    pips.append(p);
  }
  left.append(hearts, pips);

  // right: ultimate meter + missiles
  const right = el('div', 'panel hud-right');
  const ultLabel = el('div', 'meter-label', '✦ Ultimate');
  const meter = el('div', 'meter');
  const meterFill = el('div', 'meter-fill');
  meter.append(meterFill);
  const ammoLabel = el('div', 'meter-label', '✦ Missiles');
  const ammo = el('div', 'ammo');
  const ammoEls = [];
  for (let i = 0; i < MISSILE.MAX_AMMO; i++) {
    const d = el('div', 'ammo-dot');
    ammoEls.push(d);
    ammo.append(d);
  }
  right.append(ultLabel, meter, ammoLabel, ammo);

  // relight banner
  const banner = el('div', 'banner');
  const bannerH = el('h2', null, '');
  const bannerP = el('p', null, 'relighting');
  banner.append(bannerH, bannerP);

  hud.append(top, left, right, banner);
  root.append(hud);

  let prevLives = -1;

  return {
    update(state) {
      hud.classList.toggle('show', SHOW_PHASES.has(state.phase));
      if (!SHOW_PHASES.has(state.phase)) return;

      const sec = SECTORS[state.sectorIndex];
      sector.textContent = `Sector ${sec.number} — ${sec.name}`;
      score.textContent = state.score.toLocaleString();
      const best = Math.max(state.highScore, state.score);
      high.textContent = `best ${best.toLocaleString()}`;

      const mult = comboMultiplier(state.combo);
      if (mult >= 2) {
        combo.textContent = `combo ×${mult}`;
        combo.classList.add('show');
      } else {
        combo.classList.remove('show');
      }

      if (state.lives !== prevLives) {
        prevLives = state.lives;
        hearts.innerHTML = Array.from({ length: Math.max(state.lives, 0) }, () => '♥').join(' ') || '·';
      }

      for (let i = 0; i < pipEls.length; i++) {
        pipEls[i].classList.toggle('empty', i >= state.ship.hp);
      }

      meterFill.style.width = `${Math.min(100, state.ultimate)}%`;
      meter.classList.toggle('full', state.ultimate >= 100);

      for (let i = 0; i < ammoEls.length; i++) {
        ammoEls[i].classList.toggle('empty', i >= state.missileAmmo);
      }

      const relighting = state.phase === PHASES.CLEARED;
      banner.classList.toggle('show', relighting);
      if (relighting) bannerH.textContent = `✦ ${sec.constellation} relit ✦`;
    },
  };
}
