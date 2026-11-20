// Exports the selected film frames and film photographs from the Dropbox originals into public/film.
// Usage: node scripts/export-film.mjs "<path to the Zak Noyle folder>"
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = 'public/film';
mkdirSync(OUT, { recursive: true });
const grabs = readdirSync(path.join(SRC, 'Framegrabs'));
const grab = (n) => path.join(SRC, 'Framegrabs', grabs.find((f) => f.includes(`Still${String(n).padStart(3, '0')}.`)));
const film = (n) => path.join(SRC, 'FIlm Photos', `${n}.jpg`);

async function out(input, name, widths, { crop, quality = 78 } = {}) {
  for (const w of widths) {
    let img = sharp(input).rotate();
    if (crop) img = img.extract(crop);
    const info = await img.resize({ width: w, withoutEnlargement: true }).webp({ quality }).toFile(`${OUT}/${name}-${w}.webp`);
    console.log(name, w, `${info.width}x${info.height}`, Math.round(info.size / 1024) + 'KB');
  }
}

// Hero poster: the fin underwater. Wide for landscape screens, a tall crop for phones.
await out(grab(17), 'hero', [2400, 1400, 800], { quality: 74 });
await out(grab(17), 'hero-tall', [1100, 700], { crop: { left: 640, top: 0, width: 1215, height: 2160 }, quality: 74 });

// Glass: the sun through the fin.
await out(grab(12), 'glass', [2400, 1400, 800], { quality: 76 });
await out(grab(12), 'glass-tall', [1200, 700], { crop: { left: 1150, top: 0, width: 1728, height: 2160 }, quality: 76 });

// The reel: frames from the film, in order.
for (const n of [1, 4, 7, 8, 6, 11, 10, 19, 22, 24]) await out(grab(n), `frame-${String(n).padStart(2, '0')}`, [1600, 900]);

// Film photographs.
for (const n of ['000032', '000015']) await out(film(n), `photo-${n}`, [2000, 1200, 700]);
for (const n of ['000026', '000004', '000012', '000052']) await out(film(n), `photo-${n}`, [1400, 900, 560]);
