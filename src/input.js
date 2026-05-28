// Raw keyboard + pointer capture. Call snapshot() once per frame to get a stable
// per-frame view. Crucially, snapshot() also reports keys/buttons that were tapped
// *between* frames (pressed and released faster than one rAF tick) so a quick tap
// is never dropped — the core does its own edge detection on top of this.
export function createInput() {
  const keys = new Set(); // physically held right now
  const pressedBuffer = new Set(); // keydowns since the last snapshot
  const pointer = { ndcX: 0, ndcY: 0, moved: false };
  const buttons = { left: false, right: false };
  const buttonPressed = { left: false, right: false }; // clicks since last snapshot
  let onGesture = null;

  const isFormEl = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

  window.addEventListener('keydown', (e) => {
    if (isFormEl(e.target)) return;
    keys.add(e.code);
    pressedBuffer.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (onGesture) onGesture();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('mousemove', (e) => {
    pointer.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.moved = true;
  });
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      buttons.left = true;
      buttonPressed.left = true;
    }
    if (e.button === 2) {
      buttons.right = true;
      buttonPressed.right = true;
    }
    if (onGesture) onGesture();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) buttons.left = false;
    if (e.button === 2) buttons.right = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    keys.clear();
    buttons.left = buttons.right = false;
  });

  return {
    pointer,
    onGesture(fn) {
      onGesture = fn;
    },
    // A stable view for this frame. Held keys OR keys tapped since the last call
    // read as down exactly once; then the tap buffer is cleared.
    snapshot() {
      const down = new Set(keys);
      for (const c of pressedBuffer) down.add(c);
      const leftDown = buttons.left || buttonPressed.left;
      const rightDown = buttons.right || buttonPressed.right;
      pressedBuffer.clear();
      buttonPressed.left = buttonPressed.right = false;
      return {
        isDown: (code) => down.has(code),
        leftDown,
        rightDown,
        pointer,
      };
    },
  };
}
