// The neighbouring stands. The hall fills up around us in step with our own
// build: ten unbranded stands (abstract marks only, no names, no lettering),
// each with its own staggered build spread over the chapters (floor laid in
// strips, frame, walls, fascia, lights on, screens waking), work gear that
// rolls in and out as the build goes, hanging banners hoisted on chains, and
// in the show state slow abstract loops on the screens and a few slowly
// sweeping beams. No people, nothing flashes, and everything stays secondary
// to our stand: muted colours, lower light levels, the hall's haze.
//   Bespoke:  A rotunda (left), nested portals (back right), a ribbon fin wall
//             (behind), a bronze pergola (right), a ribbed dome (far back).
//   Modular:  a media stand and a twin-header stand at the back corners, two
//             side stands facing our side aisles, a pavilion at the far back.
// Far rows of finished stands light up in three groups during the second half.
// Layout and timing live in surroundings-timeline.ts, which also states the
// keep-clear rule (nothing tall in the camera's sector in front of the stand).
// Draw calls: two shared batches (matte, metal) for every panel, frame, floor
// and piece of gear, one glow and one screen material per stand, one beam mesh.

import * as THREE from "three";
import { canvasTexture, merge, rod, rng, v3, type Ctx, type Motion, type Pool, type V3, type Win } from "./core";
import { floodLevel } from "./light";
import { BOOTH_TIMELINE as T, window01 } from "./timeline";
import { GEAR, SURROUNDINGS as S, lightsOn, onSite, stagger, type ShellPlan } from "./surroundings-timeline";
import { hallPoolKind, signAtlas, surround, vaultY } from "./hall-architecture";
import { themeLevel } from "./theme";

const WARM = "#ffd9ab";
const COOL = "#d6e6f5";
const PRE: Win = [-1.0001, -1];
const smooth = (t: number) => t * t * (3 - 2 * t);
const smoothWin = (p: number, w: Win) => smooth(window01(p, w[0], w[1]));

/** Soft abstract loops for the neighbours' screens (no text, no marks): one tiling atlas, four looks. */
function screenAtlas(ctx: Ctx) {
  const W = ctx.rich ? 512 : 256;
  const H = W / 2;
  const looks: Array<[string, string, string]> = [
    ["#4f9a93", "#b08c5a", "#22393d"],
    ["#5873a8", "#8f78a0", "#212a40"],
    ["#9a8a70", "#4f8287", "#2b2824"],
    ["#666a92", "#a88e68", "#24242f"],
  ];
  const atlas = canvasTexture(W, H, (c, w, h) => {
    const r = rng(23);
    const bh = h / 4;
    looks.forEach(([a, b, ground], i) => {
      const y0 = i * bh;
      c.save();
      c.beginPath();
      c.rect(0, y0, w, bh);
      c.clip();
      c.fillStyle = ground;
      c.fillRect(0, y0, w, bh);
      for (let k = 0; k < 9; k += 1) {
        const x = r() * w;
        const y = y0 + r() * bh;
        const rad = bh * (0.35 + r() * 0.6);
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, k % 2 ? a : b);
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        // Wrapped, so the loop tiles as it drifts.
        for (const ox of [-w, 0, w]) c.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
      }
      // A few fine horizontal rules, as on a quiet motion-graphics loop.
      c.fillStyle = "rgba(255,255,255,0.05)";
      for (let k = 1; k < 4; k += 1) c.fillRect(0, y0 + (k / 4) * bh, w, Math.max(1, bh / 90));
      c.restore();
    });
  });
  atlas.texture.wrapS = THREE.RepeatWrapping;
  ctx.track(atlas.texture);
  /** A screen plane (w x h m, facing +z) showing look `i`, starting at `u0` along the loop. */
  const plane = (w: number, h: number, i: number, u0: number) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const du = (w / h) / 8; // a band of the atlas is eight times as wide as it is tall
    const v0 = 1 - (i + 1) / 4 + 0.01;
    const v1 = 1 - i / 4 - 0.01;
    for (let k = 0; k < uv.count; k += 1) uv.setXY(k, u0 + uv.getX(k) * du, v0 + uv.getY(k) * (v1 - v0));
    return ctx.track(g);
  };
  return { texture: atlas.texture, plane };
}

export function buildNeighbours(ctx: Ctx) {
  const { scene, track, parts, rich, decals, sparkles } = ctx;
  const m = surround(ctx);
  hallPoolKind(ctx);
  const opts = { cast: false, receive: false };
  const seg = rich ? 40 : 24;
  const cylGeo = track(new THREE.CylinderGeometry(1, 1, 1, seg, 1, false));
  const tubeGeo = track(new THREE.CylinderGeometry(1, 1, 1, seg + 8, 1, true));
  /** A flat full ring (unit radius) for edges, chords and light rings. */
  const ringGeo = track(new THREE.TorusGeometry(1, 0.012, 4, seg + 16).rotateX(Math.PI / 2));
  /** An upright ring facing +z (wall marks). */
  const wallRingGeo = track(new THREE.TorusGeometry(1, 0.03, 4, seg + 16));
  /** An upright disc facing +z (wall marks). */
  const discGeo = track(new THREE.CircleGeometry(1, seg));
  const pool = (g: THREE.BufferGeometry, mat: THREE.Material): Pool => parts.pool(g, mat, scene, opts);
  const matte = ctx.bars(m.matte, scene, opts);
  const metal = ctx.bars(m.metal, scene, opts);
  const cylMatte = pool(cylGeo, m.matte);
  const cylMetal = pool(cylGeo, m.metal);
  const tubeMatte = pool(tubeGeo, m.matte);
  const ringMetal = pool(ringGeo, m.metal);
  const signs = signAtlas(ctx);
  const screens = screenAtlas(ctx);

  /** Static part (in place from the opening frame), or one that arrives in `win`. */
  const put = (target: Pool, home: { p: V3; r?: V3; s?: V3 }, color: string, win?: Win, motion: Motion = {}) =>
    win ? target.add(home, win, motion, color) : target.place(home, -1, color);

  /** One glow material (and its pools) per stand, so each stand's lights come on on their own. */
  const glowSet = (win: Win, max = 0.56, off = 0.14) => {
    const mat = m.glow();
    const set = { box: ctx.bars(mat, scene, opts), cyl: pool(cylGeo, mat), ring: pool(ringGeo, mat), wallRing: pool(wallRingGeo, mat), disc: pool(discGeo, mat), mat };
    ctx.anims.push((p) => mat.color.setScalar(off + max * lightsOn(p, win)));
    return set;
  };

  /** One screen material per stand: dark glass until the screens wake, then a slow loop. */
  const screenSet = (win: Win) => {
    // Not tone-mapped: the loop keeps its soft colours, well under the bloom threshold.
    const mat = track(new THREE.MeshBasicMaterial({ map: screens.texture, color: "#000000", toneMapped: false }));
    ctx.anims.push((p) => mat.color.setScalar((0.05 + 0.78 * lightsOn(p, win)) * (1 - 0.25 * themeLevel(ctx))));
    return (w: number, h: number, look: number, u0: number) => pool(screens.plane(w, h, look, u0), mat);
  };
  // The loops drift very slowly (one pass in about four minutes): calm, never a flicker.
  ctx.anims.push((_, time) => {
    screens.texture.offset.x = (time * 0.004) % 1;
  });

  /** A chain that hangs from the roof to a hoisted part; it shortens as the part rises. */
  const chain = (x: number, z: number, yEnd: number, drop: number, win: Win, ease: (t: number) => number) => {
    const top = vaultY(x) - 0.4;
    const len = top - yEnd;
    metal.add({ p: [x, yEnd + len / 2, z], s: [0.025, len, 0.025] }, win, { from: [0, -drop / 2, 0], scaleFrom: [1, (len + drop) / len, 1], ease }, "#6a7178");
  };

  /** Soft contact shadow under a stand or a piece of gear (follows its build or its stay). */
  const shadow = (x: number, z: number, w: number, d: number, level: (p: number) => number, rotY = 0) =>
    decals.add("blob", x, 0.0035, z, w, d, (p) => level(p) * (1 - 0.35 * themeLevel(ctx)), rotY);

  /** A stand-number totem: a slim plate with an abstract mark (no lettering). */
  const totem = (x: number, z: number, rotY: number, index: number, win?: Win) => {
    put(matte, { p: [x, 0.7, z], r: [0, rotY, 0], s: [0.5, 1.4, 0.12] }, "#1d1f22", win, { from: [0, -0.66, 0], scaleFrom: [1, 0.05, 1], ease: smooth });
    const plate = pool(signs.plate(index, 0.46, 0.23), signs.material);
    const home = { p: [x + Math.sin(rotY) * 0.065, 1.18, z + Math.cos(rotY) * 0.065] as V3, r: [0, rotY, 0] as V3 };
    if (win) plate.add(home, [win[1] - 0.004, win[1]], { ease: () => 1 });
    else plate.place(home);
  };

  /** Work light on a tripod for a stand under construction (struck with ours). */
  const workMat = track(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));
  const workHead = ctx.bars(workMat, scene, opts);
  const tripodGeo = track(
    merge([
      ...[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2;
        return rod(v3(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5), v3(0, 0.7, 0), 0.02, 5);
      }),
      rod(v3(0, 0.7, 0), v3(0, 2.5, 0), 0.025, 6),
    ]),
  );
  const tripods = pool(tripodGeo, m.metal);
  const work = (x: number, z: number, aimX: number, aimZ: number) => {
    const yaw = Math.atan2(aimX - x, aimZ - z);
    const out = { out: { win: T.floodsOut, to: [0, 0, 0] as V3 } };
    tripods.add({ p: [x, 0, z] }, PRE, { ease: () => 1, ...out }, "#2b2e31");
    workHead.add({ p: [x, 2.6, z], r: [-0.35, yaw, 0], s: [0.7, 0.32, 0.06] }, PRE, { ease: () => 1, ...out }, COOL);
    sparkles.add([x + Math.sin(yaw) * 0.12, 2.6, z + Math.cos(yaw) * 0.12], 1.1, new THREE.Color(0.9, 0.96, 1.05), (p) => (p < T.floodsOut[1] ? floodLevel(p) * 0.6 + 0.15 : 0));
  };

  // ---- slowly sweeping beams on a few neighbours (one instanced mesh for all of them).
  const beams: Array<{ at: V3; aim: V3; amp: number; speed: number; phase: number; win: Win }> = [];
  /** A moving head on a stand: a small housing and a beam that sweeps slowly about its aim. */
  const movingHead = (at: V3, aim: V3, win: Win, phase: number, amp = 0.32) => {
    put(metal, { p: [at[0], at[1] + 0.12, at[2]], s: [0.24, 0.24, 0.24] }, "#2a2d30", [win[0] - 0.03, win[0] - 0.01], { from: [0, 0.6, 0], ease: smooth });
    beams.push({ at, aim, amp, speed: 0.09 + (phase % 3) * 0.012, phase, win });
  };

  // ================================================================ A rotunda
  {
    const R = S.rotunda;
    const C = { x: -17, z: -1.5 };
    const r = 4.55;
    const glow = glowSet(R.lights);
    // The open side faces the main aisle and the camera.
    const open = Math.atan2(26, 32.5);
    const lay: Motion = { from: [0, 0.5, 0], ease: smooth };
    put(cylMatte, { p: [C.x, 0.07, C.z], s: [4.95, 0.14, 4.95] }, "#3b3835", R.floor, lay);
    put(cylMatte, { p: [C.x, 0.142, C.z], s: [3.1, 0.006, 3.1] }, "#5a534a", R.floor, lay);
    put(glow.ring, { p: [C.x, 0.13, C.z], s: [4.96, 2, 4.96] }, WARM, R.floor, lay);
    shadow(C.x, C.z, 11.4, 11.4, (p) => 0.5 * smoothWin(p, R.floor));
    const postsWin: Win = [R.floor[1] - 0.02, R.ring[0] + 0.08];
    for (let k = 0; k < 10; k += 1) {
      const a = open + (k / 10) * Math.PI * 2;
      put(cylMetal, { p: [C.x + Math.sin(a) * r, 0.14 + 2.7, C.z + Math.cos(a) * r], s: [0.055, 5.4, 0.055] }, "#8d9399", stagger(postsWin, k, 10, 2.4), { from: [0, -2.6, 0], scaleFrom: [1, 0.04, 1], ease: smooth });
    }
    // Ring truss: three chords and struts, hoisted on four chains.
    const hoist: Motion = { from: [0, -3.4, 0], ease: smooth };
    const rw: Win = [R.ring[0] + 0.06, R.ring[1]];
    put(ringMetal, { p: [C.x, 5.78, C.z], s: [r, 3.5, r] }, "#a9aeb3", rw, hoist);
    put(ringMetal, { p: [C.x, 5.34, C.z], s: [r, 3.5, r] }, "#a9aeb3", rw, hoist);
    put(ringMetal, { p: [C.x, 5.56, C.z], s: [r - 0.3, 3.5, r - 0.3] }, "#a9aeb3", rw, hoist);
    const struts = rich ? 40 : 24;
    for (let k = 0; k < struts; k += 1) {
      const a = (k / struts) * Math.PI * 2;
      put(metal, { p: [C.x + Math.sin(a) * r, 5.56, C.z + Math.cos(a) * r], r: [0, a, 0.5], s: [0.03, 0.5, 0.03] }, "#9da2a7", rw, hoist);
    }
    for (let k = 0; k < 4; k += 1) {
      const a = open + Math.PI / 4 + (k / 4) * Math.PI * 2;
      chain(C.x + Math.sin(a) * r, C.z + Math.cos(a) * r, 5.8, 3.4, rw, smooth);
    }
    // Curved slat wall: eight segments round the back, each a dark backing and timber slats.
    const a0 = open + Math.PI * 0.39;
    const sweep = Math.PI * 1.22;
    const segs = 8;
    const segA = sweep / segs;
    const backGeo = track(new THREE.CylinderGeometry(r - 0.12, r - 0.12, 3.4, rich ? 8 : 5, 1, true, 0, segA));
    const backing = pool(backGeo, m.matte);
    const slatsPer = rich ? 9 : 6;
    const tone = rng(5);
    for (let s = 0; s < segs; s += 1) {
      const win = stagger(R.wall, s, segs, 1.6);
      const mid = a0 + (s + 0.5) * segA;
      const motion: Motion = { from: [Math.sin(mid) * 1.4, 0.5, Math.cos(mid) * 1.4], ease: smooth };
      put(backing, { p: [C.x, 0.14 + 1.7, C.z], r: [0, a0 + s * segA, 0] }, "#2b2826", win, motion);
      for (let k = 0; k < slatsPer; k += 1) {
        const a = a0 + (s + (k + 0.5) / slatsPer) * segA;
        const v = Math.round(118 + tone() * 22);
        put(matte, { p: [C.x + Math.sin(a) * (r - 0.3), 0.14 + 1.7, C.z + Math.cos(a) * (r - 0.3)], r: [0, a, 0], s: [0.08, 3.4, 0.16] }, `rgb(${v},${Math.round(v * 0.74)},${Math.round(v * 0.52)})`, win, motion);
      }
    }
    // Lightbox column, craned in.
    const crane: Motion = { from: [0, 3.6, 0], ease: smooth };
    put(glow.cyl, { p: [C.x, 1.69, C.z], s: [0.42, 3.0, 0.42] }, WARM, R.column, crane);
    put(cylMetal, { p: [C.x, 0.19, C.z], s: [0.47, 0.1, 0.47] }, "#3a3e43", R.column, crane);
    put(cylMetal, { p: [C.x, 3.24, C.z], s: [0.47, 0.1, 0.47] }, "#3a3e43", R.column, crane);
    // Fabric ring hung from the truss, with a light line on its lower edge.
    const lift: Motion = { from: [0, -2.8, 0], ease: smooth };
    put(tubeMatte, { p: [C.x, 4.5, C.z], s: [3.0, 1.1, 3.0] }, "#c7bba6", R.halo, lift);
    put(glow.ring, { p: [C.x, 3.96, C.z], s: [2.98, 2, 2.98] }, WARM, R.halo, lift);
    // Round tables and stools.
    const tables: Array<[number, number]> = [
      [-1.6, 1.2],
      [1.5, -1.4],
      [-1.2, -1.9],
    ];
    tables.forEach(([dx, dz], i) => {
      const win = stagger(R.dress, i, tables.length);
      const drop: Motion = { from: [0, 0.6, 0], scaleFrom: 0.85, ease: smooth };
      put(cylMatte, { p: [C.x + dx, 1.06, C.z + dz], s: [0.42, 0.04, 0.42] }, "#d9d2c5", win, drop);
      put(cylMetal, { p: [C.x + dx, 0.6, C.z + dz], s: [0.04, 0.9, 0.04] }, "#3a3e43", win, drop);
      for (const o of [0.7, -0.7]) put(cylMatte, { p: [C.x + dx + o, 0.5, C.z + dz + o * 0.3], s: [0.2, 0.72, 0.2] }, "#4a4440", win, drop);
    });
    totem(C.x + Math.sin(open) * 5.7, C.z + Math.cos(open) * 5.7, open, 0, stagger(R.dress, 2, 3));
    decals.add("hallpool", C.x, 0.16, C.z, 9.5, 9.5, (p) => lightsOn(p, R.lights) * 0.34);
    work(C.x + 3.2, C.z - 4.6, C.x, C.z);
  }

  // ================================================================ B portal
  {
    const P = S.portal;
    const C = { x: 11.5, z: -13.5 };
    const glow = glowSet(P.lights);
    const screen = screenSet(P.screens);
    const lay: Motion = { from: [0, 0.5, 0], ease: smooth };
    for (let i = 0; i < 4; i += 1) put(matte, { p: [C.x - 6.5 + (i + 0.5) * (13 / 4), 0.05, C.z], s: [13 / 4 - 0.02, 0.1, 7] }, "#2d3236", stagger(P.floor, i, 4, 1.6), lay);
    shadow(C.x, C.z, 14.2, 8.2, (p) => 0.5 * smoothWin(p, P.floor));
    put(glow.box, { p: [C.x, 0.085, C.z + 3.5], s: [13, 0.03, 0.03] }, WARM, P.floor, lay);
    // Side wall, with a screen on its inner face.
    put(matte, { p: [C.x - 6.43, 1.9, C.z], s: [0.14, 3.6, 7] }, "#2a2f33", [P.arches[0] - 0.04, P.arches[0] + 0.02], { from: [0, 0, -1.6], ease: smooth });
    put(matte, { p: [C.x - 6.33, 2.1, C.z + 0.4], s: [0.06, 1.7, 2.9] }, "#16191b", [P.panels[0], P.panels[0] + 0.04], { from: [0.8, 0, 0], ease: smooth });
    put(screen(2.75, 1.55, 0, 0.1), { p: [C.x - 6.29, 2.1, C.z + 0.4], r: [0, Math.PI / 2, 0] }, "#ffffff", [P.panels[0] + 0.02, P.panels[0] + 0.05], { from: [0.8, 0, 0], ease: smooth });
    const L = 2.4;
    const arches: Array<[number, number]> = [
      [3.4, C.z + 2.9],
      [3.0, C.z + 0.9],
      [2.6, C.z - 1.1],
    ];
    arches.forEach(([R, z], i) => {
      const win = stagger(P.arches, i, 3, 1.4);
      const crane: Motion = { from: [0, 3, 0], ease: smooth };
      const archGeo = track(new THREE.TorusGeometry(R, 0.2, 4, rich ? 36 : 22, Math.PI));
      const bandGeo = track(new THREE.TorusGeometry(R - 0.21, 0.035, 4, rich ? 36 : 22, Math.PI));
      put(pool(archGeo, m.matte), { p: [C.x, 0.1 + L, z] }, "#bdb6ab", win, crane);
      put(pool(bandGeo, glow.mat), { p: [C.x, 0.1 + L, z + 0.04] }, WARM, win, crane);
      for (const sx of [-1, 1]) {
        put(matte, { p: [C.x + sx * R, 0.1 + L / 2, z], s: [0.4, L, 0.4] }, "#bdb6ab", win, crane);
        put(glow.box, { p: [C.x + sx * (R - 0.21), 0.1 + L / 2, z + 0.04], s: [0.05, L, 0.05] }, WARM, win, crane);
      }
    });
    // Back wall: six deep petrol panels slide in one by one, then a circular light mark.
    for (let i = 0; i < 6; i += 1) {
      const win = stagger(P.panels, i, 6);
      put(matte, { p: [C.x - 6.5 + (i + 0.5) * (13 / 6), 2.3, C.z - 3.4], s: [2.15, 4.4, 0.12] }, "#22373b", win, { from: [0, 0, -1.4], ease: smooth });
    }
    put(glow.disc, { p: [C.x, 3.1, C.z - 3.32], s: [0.95, 0.95, 1] }, "#d9c4a4", P.mark, { from: [0, 0, -0.8], ease: smooth });
    put(ringMetal, { p: [C.x, 3.1, C.z - 3.3], r: [Math.PI / 2, 0, 0], s: [1.12, 4, 1.12] }, "#8c8170", P.mark, { from: [0, 0, -0.8], ease: smooth });
    put(matte, { p: [C.x, 0.6, C.z + 2.0], s: [2.8, 1.0, 0.7] }, "#bdb6ab", P.dress, { from: [0, 0, 1.2], ease: smooth });
    put(glow.box, { p: [C.x, 0.14, C.z + 2.37], s: [2.8, 0.03, 0.03] }, WARM, P.dress, { from: [0, 0, 1.2], ease: smooth });
    totem(C.x - 5.6, C.z + 3.9, 0, 1, stagger(P.dress, 1, 2));
    // A moving head on the side wall washes slowly across the back panels.
    movingHead([C.x - 6.3, 3.85, C.z + 2.6], [C.x + 1.5, 1.6, C.z - 3.3], P.lights, 0.4);
    decals.add("hallpool", C.x, 0.11, C.z + 0.5, 12, 8, (p) => lightsOn(p, P.lights) * 0.3);
    work(C.x + 4.8, C.z + 4.6, C.x, C.z);
  }

  // ================================================================ C ribbon
  {
    const Rb = S.ribbon;
    const C = { x: -6, z: -15.5 };
    const glow = glowSet(Rb.lights);
    const lay: Motion = { from: [0, 0.5, 0], ease: smooth };
    for (let i = 0; i < 4; i += 1) put(matte, { p: [C.x - 7 + (i + 0.5) * 3.5, 0.05, C.z], s: [3.48, 0.1, 7] }, "#38342f", stagger(Rb.floor, i, 4, 1.6), lay);
    shadow(C.x, C.z, 15.2, 8.2, (p) => 0.5 * smoothWin(p, Rb.floor));
    put(glow.box, { p: [C.x, 0.085, C.z + 3.5], s: [14, 0.03, 0.03] }, WARM, Rb.floor, lay);
    const n = rich ? 58 : 40;
    const x0 = C.x - 6.5;
    const span = 12.9;
    for (let i = 0; i < n; i += 1) {
      const x = x0 + (i / (n - 1)) * span;
      const u = (x - x0) * 0.5;
      const z = C.z - 1.1 + Math.sin(u) * 1.2;
      const slope = Math.cos(u) * 0.6;
      put(matte, { p: [x, 2.0, z], r: [0, -Math.atan(slope), 0], s: [0.045, 3.8, 0.5] }, i % 2 ? "#d3ccc0" : "#cbc3b6", stagger(Rb.fins, i, n, 4), { from: [0, 2.8, 0], ease: smooth });
    }
    // The light frame, hoisted.
    const fw = Rb.frame;
    const hoist: Motion = { from: [0, -3.6, 0], ease: smooth };
    const y = 5.1;
    put(metal, { p: [C.x, y, C.z + 2.9], s: [13.4, 0.26, 0.26] }, "#2c3034", fw, hoist);
    put(metal, { p: [C.x, y, C.z - 2.9], s: [13.4, 0.26, 0.26] }, "#2c3034", fw, hoist);
    put(metal, { p: [C.x - 6.7, y, C.z], s: [0.26, 0.26, 5.8] }, "#2c3034", fw, hoist);
    put(metal, { p: [C.x + 6.7, y, C.z], s: [0.26, 0.26, 5.8] }, "#2c3034", fw, hoist);
    put(glow.box, { p: [C.x, y - 0.15, C.z + 2.9], s: [13.2, 0.03, 0.08] }, COOL, fw, hoist);
    put(glow.box, { p: [C.x, y - 0.15, C.z - 2.9], s: [13.2, 0.03, 0.08] }, COOL, fw, hoist);
    for (const [dx, dz] of [
      [-6.7, 2.9],
      [6.7, 2.9],
      [-6.7, -2.9],
      [6.7, -2.9],
    ]) chain(C.x + dx, C.z + dz, y + 0.13, 3.6, fw, smooth);
    const plinths: Array<[number, number]> = [
      [-3.5, 1.6],
      [0.5, 2.0],
      [4.0, 1.3],
    ];
    plinths.forEach(([dx, dz], i) => {
      const win = stagger(Rb.dress, i, plinths.length);
      put(matte, { p: [C.x + dx, 0.55, C.z + dz], s: [0.6, 0.9, 0.6] }, "#cfc8bb", win, { from: [0, 0.5, 0], ease: smooth });
      put(glow.box, { p: [C.x + dx, 1.01, C.z + dz], s: [0.5, 0.02, 0.5] }, WARM, win, { from: [0, 0.5, 0], ease: smooth });
    });
    totem(C.x + 6.2, C.z + 3.9, 0, 2, stagger(Rb.dress, 2, 3));
    decals.add("hallpool", C.x, 0.11, C.z, 13, 7, (p) => lightsOn(p, Rb.lights) * 0.26);
    work(C.x - 4.5, C.z + 4.4, C.x, C.z - 1);
  }

  // ================================================================ D pergola
  {
    const Pg = S.pergola;
    const C = { x: 15.9, z: -4 };
    const glow = glowSet(Pg.lights);
    const screen = screenSet(Pg.screens);
    const hx = 4.1;
    const hz = 4;
    const lay: Motion = { from: [0, 0.5, 0], ease: smooth };
    for (let i = 0; i < 3; i += 1) put(matte, { p: [C.x - hx + (i + 0.5) * ((hx * 2) / 3), 0.05, C.z], s: [(hx * 2) / 3 - 0.02, 0.1, hz * 2] }, "#302c29", stagger(Pg.floor, i, 3, 1.6), lay);
    shadow(C.x, C.z, hx * 2 + 1.2, hz * 2 + 1.2, (p) => 0.5 * smoothWin(p, Pg.floor));
    const BRONZE = "#54463a";
    const rise: Motion = { from: [0, -2.3, 0], scaleFrom: [1, 0.03, 1], ease: smooth };
    let k = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(metal, { p: [C.x + sx * (hx - 0.1), 2.45, C.z + sz * (hz - 0.1)], s: [0.18, 4.7, 0.18] }, BRONZE, stagger(Pg.posts, k++, 6, 2), rise);
    const beamsWin = stagger(Pg.posts, 4, 6, 2.2);
    for (const sz of [-1, 1]) put(metal, { p: [C.x, 4.8, C.z + sz * (hz - 0.1)], s: [hx * 2, 0.3, 0.18] }, BRONZE, beamsWin, { from: [0, 1.2, 0], ease: smooth });
    for (const sx of [-1, 1]) put(metal, { p: [C.x + sx * (hx - 0.1), 4.8, C.z], s: [0.18, 0.3, hz * 2] }, BRONZE, beamsWin, { from: [0, 1.2, 0], ease: smooth });
    const fins = rich ? 19 : 13;
    for (let i = 0; i < fins; i += 1) {
      const z = C.z - hz + 0.4 + (i / (fins - 1)) * (hz * 2 - 0.8);
      put(matte, { p: [C.x, 4.66, z], s: [hx * 2 - 0.3, 0.36, 0.05] }, "#6e5744", stagger(Pg.fins, i, fins, 2.5), { from: [0, 1.6, 0], ease: smooth });
    }
    put(matte, { p: [C.x, 1.8, C.z - hz + 0.1], s: [hx * 2, 3.4, 0.16] }, "#8a8073", stagger(Pg.walls, 0, 2), { from: [0, 0, -1.4], ease: smooth });
    put(matte, { p: [C.x + hx - 0.1, 1.8, C.z - 1.9], s: [0.16, 3.4, 4] }, "#8a8073", stagger(Pg.walls, 1, 2), { from: [1.4, 0, 0], ease: smooth });
    // Two screens on the back wall.
    for (const dx of [-1.9, 1.3]) {
      put(matte, { p: [C.x + dx, 2.0, C.z - hz + 0.2], s: [2.3, 1.36, 0.05] }, "#151719", stagger(Pg.walls, 1, 2), { from: [0, 0, -1.4], ease: smooth });
      put(screen(2.2, 1.24, dx < 0 ? 1 : 3, dx < 0 ? 0.3 : 0.65), { p: [C.x + dx, 2.0, C.z - hz + 0.23] }, "#ffffff", stagger(Pg.walls, 1, 2), { from: [0, 0, -1.4], ease: smooth });
    }
    for (const sz of [-1, 1]) put(glow.box, { p: [C.x, 4.62, C.z + sz * (hz - 0.3)], s: [hx * 2 - 0.4, 0.03, 0.05] }, WARM, Pg.fins, { from: [0, 1.6, 0], ease: smooth });
    // Pylon with a round light mark, rising from the floor.
    const px = C.x + hx - 0.6;
    const pz = C.z + hz - 0.6;
    const pw = Pg.pylon;
    put(matte, { p: [px, 3.1, pz], s: [0.8, 6.0, 0.8] }, "#232528", pw, { from: [0, -2.95, 0], scaleFrom: [1, 0.02, 1], ease: smooth });
    put(glow.disc, { p: [px, 5.3, pz + 0.41], s: [0.28, 0.28, 1] }, "#d9c4a4", [pw[1] - 0.01, pw[1]]);
    const plate = pool(signs.plate(3, 0.46, 0.23), signs.material);
    plate.add({ p: [px, 1.3, pz + 0.41] }, [pw[1] - 0.01, pw[1]], { ease: () => 1 });
    const seats: Array<[number, number]> = [
      [-1.6, -1.2],
      [0.2, -2.0],
      [1.6, 0.4],
    ];
    seats.forEach(([dx, dz], i) => put(matte, { p: [C.x + dx, 0.31, C.z + dz], s: [0.8, 0.42, 0.8] }, "#b9ab95", stagger(Pg.dress, i, seats.length), { from: [0, 0.5, 0], ease: smooth }));
    decals.add("hallpool", C.x, 0.11, C.z, 9, 9, (p) => lightsOn(p, Pg.lights) * 0.3);
    work(C.x - 2.4, C.z + 5.2, C.x, C.z);
  }

  // ================================================================ E dome
  {
    const D = S.dome;
    const C = { x: 13, z: -23.5 };
    const R = 4.4;
    const glow = glowSet(D.lights);
    const lay: Motion = { from: [0, 0.5, 0], ease: smooth };
    put(cylMatte, { p: [C.x, 0.06, C.z], s: [R + 0.3, 0.12, R + 0.3] }, "#34312e", D.floor, lay);
    put(glow.ring, { p: [C.x, 0.13, C.z], s: [R + 0.31, 2, R + 0.31] }, COOL, D.floor, lay);
    shadow(C.x, C.z, R * 2 + 1.6, R * 2 + 1.6, (p) => 0.5 * smoothWin(p, D.floor));
    const ribGeo = track(new THREE.TorusGeometry(R, 0.07, 4, rich ? 32 : 20, Math.PI));
    const ribs = pool(ribGeo, m.metal);
    const n = 8;
    for (let k = 0; k < n; k += 1) put(ribs, { p: [C.x, 0.12, C.z], r: [0, (k / n) * Math.PI, 0] }, "#b0b5ba", stagger(D.ribs, k, n, 1.5), { from: [0, 5, 0], ease: smooth });
    const rings: Array<[number, number]> = [
      [R, 0.14],
      [R * Math.cos(Math.PI / 4), R * Math.sin(Math.PI / 4)],
      [1.1, Math.sqrt(R * R - 1.1 * 1.1)],
    ];
    rings.forEach(([rr, y], i) => put(ringMetal, { p: [C.x, 0.12 + y, C.z], s: [rr, 5, rr] }, "#b0b5ba", i === 0 ? D.floor : stagger(D.rings, i - 1, 2), { from: [0, 3, 0], ease: smooth }));
    put(glow.cyl, { p: [C.x, 1.35, C.z], s: [0.32, 2.4, 0.32] }, COOL, D.rings, { from: [0, 3, 0], ease: smooth });
    put(glow.ring, { p: [C.x, 0.12 + rings[2][1] - 0.05, C.z], s: [1.05, 3, 1.05] }, COOL, D.rings, { from: [0, 3, 0], ease: smooth });
    totem(C.x - R - 1.2, C.z + 3.6, 0, 4, [D.lights[0] - 0.04, D.lights[0]]);
    decals.add("hallpool", C.x, 0.13, C.z, 10, 10, (p) => lightsOn(p, D.lights) * 0.3);
  }

  // ================================================================ modular neighbours
  type Style = { floor: string; wall: string; trim: string; light: string; screens: Array<[number, number, number]>; tower?: number; banner?: string; plate: number; heads?: number };
  /**
   * A modular stand (w along its open front, d deep, walls h high), turned by
   * `yaw` so its open front (+z locally) faces the aisle. Built in its plan's
   * phases: floor strips, posts and beams, back and side panels, the fascia,
   * lights, screens, a hoisted banner, then dressing.
   */
  const shell = (C: { x: number; z: number }, w: number, d: number, h: number, yaw: number, plan: ShellPlan, style: Style) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    /** Local (x along the front, z toward the open front) to world. */
    const P = (lx: number, ly: number, lz: number): V3 => [C.x + lx * c + lz * s, ly, C.z - lx * s + lz * c];
    /** A local offset (for staging) in world axes. */
    const O = (lx: number, ly: number, lz: number): V3 => [lx * c + lz * s, ly, -lx * s + lz * c];
    const r = (extra = 0): V3 => [0, yaw + extra, 0];
    const glow = glowSet(plan.lights, 0.5, 0.08);
    const screen = screenSet(plan.screens);
    const lay: Motion = { from: [0, 0.5, 0], ease: smooth };
    // Floor: laid in strips along the front.
    const strips = 4;
    for (let i = 0; i < strips; i += 1) put(matte, { p: P(-w / 2 + (i + 0.5) * (w / strips), 0.05, 0), r: r(), s: [w / strips - 0.02, 0.1, d] }, style.floor, stagger(plan.floor, i, strips, 1.6), lay);
    put(glow.box, { p: P(0, 0.085, d / 2), r: r(), s: [w, 0.03, 0.03] }, style.light, plan.floor, lay);
    shadow(C.x, C.z, w + 1.4, d + 1.4, (p) => 0.5 * smoothWin(p, plan.floor), yaw);
    // Frame: posts rise one by one, then the beams land.
    const posts: Array<[number, number]> = [
      [-w / 2 + 0.08, -d / 2 + 0.08],
      [w / 2 - 0.08, -d / 2 + 0.08],
      [-w / 2 + 0.08, d / 2 - 0.08],
      [w / 2 - 0.08, d / 2 - 0.08],
      [0, -d / 2 + 0.08],
    ];
    const rise: Motion = { from: [0, -h / 2, 0], scaleFrom: [1, 0.03, 1], ease: smooth };
    posts.forEach(([lx, lz], i) => put(metal, { p: P(lx, 0.1 + h / 2, lz), r: r(), s: [0.1, h, 0.1] }, "#666d74", stagger(plan.frame, i, posts.length + 2, 2), rise));
    const beamWin = stagger(plan.frame, posts.length, posts.length + 2, 2);
    const land: Motion = { from: [0, 1.2, 0], ease: smooth };
    for (const lz of [-d / 2 + 0.08, d / 2 - 0.08]) put(metal, { p: P(0, h + 0.1, lz), r: r(), s: [w, 0.12, 0.1] }, "#666d74", beamWin, land);
    for (const lx of [-w / 2 + 0.08, w / 2 - 0.08]) put(metal, { p: P(lx, h + 0.1, 0), r: r(), s: [0.1, 0.12, d] }, "#666d74", beamWin, land);
    // Walls: the back in panels, then the closed side (left, seen from the aisle).
    const backN = Math.max(3, Math.round(w / 2));
    const sideN = Math.max(2, Math.round(d / 2));
    const panels = backN + sideN;
    for (let i = 0; i < backN; i += 1) {
      put(matte, { p: P(-w / 2 + (i + 0.5) * (w / backN), 0.1 + h / 2, -d / 2 + 0.06), r: r(), s: [w / backN - 0.015, h, 0.08] }, style.wall, stagger(plan.walls, i, panels, 1.8), { from: O(0, 0, -1.4), ease: smooth });
    }
    for (let i = 0; i < sideN; i += 1) {
      put(matte, { p: P(-w / 2 + 0.06, 0.1 + h / 2, -d / 2 + (i + 0.5) * (d / sideN)), r: r(), s: [0.08, h, d / sideN - 0.015] }, style.wall, stagger(plan.walls, backN + i, panels, 1.8), { from: O(-1.4, 0, 0), ease: smooth });
    }
    // Fascia: a header band across the open front, with a light line under it and an abstract mark.
    put(matte, { p: P(0, h - 0.15, d / 2 - 0.08), r: r(), s: [w - 0.2, 0.62, 0.12] }, style.trim, plan.fascia, { from: [0, 1.4, 0], ease: smooth });
    put(glow.box, { p: P(0, h - 0.48, d / 2 - 0.02), r: r(), s: [w - 0.3, 0.025, 0.05] }, style.light, plan.fascia, { from: [0, 1.4, 0], ease: smooth });
    put(glow.wallRing, { p: P(-w / 2 + 0.9, h - 0.15, d / 2 - 0.01), r: r(), s: [0.2, 0.2, 1] }, style.light, plan.fascia, { from: [0, 1.4, 0], ease: smooth });
    put(glow.box, { p: P(-w / 2 + 1.6, h - 0.15, d / 2 - 0.01), r: r(), s: [0.9, 0.05, 0.02] }, style.light, plan.fascia, { from: [0, 1.4, 0], ease: smooth });
    // Back-wall light mark (a ring) and a cove line along the wall's foot.
    put(glow.wallRing, { p: P(w / 2 - 1.2, h * 0.62, -d / 2 + 0.12), r: r(), s: [0.55, 0.55, 1] }, style.light, [plan.walls[1] - 0.01, plan.walls[1]], {});
    put(glow.box, { p: P(0, 0.16, -d / 2 + 0.12), r: r(), s: [w - 0.3, 0.03, 0.03] }, style.light, [plan.walls[1] - 0.01, plan.walls[1]], {});
    // Screens on the back wall: the dark panel arrives with the walls, the picture wakes later.
    style.screens.forEach(([lx, sw, look], i) => {
      const sh = sw * 0.5625;
      const win = stagger(plan.walls, Math.min(backN - 1, i + 1), panels, 1.8);
      put(matte, { p: P(lx, 0.1 + h * 0.52, -d / 2 + 0.13), r: r(), s: [sw + 0.1, sh + 0.1, 0.05] }, "#131517", win, { from: O(0, 0, -1.4), ease: smooth });
      put(screen(sw, sh, look, (i * 0.37 + C.x * 0.01) % 1), { p: P(lx, 0.1 + h * 0.52, -d / 2 + 0.16), r: r() }, "#ffffff", win, { from: O(0, 0, -1.4), ease: smooth });
    });
    // A tower at the back corner (a tall lightbox column with a glow band on top).
    if (style.tower) {
      const th = style.tower;
      const tw: Win = [plan.fascia[0] - 0.02, plan.fascia[1]];
      put(matte, { p: P(w / 2 - 0.5, th / 2, -d / 2 + 0.5), r: r(), s: [0.9, th, 0.9] }, style.trim, tw, { from: [0, -th / 2, 0], scaleFrom: [1, 0.02, 1], ease: smooth });
      put(glow.box, { p: P(w / 2 - 0.5, th - 0.45, -d / 2 + 0.5), r: r(), s: [0.92, 0.32, 0.92] }, style.light, [tw[1] - 0.005, tw[1]], {});
    }
    // A hoisted square fabric banner over the stand.
    if (plan.banner && style.banner) {
      const side = Math.min(w, d) * 0.62;
      const yb = h + 3.4;
      const hoist: Motion = { from: [0, -3, 0], ease: smooth };
      for (const [lx, lz, sw, sd] of [
        [0, side / 2, side, 0.05],
        [0, -side / 2, side, 0.05],
        [side / 2, 0, 0.05, side],
        [-side / 2, 0, 0.05, side],
      ] as Array<[number, number, number, number]>) {
        put(matte, { p: P(lx, yb, lz), r: r(), s: [sw, 1.3, sd] }, style.banner, plan.banner, hoist);
        put(glow.box, { p: P(lx, yb - 0.66, lz), r: r(), s: [Math.max(sw, 0.04), 0.03, Math.max(sd, 0.04)] }, style.light, plan.banner, hoist);
      }
      for (const [lx, lz] of [
        [-side / 2, -side / 2],
        [side / 2, side / 2],
      ]) {
        const at = P(lx, 0, lz);
        chain(at[0], at[2], yb + 0.65, 3, plan.banner, smooth);
      }
    }
    // Dressing: a counter at the front, two high tables.
    put(matte, { p: P(w / 4, 0.6, d / 2 - 0.9), r: r(), s: [1.8, 1.0, 0.6] }, "#c8c1b4", stagger(plan.dress, 0, 3), { from: O(0, 0, 1.2), ease: smooth });
    put(glow.box, { p: P(w / 4, 0.14, d / 2 - 0.58), r: r(), s: [1.8, 0.025, 0.03] }, style.light, stagger(plan.dress, 0, 3), { from: O(0, 0, 1.2), ease: smooth });
    for (const [i, lx, lz] of [
      [1, -w / 4, 0.2],
      [2, -w / 4 + 1.4, -0.9],
    ] as Array<[number, number, number]>) {
      const win = stagger(plan.dress, i, 3);
      const drop: Motion = { from: [0, 0.6, 0], ease: smooth };
      const at = P(lx, 0, lz);
      put(cylMatte, { p: [at[0], 1.06, at[2]], s: [0.32, 0.04, 0.32] }, "#d9d2c5", win, drop);
      put(cylMetal, { p: [at[0], 0.6, at[2]], s: [0.035, 0.9, 0.035] }, "#3a3e43", win, drop);
    }
    const tot = P(w / 2 + 0.6, 0, d / 2 + 0.3);
    totem(tot[0], tot[2], yaw, style.plate, stagger(plan.dress, 2, 3));
    // Moving heads on the front beam, washing slowly over the back wall.
    for (let i = 0; i < (style.heads ?? 0); i += 1) {
      const lx = (i - ((style.heads ?? 1) - 1) / 2) * (w * 0.45);
      movingHead(P(lx, h - 0.05, d / 2 - 0.1), P(lx * 0.5, 0.4, -d / 2 + 0.5), plan.lights, 1.3 + i * 2.1, 0.28);
    }
    decals.add("hallpool", C.x, 0.11, C.z, w * 1.1, d * 1.2, (p) => lightsOn(p, plan.lights) * 0.26, yaw);
  };

  shell({ x: -28, z: -13 }, 8, 6, 4.2, 0.12, S.mediaLeft, {
    floor: "#33373a", wall: "#c9c2b6", trim: "#2a2e31", light: WARM, plate: 5, tower: 6.4, banner: "#9c927f", heads: 2,
    screens: [[-1.6, 2.6, 0], [1.4, 1.8, 2]],
  });
  shell({ x: 27.5, z: -13.5 }, 9, 6, 4.4, -0.1, S.twinRight, {
    floor: "#2f3336", wall: "#3e4a4f", trim: "#b8b1a5", light: COOL, plate: 6, tower: 6.8, banner: "#7f898e", heads: 1,
    screens: [[-2.2, 2.4, 1], [0.6, 2.4, 3]],
  });
  shell({ x: -29, z: 1.5 }, 7, 6, 3.6, Math.PI / 2, S.sideLeft, {
    floor: "#383430", wall: "#b5a48c", trim: "#2b2825", light: WARM, plate: 7,
    screens: [[0.4, 2.2, 2]],
  });
  shell({ x: 28.5, z: 0.5 }, 7, 6, 3.6, -Math.PI / 2, S.sideRight, {
    floor: "#2e3134", wall: "#9aa3a8", trim: "#24272a", light: COOL, plate: 5,
    screens: [[0.2, 2.2, 1]],
  });
  shell({ x: -9, z: -24.6 }, 10, 5, 4.4, 0, S.pavilion, {
    floor: "#34302c", wall: "#d0c8ba", trim: "#3a352f", light: WARM, plate: 6, banner: "#c2b7a4", heads: 2,
    screens: [[-2.6, 2.2, 3], [0, 2.2, 0], [2.6, 2.2, 1]],
  });

  // ================================================================ work gear
  // Pallets, crates, a parked scissor lift and pallet trucks roll in and out as
  // the build goes (see GEAR). Plain shapes in the shared batches.
  {
    const ORANGE = "#8a6446"; // muted safety orange: secondary to our stand
    GEAR.forEach((g, gi) => {
      const c = Math.cos(g.yaw);
      const s = Math.sin(g.yaw);
      const P = (lx: number, ly: number, lz: number): V3 => [g.x + lx * c + lz * s, ly, g.z - lx * s + lz * c];
      // Rolls in along its own length from the nearest aisle and leaves the same way.
      const roll: V3 = [c * 2.4, 0, -s * 2.4];
      const motion: Motion = { from: roll, ease: smooth, out: { win: g.out, to: [-roll[0] * 1.2, 0, -roll[2] * 1.2] } };
      const box = (target: Pool, lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, color: string, tilt = 0) =>
        target.add({ p: P(lx, ly, lz), r: [0, g.yaw, tilt], s: [sx, sy, sz] }, g.in, motion, color);
      if (g.kind === "pallet") {
        for (const lz of [-0.45, 0, 0.45]) box(matte, 0, 0.06, lz, 1.2, 0.1, 0.12, "#6e5a44");
        box(matte, 0, 0.13, 0, 1.2, 0.03, 1.0, "#7a6550");
        // A wrapped load: stacked boards under film.
        box(matte, 0, 0.5, 0, 1.1, 0.7, 0.95, gi % 2 ? "#a7a29a" : "#8f969b");
        box(matte, 0, 0.5, 0.48, 1.1, 0.04, 0.02, "#d8d3c8");
      } else if (g.kind === "crates") {
        const tone = ["#7d6650", "#6f5a46", "#86705a"];
        const set: Array<[number, number, number, number, number]> = [
          [0, 0, 1.3, 0.95, 0.95],
          [1.2, 0.3, 0.9, 0.8, 0.8],
          [0.1, 0, 0.95, 0.6, 0.8],
        ];
        set.forEach(([lx, lz, w, h, d], i) => {
          const y = i === 2 ? 0.95 + h / 2 : h / 2;
          box(matte, lx, y, lz, w, h, d, tone[i]);
          box(matte, lx, y + h * 0.3, lz, w + 0.03, 0.08, d + 0.03, "#5b4a3a");
        });
      } else if (g.kind === "lift") {
        // Parked and lowered: chassis, wheels, folded scissor arms, deck and rails (long axis along local x).
        box(matte, 0, 0.34, 0, 2.4, 0.42, 1.1, ORANGE);
        for (const lx of [-0.85, 0.85]) for (const lz of [-0.5, 0.5]) box(metal, lx, 0.16, lz, 0.32, 0.32, 0.14, "#25282b");
        for (const lz of [-0.5, 0.5]) {
          box(metal, 0, 0.78, lz, 2.0, 0.06, 0.06, "#4b5056", 0.18);
          box(metal, 0, 0.78, lz, 2.0, 0.06, 0.06, "#4b5056", -0.18);
        }
        box(matte, 0, 1.02, 0, 2.6, 0.1, 1.2, ORANGE);
        for (const lz of [-0.58, 0.58]) box(metal, 0, 2.08, lz, 2.6, 0.04, 0.04, "#a3a8ad");
        for (const lx of [-1.28, 1.28]) box(metal, lx, 2.08, 0, 0.04, 0.04, 1.2, "#a3a8ad");
        for (const lx of [-1.28, 0, 1.28]) for (const lz of [-0.58, 0.58]) box(metal, lx, 1.56, lz, 0.04, 1.04, 0.04, "#a3a8ad");
      } else {
        // Pallet truck: forks, a hydraulic body and a tilted handle (along local x).
        for (const lz of [-0.2, 0.2]) box(matte, 0.3, 0.05, lz, 1.15, 0.06, 0.16, ORANGE);
        box(matte, -0.35, 0.12, 0, 0.22, 0.14, 0.58, ORANGE);
        box(metal, -0.4, 0.32, 0, 0.12, 0.35, 0.12, "#25282b");
        box(metal, -0.62, 0.8, 0, 0.04, 0.95, 0.04, "#25282b", 0.45);
        box(metal, -0.83, 1.22, 0, 0.04, 0.04, 0.26, "#25282b");
      }
      const size = g.kind === "lift" ? [3.2, 1.8] : g.kind === "crates" ? [3.2, 1.8] : [1.8, 1.6];
      const at = P(g.kind === "crates" ? 0.6 : 0, 0, 0);
      shadow(at[0], at[2], size[0], size[1], (p) => 0.55 * onSite(p, g.in, g.out), g.yaw);
    });
  }

  // ================================================================ far rows
  // Finished stands at the back and the sides of the hall: dark bodies with lit
  // fascia lines, some with a pylon, some round. They light up in three groups
  // during the second half of the film.
  {
    const groups = S.far.groups.map((win) => glowSet(win, 0.42, 0.12));
    const r = rng(17);
    const bodies = ["#2b2f33", "#34312e", "#2c3337", "#3a3632", "#30302f"];
    const block = (x: number, z: number, w: number, d: number, h: number, face: number) => {
      const col = bodies[Math.floor(r() * bodies.length)];
      const round = r() < 0.22;
      const lit = r() < 0.5 ? WARM : COOL;
      const far = groups[Math.floor(r() * groups.length)];
      if (round) {
        const rr = Math.min(w, d) / 2;
        put(cylMatte, { p: [x, h / 2, z], s: [rr, h, rr] }, col);
        put(far.ring, { p: [x, h - 0.3, z], s: [rr + 0.02, 3, rr + 0.02] }, lit);
        return;
      }
      put(matte, { p: [x, h / 2, z], r: [0, face, 0], s: [w, h, d] }, col);
      const fx = x + Math.sin(face) * (d / 2 + 0.02);
      const fz = z + Math.cos(face) * (d / 2 + 0.02);
      put(far.box, { p: [fx, h - 0.35, fz], r: [0, face, 0], s: [w * 0.8, 0.09, 0.03] }, lit);
      if (r() < 0.4) put(far.box, { p: [fx, 0.12, fz], r: [0, face, 0], s: [w * 0.9, 0.04, 0.03] }, lit);
      if (r() < 0.35) {
        const ph = h + 1.5 + r() * 2;
        const ox = (r() - 0.5) * w * 0.7;
        put(matte, { p: [fx + Math.cos(face) * ox, ph / 2, fz - Math.sin(face) * ox], s: [0.55, ph, 0.55] }, "#24272a");
        put(far.box, { p: [fx + Math.cos(face) * ox, ph - 0.25, fz - Math.sin(face) * ox], s: [0.57, 0.3, 0.57] }, lit);
      }
    };
    // Back rows, in front of the gallery (leaving the dome's bay free).
    for (const zr of [-30.5, -34]) {
      let x = -43;
      while (x < 43) {
        const w = 4 + r() * 5;
        const cx = x + w / 2;
        if (!(cx > 6 && cx < 20 && zr > -31)) block(cx, zr + (r() - 0.5), w, 3 + r() * 1.5, 2.6 + r() * 1.6, 0);
        x += w + 1.4 + r() * 1.5;
      }
    }
    // Side rows along the walls, facing the side aisles; they stop short of the
    // camera's sector in front of the stand.
    for (const sx of [-1, 1]) {
      let z = -24;
      while (z < 8) {
        const d = 4 + r() * 4;
        block(sx * (38 + r() * 2), z + d / 2, d, 4 + r() * 2, 2.6 + r() * 1.4, -sx * Math.PI / 2);
        z += d + 2 + r() * 2;
      }
    }
  }

  // ================================================================ sweeping beams
  if (beams.length) {
    // Apex (narrow end, uv.y = 0) at the origin, opening along +y.
    const coneGeo = new THREE.CylinderGeometry(1, 0.05, 1, rich ? 24 : 14, 1, true);
    coneGeo.translate(0, 0.5, 0);
    const level = new THREE.InstancedBufferAttribute(new Float32Array(beams.length), 1);
    level.setUsage(THREE.DynamicDrawUsage);
    coneGeo.setAttribute("aLevel", level);
    const beamMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0.95, 0.86, 0.72) }, uStrength: { value: rich ? 0.05 : 0.07 } },
        vertexShader: /* glsl */ `
          attribute float aLevel;
          varying float vLevel;
          varying float vAlong;
          varying float vEdge;
          void main() {
            vec4 p = instanceMatrix * vec4(position, 1.0);
            vec3 n = mat3(instanceMatrix) * normal;
            vec4 mv = modelViewMatrix * p;
            // Never normalise a zero vector: unlit beams may be scaled to nothing.
            vec3 vn = normalMatrix * n;
            vec3 toEye = -mv.xyz;
            vEdge = abs(dot(vn / max(length(vn), 0.000001), toEye / max(length(toEye), 0.000001)));
            vAlong = uv.y;
            vLevel = aLevel;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength;
          varying float vLevel;
          varying float vAlong;
          varying float vEdge;
          void main() {
            // Varyings can leave 0..1 on multisampled edges: clamp before use.
            float along = clamp(vAlong, 0.0, 1.0);
            float edge = clamp(vEdge, 0.0, 1.0);
            float level = clamp(vLevel, 0.0, 1.0);
            float a = level * uStrength * edge * edge * (0.35 + 0.65 * (1.0 - along)) * smoothstep(0.0, 0.08, along) * (1.0 - smoothstep(0.6, 1.0, along));
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
    const mesh = new THREE.InstancedMesh(track(coneGeo), beamMat, beams.length);
    mesh.frustumCulled = false;
    mesh.renderOrder = 7;
    mesh.name = "neighbour-beams";
    mesh.raycast = () => {};
    scene.add(mesh);
    const base = beamMat.uniforms.uStrength.value as number;
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const apex = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const half = Math.tan(THREE.MathUtils.degToRad(9));
    ctx.anims.push((p, time) => {
      const array = level.array as Float32Array;
      let lit = 0;
      beams.forEach((b, i) => {
        const v = lightsOn(p, b.win);
        array[i] = v;
        lit += v;
        if (v <= 0) {
          mesh.setMatrixAt(i, mtx.makeScale(0, 0, 0));
          return;
        }
        // A slow sweep about the aim (a period of about a minute), never a jump.
        const yaw = b.amp * Math.sin(time * b.speed + b.phase);
        dir.set(b.aim[0] - b.at[0], b.aim[1] - b.at[1], b.aim[2] - b.at[2]);
        const len = Math.max(0.5, dir.length());
        dir.divideScalar(len).applyAxisAngle(up, yaw);
        q.setFromUnitVectors(up, dir);
        apex.set(b.at[0], b.at[1], b.at[2]);
        scale.set(len * half, len, len * half);
        mesh.setMatrixAt(i, mtx.compose(apex, q, scale));
      });
      level.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = lit > 0;
      beamMat.uniforms.uStrength.value = base * (1 - 0.6 * themeLevel(ctx));
    });
  }

  ctx.anims.push((p) => {
    workMat.color.setScalar(p < T.floodsOut[1] ? 0.4 + floodLevel(p) * 1.6 : 0);
  });
}
