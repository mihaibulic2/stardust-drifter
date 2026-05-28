// Pure circle-vs-circle collision predicates. Every gameplay entity is a circle.
import { dist2 } from './vec2.js';

// True if two circles (cx,cy,r) overlap. Touching exactly at the boundary counts
// as overlapping (<=), which is the friendlier choice for a shooter.
export function overlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

// Convenience for entity objects with {x,y,radius}.
export function hit(a, b) {
  return overlap(a.x, a.y, a.radius, b.x, b.y, b.radius);
}

// Squared distance between entity centers (cheap; avoid sqrt in hot loops).
export function gap2(a, b) {
  return dist2(a, b);
}
