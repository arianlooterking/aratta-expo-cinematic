// The LED wall's event film: a 30 s loop that plays like a real video wall.
// A logo sting, three photos of Aratta's own exhibitions with a slow pan and
// zoom (each with the exhibition's short name in large type over a soft dark
// gradient), then the hero title. Slides cross-fade slowly at steady
// brightness. The type and gradients are drawn once into one atlas at load;
// the photos (downscaled copies in public/booth-reel/) load after the first
// frame and replace a warm graphic ground until they arrive. Everything that
// moves is done in the shader; nothing is redrawn or uploaded per frame.
// All text comes from the site content (src/data/aratta-content.ts), handed
// over by the hero; exhibition names are shortened here, in code.

import * as THREE from "three";
import { canvasTexture, drawLogo, type Ctx } from "./core";
import { LOGO_HEIGHT } from "./brand-logo";

/** Text for the reel, taken from the site content (no dates, no invented lines). */
export type ReelText = {
  /** content.exhibitions.title */
  heading: string;
  /** content.exhibitions.items[].title, in order */
  events: string[];
  /** content.hero.title */
  title: string;
  /** content.hero.subtitle */
  line: string;
};

/** Photos of the three exhibitions, in the order of content.exhibitions.items (their own covers). */
export const REEL_PHOTOS = ["mining-machinery", "steel-copper-energy", "mineral-production"] as const;

/** Slide start times (s): logo sting, three photos, the hero title; the loop is 30 s. */
export const REEL_STARTS = [0, 3.5, 10.5, 17.5, 24.5] as const;
export const REEL_LOOP = 30;
export const REEL_FADE = 1.5;

/**
 * The shortest name an exhibition has: only long titles exist in the content,
 * so take its first clause (up to the first comma or colon), adding the next
 * clause while it is still too short to name the event.
 */
export function shortName(title: string) {
  const parts = title.split(/\s*[,،:]\s*/);
  let name = parts[0];
  for (let i = 1; i < parts.length && name.length < 18; i += 1) name += (/[،]/.test(title) ? "، " : ", ") + parts[i];
  return name;
}

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

export function buildReel(ctx: Ctx, text: ReelText | undefined) {
  const { rich, font, fa, track } = ctx;
  // One atlas of 2 x 3 slots at the wall's 7:5; 1024 wide on phones.
  const W = rich ? 840 : 512;
  const H = Math.round(W / 1.4);
  const dir: CanvasDirection = fa ? "rtl" : "ltr";
  type Fill = (c: CanvasRenderingContext2D) => void;
  /** Near black with a warm glow, so the dark slides sit close to the photos' brightness. */
  const ground = (c: CanvasRenderingContext2D, glow = 0.32) => {
    c.fillStyle = "#0b0a09";
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.7);
    g.addColorStop(0, `rgba(196,150,78,${glow})`);
    g.addColorStop(1, "rgba(196,150,78,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  };
  const lines = (c: CanvasRenderingContext2D, list: string[], y: number, step: number) => list.forEach((l, i) => c.fillText(l, W / 2, y + i * step));

  // 0 logo sting: the logo large, no plate (the official transparent artwork).
  const logo: Fill = (c) => {
    ground(c, 0.4);
    const lh = H * 0.68;
    const lw = lh / LOGO_HEIGHT;
    drawLogo(c, W / 2 - lw / 2, H / 2 - lh / 2, lw);
  };
  // 1 the hero title, large, with the subtitle under a gold rule.
  const title: Fill = (c) => {
    ground(c, 0.36);
    c.direction = dir;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#fbf5ea";
    c.font = font(800, H * 0.13);
    const t = wrap(c, text?.title ?? "", W * 0.86).slice(0, 2);
    const y0 = H * 0.5 - (t.length - 1) * H * 0.08;
    lines(c, t, y0, H * 0.16);
    const yr = y0 + (t.length - 1) * H * 0.16 + H * 0.08;
    c.fillStyle = "#e0b75a";
    c.fillRect(W / 2 - W * 0.08, yr, W * 0.16, H * 0.007);
    c.font = font(600, H * 0.058);
    lines(c, wrap(c, text?.line ?? "", W * 0.8).slice(0, 2), yr + H * 0.1, H * 0.08);
  };
  // 2-4 photo captions: transparent, a soft dark gradient at the bottom, the short name large.
  const caption = (i: number): Fill => (c) => {
    c.clearRect(0, 0, W, H);
    const g = c.createLinearGradient(0, H * 0.38, 0, H);
    g.addColorStop(0, "rgba(6,5,4,0)");
    g.addColorStop(0.55, "rgba(6,5,4,0.62)");
    g.addColorStop(1, "rgba(6,5,4,0.86)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.direction = dir;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.font = font(800, H * 0.115);
    const name = wrap(c, shortName(text?.events[i] ?? ""), W * 0.88).slice(0, 2);
    const yb = H * 0.82 - (name.length - 1) * H * 0.135;
    c.fillStyle = "#e0b75a";
    c.fillRect(W / 2 - W * 0.05, yb - H * 0.17, W * 0.1, H * 0.008);
    c.fillStyle = "#fbf5ea";
    lines(c, name, yb, H * 0.135);
  };
  // 5 the ground a photo slide shows until its photo arrives: warm contours on near black.
  const waiting: Fill = (c) => {
    ground(c, 0.3);
    c.lineWidth = Math.max(1, W / 420);
    for (let i = 0; i < 18; i += 1) {
      c.strokeStyle = `rgba(224,183,90,${0.16 + (i % 4) * 0.06})`;
      c.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = H * 0.22 + i * H * 0.04 + Math.sin(x / (W * 0.15) + i * 0.5) * H * 0.03;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  };

  const fills = [logo, title, caption(0), caption(1), caption(2), waiting];
  const atlas = canvasTexture(W * 2, H * 3, (c) => {
    fills.forEach((fill, i) => {
      c.save();
      c.translate((i % 2) * W, Math.floor(i / 2) * H);
      c.beginPath();
      c.rect(0, 0, W, H);
      c.clip();
      fill(c);
      c.restore();
    });
  });
  track(atlas.texture);
  atlas.texture.anisotropy = 4;

  const uniforms = {
    uReel: { value: atlas.texture },
    uPhoto0: { value: null as THREE.Texture | null },
    uPhoto1: { value: null as THREE.Texture | null },
    uPhoto2: { value: null as THREE.Texture | null },
    uPhotoOn: { value: new THREE.Vector3(0, 0, 0) },
    uTime: { value: 0 },
  };
  // Photos at 1024 px on desktop, 640 on phones, after the first frame (the hero start is not slowed).
  let asked = false;
  const loadPhotos = () => {
    if (asked) return;
    asked = true;
    const loader = new THREE.TextureLoader();
    const slots = [uniforms.uPhoto0, uniforms.uPhoto1, uniforms.uPhoto2];
    REEL_PHOTOS.forEach((name, i) => {
      loader.load(`/booth-reel/${name}-${rich ? 1024 : 640}.jpg`, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        track(t);
        slots[i].value = t;
        uniforms.uPhotoOn.value.setComponent(i, 1);
      });
    });
  };
  return { uniforms, loadPhotos };
}

/**
 * GLSL for the reel: `vec3 reel(vec2 uv, float time)` returns the wall's picture
 * at a point of the whole wall (0..1) and a reel time in seconds.
 */
export const REEL_GLSL = /* glsl */ `
  uniform sampler2D uReel;
  uniform sampler2D uPhoto0;
  uniform sampler2D uPhoto1;
  uniform sampler2D uPhoto2;
  uniform vec3 uPhotoOn;
  const float FADE = ${REEL_FADE.toFixed(2)};
  const float LOOP = ${REEL_LOOP.toFixed(2)};
  float reelStart(float k) {
    return k < 0.5 ? ${REEL_STARTS[0].toFixed(2)} : k < 1.5 ? ${REEL_STARTS[1].toFixed(2)} : k < 2.5 ? ${REEL_STARTS[2].toFixed(2)} : k < 3.5 ? ${REEL_STARTS[3].toFixed(2)} : k < 4.5 ? ${REEL_STARTS[4].toFixed(2)} : LOOP;
  }
  vec4 atlasAt(float slot, vec2 q) {
    float col = mod(slot, 2.0);
    float row = floor(slot / 2.0);
    q = clamp(q, 0.003, 0.997);
    // Slot (col, row) from the canvas's top-left; textures are flipped, so row 0 is the top third.
    return texture2D(uReel, vec2((col + q.x) * 0.5, (3.0 - row - 1.0 + q.y) / 3.0));
  }
  vec3 reelSlide(float k, vec2 uv, float s, float life) {
    vec3 gold = vec3(1.0, 0.8, 0.45);
    if (k < 0.5 || k > 3.5) {
      // Logo sting and title: a slow 2.5% push-in and one soft gold light sweep.
      vec2 q = 0.5 + (uv - 0.5) * (1.0 - 0.025 * life);
      vec3 c = atlasAt(k < 0.5 ? 0.0 : 1.0, q).rgb;
      float x0 = -0.35 + 1.7 * life;
      float band = exp(-pow(q.x + (q.y - 0.5) * 0.45 - x0, 2.0) / 0.014);
      return c + gold * band * 0.35 * smoothstep(0.1, 0.45, dot(c, vec3(0.333)));
    }
    // Photos: slow pan and zoom (about 3.5% over the slide), the caption held still over it.
    float i = k - 1.0;
    float dirx = i < 0.5 ? 1.0 : i < 1.5 ? -1.0 : 1.0;
    vec2 q = 0.5 + (uv - 0.5) * (1.0 - 0.035 * life) + vec2(0.012 * dirx, 0.006) * (life - 0.5);
    float on = i < 0.5 ? uPhotoOn.x : i < 1.5 ? uPhotoOn.y : uPhotoOn.z;
    vec3 photo = i < 0.5 ? texture2D(uPhoto0, q).rgb : i < 1.5 ? texture2D(uPhoto1, q).rgb : texture2D(uPhoto2, q).rgb;
    vec3 c = mix(atlasAt(5.0, q).rgb, photo, on);
    vec4 cap = atlasAt(2.0 + i, uv);
    return mix(c, cap.rgb, cap.a);
  }
  vec3 reel(vec2 uv, float time) {
    float t = mod(time, LOOP);
    float k = t < reelStart(1.0) ? 0.0 : t < reelStart(2.0) ? 1.0 : t < reelStart(3.0) ? 2.0 : t < reelStart(4.0) ? 3.0 : 4.0;
    float a = reelStart(k);
    float b = reelStart(k + 1.0);
    // Each slide is on from FADE before its slot (cross-fading in) to the end of its slot.
    float s = t - a + FADE;
    vec3 now = reelSlide(k, uv, s, clamp(s / (b - a + FADE), 0.0, 1.0));
    float w = smoothstep(b - FADE, b, t);
    if (w <= 0.0) return now;
    float n = mod(k + 1.0, 5.0);
    float sn = t - b + FADE;
    float bn = reelStart(n + 1.0);
    float an = reelStart(n);
    vec3 next = reelSlide(n, uv, sn, clamp(sn / (bn - an + FADE), 0.0, 1.0));
    return mix(now, next, w);
  }
`;
