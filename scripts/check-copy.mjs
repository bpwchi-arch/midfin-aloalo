// Brand guardrail: no exclamation points, no surf clichés, no hype words, anywhere a visitor can read.
import { readFileSync } from 'node:fs';

const files = ['index.html', 'src/copy.ts', 'data/editions.json'];
const banned = [
  /!/,
  /\bwaves?\b/i, /\blineups?\b/i, /\bboards?\b/i, /\bbeach(es)?\b/i, /\bsunsets?\b/i, /\bstoke(d)?\b/i,
  /\bride the vibe\b/i, /\bsurf(ing|er|ers)?\b/i,
  /\bepic\b/i, /\bdrop alert\b/i, /\bdon'?t miss out\b/i, /\binsane\b/i, /\bhype\b/i,
  /→/, / · /,
];
let bad = 0;
for (const f of files) {
  let text = readFileSync(f, 'utf8');
  if (f.endsWith('.html')) {
    text = text.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    text = text.replace(/<[^>]+>/g, ' ');
  }
  text.split('\n').forEach((line, i) => {
    for (const re of banned) {
      if (re.test(line)) {
        console.error(`${f}:${i + 1}: matches ${re}  →  ${line.trim().slice(0, 100)}`);
        bad++;
      }
    }
  });
}
if (bad) {
  console.error(`\n${bad} copy problem(s).`);
  process.exit(1);
}
console.log('copy check passed');
