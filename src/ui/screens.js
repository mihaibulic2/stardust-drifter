// Full-screen overlays: title, pause, victory, game-over — plus the white
// flash effect and the mute button.
import { el } from './dom.js';
import { PHASES } from '../core/gameState.js';
import { TITLE } from '../core/content/story.js';

export function createScreens(root, { onMute } = {}) {
  // title
  const title = el('div', 'overlay');
  title.innerHTML = `
    <div class="title-logo"><span class="title-star">✦</span> ${TITLE.name} <span class="title-star">✦</span></div>
    <div class="subtitle">${TITLE.tagline}</div>
    <div class="prompt">press <kbd>Enter</kbd> to begin</div>
    <div class="controls">
      <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp;·&nbsp; <kbd>mouse</kbd> aim<br/>
      <kbd>click</kbd>/<kbd>Space</kbd> blaster &nbsp;·&nbsp; <kbd>right-click</kbd>/<kbd>Shift</kbd> missile<br/>
      <kbd>E</kbd> ultimate &nbsp;·&nbsp; <kbd>P</kbd> pause
    </div>`;
  const titleHigh = el('div', 'hud-high', '');
  titleHigh.style.marginTop = '8px';
  title.append(titleHigh);

  // pause
  const pause = el('div', 'overlay');
  pause.innerHTML = `<div class="big">paused</div><div class="prompt">press <kbd>P</kbd> to resume</div>`;

  // won
  const won = el('div', 'overlay');
  const wonBig = el('div', 'big', 'the stars are singing ✦');
  const wonScore = el('div', 'score-line', '');
  const wonHigh = el('div', 'newhigh', '');
  const wonPrompt = el('div', 'prompt', 'press <kbd>Enter</kbd> to return');
  won.append(wonBig, wonScore, wonHigh, wonPrompt);

  // game over
  const over = el('div', 'overlay');
  const overBig = el('div', 'big', 'the light went out');
  const overScore = el('div', 'score-line', '');
  const overHigh = el('div', 'newhigh', '');
  const overPrompt = el('div', 'prompt', 'press <kbd>Enter</kbd> to try again');
  over.append(overBig, overScore, overHigh, overPrompt);

  // flash + mute
  const flash = el('div');
  flash.id = 'flash';
  const mute = el('div', 'panel clickable', '🔊');
  mute.id = 'mute';
  mute.title = 'mute / unmute';
  mute.addEventListener('click', () => {
    const muted = onMute ? onMute() : false;
    mute.textContent = muted ? '🔇' : '🔊';
  });

  root.append(title, pause, won, over, flash, mute);

  let flashV = 0;

  function scoreText(state) {
    return `score <b>${state.score.toLocaleString()}</b> &nbsp;·&nbsp; best <b>${Math.max(
      state.highScore,
      state.score
    ).toLocaleString()}</b>`;
  }

  return {
    flash(amount = 0.4) {
      flashV = Math.max(flashV, amount);
    },
    update(state, dt) {
      title.classList.toggle('show', state.phase === PHASES.TITLE);
      pause.classList.toggle('show', state.phase === PHASES.PAUSED);
      won.classList.toggle('show', state.phase === PHASES.WON);
      over.classList.toggle('show', state.phase === PHASES.GAMEOVER);

      if (state.phase === PHASES.TITLE) {
        titleHigh.textContent = state.highScore > 0 ? `best ${state.highScore.toLocaleString()}` : '';
      }
      if (state.phase === PHASES.WON) {
        wonScore.innerHTML = scoreText(state);
        wonHigh.textContent = state.newHigh ? '✦ new high score! ✦' : '';
      }
      if (state.phase === PHASES.GAMEOVER) {
        overScore.innerHTML = scoreText(state);
        overHigh.textContent = state.newHigh ? '✦ new high score! ✦' : '';
      }

      if (flashV > 0) {
        flash.style.opacity = String(Math.min(0.85, flashV));
        flashV = Math.max(0, flashV - dt * 2.2);
      } else {
        flash.style.opacity = '0';
      }
    },
  };
}
