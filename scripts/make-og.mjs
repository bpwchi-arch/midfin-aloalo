// Builds public/og.png (1200×630) and public/favicon.svg from the supplied assets. Run: npm run og
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const W = 1200, H = 630;
const BLACK = { r: 0x20, g: 0x28, b: 0x20 };

const tileBuf = await sharp('public/assets/aloalo-tile-3000.webp').resize(620, 620).toBuffer();
const tiles = [];
for (let y = -200; y < H; y += 620) for (let x = -300; x < W; x += 620) tiles.push({ input: tileBuf, left: x, top: y });
const field = await sharp({ create: { width: W, height: H, channels: 3, background: BLACK } })
  .composite(tiles)
  .png()
  .toBuffer();
const dimmed = await sharp(field)
  .composite([{ input: { create: { width: W, height: H, channels: 4, background: { ...BLACK, alpha: 0.8 } } } }])
  .png()
  .toBuffer();

const fin = await sharp('public/assets/aloalo-fin-cut-from-print-1600.webp').resize({ width: 640 }).png().toBuffer();
const finMeta = await sharp(fin).metadata();
const alpha = await sharp(fin).ensureAlpha().extractChannel('alpha').blur(18).png().toBuffer();
const shadowRgba = await sharp({ create: { width: finMeta.width, height: finMeta.height, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .joinChannel(alpha)
  .png()
  .toBuffer();

const logo = await sharp('public/assets/logo-midfin-x-maoi-cream-1200.png').resize({ width: 400 }).toBuffer();
const logoMeta = await sharp(logo).metadata();

const finLeft = 70, finTop = Math.round((H - finMeta.height) / 2);
await sharp(dimmed)
  .composite([
    { input: shadowRgba, left: finLeft + 10, top: finTop + 34 },
    { input: fin, left: finLeft, top: finTop },
    { input: logo, left: W - logoMeta.width - 90, top: Math.round(H / 2 - logoMeta.height / 2) },
  ])
  .png({ compressionLevel: 9 })
  .toFile('public/og.png');

const svg = readFileSync('../kit/aloalo-fable-kit/assets/fin-outline-path.svg', 'utf8');
const d = svg.match(/ d="([^"]+)"/)[1];
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 3766 3393"><path fill="#BC7171" d="${d}"/></svg>\n`
);
console.log('wrote public/og.png and public/favicon.svg');
