import './styles.css';
import '@fontsource-variable/figtree';
import { config, computePhase, honoluluToday } from './config';
import { COPY } from './copy';
import { Hero } from './hero';
import { supportsFlight, startFlight } from './flight';
import { renderGrid, renderCount, renderShops, openCount, editions } from './editions';
import { initWaitlist } from './waitlist';
import { initHeroFilm, initReel, initParallax } from './film';
import { initAnalytics, track } from './analytics';

document.documentElement.classList.remove('no-js');

// Dev-only switches for QA: ?phase=pre|event|post  ?motion=reduce  ?flight=off  ?sold=all  ?allocations=on|off  ?demo=shops
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
    note.textContent = COPY.eventBanner(config.eventHours[honoluluToday()]);
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
const film = $('hero-film');
const heroTrack = $('hero-track');
const plainCut = () => {
  heroTrack.classList.remove('is-flight');
  film.hidden = true;
  $('hero-cue').hidden = true;
  hero.playCut();
};
if (reduced) {
  film.hidden = true;
  hero.setEndState();
} else if (supportsFlight() && dev?.get('flight') !== 'off') {
  // The film is the first thing on screen, so the flight behind it can wait: reserve its scroll
  // room now, then build the WebGL scene once the page is idle or the visitor starts to scroll.
  heroTrack.classList.add('is-flight');
  $('hero-cue').hidden = false;
  let begun = false;
  const begin = () => {
    if (begun) return;
    begun = true;
    const tile = new Image();
    tile.onload = () => {
      try {
        startFlight(hero, tile);
      } catch {
        plainCut();
      }
    };
    tile.onerror = plainCut;
    tile.src = './assets/aloalo-tile-1500.webp';
  };
  addEventListener('scroll', begin, { passive: true, once: true });
  addEventListener('touchstart', begin, { passive: true, once: true });
  addEventListener('wheel', begin, { passive: true, once: true });
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(begin, { timeout: 2500 }) : setTimeout(begin, 1200));
  if (scrollY > 0) begin();
  else if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
  initHeroFilm();
} else {
  film.hidden = true;
  hero.playCut();
}
renderGrid();
renderCount();
renderShops();
wireLinks();
applyPhase();
initWaitlist();
initReel(reduced);
initParallax(reduced);
initAnalytics();
