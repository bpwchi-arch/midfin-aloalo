// The film material: the opening loop in the hero, the pinned frame strip, and gentle parallax on the stills.

/** Set by vite.config.ts: true when public/film/loop-720.mp4 exists. */
declare const __HAS_LOOP__: boolean;
const HAS_LOOP = __HAS_LOOP__;

const desktopPointer = () => matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches;

/**
 * Loads the opening loop after the page has settled, so the poster is the first paint and
 * the video never competes with it. Phones in portrait get the upright cut.
 */
export function initHeroFilm(): void {
  const video = document.getElementById('hero-film-video') as HTMLVideoElement | null;
  if (!video || !HAS_LOOP) return;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return;

  const start = () => {
    const tall = innerWidth / innerHeight < 0.8;
    video.src = tall ? './film/loop-tall.mp4' : innerWidth > 1100 ? './film/loop-1080.mp4' : './film/loop-720.mp4';
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    video.play().catch(() => {
      /* autoplay refused (Low Power Mode, etc.): the poster stays */
    });
  };
  if (document.readyState === 'complete') setTimeout(start, 600);
  else addEventListener('load', () => setTimeout(start, 600), { once: true });
}


/** Scroll down, the strip runs sideways. Touch and reduced motion keep the native swipe row. */
export function initReel(reduced: boolean): void {
  const section = document.getElementById('reel');
  const row = document.getElementById('reel-row');
  if (!section || !row) return;
  const RATIO = 0.5; // page pixels scrolled per pixel the strip travels
  let travel = 0;
  let pinned = false;

  const layout = () => {
    const want = !reduced && desktopPointer();
    if (want !== pinned) {
      pinned = want;
      section.classList.toggle('is-pinned', pinned);
      if (!pinned) {
        section.style.height = '';
        row.style.transform = '';
      }
    }
    if (!pinned) return;
    travel = Math.max(0, row.scrollWidth - innerWidth);
    section.style.height = `${innerHeight + travel * RATIO}px`;
    update();
  };

  const update = () => {
    if (!pinned) return;
    const top = section.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, -top / (travel * RATIO || 1)));
    row.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
  };

  layout();
  addEventListener('resize', layout, { passive: true });
  addEventListener('load', layout, { once: true });
  addEventListener('scroll', update, { passive: true });
}

/** Stills drift at slightly different rates as they pass through the viewport. */
export function initParallax(reduced: boolean): void {
  if (reduced) return;
  const items = [...document.querySelectorAll<HTMLElement>('[data-speed]')];
  if (!items.length) return;
  const visible = new Set<HTMLElement>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target as HTMLElement);
        else visible.delete(e.target as HTMLElement);
      }
      schedule();
    },
    { rootMargin: '20% 0px' }
  );
  items.forEach((el) => io.observe(el));

  let queued = false;
  const shift = new WeakMap<HTMLElement, number>();
  const apply = () => {
    queued = false;
    const small = innerWidth < 900;
    const mid = innerHeight / 2;
    for (const el of visible) {
      const glass = el.closest<HTMLElement>('.glass');
      // On phones only the full-bleed glass frame moves; the stacked stills stay put.
      if (small && !glass) {
        if (shift.get(el)) {
          el.style.transform = '';
          shift.set(el, 0);
        }
        continue;
      }
      const r = (glass ?? el).getBoundingClientRect();
      const own = glass ? 0 : shift.get(el) ?? 0;
      const delta = r.top - own + r.height / 2 - mid;
      const y = -delta * Number(el.dataset.speed);
      shift.set(el, y);
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    }
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
}
