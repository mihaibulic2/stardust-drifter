// Pure 2D vector helpers. Gameplay runs on a 2D plane (core-y maps to world-z).
// Vectors are plain { x, y } objects. Functions are non-mutating unless named *Mut.

export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a, s) => ({ x: a.x * s, y: a.y * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const len = (a) => Math.hypot(a.x, a.y);
export const len2 = (a) => a.x * a.x + a.y * a.y;

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const normalize = (a) => {
  const l = Math.hypot(a.x, a.y);
  if (l < 1e-9) return { x: 0, y: 0 };
  return { x: a.x / l, y: a.y / l };
};

// Clamp a vector's magnitude to max.
export const clampLen = (a, max) => {
  const l = Math.hypot(a.x, a.y);
  if (l <= max || l < 1e-9) return { x: a.x, y: a.y };
  const s = max / l;
  return { x: a.x * s, y: a.y * s };
};

export const fromAngle = (angle, mag = 1) => ({
  x: Math.cos(angle) * mag,
  y: Math.sin(angle) * mag,
});

export const angleOf = (a) => Math.atan2(a.y, a.x);

// Smallest signed difference between two angles, in (-PI, PI].
export const angleDiff = (a, b) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// Rotate `current` toward `target` by at most maxStep radians.
export const rotateToward = (current, target, maxStep) => {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
