// Builds public/og.png (1200×630) from the backlit fin frame plus the lockup. Run: npm run og
import sharp from 'sharp';

const W = 1200, H = 630;
const frame = await sharp('public/film/glass-2400.webp').resize(W, H, { fit: 'cover', position: 'centre' }).toBuffer();
const scrim = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#0f1814" stop-opacity="0"/><stop offset="1" stop-color="#0f1814" stop-opacity="0.78"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`
);
const logo = await sharp('public/assets/logo-midfin-x-maoi-cream-1200.png').resize({ width: 380 }).toBuffer();
const lm = await sharp(logo).metadata();
await sharp(frame)
  .composite([{ input: scrim }, { input: logo, left: 64, top: H - lm.height - 56 }])
  .png({ compressionLevel: 9 })
  .toFile('public/og.png');
console.log('wrote public/og.png');
