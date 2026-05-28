// All narrative text, lifted from docs/02-story-bible.md. Pure data.
// Each sector has an `intro` (before play) and `outro` (after clearing) — arrays of
// lines shown one panel at a time by the UI typewriter.

export const TITLE = {
  name: 'STARDUST DRIFTER',
  tagline: 'relight the stars, one constellation at a time',
};

export const SECTOR_STORY = {
  1: {
    intro: [
      '...oh! you’re awake. good, good.',
      'um — I’m PIXL. I think? that feels right.',
      'I don’t remember much, but I know this: those stars up there are going out.',
      'and we can stop it. ready when you are, Drifter.',
    ],
    outro: [
      'it lit. it actually lit! did you see that??',
      'and — oh. I remember this one. its name is Vela.',
      'how do I know that?',
    ],
  },
  2: {
    intro: [
      'the Husks are thicker here, and there’s rock everywhere — watch the asteroids, okay?',
      'I’d be sad if you got a dent. ...why do I care so much? weird.',
      'anyway. let’s warm this place up.',
    ],
    outro: [
      'Cinder Reef. I named this. I was here before, a long time ago, I—',
      'it’s like remembering a song you didn’t know you knew.',
    ],
  },
  3: {
    intro: [
      'feel that? it’s quieter here. the Lull.',
      'the Hush is strongest where things were happiest once.',
      'there’s something big curled around the heart-star. stay sharp.',
      'we relight this one together.',
    ],
    outro: [
      'you did it. you actually — okay, I have to tell you something.',
      'when the stars light up, I get a piece back. of me.',
      'and the pieces are... old. older-than-the-galaxy old.',
      'Drifter, what am I?',
    ],
  },
  4: {
    intro: [
      'mirrors. of course it’s mirrors.',
      'the Husks here throw your own light back at you — shields up, pick your moment.',
      'I trust you. I really do. I don’t know why I trust you this much. it’s nice.',
    ],
    outro: [
      'I remember the Lantern now. the thing that sang the stars awake. it’s gone. it broke.',
      'the pieces I keep getting back? Drifter.',
      'I think they’re the Lantern. I think I’m the Lantern. or — what’s left of it.',
    ],
  },
  5: {
    intro: [
      'one left. the heart of it all. I remember everything now — almost.',
      'I didn’t die, I hid. I split myself up and tucked the pieces into the stars.',
      'and I made myself small and forgetful so that someone — so that you — could help me find them.',
      'one more star, Drifter. let’s bring the light home.',
    ],
    outro: [
      '...listen. hear that? the stars are singing again. I’m whole.',
      'I could be the big quiet Lantern again, way up high, alone. ...nah.',
      'I like it down here. I like the dents and the boost and the way you fly.',
      'I’m staying. with you. thanks for relighting me too, Drifter.',
    ],
  },
};

export const WIN = [
  'the whole sky is lit. every constellation, singing.',
  'we did it, Drifter. you and me.',
  'now — wanna go see them all lit up? together?',
];

export const GAME_OVER = [
  '...the light went out. that’s okay. that’s okay. it happens.',
  'take a breath. wanna try again?',
  'I’ll be right here. I’m always right here.',
];

// Random in-combat barks, by trigger.
export const BARKS = {
  combo: ['ooh, combo!', 'nice shot!', 'you’re on fire!', 'keep it going!'],
  hit: ['careful!', 'oof — you good?', 'shake it off!'],
  low: ['hey, careful, careful — I’ve got you, just breathe.', 'last one — you can do this.'],
  power: ['ooh shiny! grab it grab it!', 'power-up!', 'oh I love that one!'],
  oneup: ['one-up! the galaxy’s looking out for you.', 'extra heart! yay!'],
  relight: ['it’s lighting up!', 'look at it glow!', 'so pretty...'],
  boss: ['big one! stay sharp!', 'okay okay — this is the heart-star. focus!'],
};
