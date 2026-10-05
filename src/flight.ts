import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';
import type { Hero } from './hero';
import { TILE } from './fin-path';

// Flying through the print. The tile is keyed on its rose ground so each depth layer is a
// field of floating hibiscus cut-outs; six of them loop toward the camera. Scroll is the
// throttle, the pointer tilts the camera, near petals blur as they pass. At the end the
// layers land on the exact factory print view the SVG hero holds, and the cut takes over.

const VERT = /* glsl */ `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTile;
uniform vec2 uRes;
uniform float uTime;
uniform float uFlight;
uniform vec2 uTilt;
uniform vec4 uView;
uniform float uLand;
uniform float uIn;
out vec4 outColor;

const vec3 BLACK = vec3(0.125, 0.157, 0.125);
const vec3 ROSE  = vec3(0.737, 0.443, 0.443);
const float N = 5.0;

vec2 hash2(float n) { return fract(sin(vec2(n, n + 1.7) * 43758.5453) * vec2(1.0, 1.3)); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  // Deep fog: rose ground falling into Vintage Black.
  vec3 col = mix(BLACK, ROSE, 0.3 + 0.1 * (1.0 - uv.y));

  // Camera roll follows the tilt a little, so the field banks as you steer.
  float roll = -uTilt.x * 0.12;
  vec2 pr = vec2(p.x * cos(roll) - p.y * sin(roll), p.x * sin(roll) + p.y * cos(roll));

  for (float i = 0.0; i < N; i += 1.0) {
    float f = i / N - uFlight;
    float z = fract(f);                   // 1 = far, 0 = at the lens
    float id = floor(f) * N + i;          // stable per wrap, so layers get fresh offsets
    vec2 off = hash2(id) * 4.0;
    float width = 0.09 + 1.35 * z;        // how much of the tile spans the screen at this depth
    vec2 drift = vec2(sin(uTime * 0.11 + id), cos(uTime * 0.09 + id * 1.3)) * 0.015 * (1.0 - z);
    vec2 tuv = pr * width + off + drift + uTilt * (1.0 - z) * 0.35;
    float lod = clamp((0.14 - z) * 30.0, 0.0, 4.5) + max(0.0, (z - 0.82) * 8.0);
    vec3 c = textureLod(uTile, tuv, lod).rgb;
    float key = smoothstep(0.06, 0.17, distance(c, ROSE));   // flowers stay, the rose ground goes
    float depthFade = smoothstep(1.0, 0.72, z) * smoothstep(0.0, 0.09, z);
    float a = key * depthFade * 0.94;
    vec3 lit = mix(c, BLACK, smoothstep(0.62, 1.0, z) * 0.6) * (1.0 + 0.1 * (1.0 - z));
    col = mix(col, lit, a);
  }

  // Vignette: the edges fall away, the centre is where you are flying.
  float vig = smoothstep(1.25, 0.35, length(p));
  col = mix(col, BLACK, (1.0 - vig) * 0.55);

  // Land on the factory view: same mapping the SVG uses, so the handover is invisible.
  vec2 g = uView.xy + uv * uView.zw;
  vec2 luv = (g - vec2(${TILE.x}.0, ${TILE.y}.0)) / ${TILE.size}.0;
  vec3 land = texture(uTile, luv).rgb;
  col = mix(col, land, uLand);

  col = mix(BLACK, col, uIn);
  outColor = vec4(col, 1.0);
}`;

export function supportsFlight(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

export function startFlight(heroSvg: Hero, tileImg: HTMLImageElement): void {
  const canvas = document.getElementById('hero-flight') as HTMLCanvasElement;
  const track = document.getElementById('hero-track') as HTMLElement;
  const mark = document.getElementById('hero-mark') as HTMLElement;
  const cue = document.getElementById('hero-cue') as HTMLElement;

  const renderer = new Renderer({ canvas, webgl: 2, dpr: Math.min(devicePixelRatio || 1, innerWidth < 800 ? 1.5 : 2), alpha: false, antialias: false });
  const gl = renderer.gl;
  const tile = new Texture(gl, { image: tileImg, wrapS: gl.REPEAT, wrapT: gl.REPEAT, generateMipmaps: true, minFilter: gl.LINEAR_MIPMAP_LINEAR });
  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTile: { value: tile },
      uRes: { value: [1, 1] },
      uTime: { value: 0 },
      uFlight: { value: 0 },
      uTilt: { value: [0, 0] },
      uView: { value: [0, 0, 1, 1] },
      uLand: { value: 0 },
      uIn: { value: 0 },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const hero = canvas.parentElement as HTMLElement;
  const resize = () => {
    renderer.setSize(hero.clientWidth || innerWidth, hero.clientHeight || innerHeight);
    program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  track.classList.add('is-flight');
  cue.hidden = false;
  canvas.classList.add('is-on');

  const tiltTarget = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  track.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    tiltTarget.x = e.clientX / innerWidth - 0.5;
    tiltTarget.y = e.clientY / innerHeight - 0.5;
  });

  let landed = false;
  let flight = 0;
  let last = performance.now();
  const t0 = last;

  function progress(): number {
    const max = track.offsetHeight - innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
  }

  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const p = progress();
    // Scroll is the throttle; idle flight keeps the field alive.
    const target = p * 2.6;
    flight += (target - flight) * (1 - Math.exp(-dt * 4)) + dt * 0.045;
    tilt.x += (tiltTarget.x - tilt.x) * 0.05;
    tilt.y += (tiltTarget.y - tilt.y) * 0.05;

    const land = smooth(0.56, 0.7, p);
    const v = heroSvg.view;
    program.uniforms.uTime.value = (now - t0) / 1000;
    program.uniforms.uFlight.value = flight;
    program.uniforms.uTilt.value = [tilt.x, tilt.y];
    program.uniforms.uView.value = [v.x, v.y, v.w, v.h];
    program.uniforms.uLand.value = land;
    program.uniforms.uIn.value = Math.min(1, (now - t0) / 1400);

    mark.style.opacity = String(1 - land);
    cue.style.opacity = String(1 - smooth(0.05, 0.25, p));

    if (!landed && land >= 1) {
      landed = true;
      renderer.render({ scene: mesh });
      canvas.classList.remove('is-on');
      heroSvg.playCut(0.05);
      return; // the SVG holds the identical frame from here on
    }
    renderer.render({ scene: mesh });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
