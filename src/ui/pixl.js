// PIXL companion: the story dialogue panel (typewriter) + the in-play mascot
// with pop-up barks.
import { el, pixlFace } from './dom.js';
import { PHASES } from '../core/gameState.js';

const DIALOGUE_PHASES = new Set([PHASES.STORY, PHASES.GAMEOVER]);
const PLAY_PHASES = new Set([PHASES.PLAYING, PHASES.CLEARED, PHASES.PAUSED]);

export function createCompanion(root) {
  // dialogue panel
  const dialogue = el('div', 'panel', '');
  dialogue.id = 'dialogue';
  const face = pixlFace();
  const body = el('div');
  body.style.flex = '1';
  const name = el('div', 'pixl-name', 'PIXL');
  const text = el('div', 'pixl-text');
  const textSpan = el('span');
  const cursor = el('span', 'cursor', '▌');
  text.append(textSpan, cursor);
  const hint = el('div', 'hint', 'press <kbd>Enter</kbd> to continue ▶');
  body.append(name, text, hint);
  dialogue.append(face, body);
  root.append(dialogue);

  // in-play mascot + bark
  const mascot = el('div');
  mascot.id = 'mascot';
  const bark = el('div', 'panel bark');
  const mFace = pixlFace();
  mascot.append(bark, mFace);
  root.append(mascot);

  let curLine = null;
  let shown = 0;
  let barkTimer = 0;

  return {
    update(state, dt) {
      const inDialogue = DIALOGUE_PHASES.has(state.phase) && state.story;
      dialogue.classList.toggle('show', !!inDialogue);
      if (inDialogue) {
        const line = state.story.lines[state.story.index] ?? '';
        if (line !== curLine) {
          curLine = line;
          shown = 0;
        }
        shown = Math.min(line.length, shown + dt * 42);
        textSpan.textContent = line.slice(0, Math.floor(shown));
        const done = shown >= line.length;
        cursor.style.display = done ? 'none' : 'inline';
        hint.style.opacity = done ? '0.55' : '0';
      } else {
        curLine = null;
      }

      // mascot visibility
      mascot.classList.toggle('show', PLAY_PHASES.has(state.phase));

      // barks from events
      for (const ev of state.events) {
        if (ev.type === 'bark') {
          bark.textContent = ev.text;
          bark.classList.add('show');
          barkTimer = 2.6;
        }
      }
      if (barkTimer > 0) {
        barkTimer -= dt;
        if (barkTimer <= 0) bark.classList.remove('show');
      }
    },
  };
}
