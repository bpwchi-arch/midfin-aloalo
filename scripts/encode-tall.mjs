// Encodes the upright phone version of the opening film, reframed shot by shot so the subject
// (usually the fin) stays in the 9:16 window. Usage: node scripts/encode-tall.mjs <ffmpeg> "<hero film .mov>"
import { spawnSync } from 'node:child_process';

const [ff, src] = process.argv.slice(2);
const W = 3840, CW = 1215, END = 40.75;

// One entry per shot: [start, centre] or [start, [[time, centre], ...]] for a move within the shot.
// Centre is the horizontal middle of the window as a fraction of the 16:9 frame.
const SHOTS = [
  [0, 0.63], [0.459, 0.5], [0.792, 0.3], [1.46, 0.52], [2.753, 0.6], [3.504, 0.54], [5.756, 0.56],
  [6.548, 0.38], [9.676, 0.48], [10.677, 0.6], [11.47, 0.6], [12.429, 0.3], [14.223, 0.66],
  [14.765, [[14.765, 0.5], [17.81, 0.45]]], [17.81, 0.47], [18.769, 0.56], [19.52, 0.4],
  [21.313, [[21.313, 0.36], [22.314, 0.64]]], [22.314, 0.4],
  [22.815, [[22.815, 0.68], [23.8, 0.55], [24.5, 0.5], [25.1, 0.4], [25.5, 0.36], [26.86, 0.4]]],
  [26.86, 0.27], [27.611, [[27.611, 0.62], [28.74, 0.56], [29.863, 0.42]]],
  [29.863, [[29.863, 0.32], [30.364, 0.4]]], [30.364, 0.57], [31.406, 0.35], [32.4, 0.48],
  [34.66, [[34.66, 0.45], [36.745, 0.5]]], [36.745, 0.46], [38.705, [[38.705, 0.27], [END, 0.74]]],
];

const px = (c) => Math.round(Math.min(W - CW, Math.max(0, c * W - CW / 2)));
const terms = [];
SHOTS.forEach(([start, c], i) => {
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : END + 1;
  const keys = Array.isArray(c) ? c : [[start, c]];
  for (let k = 0; k < keys.length; k++) {
    const [t0, c0] = keys[k];
    const last = k === keys.length - 1;
    const [t1, c1] = last ? [end, c0] : keys[k + 1];
    const a = px(c0), b = px(c1);
    const value = a === b ? `${a}` : `(${a}+(${b - a})*(t-${t0})/${(t1 - t0).toFixed(3)})`;
    terms.push(`gte(t,${t0})*lt(t,${t1})*${value}`);
  }
});
const x = terms.join('+');

const r = spawnSync(ff, [
  '-hide_banner', '-loglevel', 'error', '-y', '-t', String(END), '-i', src,
  '-vf', `crop=${CW}:2160:'${x}':0,scale=720:1280:flags=lanczos`,
  '-an', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-g', '48',
  '-crf', '26', '-maxrate', '2200k', '-bufsize', '4400k', '-movflags', '+faststart', 'public/film/loop-tall.mp4',
], { stdio: 'inherit' });
process.exit(r.status ?? 1);
