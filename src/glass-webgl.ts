import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';

const VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// The hibiscus field sits behind the fin. Inside the fin's silhouette the field is seen
// through glass: displaced by the print's own relief, tinted rose, lit by a soft light that
// follows the pointer. The real flatlay photo is composited on top so the printed flowers
// and the glass texture stay legible.
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTile;
uniform sampler2D uFlat;
uniform vec2 uRes;
uniform vec2 uLight;
uniform float uTime;
uniform float uReveal;
varying vec2 vUv;

const vec3 BLACK = vec3(0.125, 0.157, 0.125);
const vec3 ROSE  = vec3(0.737, 0.443, 0.443);
const vec3 CREAM = vec3(0.984, 0.965, 0.914);

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 uv = vUv;
  vec2 fuv = uv;
  vec4 f = texture2D(uFlat, fuv);
  float mask = smoothstep(0.15, 0.75, f.a);

  // Background: the print, slowly drifting, dimmed toward Vintage Black.
  float aspect = uRes.x / uRes.y;
  vec2 tuv = (uv - 0.5) * vec2(1.45 * aspect, 1.45) + 0.5 + vec2(uTime * 0.006, -uTime * 0.004);
  vec3 field = texture2D(uTile, tuv).rgb;
  vec3 bg = mix(field, BLACK, 0.78);

  // Shadow the fin casts on the field.
  float sh = texture2D(uFlat, fuv + vec2(-0.03, 0.05)).a;
  bg = mix(bg, BLACK, sh * 0.55);

  // Glass: refract the field by the print's relief inside the silhouette.
  vec2 px = 1.0 / uRes;
  float l0 = lum(texture2D(uFlat, fuv).rgb);
  float lx = lum(texture2D(uFlat, fuv + vec2(px.x * 3.0, 0.0)).rgb);
  float ly = lum(texture2D(uFlat, fuv + vec2(0.0, px.y * 3.0)).rgb);
  vec2 n = vec2(lx - l0, ly - l0);
  vec2 wobble = vec2(sin(uv.y * 14.0 + uTime * 0.7), cos(uv.x * 11.0 - uTime * 0.6)) * 0.004;
  vec3 through = texture2D(uTile, tuv + n * 0.9 + wobble).rgb;
  through = mix(through, ROSE, 0.28) * 1.08;

  // Light passing through the glass, following the pointer.
  vec2 d = (uv - uLight) * vec2(aspect, 1.0);
  float light = exp(-dot(d, d) * 9.0);
  float glint = exp(-dot(d, d) * 60.0);

  vec3 glass = through + light * vec3(0.55, 0.42, 0.36);
  vec3 surface = mix(glass, f.rgb, 0.68);
  surface += glint * CREAM * 0.35 + light * 0.08;

  // A thin bright rim where the glass edge catches light.
  float rim = smoothstep(0.05, 0.45, f.a) * (1.0 - smoothstep(0.45, 0.95, f.a));
  surface = mix(surface, CREAM, rim * 0.35);

  vec3 col = mix(bg, surface, mask * uReveal);
  gl_FragColor = vec4(col, 1.0);
}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function mount(stage: HTMLElement): Promise<void> {
  const [tileImg, flatImg] = await Promise.all([
    loadImage('./assets/aloalo-tile-1500.webp'),
    loadImage('./assets/aloalo-fin-flatlay.webp'),
  ]);

  const renderer = new Renderer({ dpr: Math.min(devicePixelRatio || 1, 2), alpha: false, antialias: false });
  const gl = renderer.gl;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);

  const tile = new Texture(gl, { image: tileImg, wrapS: gl.REPEAT, wrapT: gl.REPEAT, generateMipmaps: true });
  const flat = new Texture(gl, { image: flatImg, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE, generateMipmaps: false, premultiplyAlpha: false });

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTile: { value: tile },
      uFlat: { value: flat },
      uRes: { value: [1, 1] },
      uLight: { value: [0.62, 0.3] },
      uTime: { value: 0 },
      uReveal: { value: 0 },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h);
    program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  // Pointer moves the light; on touch devices the light drifts with scroll instead.
  const target = { x: 0.62, y: 0.3 };
  const light = { x: 0.62, y: 0.3 };
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = (e.clientY - r.top) / r.height;
  });
  stage.addEventListener('pointerleave', () => {
    target.x = 0.62;
    target.y = 0.3;
  });
  const onScroll = () => {
    if (matchMedia('(hover: hover)').matches) return;
    const r = stage.getBoundingClientRect();
    const p = 1 - Math.min(1, Math.max(0, (r.top + r.height) / (innerHeight + r.height)));
    target.x = 0.25 + p * 0.55;
    target.y = 0.15 + p * 0.5;
  };
  addEventListener('scroll', onScroll, { passive: true });

  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) requestAnimationFrame(frame);
  });
  io.observe(stage);

  let reveal = 0;
  const t0 = performance.now();
  function frame(now: number): void {
    if (!visible) return;
    light.x += (target.x - light.x) * 0.06;
    light.y += (target.y - light.y) * 0.06;
    reveal = Math.min(1, reveal + 0.02);
    program.uniforms.uLight.value = [light.x, 1 - light.y];
    program.uniforms.uTime.value = (now - t0) / 1000;
    program.uniforms.uReveal.value = reveal;
    renderer.render({ scene: mesh });
    requestAnimationFrame(frame);
  }
  stage.classList.add('is-gl');
  requestAnimationFrame(frame);
}
