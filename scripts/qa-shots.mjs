// QA harness: full-size screenshots at four widths, reduced motion, WebGL off, sold out, and the waitlist flows.
// Usage: node scripts/qa-shots.mjs <puppeteer-core dir> <base url> <out dir>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require(process.argv[2] + '/puppeteer-core');
const BASE = process.argv[3] || 'http://localhost:5173/';
const OUT = process.argv[4] || 'qa';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function flyThrough(page) {
  // scroll the flight track in steps so the landing triggers, then let the cut play
  const max = await page.evaluate(() => document.getElementById('hero-track').offsetHeight - innerHeight);
  for (let y = 0; y <= max; y += Math.max(40, max / 30)) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(70);
  }
  await page.evaluate((v) => window.scrollTo(0, v), max);
  await sleep(4500);
}

async function shoot(name, { width, height, url = BASE, reduced = false, scale = 1, fly = true }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/${name}-00-landing.png` });
  if (fly) {
    const max = await page.evaluate(() => document.getElementById('hero-track').offsetHeight - innerHeight);
    if (max > 0) {
      await page.evaluate((v) => window.scrollTo(0, v), max * 0.3);
      await sleep(900);
      await page.screenshot({ path: `${OUT}/${name}-01-flight.png` });
    }
    await flyThrough(page);
    await page.screenshot({ path: `${OUT}/${name}-02-cut.png` });
  }
  // let the glass section load, then full page
  await page.evaluate(() => document.getElementById('glass').scrollIntoView());
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/${name}-03-glass.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-04-full.png`, fullPage: true });
  const info = await page.evaluate(() => ({
    phase: document.body.dataset.phase,
    count: document.getElementById('count').textContent,
    buyLinks: document.querySelectorAll('a[href*="products/maoi-common"]').length,
    overflow: document.documentElement.scrollWidth > innerWidth,
    gl: document.getElementById('glass-stage').classList.contains('is-gl'),
    flight: document.getElementById('hero-track').classList.contains('is-flight'),
    text: document.body.innerText.includes('!'),
  }));
  console.log(name, JSON.stringify(info), errors.length ? 'ERRORS: ' + errors.join(' | ') : '');
  await page.close();
}

await shoot('w360', { width: 360, height: 740, scale: 2 });
await shoot('w768', { width: 768, height: 1024, scale: 2 });
await shoot('w1440', { width: 1440, height: 900 });
await shoot('w2560', { width: 2560, height: 1440 });
await shoot('reduced', { width: 390, height: 844, scale: 2, reduced: true, fly: false });
await shoot('glOff', { width: 1440, height: 900, url: BASE + '?gl=off&flight=off', fly: false });
await shoot('postSold', { width: 1440, height: 900, url: BASE + '?phase=post&sold=all', fly: false });
await shoot('event', { width: 390, height: 844, scale: 2, url: BASE + '?phase=event', fly: false });

// Waitlist flows
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  const status = () => page.$eval('#waitlist-status', (e) => e.textContent);
  await page.evaluate(() => document.getElementById('waitlist').scrollIntoView());
  await page.type('#email', 'nope');
  await page.click('#waitlist-btn');
  await sleep(200);
  console.log('invalid ->', await status(), 'aria-invalid=', await page.$eval('#email', (e) => e.getAttribute('aria-invalid')));
  await page.$eval('#email', (e) => (e.value = ''));
  await page.type('#email', 'fail@example.com');
  await page.click('#waitlist-btn');
  await sleep(100);
  console.log('pending ->', await status(), 'disabled=', await page.$eval('#waitlist-btn', (e) => e.disabled));
  await page.click('#waitlist-btn'); // double submit while pending
  await sleep(1200);
  console.log('network ->', await status());
  await page.$eval('#email', (e) => (e.value = ''));
  await page.type('#email', 'someone@example.com');
  await page.click('#waitlist-btn');
  await sleep(1200);
  console.log('success ->', await status(), 'value=', await page.$eval('#email', (e) => e.value));
  await page.screenshot({ path: `${OUT}/waitlist-success.png` });
  await page.close();
}

await browser.close();
