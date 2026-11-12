// The neighbouring stands: five unbranded premium stands (abstract marks and
// stand numbers only) that are built in the background, slower than ours and
// staggered, plus far rows of finished stands as lit silhouettes.
//   A14 rotunda   circular pavilion: round floor disc, ring truss hoisted on
//                 chains, a curved timber-slat wall that arrives segment by
//                 segment, a cylindrical lightbox column and a fabric ring.
//   B08 portal    three nested arched portals with curved light bands.
//   C21 ribbon    an undulating fin wall under a hoisted light frame.
//   D03 pergola   a bronze frame whose roof fins land one by one, and a pylon.
//   B15 dome      a ribbed half dome, rib by rib, with an oculus ring.
// They stay secondary: muted colours, lower light levels, less detail. Their
// lights come on one stand after another once our show lighting is on.
// Everything sits at x < -9.5, x > 9.5 or z < -8.5 and nothing stands in front
// of the plot. Two shared materials (instance colours) plus one glow per stand.

import * as THREE from "three";
import { merge, rod, rng, v3, type Ctx, type Motion, type Pool, type V3, type Win } from "./core";
import { floodLevel } from "./light";
import { BOOTH_TIMELINE as T } from "./timeline";
import { SURROUNDINGS as S, lightsOn, stagger } from "./surroundings-timeline";
import { hallPoolKind, signAtlas, surround, vaultY } from "./hall-architecture";

const WARM = "#ffd9ab";
const COOL = "#d6e6f5";
const PRE: Win = [-1.0001, -1];

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
  const pool = (g: THREE.BufferGeometry, mat: THREE.Material): Pool => parts.pool(g, mat, scene, opts);
  const matte = ctx.bars(m.matte, scene, opts);
  const metal = ctx.bars(m.metal, scene, opts);
  const cylMatte = pool(cylGeo, m.matte);
  const cylMetal = pool(cylGeo, m.metal);
  const tubeMatte = pool(tubeGeo, m.matte);
  const ringMetal = pool(ringGeo, m.metal);
  const signs = signAtlas(ctx);

  /** Static part (in place from the opening frame), or one that arrives in `win`. */
  const put = (target: Pool, home: { p: V3; r?: V3; s?: V3 }, color: string, win?: Win, motion: Motion = {}) =>
    win ? target.add(home, win, motion, color) : target.place(home, -1, color);

  /** One glow material (and its pools) per stand, so each stand's lights come on on their own. */
  const glowSet = (win: Win, max = 0.56, off = 0.14) => {
    const mat = m.glow();
    const set = { box: ctx.bars(mat, scene, opts), cyl: pool(cylGeo, mat), ring: pool(ringGeo, mat), mat };
    ctx.anims.push((p) => mat.color.setScalar(off + max * lightsOn(p, win)));
    return set;
  };

  /** A chain that hangs from the roof to a hoisted part; it shortens as the part rises. */
  const chain = (x: number, z: number, yEnd: number, drop: number, win: Win, ease: (t: number) => number) => {
    const top = vaultY(x) - 0.4;
    const len = top - yEnd;
    metal.add({ p: [x, yEnd + len / 2, z], s: [0.025, len, 0.025] }, win, { from: [0, -drop / 2, 0], scaleFrom: [1, (len + drop) / len, 1], ease }, "#6a7178");
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);

  /** A stand-number plate on a slim totem. */
  const totem = (x: number, z: number, rotY: number, index: number) => {
    put(matte, { p: [x, 0.7, z], r: [0, rotY, 0], s: [0.5, 1.4, 0.12] }, "#1d1f22");
    const plate = pool(signs.plate(index, 0.46, 0.23), signs.material);
    plate.place({ p: [x + Math.sin(rotY) * 0.065, 1.18, z + Math.cos(rotY) * 0.065], r: [0, rotY, 0] });
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

  // ================================================================ A14 rotunda
  {
    const C = { x: -17, z: -1.5 };
    const r = 4.55;
    const glow = glowSet(S.rotunda.lights);
    // The open side faces the main aisle and the camera.
    const open = Math.atan2(26, 32.5);
    put(cylMatte, { p: [C.x, 0.07, C.z], s: [4.95, 0.14, 4.95] }, "#3b3835");
    put(cylMatte, { p: [C.x, 0.142, C.z], s: [3.1, 0.006, 3.1] }, "#5a534a");
    put(glow.ring, { p: [C.x, 0.13, C.z], s: [4.96, 2, 4.96] }, WARM);
    for (let k = 0; k < 10; k += 1) {
      const a = open + (k / 10) * Math.PI * 2;
      put(cylMetal, { p: [C.x + Math.sin(a) * r, 0.14 + 2.7, C.z + Math.cos(a) * r], s: [0.055, 5.4, 0.055] }, "#8d9399");
    }
    // Ring truss: three chords and struts, hoisted on four chains.
    const hoist: Motion = { from: [0, -3.4, 0], ease: smooth };
    const rw = S.rotunda.ring;
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
      const win = stagger(S.rotunda.wall, s, segs, 1.6);
      const mid = a0 + (s + 0.5) * segA;
      const motion: Motion = { from: [Math.sin(mid) * 1.4, 0.5, Math.cos(mid) * 1.4] };
      put(backing, { p: [C.x, 0.14 + 1.7, C.z], r: [0, a0 + s * segA, 0] }, "#2b2826", win, motion);
      for (let k = 0; k < slatsPer; k += 1) {
        const a = a0 + (s + (k + 0.5) / slatsPer) * segA;
        const v = Math.round(118 + tone() * 22);
        put(matte, { p: [C.x + Math.sin(a) * (r - 0.3), 0.14 + 1.7, C.z + Math.cos(a) * (r - 0.3)], r: [0, a, 0], s: [0.08, 3.4, 0.16] }, `rgb(${v},${Math.round(v * 0.74)},${Math.round(v * 0.52)})`, win, motion);
      }
    }
    // Lightbox column, craned in.
    const cw = S.rotunda.column;
    const crane: Motion = { from: [0, 3.6, 0] };
    put(glow.cyl, { p: [C.x, 1.69, C.z], s: [0.42, 3.0, 0.42] }, WARM, cw, crane);
    put(cylMetal, { p: [C.x, 0.19, C.z], s: [0.47, 0.1, 0.47] }, "#3a3e43", cw, crane);
    put(cylMetal, { p: [C.x, 3.24, C.z], s: [0.47, 0.1, 0.47] }, "#3a3e43", cw, crane);
    // Fabric ring hung from the truss, with a light line on its lower edge.
    const hw = S.rotunda.halo;
    const lift: Motion = { from: [0, -2.8, 0], ease: smooth };
    put(tubeMatte, { p: [C.x, 4.5, C.z], s: [3.0, 1.1, 3.0] }, "#c7bba6", hw, lift);
    put(glow.ring, { p: [C.x, 3.96, C.z], s: [2.98, 2, 2.98] }, WARM, hw, lift);
    // Round tables and stools.
    const tables: Array<[number, number]> = [
      [-1.6, 1.2],
      [1.5, -1.4],
      [-1.2, -1.9],
    ];
    tables.forEach(([dx, dz], i) => {
      const win = stagger(S.rotunda.dress, i, tables.length);
      const drop: Motion = { from: [0, 0.6, 0], scaleFrom: 0.85 };
      put(cylMatte, { p: [C.x + dx, 1.06, C.z + dz], s: [0.42, 0.04, 0.42] }, "#d9d2c5", win, drop);
      put(cylMetal, { p: [C.x + dx, 0.6, C.z + dz], s: [0.04, 0.9, 0.04] }, "#3a3e43", win, drop);
      for (const o of [0.7, -0.7]) put(cylMatte, { p: [C.x + dx + o, 0.5, C.z + dz + o * 0.3], s: [0.2, 0.72, 0.2] }, "#4a4440", win, drop);
    });
    totem(C.x + Math.sin(open) * 5.7, C.z + Math.cos(open) * 5.7, open, 0);
    decals.add("hallpool", C.x, 0.16, C.z, 9.5, 9.5, (p) => lightsOn(p, S.rotunda.lights) * 0.34);
    work(C.x + 3.2, C.z - 4.6, C.x, C.z);
  }

  // ================================================================ B08 portal
  {
    const C = { x: 11.5, z: -13.5 };
    const glow = glowSet(S.portal.lights);
    put(matte, { p: [C.x, 0.05, C.z], s: [13, 0.1, 7] }, "#2d3236");
    put(glow.box, { p: [C.x, 0.085, C.z + 3.5], s: [13, 0.03, 0.03] }, WARM);
    put(matte, { p: [C.x - 6.43, 1.9, C.z], s: [0.14, 3.6, 7] }, "#2a2f33");
    const L = 2.4;
    const arches: Array<[number, number]> = [
      [3.4, C.z + 2.9],
      [3.0, C.z + 0.9],
      [2.6, C.z - 1.1],
    ];
    const aw = S.portal.arches;
    arches.forEach(([R, z], i) => {
      const win = i === 0 ? undefined : stagger(aw, i - 1, 2, 1.4);
      const crane: Motion = { from: [0, 3, 0] };
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
      const win = stagger(S.portal.panels, i, 6);
      put(matte, { p: [C.x - 6.5 + (i + 0.5) * (13 / 6), 2.3, C.z - 3.4], s: [2.15, 4.4, 0.12] }, "#22373b", win, { from: [0, 0, -1.4] });
    }
    put(glow.cyl, { p: [C.x, 3.1, C.z - 3.32], r: [Math.PI / 2, 0, 0], s: [0.95, 0.04, 0.95] }, "#d9c4a4", S.portal.mark, { from: [0, 0, -0.8] });
    put(ringMetal, { p: [C.x, 3.1, C.z - 3.3], r: [Math.PI / 2, 0, 0], s: [1.12, 4, 1.12] }, "#8c8170", S.portal.mark, { from: [0, 0, -0.8] });
    const dw = S.portal.dress;
    put(matte, { p: [C.x, 0.6, C.z + 2.0], s: [2.8, 1.0, 0.7] }, "#bdb6ab", dw, { from: [0, 0, 1.2] });
    put(glow.box, { p: [C.x, 0.14, C.z + 2.37], s: [2.8, 0.03, 0.03] }, WARM, dw, { from: [0, 0, 1.2] });
    totem(C.x - 5.6, C.z + 3.9, 0, 1);
    decals.add("hallpool", C.x, 0.11, C.z + 0.5, 12, 8, (p) => lightsOn(p, S.portal.lights) * 0.3);
    work(C.x + 4.8, C.z + 4.6, C.x, C.z);
  }

  // ================================================================ C21 ribbon
  {
    const C = { x: -6, z: -15.5 };
    const glow = glowSet(S.ribbon.lights);
    put(matte, { p: [C.x, 0.05, C.z], s: [14, 0.1, 7] }, "#38342f");
    put(glow.box, { p: [C.x, 0.085, C.z + 3.5], s: [14, 0.03, 0.03] }, WARM);
    const n = rich ? 58 : 40;
    const x0 = C.x - 6.5;
    const span = 12.9;
    for (let i = 0; i < n; i += 1) {
      const x = x0 + (i / (n - 1)) * span;
      const u = (x - x0) * 0.5;
      const z = C.z - 1.1 + Math.sin(u) * 1.2;
      const slope = Math.cos(u) * 0.6;
      put(matte, { p: [x, 2.0, z], r: [0, -Math.atan(slope), 0], s: [0.045, 3.8, 0.5] }, i % 2 ? "#d3ccc0" : "#cbc3b6", stagger(S.ribbon.fins, i, n, 4), { from: [0, 2.8, 0] });
    }
    // The light frame, hoisted.
    const fw = S.ribbon.frame;
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
      const win = stagger(S.ribbon.dress, i, plinths.length);
      put(matte, { p: [C.x + dx, 0.55, C.z + dz], s: [0.6, 0.9, 0.6] }, "#cfc8bb", win, { from: [0, 0.5, 0] });
      put(glow.box, { p: [C.x + dx, 1.01, C.z + dz], s: [0.5, 0.02, 0.5] }, WARM, win, { from: [0, 0.5, 0] });
    });
    totem(C.x + 6.2, C.z + 3.9, 0, 2);
    decals.add("hallpool", C.x, 0.11, C.z, 13, 7, (p) => lightsOn(p, S.ribbon.lights) * 0.26);
    work(C.x - 4.5, C.z + 4.4, C.x, C.z - 1);
  }

  // ================================================================ D03 pergola
  {
    const C = { x: 15.9, z: -4 };
    const glow = glowSet(S.pergola.lights);
    const hx = 4.1;
    const hz = 4;
    put(matte, { p: [C.x, 0.05, C.z], s: [hx * 2, 0.1, hz * 2] }, "#302c29");
    const BRONZE = "#54463a";
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(metal, { p: [C.x + sx * (hx - 0.1), 2.45, C.z + sz * (hz - 0.1)], s: [0.18, 4.7, 0.18] }, BRONZE);
    for (const sz of [-1, 1]) put(metal, { p: [C.x, 4.8, C.z + sz * (hz - 0.1)], s: [hx * 2, 0.3, 0.18] }, BRONZE);
    for (const sx of [-1, 1]) put(metal, { p: [C.x + sx * (hx - 0.1), 4.8, C.z], s: [0.18, 0.3, hz * 2] }, BRONZE);
    const fins = rich ? 19 : 13;
    for (let i = 0; i < fins; i += 1) {
      const z = C.z - hz + 0.4 + (i / (fins - 1)) * (hz * 2 - 0.8);
      put(matte, { p: [C.x, 4.66, z], s: [hx * 2 - 0.3, 0.36, 0.05] }, "#6e5744", stagger(S.pergola.fins, i, fins, 2.5), { from: [0, 1.6, 0] });
    }
    put(matte, { p: [C.x, 1.8, C.z - hz + 0.1], s: [hx * 2, 3.4, 0.16] }, "#8a8073");
    put(matte, { p: [C.x + hx - 0.1, 1.8, C.z - 1.9], s: [0.16, 3.4, 4] }, "#8a8073");
    for (const sz of [-1, 1]) put(glow.box, { p: [C.x, 4.62, C.z + sz * (hz - 0.3)], s: [hx * 2 - 0.4, 0.03, 0.05] }, WARM);
    // Pylon with a round light mark, rising from the floor.
    const px = C.x + hx - 0.6;
    const pz = C.z + hz - 0.6;
    const pw = S.pergola.pylon;
    put(matte, { p: [px, 3.1, pz], s: [0.8, 6.0, 0.8] }, "#232528", pw, { from: [0, -2.95, 0], scaleFrom: [1, 0.02, 1], ease: smooth });
    put(glow.cyl, { p: [px, 5.3, pz + 0.41], r: [Math.PI / 2, 0, 0], s: [0.28, 0.03, 0.28] }, "#d9c4a4", [pw[1] - 0.01, pw[1]]);
    const plate = pool(signs.plate(3, 0.46, 0.23), signs.material);
    plate.add({ p: [px, 1.3, pz + 0.41] }, [pw[1] - 0.01, pw[1]], { ease: () => 1 });
    const seats: Array<[number, number]> = [
      [-1.6, -1.2],
      [0.2, -2.0],
      [1.6, 0.4],
    ];
    seats.forEach(([dx, dz], i) => put(matte, { p: [C.x + dx, 0.31, C.z + dz], s: [0.8, 0.42, 0.8] }, "#b9ab95", stagger(S.pergola.dress, i, seats.length), { from: [0, 0.5, 0] }));
    decals.add("hallpool", C.x, 0.11, C.z, 9, 9, (p) => lightsOn(p, S.pergola.lights) * 0.3);
    work(C.x - 2.4, C.z + 5.2, C.x, C.z);
  }

  // ================================================================ B15 dome
  {
    const C = { x: 13, z: -23.5 };
    const R = 4.4;
    const glow = glowSet(S.dome.lights);
    put(cylMatte, { p: [C.x, 0.06, C.z], s: [R + 0.3, 0.12, R + 0.3] }, "#34312e");
    put(glow.ring, { p: [C.x, 0.13, C.z], s: [R + 0.31, 2, R + 0.31] }, COOL);
    const ribGeo = track(new THREE.TorusGeometry(R, 0.07, 4, rich ? 32 : 20, Math.PI));
    const ribs = pool(ribGeo, m.metal);
    const n = 8;
    for (let k = 0; k < n; k += 1) put(ribs, { p: [C.x, 0.12, C.z], r: [0, (k / n) * Math.PI, 0] }, "#b0b5ba", stagger(S.dome.ribs, k, n, 1.5), { from: [0, 5, 0] });
    const rings: Array<[number, number]> = [
      [R, 0.14],
      [R * Math.cos(Math.PI / 4), R * Math.sin(Math.PI / 4)],
      [1.1, Math.sqrt(R * R - 1.1 * 1.1)],
    ];
    rings.forEach(([rr, y], i) => put(ringMetal, { p: [C.x, 0.12 + y, C.z], s: [rr, 5, rr] }, "#b0b5ba", i === 0 ? undefined : stagger(S.dome.rings, i - 1, 2), { from: [0, 3, 0] }));
    put(glow.cyl, { p: [C.x, 1.35, C.z], s: [0.32, 2.4, 0.32] }, COOL, S.dome.rings, { from: [0, 3, 0] });
    put(glow.ring, { p: [C.x, 0.12 + rings[2][1] - 0.05, C.z], s: [1.05, 3, 1.05] }, COOL, S.dome.rings, { from: [0, 3, 0] });
    totem(C.x - R - 1.2, C.z + 3.6, 0, 4);
    decals.add("hallpool", C.x, 0.13, C.z, 10, 10, (p) => lightsOn(p, S.dome.lights) * 0.3);
  }

  // ================================================================ far rows
  // Finished stands at the back and the sides of the hall: dark bodies with lit
  // fascia lines, some with a pylon, some round. Static, one shared glow.
  {
    const far = glowSet(S.far.lights, 0.4, 0.38);
    const r = rng(17);
    const bodies = ["#2b2f33", "#34312e", "#2c3337", "#3a3632", "#30302f"];
    const block = (x: number, z: number, w: number, d: number, h: number, face: number) => {
      const col = bodies[Math.floor(r() * bodies.length)];
      const round = r() < 0.22;
      const lit = r() < 0.5 ? WARM : COOL;
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
    // Side rows, facing the side aisles.
    for (const sx of [-1, 1]) {
      let z = -24;
      while (z < 16) {
        const d = 4 + r() * 4;
        block(sx * (32 + r() * 4), z + d / 2, d, 4 + r() * 2, 2.6 + r() * 1.4, -sx * Math.PI / 2);
        z += d + 2 + r() * 2;
      }
    }
  }

  ctx.anims.push((p) => {
    workMat.color.setScalar(p < T.floodsOut[1] ? 0.4 + floodLevel(p) * 1.6 : 0);
  });
}
