// Seedable PRNG (mulberry32). Deterministic -> tests & gameplay are reproducible.
// Never use Math.random() inside src/core; use an instance of this instead.

export function makeRng(seed = 1) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9; // avoid the degenerate all-zero state
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    // float in [0,1)
    next,
    // float in [min,max)
    range: (min, max) => min + next() * (max - min),
    // integer in [min,max] inclusive
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    // true with probability p
    chance: (p) => next() < p,
    // pick one element of arr
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // current seed snapshot (for save/debug)
    state: () => a >>> 0,
  };
}
