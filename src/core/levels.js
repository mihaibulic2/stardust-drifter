// The 5 sectors. Each sector is an ordered list of waves; the last wave of a
// sector is an elite/boss set-piece. Difficulty scales across sectors.
// Palette ids are shared with src/render/palette.js.
import { SECTOR_STORY } from './content/story.js';

export const SECTORS = [
  {
    number: 1,
    id: 'hush',
    name: 'The Hush',
    paletteId: 'periwinkle',
    constellation: 'Vela',
    waves: [
      { entries: [{ type: 'mote', count: 5, interval: 0.7, pattern: 'top' }] },
      { entries: [{ type: 'mote', count: 6, interval: 0.5, pattern: 'random' }] },
      {
        entries: [
          { type: 'swarmer', count: 4, interval: 0.6, pattern: 'sides' },
          { type: 'mote', count: 4, interval: 0.5, delay: 1.5, pattern: 'top' },
        ],
      },
    ],
  },
  {
    number: 2,
    id: 'cinder',
    name: 'Cinder Reef',
    paletteId: 'coral',
    constellation: 'Ember',
    waves: [
      {
        entries: [
          { type: 'asteroid', count: 4, interval: 0.9, pattern: 'random' },
          { type: 'swarmer', count: 5, interval: 0.5, delay: 1, pattern: 'top' },
        ],
      },
      {
        entries: [
          { type: 'spitter', count: 3, interval: 1.0, pattern: 'sides' },
          { type: 'swarmer', count: 6, interval: 0.4, delay: 1, pattern: 'random' },
        ],
      },
      {
        entries: [
          { type: 'asteroid', count: 5, interval: 0.6, pattern: 'random' },
          { type: 'spitter', count: 4, interval: 0.8, delay: 2, pattern: 'top' },
          { type: 'swarmer', count: 6, interval: 0.4, delay: 1, pattern: 'sides' },
        ],
      },
    ],
  },
  {
    number: 3,
    id: 'lull',
    name: 'The Lull',
    paletteId: 'mint',
    constellation: 'Sora',
    waves: [
      {
        entries: [
          { type: 'splitter', count: 3, interval: 1.0, pattern: 'top' },
          { type: 'swarmer', count: 6, interval: 0.4, delay: 1.5, pattern: 'random' },
        ],
      },
      {
        entries: [
          { type: 'spitter', count: 4, interval: 0.8, pattern: 'sides' },
          { type: 'splitter', count: 4, interval: 0.9, delay: 1, pattern: 'random' },
        ],
      },
      {
        boss: true,
        entries: [
          { type: 'miniboss', count: 1, pattern: 'boss' },
          { type: 'swarmer', count: 6, interval: 0.8, delay: 2, pattern: 'ring' },
        ],
      },
    ],
  },
  {
    number: 4,
    id: 'glasswake',
    name: 'Glasswake',
    paletteId: 'lavender',
    constellation: 'Lyra',
    waves: [
      {
        entries: [
          { type: 'mirror', count: 4, interval: 1.0, pattern: 'top' },
          { type: 'swarmer', count: 6, interval: 0.4, delay: 1, pattern: 'sides' },
        ],
      },
      {
        entries: [
          { type: 'mirror', count: 5, interval: 0.9, pattern: 'random' },
          { type: 'spitter', count: 5, interval: 0.7, delay: 1, pattern: 'sides' },
          { type: 'splitter', count: 3, interval: 1.0, delay: 2, pattern: 'top' },
        ],
      },
      {
        entries: [
          { type: 'mirror', count: 6, interval: 0.7, pattern: 'random' },
          { type: 'spitter', count: 6, interval: 0.6, delay: 1.5, pattern: 'sides' },
        ],
      },
    ],
  },
  {
    number: 5,
    id: 'ember',
    name: 'The Last Ember',
    paletteId: 'gold',
    constellation: 'the Lantern',
    waves: [
      {
        entries: [
          { type: 'swarmer', count: 8, interval: 0.35, pattern: 'random' },
          { type: 'spitter', count: 4, interval: 0.8, delay: 1, pattern: 'sides' },
        ],
      },
      {
        entries: [
          { type: 'mirror', count: 5, interval: 0.7, pattern: 'top' },
          { type: 'splitter', count: 5, interval: 0.8, delay: 1, pattern: 'random' },
          { type: 'spitter', count: 5, interval: 0.7, delay: 2, pattern: 'sides' },
        ],
      },
      {
        boss: true,
        entries: [
          { type: 'boss', count: 1, pattern: 'boss' },
          { type: 'mirror', count: 4, interval: 1.2, delay: 3, pattern: 'ring' },
          { type: 'swarmer', count: 8, interval: 0.6, delay: 5, pattern: 'sides' },
        ],
      },
    ],
  },
];

export const SECTOR_COUNT = SECTORS.length;

export function getSector(number) {
  return SECTORS.find((s) => s.number === number) || null;
}

export function sectorStory(number) {
  return SECTOR_STORY[number] || { intro: [], outro: [] };
}

// Is this the final wave of the sector?
export function isLastWave(sector, waveIndex) {
  return waveIndex >= sector.waves.length - 1;
}
