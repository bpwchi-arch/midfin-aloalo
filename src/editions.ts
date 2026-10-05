import data from '../data/editions.json';
import { FIN_PATH } from './fin-path';
import { COPY } from './copy';

export type Status = 'open' | 'kept' | 'allocated' | 'kilo' | 'sold';
export interface Edition {
  no: number;
  size: '10in' | '10.5in';
  status: Status;
  label: string | null;
}

export const editions = (data as { editions: Edition[] }).editions;

export const openCount = (): number => editions.filter((e) => e.status === 'open').length;

const pad = (n: number) => String(n).padStart(2, '0');

function finSvg(status: Status): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-60 -60 3486 3113');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('finsvg');
  svg.dataset.status = status;
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#fin');
  svg.appendChild(use);
  return svg;
}

export function renderGrid(): void {
  const shape = document.getElementById('fin-shape');
  if (shape) shape.setAttribute('d', FIN_PATH);

  const grid = document.getElementById('grid') as HTMLOListElement;
  const tip = document.getElementById('tip') as HTMLDivElement;
  const section = grid.closest('section') as HTMLElement;
  const frag = document.createDocumentFragment();

  let firstTall = true;
  for (const e of editions) {
    const li = document.createElement('li');
    li.className = 'ed';
    if (e.size === '10.5in' && firstTall) {
      li.classList.add('is-first-tall');
      firstTall = false;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ed-btn' + (e.size === '10.5in' ? ' is-tall' : '');
    btn.dataset.status = e.status;
    btn.dataset.no = String(e.no);
    const size = COPY.sizeLabel[e.size];
    const status = COPY.statusLabel[e.status];
    btn.setAttribute('aria-label', `Number ${pad(e.no)}, ${size}, ${e.label ?? status}`);
    btn.appendChild(finSvg(e.status));
    if (e.status === 'kept') {
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.setAttribute('aria-hidden', 'true');
      btn.appendChild(mark);
    }
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = pad(e.no);
    btn.appendChild(n);
    li.appendChild(btn);
    frag.appendChild(li);
  }
  grid.replaceChildren(frag);

  // One tooltip, positioned over the active fin.
  let active: HTMLButtonElement | null = null;
  const show = (btn: HTMLButtonElement) => {
    const e = editions[Number(btn.dataset.no) - 1];
    const size = COPY.sizeLabel[e.size];
    tip.innerHTML = `<strong>No. ${pad(e.no)}</strong>, ${size}${e.label ? `<br>${escapeHtml(e.label)}` : ''}`;
    const b = btn.getBoundingClientRect();
    const s = section.getBoundingClientRect();
    tip.style.left = `${b.left - s.left + b.width / 2}px`;
    tip.style.top = `${b.top - s.top}px`;
    tip.hidden = false;
    active = btn;
  };
  const hide = () => {
    tip.hidden = true;
    active = null;
  };

  grid.addEventListener('pointerover', (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>('.ed-btn');
    if (btn && (ev as PointerEvent).pointerType !== 'touch') show(btn);
  });
  grid.addEventListener('pointerout', (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>('.ed-btn');
    if (btn && btn === active && (ev as PointerEvent).pointerType !== 'touch' && document.activeElement !== btn) hide();
  });
  grid.addEventListener('focusin', (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>('.ed-btn');
    if (btn) show(btn);
  });
  grid.addEventListener('focusout', () => hide());
  grid.addEventListener('click', (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>('.ed-btn');
    if (!btn) return;
    if (active === btn && !tip.hidden) hide();
    else show(btn);
  });
  document.addEventListener('click', (ev) => {
    if (!(ev.target as Element).closest('.grid')) hide();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hide();
  });
  addEventListener('scroll', () => active && !tip.hidden && document.activeElement !== active && hide(), { passive: true });
}

export function renderCount(): void {
  const el = document.getElementById('count') as HTMLElement;
  const n = openCount();
  el.textContent = n > 0 ? COPY.countOpen(n) : COPY.countNone;
}

/** Shops holding numbers: allocated entries, deduped by label, in first-seen order. */
export function shopNames(): string[] {
  const seen = new Set<string>();
  for (const e of editions) {
    if (e.status === 'allocated' && e.label) seen.add(e.label.trim());
  }
  return [...seen];
}

export function renderShops(): void {
  const step = document.getElementById('step-shops') as HTMLElement;
  const list = document.getElementById('shops') as HTMLUListElement;
  const names = shopNames();
  if (names.length === 0) {
    step.hidden = true;
    return;
  }
  list.replaceChildren(
    ...names.map((n) => {
      const li = document.createElement('li');
      li.textContent = n;
      return li;
    })
  );
  step.hidden = false;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
