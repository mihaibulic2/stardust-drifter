// Tiny DOM helper.
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// The CSS-drawn PIXL face (glowing origami fox-cat). Cute on purpose.
export function pixlFace() {
  const f = el('div', 'pixl-face');
  f.innerHTML = `
    <div class="pixl-ear l"></div>
    <div class="pixl-ear r"></div>
    <div class="pixl-head"></div>
    <div class="pixl-eye l"></div>
    <div class="pixl-eye r"></div>
    <div class="pixl-blush l"></div>
    <div class="pixl-blush r"></div>`;
  return f;
}
