// Per-sector pastel/neon palettes. Colors are hex ints for three.js and also
// exposed as CSS strings for the DOM HUD. "Kawaii spacecore": soft but glowing.

export const PALETTES = {
  periwinkle: {
    name: 'The Hush',
    bg: 0x0b0a1f,
    fog: 0x141233,
    nebula: [0x6c7bf0, 0x9d8cff, 0x5fd2ff],
    star: 0xcdd6ff,
    enemy: 0x9d8cff,
    enemyCore: 0xe6e0ff,
    accent: 0x8ab6ff,
  },
  coral: {
    name: 'Cinder Reef',
    bg: 0x1a0a14,
    fog: 0x2a0f18,
    nebula: [0xff7a8a, 0xffb38a, 0xff5fa2],
    star: 0xffe6d6,
    enemy: 0xff8a6c,
    enemyCore: 0xfff0d6,
    accent: 0xffb38a,
  },
  mint: {
    name: 'The Lull',
    bg: 0x051613,
    fog: 0x0a241f,
    nebula: [0x5fffd2, 0x66f0c0, 0x7affe6],
    star: 0xd6fff2,
    enemy: 0x5fe6c0,
    enemyCore: 0xe0fff6,
    accent: 0x7affe6,
  },
  lavender: {
    name: 'Glasswake',
    bg: 0x140a1f,
    fog: 0x1f1233,
    nebula: [0xc88aff, 0xff8ae6, 0x9d8cff],
    star: 0xf0d6ff,
    enemy: 0xc88aff,
    enemyCore: 0xf6e0ff,
    accent: 0xff8ae6,
  },
  gold: {
    name: 'The Last Ember',
    bg: 0x1f1505,
    fog: 0x33260a,
    nebula: [0xffd96c, 0xfff0a0, 0xffb35f],
    star: 0xfff6d6,
    enemy: 0xffc86c,
    enemyCore: 0xfffae0,
    accent: 0xffe08a,
  },
};

// Ship + UI brand colors (constant across sectors so the player ship reads clearly).
export const SHIP_COLORS = {
  body: 0xfff0f6,
  bodyEmissive: 0xff9ed8,
  trim: 0x9ed8ff,
  core: 0xa0f0ff,
  thrust: 0xffb3e6,
};

export const PICKUP_COLORS = {
  seed: 0xfff1a8,
  rapid: 0xff7ad8,
  spread: 0x9d8cff,
  shield: 0x7ee8ff,
  magnet: 0xff9ec2,
  overcharge: 0xfff07a,
  oneup: 0xff5fa2,
};

export const toCss = (hex) => '#' + hex.toString(16).padStart(6, '0');

export function getPalette(id) {
  return PALETTES[id] || PALETTES.periwinkle;
}
