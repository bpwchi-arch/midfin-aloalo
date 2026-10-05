import './styles.css';
import '@fontsource-variable/figtree';
import { config, computePhase } from './config';
import { COPY } from './copy';
import { Hero } from './hero';
import { supportsFlight, startFlight } from './flight';
import { renderGrid, renderCount, renderShops, openCount, editions } from './editions';
import { initWaitlist } from './waitlist';
import { initGlass } from './glass';
import { initAnalytics, track } from './analytics';

document.documentElement.classList.remove('no-js');

// Dev-only switches for QA: ?phase=pre|event|post  ?motion=reduce  ?gl=off  ?sold=all  ?allocations=on|off  ?demo=shops
const dev = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || dev?.get('motion') === 'reduce';
if (dev?.get('sold') === 'all') for (const e of editions) if (e.status === 'open') e.status = 'sold';
if (dev?.get('demo') === 'shops') {
  for (const n of [12, 13, 30]) Object.assign(editions[n - 1], { status: 'allocated', label: n === 30 ? 'Demo Shop B' : 'Demo Shop A' });
}
const phase = computePhase();
document.body.dataset.phase = phase;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function link(href: string, text: string, onClick?: () => void): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  if (onClick) a.addEventListener('click', onClick);
  return a;
}

function applyPhase(): void {
  const note = $('phase-note');
  const online = $('step-online-copy');
  const waitlist = $('waitlist');
  const postLine = $('post-line');
  const remaining = openCount();
  const buy = phase === 'post' && remaining > 0 && config.showPostPhaseBuyLink;

  if (phase === 'event') {
    note.textContent = COPY.eventBanner;
    note.hidden = false;
  }

  if (phase === 'post') {
    waitlist.classList.add('is-post');
    postLine.hidden = false;
    if (buy) {
      const onClick = () => track('product_click');
      note.replaceChildren(link(config.productUrl, COPY.postRemain, onClick));
      online.replaceChildren(link(config.productUrl, COPY.stepOnlineNow, onClick));
      postLine.replaceChildren(link(config.productUrl, COPY.postRemain, onClick));
    } else {
      note.textContent = COPY.postNone;
      online.textContent = COPY.postNone;
      postLine.textContent = COPY.postNone;
    }
    note.hidden = false;
  }
}

function wireLinks(): void {
  const apply = $<HTMLAnchorElement>('b2b-apply');
  const login = $<HTMLAnchorElement>('b2b-login');
  apply.href = config.b2bApplicationUrl;
  login.href = config.b2bLoginUrl;
  apply.addEventListener('click', () => track('b2b_click', { which: 'apply' }));
  login.addEventListener('click', () => track('b2b_click', { which: 'login' }));
  $<HTMLAnchorElement>('link-midfin').href = config.links.midfin;
  const maoi = $<HTMLAnchorElement>('link-maoi');
  maoi.href = config.links.maoi;
  maoi.textContent = config.links.maoiHandle;
}

const hero = new Hero();
if (reduced) {
  hero.setEndState();
} else if (supportsFlight() && dev?.get('flight') !== 'off') {
  const tile = new Image();
  tile.onload = () => startFlight(hero, tile);
  tile.onerror = () => hero.playCut();
  tile.src = './assets/aloalo-tile-1500.webp';
} else {
  hero.playCut();
}
renderGrid();
renderCount();
renderShops();
wireLinks();
applyPhase();
initWaitlist();
initGlass(reduced || dev?.get('gl') === 'off');
initAnalytics();
