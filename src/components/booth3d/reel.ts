// The LED wall's brand reel: four calm slides with slow cross-fades, drawn once
// into one atlas texture at load (plus a small line-order map for the plan
// slide) and animated only in the shader: a slow 2-3% zoom on every slide, a
// soft gold light sweep, drifting survey contours and a hall plan that draws
// itself line by line. Nothing is redrawn or uploaded per frame; the frame loop
// only sets the reel time. All text comes from the site content
// (src/data/aratta-content.ts), handed over by the hero.

import { canvasTexture, drawLogo, type Ctx } from "./core";
import { LOGO_HEIGHT } from "./brand-logo";

/** Text for the reel, taken from the site content (no dates, no invented lines). */
export type ReelText = {
  /** content.exhibitions.title */
  heading: string;
  /** content.exhibitions.items[].title */
  events: string[];
  /** content.services.items[0].title */
  caption: string;
  /** content.hero.title */
  title: string;
  /** content.hero.subtitle */
  line: string;
};

/** Seconds each slide holds (cross-fade included) and the cross-fade itself. */
export const REEL = { slides: 4, hold: 7, fade: 1.8 } as const;
/** One loop of the reel, in seconds (4 x 7 = 28 s). */
export const REEL_LOOP = REEL.slides * REEL.hold;

type Fill = (c: CanvasRenderingContext2D, w: number, h: number) => void;

/** Break text into lines that fit `max` pixels with the current font. */
function wrap(c: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The plan: a hall outline, aisles and a grid of stands, one of them ours (gold). */
function planLines(w: number, h: number) {
  const lines: Array<{ a: [number, number]; b: [number, number]; ours?: boolean }> = [];
  const rect = (x0: number, y0: number, x1: number, y1: number, ours = false) => {
    lines.push({ a: [x0, y0], b: [x1, y0], ours }, { a: [x1, y0], b: [x1, y1], ours }, { a: [x1, y1], b: [x0, y1], ours }, { a: [x0, y1], b: [x0, y0], ours });
  };
  const L = w * 0.1;
  const R = w * 0.9;
  const T = h * 0.12;
  const B = h * 0.72;
  rect(L, T, R, B);
  const cols = 5;
  const rows = 2;
  const gx = (R - L) * 0.06;
  const gy = (B - T) * 0.16;
  const bw = (R - L - gx * (cols + 1)) / cols;
  const bh = (B - T - gy * (rows + 1)) / rows;
  for (let r = 0; r < rows; r += 1)
    for (let k = 0; k < cols; k += 1) {
      const x0 = L + gx + k * (bw + gx);
      const y0 = T + gy + r * (bh + gy);
      rect(x0, y0, x0 + bw, y0 + bh, r === 1 && k === 2);
    }
  return lines;
}

export function buildReel(ctx: Ctx, text: ReelText | undefined) {
  const { rich, font, fa, track } = ctx;
  // Phones: the same reel at about half the resolution (atlas 1024 wide).
  const W = rich ? 840 : 512;
  const H = Math.round(W / 1.4);
  const k = W / 840;
  const dir: CanvasDirection = fa ? "rtl" : "ltr";
  const ground = (c: CanvasRenderingContext2D, x: number, y: number, top: string, bottom: string) => {
    const g = c.createLinearGradient(x, y, x + W, y + H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    c.fillStyle = g;
    c.fillRect(x, y, W, H);
  };
  const centred = (c: CanvasRenderingContext2D, lines: string[], x: number, y: number, step: number) => {
    lines.forEach((l, i) => c.fillText(l, x, y + i * step));
  };

  // (a) the official logo on a dark ground; the gold sweep is the shader's.
  const logoSlide: Fill = (c) => {
    ground(c, 0, 0, "#0d1714", "#070c0a");
    const lw = H * 0.56 / LOGO_HEIGHT;
    drawLogo(c, W / 2 - lw / 2, H / 2 - (lw * LOGO_HEIGHT) / 2, lw, { plate: true });
  };
  // (b) Aratta's own exhibitions, by name; contours drift behind them in the shader.
  const eventsSlide: Fill = (c) => {
    ground(c, 0, 0, "#0b2a21", "#06150f");
    c.direction = dir;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#e0b75a";
    c.font = font(800, 30 * k);
    c.fillText(text?.heading ?? "", W / 2, 70 * k);
    c.fillStyle = "rgba(224,183,90,0.7)";
    c.fillRect(W / 2 - 60 * k, 88 * k, 120 * k, 2 * k);
    c.fillStyle = "#f5efe3";
    c.font = font(700, 21 * k);
    let y = 136 * k;
    for (const event of (text?.events ?? []).slice(0, 3)) {
      const lines = wrap(c, event, W * 0.8).slice(0, 2);
      centred(c, lines, W / 2, y, 30 * k);
      y += lines.length * 30 * k + 34 * k;
    }
  };
  // (c) a hall plan (lines come from the order map), with a real caption under it.
  const planSlide: Fill = (c) => {
    ground(c, 0, 0, "#0e1a17", "#08100d");
    c.strokeStyle = "rgba(224,183,90,0.07)";
    c.lineWidth = 1;
    for (let x = 0; x <= W; x += 28 * k) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, H);
      c.stroke();
    }
    for (let y = 0; y <= H; y += 28 * k) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    c.direction = dir;
    c.textAlign = "center";
    c.fillStyle = "#f5efe3";
    c.font = font(700, 30 * k);
    c.fillText(text?.caption ?? "", W / 2, H * 0.86);
  };
  // (d) a short line of the site's own copy.
  const copySlide: Fill = (c) => {
    ground(c, 0, 0, "#0b2a21", "#07130f");
    const lw = 120 * k;
    drawLogo(c, W / 2 - lw / 2, 46 * k, lw, { plate: true });
    c.direction = dir;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#f5efe3";
    c.font = font(800, 40 * k);
    const title = wrap(c, text?.title ?? "", W * 0.84).slice(0, 2);
    const top = 46 * k + lw * LOGO_HEIGHT + 82 * k;
    centred(c, title, W / 2, top, 52 * k);
    c.fillStyle = "#e0b75a";
    c.font = font(600, 22 * k);
    centred(c, wrap(c, text?.line ?? "", W * 0.78).slice(0, 2), W / 2, top + title.length * 52 * k + 14 * k, 34 * k);
  };

  // One atlas, 2 x 2 slots, drawn once.
  const fills = [logoSlide, eventsSlide, planSlide, copySlide];
  const atlas = canvasTexture(W * 2, H * 2, (c) => {
    fills.forEach((fill, i) => {
      c.save();
      c.translate((i % 2) * W, Math.floor(i / 2) * H);
      c.beginPath();
      c.rect(0, 0, W, H);
      c.clip();
      fill(c, W, H);
      c.restore();
    });
  });
  track(atlas.texture);
  atlas.texture.anisotropy = 4;

  // Line-order map for the plan: r = when the pixel draws (0..1, premultiplied by g),
  // g = coverage, b = our stand (gold). Each line is a gradient, so it draws along itself.
  const PW = rich ? 512 : 256;
  const PH = Math.round(PW / 1.4);
  const lines = planLines(PW, PH);
  const plan = canvasTexture(PW, PH, (c) => {
    c.fillStyle = "#000";
    c.fillRect(0, 0, PW, PH);
    c.lineCap = "round";
    lines.forEach((l, i) => {
      const g = c.createLinearGradient(l.a[0], l.a[1], l.b[0], l.b[1]);
      const blue = l.ours ? 255 : 0;
      g.addColorStop(0, `rgb(${Math.round((i / lines.length) * 255)},255,${blue})`);
      g.addColorStop(1, `rgb(${Math.round(((i + 1) / lines.length) * 255)},255,${blue})`);
      c.strokeStyle = g;
      c.lineWidth = (l.ours ? 3.2 : 2.2) * (PW / 512);
      c.beginPath();
      c.moveTo(l.a[0], l.a[1]);
      c.lineTo(l.b[0], l.b[1]);
      c.stroke();
    });
  }, true);
  track(plan.texture);

  const uniforms = {
    uReel: { value: atlas.texture },
    uPlan: { value: plan.texture },
    uTime: { value: 0 },
  };
  return { uniforms, atlas: atlas.texture };
}

/**
 * GLSL for the reel: `vec3 reel(vec2 uv, float time)` returns the wall's picture
 * at a point of the whole wall (0..1) and a reel time in seconds.
 */
export const REEL_GLSL = /* glsl */ `
  uniform sampler2D uReel;
  uniform sampler2D uPlan;
  const float HOLD = ${REEL.hold.toFixed(1)};
  const float FADE = ${REEL.fade.toFixed(1)};
  const float SLIDES = ${REEL.slides.toFixed(1)};
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  vec3 reelSlide(float k, vec2 uv, float s) {
    // Slow push-in of about 2.5% over the slide's life.
    float life = clamp(s / (HOLD + FADE), 0.0, 1.0);
    vec2 q = 0.5 + (uv - 0.5) * (1.0 - 0.025 * life);
    if (k > 2.5) q.x += 0.006 * sin(s * 0.35);
    q = clamp(q, 0.004, 0.996);
    float col = mod(k, 2.0);
    float row = floor(k / 2.0);
    // Slot (col, row) from the canvas's top-left; textures are flipped, so row 0 is the top half.
    vec3 c = texture2D(uReel, vec2((col + q.x) * 0.5, (1.0 - row + q.y) * 0.5)).rgb;
    vec3 gold = vec3(0.88, 0.7, 0.34);
    if (k < 0.5 || k > 2.5) {
      // A soft, slow gold light sweep across the bright parts.
      float x0 = -0.35 + 1.7 * life;
      float band = exp(-pow(q.x + (q.y - 0.5) * 0.45 - x0, 2.0) / 0.012);
      c += gold * band * 0.45 * smoothstep(0.12, 0.5, luma(c));
    } else if (k < 1.5) {
      // Survey contours drifting slowly behind the names.
      float d = sin((q.y * 9.0 + 0.35 * sin(q.x * 4.0 + s * 0.11) + s * 0.03) * 6.2832);
      c += gold * smoothstep(0.93, 1.0, d) * 0.1 * (1.0 - smoothstep(0.05, 0.16, luma(c)));
    } else {
      // The plan draws itself line by line, each line along its length.
      vec4 m = texture2D(uPlan, q);
      float order = m.r / max(m.g, 0.004);
      float reveal = clamp((s - 0.6) / 5.2, 0.0, 1.0) * 1.02;
      float on = m.g * smoothstep(order, order + 0.012, reveal);
      float head = m.g * (1.0 - smoothstep(0.0, 0.02, abs(reveal - order))) * step(reveal, 1.0);
      vec3 line = mix(vec3(0.78, 0.74, 0.64), gold * 1.25, m.b / max(m.g, 0.004));
      c = mix(c, line, on * 0.9) + gold * head * 0.5;
    }
    return c;
  }
  vec3 reel(vec2 uv, float time) {
    float t = mod(time, HOLD * SLIDES);
    float k = floor(t / HOLD);
    float s = t - k * HOLD;
    // Each slide is on from FADE before its slot (cross-fading in) to the end of its slot.
    vec3 now = reelSlide(k, uv, s + FADE);
    float w = smoothstep(HOLD - FADE, HOLD, s);
    if (w <= 0.0) return now;
    vec3 next = reelSlide(mod(k + 1.0, SLIDES), uv, s - HOLD + FADE);
    return mix(now, next, w);
  }
`;
