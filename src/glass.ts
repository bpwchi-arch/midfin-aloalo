/** Lazy loader for the WebGL "set in glass" moment. The static fallback is always rendered first. */
export function initGlass(reduced: boolean): void {
  const stage = document.getElementById('glass-stage');
  if (!stage || reduced) return;
  if (!capable()) return;

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import('./glass-webgl')
        .then((m) => m.mount(stage))
        .catch(() => {
          /* fallback stays */
        });
    },
    { rootMargin: '240px 0px' }
  );
  io.observe(stage);
}

function capable(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return false;
    if (nav.connection?.saveData) return false;
    return true;
  } catch {
    return false;
  }
}
