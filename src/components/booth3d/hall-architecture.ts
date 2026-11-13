// The hall itself: a tall vaulted exhibition hall. Behind the stand (the
// backdrop of almost every frame) a full-height glazed curtain wall shows a
// dusk sky with slim mullions, above a mezzanine gallery whose fascia carries
// a long illuminated wayfinding band. Arched roof ribs land on the side
// columns, skylight strips run along the vault, suspended ring lights hang
// over the aisles with soft light shafts and pools under them, and banners
// hang at the back. Everything is instanced or shares a batch (see
// createSurroundMaterials); the front of the hall stays clear for the camera.

import * as THREE from "three";
import { canvasTexture, toFa, type Ctx, type V3 } from "./core";
import { createSurroundMaterials, type SurroundMaterials } from "./materials";
import { FINALE_AT, hallLight, window01 } from "./timeline";
import { SURROUNDINGS as S, lightsOn, nightLevel } from "./surroundings-timeline";
import { onTheme, themeLevel } from "./theme";

/** Hall shell (m): half width, back (glazed) wall, front, roof springing and crown. */
export const HALL = { x: 46, back: -40, front: 60, spring: 12, crown: 19.5, mezzanine: 6.8 };
const RISE = HALL.crown - HALL.spring;
const R = (HALL.x * HALL.x + RISE * RISE) / (2 * RISE);
const ALPHA = Math.asin(HALL.x / R);
/** Height of the vault's underside above a point at x. */
export const vaultY = (x: number) => HALL.crown - R + Math.sqrt(R * R - x * x);

/** 0 until the closing frame, 1 once it rests (same curve as the stand's finale light). */
const finaleLight = (p: number) => {
  const t = window01(p, FINALE_AT - 0.03, FINALE_AT + 0.05);
  return t * t * (3 - 2 * t);
};

/** Shared hall/neighbour materials, created once per scene. */
export function surround(ctx: Ctx): SurroundMaterials {
  if (!ctx.hooks.surround) ctx.hooks.surround = createSurroundMaterials(ctx.track);
  return ctx.hooks.surround as SurroundMaterials;
}

/** A plane whose UVs cover one cell (pixels, top-left origin) of an atlas. */
export function atlasPlane(w: number, h: number, cell: [number, number, number, number], size: [number, number]) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const [x0, y0, x1, y1] = cell;
  for (let k = 0; k < uv.count; k += 1) {
    const u = uv.getX(k);
    const v = uv.getY(k);
    uv.setXY(k, (x0 + (x1 - x0) * u) / size[0], 1 - (y1 - (y1 - y0) * v) / size[1]);
  }
  return g;
}

/**
 * Banners and stand-number plates share one atlas (and one draw call):
 * the top three quarters hold four tall banners, the bottom quarter eight plates.
 */
export function signAtlas(ctx: Ctx) {
  if (ctx.hooks.signs) return ctx.hooks.signs as { material: THREE.Material; banner(i: number, w: number, h: number): THREE.BufferGeometry; plate(i: number, w: number, h: number): THREE.BufferGeometry };
  const { track, rich, font } = ctx;
  const W = rich ? 1024 : 512;
  const H = W;
  const k = W / 1024;
  const plates = ["A14", "B08", "C21", "D03", "B15", "E06", "E11", "F02"];
  const atlas = canvasTexture(W, H, (c) => {
    const bw = W / 4;
    const bh = H * 0.75;
    // Banners: muted fields, abstract marks, a zone letter and an arrow (no names).
    const banners: Array<{ bg: string; ink: string; accent: string; mark: number; letter: string }> = [
      { bg: "#1f3a3d", ink: "#d9e4df", accent: "#8fb8ae", mark: 0, letter: "B" },
      { bg: "#3a2a2e", ink: "#eadfd6", accent: "#b98a76", mark: 1, letter: "C" },
      { bg: "#cdc2ae", ink: "#2a2724", accent: "#7d6a52", mark: 2, letter: "D" },
      { bg: "#23272c", ink: "#e6e1d6", accent: "#a99a7c", mark: 3, letter: "A" },
    ];
    banners.forEach((b, i) => {
      const x = i * bw;
      c.fillStyle = b.bg;
      c.fillRect(x, 0, bw, bh);
      c.strokeStyle = b.accent;
      c.fillStyle = b.accent;
      c.lineWidth = 6 * k;
      const cx = x + bw / 2;
      const cy = bh * 0.36;
      if (b.mark === 0) {
        for (const r of [0.34, 0.25, 0.16]) {
          c.beginPath();
          c.arc(cx, cy, bw * r, Math.PI * 0.85, Math.PI * 2.15);
          c.stroke();
        }
      } else if (b.mark === 1) {
        c.beginPath();
        c.arc(cx, cy, bw * 0.28, 0, Math.PI * 2);
        c.stroke();
        c.fillRect(x + bw * 0.18, cy + bw * 0.4, bw * 0.64, 6 * k);
      } else if (b.mark === 2) {
        for (let j = 0; j < 3; j += 1) c.fillRect(x + bw * 0.22, cy - bw * 0.2 + j * bw * 0.18, bw * (0.56 - j * 0.14), 14 * k);
      } else {
        c.beginPath();
        c.arc(cx, cy + bw * 0.3, bw * 0.4, Math.PI, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(cx, cy + bw * 0.3, bw * 0.08, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = b.ink;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = font(800, 120 * k);
      c.fillText(b.letter, cx, bh * 0.72);
      c.fillRect(x + bw * 0.3, bh * 0.86, bw * 0.4, 4 * k);
      // Hem and header pockets.
      c.fillStyle = "rgba(0,0,0,0.25)";
      c.fillRect(x, 0, bw, 10 * k);
      c.fillRect(x, bh - 10 * k, bw, 10 * k);
    });
    // Stand-number plates: dark ground, light numerals.
    const pw = W / 4;
    const ph = H / 8;
    plates.forEach((name, i) => {
      const x = (i % 4) * pw;
      const y = bh + Math.floor(i / 4) * ph;
      c.fillStyle = "#1b1d20";
      c.fillRect(x, y, pw, ph);
      c.fillStyle = "#d8d2c4";
      c.fillRect(x + 10 * k, y + ph - 18 * k, pw * 0.22, 4 * k);
      c.font = font(800, 70 * k);
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText(name, x + 16 * k, y + ph * 0.44);
    });
  });
  track(atlas.texture);
  const material = track(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }));
  const size: [number, number] = [W, H];
  const out = {
    material,
    banner: (i: number, w: number, h: number) => track(atlasPlane(w, h, [i * (W / 4), 0, (i + 1) * (W / 4), H * 0.75], size)),
    plate: (i: number, w: number, h: number) => {
      const x = (i % 4) * (W / 4);
      const y = H * 0.75 + Math.floor(i / 4) * (H / 8);
      return track(atlasPlane(w, h, [x, y, x + W / 4, y + H / 8], size));
    },
  };
  ctx.hooks.signs = out;
  return out;
}

/** Soft radial mask for light pools on the hall floor (shared with the neighbours). */
export function hallPoolKind(ctx: Ctx) {
  if (ctx.hooks.hallPool) return;
  const pool = canvasTexture(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, "#6e6e6e");
    g.addColorStop(0.8, "#161616");
    g.addColorStop(1, "#000000");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, true);
  ctx.track(pool.texture);
  ctx.decals.kind("hallpool", pool.texture, new THREE.Color(0.95, 0.86, 0.72), true);
  ctx.hooks.hallPool = true;
}

export function buildHallArchitecture(ctx: Ctx) {
  const { scene, track, parts, rich, fa, font, decals, sparkles } = ctx;
  const m = surround(ctx);
  const opts = { cast: false, receive: false };
  const metal = ctx.bars(m.metal, scene, opts);
  const matte = ctx.bars(m.matte, scene, opts);
  const hallGlow = m.glow();
  const glowBars = ctx.bars(hallGlow, scene, opts);
  hallPoolKind(ctx);
  const STEEL = "#4a5158";
  const DARK = "#1f2327";

  // ---- vault: a shallow barrel roof with acoustic panels and skylight strips.
  const vaultTex = canvasTexture(rich ? 512 : 256, rich ? 1024 : 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#1a1f25");
    g.addColorStop(0.5, "#283039");
    g.addColorStop(1, "#1a1f25");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(0,0,0,0.22)";
    for (let i = 0; i < 32; i += 1) c.fillRect((i / 32) * w, 0, 1, h);
    for (let j = 0; j < 100; j += 1) c.fillRect(0, (j / 100) * h, w, 1);
    // Skylights along the vault: a wide crown strip and two narrow ones, dusk-blue glass.
    const sky = (u0: number, u1: number) => {
      const s = c.createLinearGradient(u0 * w, 0, u1 * w, 0);
      s.addColorStop(0, "#3c4b60");
      s.addColorStop(0.5, "#7d90a8");
      s.addColorStop(1, "#3c4b60");
      c.fillStyle = s;
      c.fillRect(u0 * w, 0, (u1 - u0) * w, h);
      c.fillStyle = "rgba(20,24,30,0.7)";
      for (let j = 0; j < 50; j += 1) c.fillRect(u0 * w, (j / 50) * h, (u1 - u0) * w, Math.max(1, h / 400));
    };
    sky(0.465, 0.535);
    sky(0.29, 0.31);
    sky(0.69, 0.71);
    // Rib shadows across every 12 m bay (v = 0 at the back wall).
    c.fillStyle = "rgba(8,10,12,0.75)";
    for (let z = -36; z <= 60; z += 12) {
      const y = (1 - (z - HALL.back) / (HALL.front - HALL.back)) * h;
      c.fillRect(0, y - h * 0.004, w, h * 0.008);
    }
  });
  track(vaultTex.texture);
  const vaultMat = track(new THREE.MeshBasicMaterial({ map: vaultTex.texture, side: THREE.BackSide }));
  const length = HALL.front - HALL.back;
  const vaultGeo = new THREE.CylinderGeometry(R, R, length, rich ? 48 : 28, 1, true, Math.PI - ALPHA, 2 * ALPHA);
  vaultGeo.rotateX(Math.PI / 2);
  vaultGeo.translate(0, HALL.crown - R, (HALL.front + HALL.back) / 2);
  const vault = new THREE.Mesh(track(vaultGeo), vaultMat);
  vault.name = "hall-vault";
  scene.add(vault);

  // ---- arched ribs every 12 m, landing on the side columns, with purlins between.
  const ribGeo = track(new THREE.TorusGeometry(R - 0.45, 0.3, 4, rich ? 72 : 40, 2 * ALPHA).rotateZ(Math.PI / 2 - ALPHA));
  const ribs = parts.pool(ribGeo, m.metal, scene, opts);
  for (let z = -36; z <= 48; z += 12) {
    ribs.place({ p: [0, HALL.crown - R, z] }, -1, STEEL);
    for (const sx of [-1, 1]) {
      metal.place({ p: [sx * (HALL.x - 0.5), HALL.spring / 2, z], s: [0.8, HALL.spring, 0.8] }, -1, STEEL);
      metal.place({ p: [sx * (HALL.x - 1.3), HALL.spring - 0.9, z], s: [1.6, 0.5, 0.5], r: [0, 0, sx * 0.5] }, -1, STEEL);
    }
  }
  ribs.place({ p: [0, HALL.crown - R, HALL.back + 0.4] }, -1, STEEL);
  for (const x of [-36, -24, -12, 12, 24, 36]) metal.place({ p: [x, vaultY(x) - 0.75, (HALL.front + HALL.back) / 2], s: [0.18, 0.22, length] }, -1, "#3a4047");

  // ---- side walls: dark acoustic panels with a fine light line.
  for (const sx of [-1, 1]) {
    matte.place({ p: [sx * (HALL.x + 0.2), HALL.spring / 2, (HALL.front + HALL.back) / 2], s: [0.3, HALL.spring, length] }, -1, "#24282d");
    glowBars.place({ p: [sx * (HALL.x - 0.02), 4.4, (HALL.front + HALL.back) / 2], s: [0.03, 0.07, length] }, -1, "#d9cdb6");
  }

  // ---- back wall, ground floor: dark acoustic wall with lit service openings.
  const zb = HALL.back;
  const mz = HALL.mezzanine;
  matte.place({ p: [0, mz / 2, zb - 0.1], s: [HALL.x * 2, mz, 0.2] }, -1, DARK);
  for (const x of [-33, -15, 9, 27]) {
    glowBars.place({ p: [x, 1.6, zb + 0.02], s: [3.2, 3.2, 0.02] }, -1, "#b9a68a");
    matte.place({ p: [x, 3.3, zb + 0.06], s: [3.6, 0.2, 0.12] }, -1, "#2d3237");
  }

  // ---- mezzanine gallery across the back wall, on slim columns, with a glass balustrade line.
  const md = 4.2;
  const front = zb + md;
  matte.place({ p: [0, mz, zb + md / 2], s: [HALL.x * 2, 0.5, md] }, -1, "#2a2f35");
  for (let x = -40.5; x <= 40.5; x += 9) metal.place({ p: [x, (mz - 0.25) / 2, front - 0.35], s: [0.32, mz - 0.25, 0.32] }, -1, "#3b4148");
  metal.place({ p: [0, mz + 1.35, front - 0.08], s: [HALL.x * 2, 0.05, 0.06] }, -1, "#9aa1a8");
  for (let x = -45; x <= 45; x += 1.8) metal.place({ p: [x, mz + 0.8, front - 0.08], s: [0.035, 1.1, 0.035] }, -1, "#7d848b");
  // Soffit downlights under the gallery.
  for (let x = -42; x <= 42; x += 3.5) sparkles.add([x, mz - 0.3, front - 1.2], rich ? 0.45 : 0.6, new THREE.Color(1.1, 0.88, 0.62), (p) => 0.55 + 0.35 * lightsOn(p, S.far.lights));

  // The fascia: a long illuminated wayfinding band (hall number, zones, arrows).
  const BW = rich ? 4096 : 2048;
  const BH = rich ? 96 : 48;
  const band = canvasTexture(BW, BH, (c, w, h) => {
    c.fillStyle = "#121519";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(226,214,190,0.75)";
    c.fillRect(0, h * 0.08, w, Math.max(1, h * 0.03));
    c.fillRect(0, h * 0.89, w, Math.max(1, h * 0.03));
    c.fillStyle = "rgba(238,232,220,0.95)";
    c.textBaseline = "middle";
    c.textAlign = "center";
    c.direction = fa ? "rtl" : "ltr";
    const hall = fa ? `سالن ${toFa(3)}` : "HALL 3";
    const items = [hall, "◂  A", "B  ▸", "○", hall, "◂  C", "D  ▸", "○", hall, "◂  E", "F  ▸"];
    items.forEach((text, i) => {
      const x = ((i + 0.5) / items.length) * w;
      c.font = font(text === hall ? 800 : 600, h * (text === hall ? 0.52 : 0.42));
      if (text === "○") {
        c.strokeStyle = "rgba(201,169,96,0.95)";
        c.lineWidth = Math.max(1, h * 0.06);
        c.beginPath();
        c.arc(x, h / 2, h * 0.2, 0, Math.PI * 2);
        c.stroke();
      } else c.fillText(text, x, h * 0.52);
    });
  });
  track(band.texture);
  const bandMat = track(new THREE.MeshBasicMaterial({ map: band.texture, toneMapped: false, color: new THREE.Color(1, 1, 1) }));
  const bandMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(HALL.x * 2, 0.95)), bandMat);
  bandMesh.position.set(0, mz, front + 0.005);
  bandMesh.name = "hall-wayfinding";
  scene.add(bandMesh);

  // ---- glazed curtain wall above the gallery: dusk sky behind slim mullions.
  const GW = rich ? 1024 : 512;
  const GH = rich ? 256 : 128;
  const top = 21;
  const bottom = mz + 0.25;
  const sky = canvasTexture(GW, GH, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#16213a");
    g.addColorStop(0.45, "#2d3a58");
    g.addColorStop(0.72, "#5d5670");
    g.addColorStop(0.86, "#8f6f6c");
    g.addColorStop(0.95, "#b58a68");
    g.addColorStop(1, "#a07c62");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // A distant skyline with a few lit windows, low in the glass.
    const r = (() => {
      let s = 7;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
    let x = 0;
    while (x < w) {
      const bw = w * (0.012 + r() * 0.03);
      const bh = h * (0.04 + r() * r() * 0.14);
      c.fillStyle = "#1d2029";
      c.fillRect(x, h - bh, bw, bh);
      c.fillStyle = "rgba(255,206,150,0.55)";
      for (let k = 0; k < bw * bh * 0.004; k += 1) c.fillRect(x + r() * bw, h - bh + r() * bh, Math.max(1, w / 900), Math.max(1, h / 220));
      x += bw + w * r() * 0.01;
    }
  });
  track(sky.texture);
  // The same glass on a bright day (built once; the theme swaps the map).
  const day = canvasTexture(GW / 2, GH / 2, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#7fa6cf");
    g.addColorStop(0.55, "#b4cde3");
    g.addColorStop(0.9, "#dfe8ec");
    g.addColorStop(1, "#e6ebea");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const r = (() => {
      let s = 7;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
    let x = 0;
    while (x < w) {
      const bw = w * (0.012 + r() * 0.03);
      const bh = h * (0.04 + r() * r() * 0.14);
      c.fillStyle = "#93a0ad";
      c.fillRect(x, h - bh, bw, bh);
      x += bw + w * r() * 0.01;
    }
  });
  track(day.texture);
  const glassMat = track(new THREE.MeshBasicMaterial({ map: sky.texture, fog: false, color: new THREE.Color(1, 1, 1) }));
  const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(HALL.x * 2, top - bottom)), glassMat);
  glass.position.set(0, (top + bottom) / 2, zb);
  glass.name = "hall-curtain-wall";
  scene.add(glass);
  const MULL = "#1b1f24";
  for (let x = -45; x <= 45.01; x += 3) {
    const major = Math.abs(x % 9) < 0.01;
    metal.place({ p: [x, (top + bottom) / 2, zb + 0.12], s: [major ? 0.32 : 0.08, top - bottom, major ? 0.5 : 0.16] }, -1, MULL);
  }
  for (let y = bottom + 3.4; y < top; y += 3.4) metal.place({ p: [0, y, zb + 0.1], s: [HALL.x * 2, 0.08, 0.14] }, -1, MULL);

  // ---- suspended ring lights (never below 13 m over the front aisle), with shafts and pools.
  const rings: Array<[number, number, number, number]> = [
    [-15, 14.2, -15, 3.4],
    [14, 14.6, -16, 3.0],
    [0, 15.4, -25, 4.2],
    [-27, 13.8, -27, 3.2],
    [27, 13.8, -28, 3.2],
    [-29, 14.2, 8, 3.4],
    [29, 14.2, 8, 3.4],
    [-14, 15.2, 13, 3.2],
    [14, 15.2, 13, 3.2],
  ];
  const ringMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.42, 1.15), toneMapped: false }));
  const ringGeo = track(new THREE.TorusGeometry(1, 0.026, 6, rich ? 72 : 44).rotateX(Math.PI / 2));
  const housingGeo = track(new THREE.TorusGeometry(1, 0.05, 4, rich ? 72 : 44).rotateX(Math.PI / 2));
  const ringPool = parts.pool(ringGeo, ringMat, scene, opts);
  const housing = parts.pool(housingGeo, m.metal, scene, opts);
  const ringLevel = (p: number) => (0.55 + 0.45 * hallLight(p)) * (1 - 0.25 * finaleLight(p)) * (1 - 0.35 * themeLevel(ctx));
  const cones: Array<{ at: V3; r: number }> = [];
  for (const [x, y, z, r] of rings) {
    // Unit rings scaled to size: the tube grows with r across (~9 cm), y keeps it as tall.
    ringPool.place({ p: [x, y, z], s: [r, 3.4, r] });
    housing.place({ p: [x, y + 0.1, z], s: [r, 2, r] }, -1, "#2a2e33");
    for (let k = 0; k < 3; k += 1) {
      const a = (k / 3) * Math.PI * 2 + 0.4;
      const len = vaultY(x) - y;
      metal.place({ p: [x + Math.sin(a) * r, y + len / 2, z + Math.cos(a) * r], s: [0.02, len, 0.02] }, -1, "#5c636a");
    }
    const n = 10;
    for (let k = 0; k < n; k += 1) {
      const a = (k / n) * Math.PI * 2;
      sparkles.add([x + Math.sin(a) * r, y - 0.05, z + Math.cos(a) * r], rich ? 0.9 : 1.3, new THREE.Color(1.0, 0.86, 0.64), (p) => ringLevel(p) * (rich ? 0.22 : 0.34));
    }
    decals.add("hallpool", x, 0.006, z, r * 4.2, r * 4.2, (p) => ringLevel(p) * (z > 5 ? 0.3 : 0.2));
    if (z < -12) cones.push({ at: [x, y, z], r });
  }

  // Soft shafts under the rear rings: additive, view-softened cones in the haze.
  const coneGeo = new THREE.CylinderGeometry(1, 1.6, 1, rich ? 32 : 20, 1, true);
  coneGeo.translate(0, -0.5, 0);
  const shaftMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0.95, 0.85, 0.68) }, uStrength: { value: rich ? 0.11 : 0.14 } },
      vertexShader: /* glsl */ `
        varying float vAlong;
        varying float vEdge;
        void main() {
          vec4 p = instanceMatrix * vec4(position, 1.0);
          vec3 n = mat3(instanceMatrix) * normal;
          vec4 mv = modelViewMatrix * p;
          vec3 vn = normalMatrix * n;
          vEdge = abs(dot(vn / max(length(vn), 0.000001), normalize(-mv.xyz)));
          vAlong = uv.y;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uStrength;
        varying float vAlong;
        varying float vEdge;
        void main() {
          // Varyings can leave 0..1 on multisampled edges, and pow() of a negative
          // value is not a number on some graphics drivers: clamp first.
          float along = clamp(vAlong, 0.0, 1.0);
          float edge = clamp(vEdge, 0.0, 1.0);
          float a = uStrength * edge * edge * pow(max(along, 0.0001), 1.6) * smoothstep(0.0, 0.25, along);
          gl_FragColor = vec4(uColor * max(a, 0.0), 1.0);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  const shafts = new THREE.InstancedMesh(track(coneGeo), shaftMat, cones.length);
  const mtx = new THREE.Matrix4();
  cones.forEach(({ at, r }, i) => {
    mtx.compose(new THREE.Vector3(at[0], at[1], at[2]), new THREE.Quaternion(), new THREE.Vector3(r, at[1], r));
    shafts.setMatrixAt(i, mtx);
  });
  shafts.frustumCulled = false;
  shafts.renderOrder = 7;
  shafts.name = "hall-shafts";
  scene.add(shafts);
  const shaftBase = shaftMat.uniforms.uStrength.value as number;

  // ---- hanging banners at the back and over the side aisles.
  const signs = signAtlas(ctx);
  const banners: Array<[number, number, number, number]> = [
    [-25, 11.6, -14, 0],
    [-9, 12.4, -28, 1],
    [6, 12.4, -28, 2],
    [21, 12, -31, 3],
    [-31, 11.2, 0, 2],
    [31, 11.2, -2, 0],
  ];
  const bannerGeos = [0, 1, 2, 3].map((i) => signs.banner(i, 1.6, 4.8));
  const bannerPools = bannerGeos.map((g) => parts.pool(g, signs.material, scene, opts));
  for (const [x, y, z, i] of banners) {
    bannerPools[i].place({ p: [x, y, z], r: [0, x > 0 ? -0.18 : 0.18, 0] });
    metal.place({ p: [x, y + 2.45, z], s: [1.8, 0.05, 0.05], r: [0, x > 0 ? -0.18 : 0.18, 0] }, -1, "#2a2e33");
    const len = vaultY(x) - (y + 2.45);
    for (const dx of [-0.75, 0.75]) metal.place({ p: [x + dx * Math.cos(0.18), y + 2.45 + len / 2, z], s: [0.015, len, 0.015] }, -1, "#5c636a");
  }

  // ---- per-frame levels: work-lit build-up, dimmed show, night outside by the finale.
  const night = new THREE.Color(0.42, 0.5, 0.78);
  const white = new THREE.Color(1, 1, 1);
  // Theme: the light opening day brightens the shell (shared with the neighbours,
  // whose muted instance colours read lit for day) and puts daylight in the glass.
  onTheme(ctx, (theme) => {
    const light = theme === "light";
    glassMat.map = light ? day.texture : sky.texture;
    m.matte.color.setScalar(light ? 1.7 : 1);
    m.metal.color.setScalar(light ? 1.35 : 1);
  });
  ctx.anims.push((p) => {
    const L = themeLevel(ctx);
    // Daylight keeps the hall bright even when the show lighting is on.
    const hall = hallLight(p) * (1 - L) + L * (0.85 + 0.15 * hallLight(p));
    const fin = finaleLight(p);
    const nl = nightLevel(p);
    const rl = ringLevel(p);
    ringMat.color.setRGB(1.6 * rl, 1.42 * rl, 1.15 * rl);
    shaftMat.uniforms.uStrength.value = shaftBase * rl;
    vaultMat.color.setScalar(0.62 + 0.38 * hall).multiplyScalar((1 - 0.25 * nl * (1 - L)) * (1 + 2.2 * L));
    if (L) glassMat.color.setScalar(1 - 0.08 * fin);
    else glassMat.color.copy(white).lerp(night, nl).multiplyScalar(0.92 - 0.12 * fin);
    const far = lightsOn(p, S.far.lights);
    hallGlow.color.setScalar(0.45 + 0.35 * far);
    bandMat.color.setScalar(0.62 + 0.12 * far - 0.1 * fin);
  });
}
