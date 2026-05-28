// Tiny object pool: reuse meshes instead of allocating per frame. Meshes stay in
// the scene; we just toggle visibility.
export function createPool(scene, createFn) {
  const free = [];
  const all = [];
  return {
    acquire() {
      let m = free.pop();
      if (!m) {
        m = createFn();
        scene.add(m);
        all.push(m);
      }
      m.visible = true;
      return m;
    },
    release(m) {
      m.visible = false;
      free.push(m);
    },
    dispose() {
      for (const m of all) scene.remove(m);
      all.length = 0;
      free.length = 0;
    },
  };
}
