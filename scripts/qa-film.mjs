// Screenshots of the film sections. Usage: node scripts/qa-film.mjs <node_modules dir with puppeteer-core> <base url> <out dir>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require(process.argv[2] + '/puppeteer-core');
const BASE = process.argv[3] || 'http://localhost:5173/';
const OUT = process.argv[4] || 'qa';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
});

async function run(name, width, height, scale = 1, mobile = false) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await sleep(1800);
  const shot = (n) => page.screenshot({ path: `${OUT}/${name}-${n}.jpg`, type: 'jpeg', quality: 80 });
  await shot('1-open');
  const max = await page.evaluate(() => document.getElementById('hero-track').offsetHeight - innerHeight);
  const to = async (y, wait = 700) => { await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(wait); };
  await to(max * 0.11); await shot('2-dive');
  await to(max * 0.4, 900); await shot('3-flight');
  for (let y = max * 0.4; y <= max; y += max / 25) await to(y, 60);
  await to(max, 3200); await shot('4-cut');
  const top = (id) => page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top + scrollY, id);
  const reelTop = await top('reel');
  const reelH = await page.evaluate(() => document.getElementById('reel').offsetHeight);
  await to(reelTop, 900); await shot('5-reel-a');
  await to(reelTop + (reelH - height) * 0.5, 900); await shot('6-reel-b');
  if (mobile) { await page.evaluate(() => document.getElementById('reel-pin').scrollTo(600, 0)); await sleep(600); await shot('6-reel-swiped'); }
  const spTop = await top('spread'); const spH = await page.evaluate(() => document.getElementById('spread').offsetHeight);
  for (let i = 0; i < Math.min(6, Math.ceil(spH / height)); i++) { await to(spTop + i * height * 0.9 - 40, 900); await shot('7-spread-' + i); }
  await to(await top('glass'), 1200); await shot('8-glass');
  await to(await top('waitlist') - 80, 600); await shot('9-waitlist');
  const info = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    pinned: document.getElementById('reel').classList.contains('is-pinned'),
    filmHidden: document.getElementById('hero-film').hidden,
    pageH: document.documentElement.scrollHeight,
    broken: [...document.images].filter((i) => i.complete && !i.naturalWidth).map((i) => i.src),
    bang: document.body.innerText.includes('!'),
  }));
  console.log(name, JSON.stringify(info), errors.length ? 'ERRORS ' + errors.join(' | ') : '');
  await page.close();
}
await run('d', 1440, 900);
await run('m', 390, 844, 2, true);
await browser.close();
