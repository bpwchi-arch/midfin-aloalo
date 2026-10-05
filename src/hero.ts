import gsap from 'gsap';
import { HERO_PATH, HERO_OFFSET, FIN_W, FIN_H } from './fin-path';

const $ = <T extends Element>(sel: string) => document.querySelector(sel) as T;

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The hero field is one SVG in factory cut-guide units. The print pattern is userSpaceOnUse,
 * so the viewBox can move freely and the fin piece always carries exactly the patch of print
 * that is on the real fin. The WebGL flight (flight.ts) lands on this same view, pixel for pixel.
 */
export class Hero {
  svg = $<SVGSVGElement>('#hero-svg');
  cut = $<SVGPathElement>('#hero-cut');
  piece = $<SVGGElement>('#hero-piece');
  piecePath = $<SVGPathElement>('#hero-piece-path');
  dim = $<SVGRectElement>('#hero-dim');
  copy = $<HTMLElement>('#hero-copy');
  img = $<SVGImageElement>('#print-img');
  mark = $<HTMLElement>('#hero-mark');
  view: View = { x: 0, y: 0, w: 3900, h: 3450 };
  private played = false;
  private cx = HERO_OFFSET.x + FIN_W / 2;
  private cy = HERO_OFFSET.y + FIN_H / 2;

  constructor() {
    this.cut.setAttribute('d', HERO_PATH);
    this.piecePath.setAttribute('d', HERO_PATH);
    this.layout();
    addEventListener('resize', () => this.layout(), { passive: true });
  }

  layout(): void {
    const r = this.svg.getBoundingClientRect();
    const w = r.width > 0 ? r.width : innerWidth;
    const h = r.height > 0 ? r.height : innerHeight;
    // units per CSS px: fin no wider than 86% of the viewport, no taller than 46% of it
    const s = Math.max(FIN_W / (0.86 * w), FIN_H / (0.46 * h));
    const vw = w * s;
    const vh = h * s;
    this.view = { x: this.cx - vw / 2, y: this.cy - 0.36 * vh, w: vw, h: vh };
    this.svg.setAttribute('viewBox', `${this.view.x} ${this.view.y} ${vw} ${vh}`);
    // Keep the pattern-filled rects just larger than the view instead of enormous.
    const pad = Math.max(vw, vh);
    for (const rect of this.svg.querySelectorAll<SVGRectElement>('rect')) {
      rect.setAttribute('x', String(this.view.x - pad));
      rect.setAttribute('y', String(this.view.y - pad));
      rect.setAttribute('width', String(vw + pad * 2));
      rect.setAttribute('height', String(vh + pad * 2));
    }
    // The page starts on a 1000px tile; sharper screens swap in 1500 or 3000 once settled.
    const tilePx = (3600 / s) * Math.min(devicePixelRatio || 1, 2);
    const want = tilePx > 1700 ? '3000' : tilePx > 900 ? '1500' : '1000';
    if (want !== '1000' && this.img.dataset.hi !== want) {
      this.img.dataset.hi = want;
      const src = `./assets/aloalo-tile-${want}.webp`;
      const hi = new Image();
      hi.onload = () => this.img.setAttribute('href', src);
      hi.src = src;
    }
  }

  /** Reduced motion: the end state, no animation. */
  setEndState(): void {
    gsap.set(this.cut, { strokeDashoffset: 0, attr: { opacity: 0.35 } });
    gsap.set(this.dim, { attr: { opacity: 0.82 } });
    this.piece.setAttribute('filter', 'url(#lift)');
    gsap.set(this.piece, { attr: { opacity: 1 } });
    gsap.set(this.copy, { opacity: 1 });
    this.mark.hidden = true;
    this.played = true;
  }

  /** The cut: line traces the outline, field dims, the piece lifts, the lockup and name resolve. */
  playCut(delay = 0.15): void {
    if (this.played) return;
    this.played = true;
    const { cut, dim, piece, copy, svg, mark } = this;
    const tl = gsap.timeline({ delay });
    tl.to(mark, { opacity: 0, duration: 0.8 }, 0)
      .to(cut, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
      .to(dim, { attr: { opacity: 0.82 }, duration: 0.7, ease: 'power2.out' }, '-=0.25')
      .set(piece, { attr: { opacity: 1 } }, '<')
      .fromTo(
        piece,
        { scale: 1, y: 0, transformOrigin: '50% 50%' },
        { scale: 1.035, y: -FIN_H * 0.02, duration: 0.8, ease: 'power3.out' },
        '<'
      )
      .to(cut, { attr: { opacity: 0.35 }, duration: 0.7 }, '<')
      .call(() => piece.setAttribute('filter', 'url(#lift)'), [], '>-0.2')
      .to(copy, { opacity: 1, duration: 0.7, ease: 'power2.out' }, '-=0.55')
      // then a very slow breathing drift of the whole field, fin included
      .call(() => {
        gsap.fromTo(
          svg,
          { xPercent: 0, scale: 1 },
          { xPercent: 0.8, scale: 1.02, duration: 24, yoyo: true, repeat: -1, ease: 'sine.inOut' }
        );
      });
  }
}
