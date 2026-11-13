// Chapter 5: walls, timber and glass. Modular aluminium frames (1 m, 62 mm
// deep) stand up bay by bay, 20 mm matt greige cladding clicks on with 4 mm
// shadow gaps over a recessed dark plinth (two panels wait a beat so the
// frames show), timber slats arrive as a sweeping wave, the meeting room is glazed between slim
// black mullions with a frosted band, and the doors swing into their frames.

import * as THREE from "three";
import { type Ctx, type Pool } from "./core";
import { FLOOR_TOP } from "./floor";
import { DECK, TOWER } from "./structure";
import { BOOTH_TIMELINE as T, ledAt, window01 } from "./timeline";

const FRAME_D = 0.062;
const PROFILE = 0.04;
const GAP = 0.004;
const PLINTH = 0.1;
const PANEL = 0.02;
export const BACK_Z = -4.5 + FRAME_D / 2; // frame centre line of the back wall
export const WALL_TOP = FLOOR_TOP + 4;

type Run = {
  /** Start point and direction of the run (frames are laid from the start). */
  x: number;
  z: number;
  dir: "x" | "-x" | "z" | "-z";
  modules: number;
  bottom: number;
  height: number;
  /** Which face gets which cladding: +n is the side the normal points to. */
  front?: { material: THREE.Material; slats?: boolean };
  back?: { material: THREE.Material; slats?: boolean };
  /** Skip cladding on module index (for doors). */
  door?: number;
  /** Module indices whose cladding waits a beat (frames stay visible). */
  late?: number[];
  win: readonly [number, number];
};

export function buildWalls(ctx: Ctx) {
  const { mats, root, track, parts, decals } = ctx;
  const framePools = new Map<number, Pool>();
  const framePool = (h: number) => {
    let pool = framePools.get(h);
    if (!pool) {
      const pieces = [
        new THREE.BoxGeometry(PROFILE, h, FRAME_D).translate(-0.5 + PROFILE / 2, h / 2, 0),
        new THREE.BoxGeometry(PROFILE, h, FRAME_D).translate(0.5 - PROFILE / 2, h / 2, 0),
        new THREE.BoxGeometry(1 - PROFILE * 2, PROFILE, FRAME_D).translate(0, PROFILE / 2, 0),
        new THREE.BoxGeometry(1 - PROFILE * 2, PROFILE, FRAME_D).translate(0, h - PROFILE / 2, 0),
        new THREE.BoxGeometry(1 - PROFILE * 2, PROFILE * 0.75, FRAME_D * 0.8).translate(0, h / 2, 0),
      ];
      pool = parts.pool(track(mergeBoxes(pieces)), mats.alu, root, { cast: true });
      framePools.set(h, pool);
    }
    return pool;
  };
  const panelPools = new Map<string, Pool>();
  const panelPool = (w: number, h: number, material: THREE.Material) => {
    const key = `${w}|${h}|${material.uuid}`;
    let pool = panelPools.get(key);
    if (!pool) {
      pool = parts.pool(ctx.rbox(w, h, PANEL, 0.004), material, root);
      panelPools.set(key, pool);
    }
    return pool;
  };
  const slatPool = ctx.bars(mats.slat, root);
  const gapPool = ctx.bars(mats.black, root, { cast: false });

  const layRun = (run: Run) => {
    const [w0, w1] = run.win;
    const n = run.modules;
    const frameSpan = (T.frames[1] - T.frames[0]) * 0.35;
    const cladSpan = (T.cladding[1] - T.cladding[0]) * 0.4;
    const along = run.dir === "x" ? [1, 0] : run.dir === "-x" ? [-1, 0] : run.dir === "z" ? [0, 1] : [0, -1];
    // Normal: the "front" side of the run (left-hand of the direction of travel).
    const normal = [-along[1], along[0]];
    const rotY = Math.atan2(along[1], along[0]) * -1;
    for (let i = 0; i < n; i += 1) {
      const cx = run.x + along[0] * (i + 0.5);
      const cz = run.z + along[1] * (i + 0.5);
      const s = w0 + (i / n) * (w1 - w0) * 0.65;
      framePool(run.height).add({ p: [cx, run.bottom, cz], r: [0, rotY, 0] }, [s, s + frameSpan / n + 0.006], {
        from: [along[0] * 0.8, 0.05, along[1] * 0.8],
        glint: i > 0 ? [cx - along[0] * 0.5, run.bottom + run.height * 0.5, cz - along[1] * 0.5] : undefined,
      });
      if (run.door === i) continue;
      const cs = T.cladding[0] + (w0 - T.frames[0]) * 0.6 + (i / n) * cladSpan;
      for (const side of [1, -1] as const) {
        const spec = side === 1 ? run.front : run.back;
        if (!spec) continue;
        const off = (FRAME_D / 2 + PANEL / 2) * side;
        const px = cx + normal[0] * off;
        const pz = cz + normal[1] * off;
        if (spec.slats) {
          // Smoked oak battens, 45 x 20 mm at 90 mm centres, fanning in.
          const backer = panelPool(1 - GAP, run.height - GAP, mats.charcoal);
          backer.add({ p: [px, run.bottom + run.height / 2, pz], r: [0, rotY, 0] }, [cs, cs + 0.006], { from: [normal[0] * side * 0.5, 0, normal[1] * side * 0.5] });
          const count = 11;
          for (let k = 0; k < count; k += 1) {
            const t = (k + 0.5) / count - 0.5;
            const sx = px + along[0] * t * 0.99 + normal[0] * side * (PANEL / 2 + 0.01);
            const sz = pz + along[1] * t * 0.99 + normal[1] * side * (PANEL / 2 + 0.01);
            const ss = T.slats[0] + (i * count + k) * ((T.slats[1] - T.slats[0] - 0.008) / (n * count)) + (w0 - T.frames[0]) * 0.15;
            slatPool.add({ p: [sx, run.bottom + run.height / 2, sz], r: [0, rotY, 0], s: [0.045, run.height - 0.04, 0.02] }, [ss, ss + 0.008], { rot: [0, 1.35, 0], from: [normal[0] * side * 0.25, 0, normal[1] * side * 0.25] });
          }
        } else {
          // Ground runs stand on a recessed dark plinth; the panel starts above it.
          const base = run.bottom < 0.2 ? PLINTH : 0;
          const at = run.late?.includes(i) ? T.cladding[1] - 0.007 : cs;
          panelPool(1 - GAP, run.height - GAP - base, spec.material).add({ p: [px, run.bottom + base + (run.height - base) / 2, pz], r: [0, rotY, 0] }, [at, at + 0.008], {
            from: [normal[0] * side * 0.6, 0, normal[1] * side * 0.6],
            glint: i % 2 === 0 ? [px, run.bottom + run.height * 0.55, pz] : undefined,
          });
          // The 4 mm shadow gap reads dark, not as the silver frame behind it.
          if (i > 0) {
            const gx = cx - along[0] * 0.5 + normal[0] * (FRAME_D / 2 + PANEL * 0.4) * side;
            const gz = cz - along[1] * 0.5 + normal[1] * (FRAME_D / 2 + PANEL * 0.4) * side;
            gapPool.add({ p: [gx, run.bottom + run.height / 2, gz], r: [0, rotY, 0], s: [0.006, run.height - 0.01, PANEL * 0.7] }, [at, at + 0.002], {});
          }
          if (base) {
            const bx = cx + normal[0] * (FRAME_D / 2 + PANEL * 0.3) * side;
            const bz = cz + normal[1] * (FRAME_D / 2 + PANEL * 0.3) * side;
            gapPool.add({ p: [bx, run.bottom + base / 2, bz], r: [0, rotY, 0], s: [1.0, base, PANEL * 0.6] }, [at, at + 0.002], {});
          }
        }
      }
    }
    // Contact shadow along the base of the run, on the front side.
    const len = n;
    const mx = run.x + along[0] * (n / 2);
    const mz = run.z + along[1] * (n / 2);
    if (run.bottom < 0.2) {
      const off = 0.2;
      decals.add("edge", mx + normal[0] * off, FLOOR_TOP + 0.0032, mz + normal[1] * off, len, 0.36, (p) => window01(p, T.cladding[0], T.cladding[1]) * 0.55, rotY);
      if (run.back) decals.add("edge", mx - normal[0] * off, FLOOR_TOP + 0.0032, mz - normal[1] * off, len, 0.36, (p) => window01(p, T.cladding[0], T.cladding[1]) * 0.5, rotY + Math.PI);
    }
  };

  const [f0, f1] = T.frames;
  const fs = (k: number) => [f0 + (f1 - f0) * k, f1] as const;
  // Back wall, 4 m, x -1..6 (behind the tower and the LED wall).
  layRun({ x: -1, z: BACK_Z, dir: "x", modules: 7, bottom: FLOOR_TOP, height: 4, front: { material: mats.greige }, late: [4, 5], win: fs(0) });
  // Meeting room back and left (left faces the aisle: timber slats outside).
  layRun({ x: DECK.x0, z: BACK_Z, dir: "x", modules: 3, bottom: FLOOR_TOP, height: DECK.under - FLOOR_TOP, front: { material: mats.warmWhite }, win: fs(0.12) });
  layRun({ x: DECK.x0 + FRAME_D / 2, z: -1.5, dir: "-z", modules: 3, bottom: FLOOR_TOP, height: DECK.under - FLOOR_TOP, front: { material: mats.warmWhite }, back: { material: mats.slat, slats: true }, win: fs(0.2) });
  // Partition between meeting room and store/bar.
  layRun({ x: -3 + FRAME_D / 2, z: -4.5, dir: "z", modules: 3, bottom: FLOOR_TOP, height: DECK.under - FLOOR_TOP, front: { material: mats.warmWhite }, back: { material: mats.greige }, win: fs(0.28) });
  // Store: back, front with a flush door (slatted outside), right side.
  layRun({ x: -3, z: BACK_Z, dir: "x", modules: 2, bottom: FLOOR_TOP, height: DECK.under - FLOOR_TOP, front: { material: mats.greige }, win: fs(0.34) });
  layRun({ x: -3, z: -2.6, dir: "x", modules: 2, bottom: FLOOR_TOP, height: DECK.under - FLOOR_TOP, front: { material: mats.slat, slats: true }, door: 1, win: fs(0.4) });
  layRun({ x: -1 - FRAME_D / 2, z: -4.5, dir: "z", modules: 2, bottom: FLOOR_TOP, height: DECK.under - FLOOR_TOP, front: { material: mats.greige }, win: fs(0.45) });
  panelPool(1.2, DECK.under - FLOOR_TOP - GAP, mats.greige).add({ p: [-1 + PANEL / 2 + 0.001, FLOOR_TOP + (DECK.under - FLOOR_TOP) / 2, -3.2], r: [0, Math.PI / 2, 0] }, [T.cladding[0] + 0.012, T.cladding[0] + 0.02], { from: [0.6, 0, 0] });
  // Upstairs back wall (1.2 m): carries the backlit fabric lightbox (brand chapter).
  layRun({ x: DECK.x0, z: BACK_Z, dir: "x", modules: 5, bottom: DECK.top, height: WALL_TOP - DECK.top, front: { material: mats.greige }, win: fs(0.5) });

  // Back faces and tops: plain greige skins, aluminium capping with an LED cove.
  const skin = ctx.bars(mats.greige, root);
  const [cl0, cl1] = T.cladding;
  skin.add({ p: [2.5, FLOOR_TOP + 2, -4.5 - 0.005], s: [7, 4, 0.01] }, [cl0, cl1], { from: [0, 0, -0.6] });
  skin.add({ p: [-3.5, (FLOOR_TOP + WALL_TOP) / 2, -4.5 - 0.005], s: [5, WALL_TOP - FLOOR_TOP, 0.01] }, [cl0, cl1], { from: [0, 0, -0.6] });
  const cap = ctx.bars(mats.alu, root);
  cap.add({ p: [-0.5 + 0.5 * 0, WALL_TOP + 0.006, BACK_Z], s: [12, 0.012, FRAME_D + PANEL * 2 + 0.01] }, [cl1 - 0.008, cl1], { from: [0, 0.5, 0] });
  const led = ctx.bars(mats.led, root, { cast: false, receive: false });
  led.add({ p: [2.5, WALL_TOP - 0.03, BACK_Z + FRAME_D / 2 + PANEL + 0.012], s: [6.9, 0.01, 0.01] }, [cl1 - 0.004, cl1], {});
  led.add({ p: [-3.5, WALL_TOP - 0.03, BACK_Z + FRAME_D / 2 + PANEL + 0.035], s: [4.9, 0.01, 0.01] }, [cl1 - 0.004, cl1], {});
  // The light the cove throws down the wall.
  for (let i = 0; i < 12; i += 1) {
    const x = -5.5 + i;
    const wallZ = BACK_Z + FRAME_D / 2 + PANEL + 0.004;
    decals.add("pool", x, WALL_TOP - 0.45, wallZ, 1.2, 0.9, (p) => ledAt(p, x, WALL_TOP, wallZ) * 0.22, 0, new THREE.Euler(Math.PI / 2, 0, 0));
  }

  // ---- tower cladding: graphite sides and cap (the fabric face comes with the brand).
  const tw = TOWER.x1 - TOWER.x0;
  const td = TOWER.z1 - TOWER.z0;
  const tcz = (TOWER.z0 + TOWER.z1) / 2;
  const towerSide = parts.pool(ctx.rbox(PANEL, 6 - GAP, td, 0.004), mats.graphite, root);
  towerSide.add({ p: [TOWER.x0 - PANEL / 2, FLOOR_TOP + 3, tcz] }, [cl0 + 0.004, cl0 + 0.014], { from: [-0.6, 0, 0] });
  towerSide.add({ p: [TOWER.x1 + PANEL / 2, FLOOR_TOP + 3, tcz] }, [cl0 + 0.008, cl0 + 0.018], { from: [0.6, 0, 0] });
  const towerCap = parts.pool(ctx.rbox(tw + PANEL * 2, PANEL, td, 0.004), mats.graphite, root);
  towerCap.add({ p: [(TOWER.x0 + TOWER.x1) / 2, TOWER.top + PANEL / 2, tcz] }, [cl0 + 0.014, cl0 + 0.022], { from: [0, 0.6, 0] });
  // Aluminium tension frame around the lightbox face.
  const seg = ctx.bars(mats.aluBlack, root);
  const fz = TOWER.z1 + 0.012;
  const fx = (TOWER.x0 + TOWER.x1) / 2;
  for (const [p, s] of [
    [[fx, FLOOR_TOP + 0.02, fz], [tw, 0.04, 0.024]],
    [[fx, TOWER.top - 0.02, fz], [tw, 0.04, 0.024]],
    [[TOWER.x0 + 0.02, FLOOR_TOP + 3, fz], [0.04, 6, 0.024]],
    [[TOWER.x1 - 0.02, FLOOR_TOP + 3, fz], [0.04, 6, 0.024]],
  ] as Array<[[number, number, number], [number, number, number]]>)
    seg.add({ p, s }, [cl0 + 0.01, cl0 + 0.02], { from: [0, 0, 0.5] });

  // ---- meeting room glazing: mullions, panes, frosted band, glass door.
  const [g0, g1] = T.glass;
  const mull = ctx.bars(mats.aluBlack, root);
  const gz = DECK.z1 - 0.03;
  const gx0 = DECK.x0 + FRAME_D;
  const gx1 = -3 - FRAME_D / 2;
  const glazeH = DECK.under - FLOOR_TOP;
  const bays = [gx0, -5.0, -4.0, gx1];
  mull.add({ p: [(gx0 + gx1) / 2, FLOOR_TOP + 0.02, gz], s: [gx1 - gx0, 0.04, 0.06] }, [g0, g0 + 0.006], { from: [0, 0, 0.6] });
  mull.add({ p: [(gx0 + gx1) / 2, DECK.under - 0.02, gz], s: [gx1 - gx0, 0.04, 0.06] }, [g0 + 0.002, g0 + 0.008], { from: [0, 0, 0.6] });
  bays.forEach((x, i) => mull.add({ p: [x, FLOOR_TOP + glazeH / 2, gz], s: [0.04, glazeH, 0.06] }, [g0 + 0.004 + i * 0.002, g0 + 0.01 + i * 0.002], { from: [0, 0.8, 0], glint: [x, FLOOR_TOP + 2.1, gz + 0.03] }));
  // Transom over the door.
  mull.add({ p: [-3.5 + 0.02, FLOOR_TOP + 2.12, gz], s: [gx1 - -4.0, 0.04, 0.06] }, [g0 + 0.012, g0 + 0.016], { from: [0, 0, 0.6] });
  const glassPool = parts.pool(ctx.rbox(1, 1, 0.01, 0.002), mats.glass, root, { cast: false });
  const frostPool = ctx.bars(mats.frost, root, { cast: false });
  const pane = (x0: number, x1: number, y0: number, y1: number, s: number, frost: boolean) => {
    const w = x1 - x0 - 0.045;
    const h = y1 - y0 - 0.045;
    glassPool.add({ p: [(x0 + x1) / 2, (y0 + y1) / 2, gz], s: [w, h, 1] }, [s, s + 0.008], { from: [0, 0, 1.0] });
    if (frost) frostPool.add({ p: [(x0 + x1) / 2, FLOOR_TOP + 1.25, gz + 0.008], s: [w, 0.42, 0.003] }, [s + 0.004, s + 0.008], { scaleFrom: [0.01, 1, 1], ease: (t) => t });
  };
  pane(gx0, -5.0, FLOOR_TOP, DECK.under, g0 + 0.006, true);
  pane(-5.0, -4.0, FLOOR_TOP, DECK.under, g0 + 0.009, true);
  pane(-4.0, gx1, FLOOR_TOP + 2.12, DECK.under, g0 + 0.011, false);

  // Door: frameless glass leaf on a black pivot, brass pull; swings shut into place.
  const [dr0, dr1] = T.doors;
  const doorW = gx1 - -4.0 - 0.04;
  const door = new THREE.Group();
  door.position.set(-4.0 + 0.02, FLOOR_TOP, gz);
  const leaf = new THREE.Mesh(ctx.rbox(doorW, 2.08, 0.012, 0.003), mats.glass);
  leaf.position.set(doorW / 2, 1.05, 0);
  const band = new THREE.Mesh(track(new THREE.BoxGeometry(doorW - 0.02, 0.3, 0.002)), mats.frost);
  band.position.set(doorW / 2, 1.2 - 0.0, 0.008);
  const pull = ctx.mesh(track(new THREE.CylinderGeometry(0.014, 0.014, 0.7, 10)), mats.brass);
  pull.position.set(doorW - 0.12, 1.05, 0.06);
  const pullArms = ctx.mesh(track(mergeBoxes([new THREE.BoxGeometry(0.012, 0.012, 0.055).translate(0, 0.3, 0.03), new THREE.BoxGeometry(0.012, 0.012, 0.055).translate(0, -0.3, 0.03)])), mats.brass);
  pullArms.position.set(doorW - 0.12, 1.05, 0.0);
  door.add(leaf, band, pull, pullArms);
  root.add(door);
  parts.object(door, [dr0, dr0 + 0.01], { rot: [0, -1.25, 0], glint: [-4.0 + doorW, FLOOR_TOP + 1.05, gz] });

  // Store: flush door with shadow gap and a small brass pull.
  const sdoor = new THREE.Group();
  sdoor.position.set(-2.0 - 0.4, FLOOR_TOP, -2.6 + FRAME_D / 2 + PANEL / 2 + 0.002);
  const sleaf = ctx.mesh(ctx.rbox(0.8 - GAP, 2.1, 0.04, 0.003), mats.slat);
  sleaf.position.set(0.4, 1.05, 0);
  const sgap = ctx.mesh(track(new THREE.BoxGeometry(0.82, 2.13, 0.01)), mats.black);
  sgap.position.set(0.4, 1.06, -0.02);
  const spull = ctx.mesh(track(new THREE.BoxGeometry(0.012, 0.22, 0.02)), mats.brass);
  spull.position.set(0.72, 1.05, 0.03);
  sdoor.add(sleaf, sgap, spull);
  root.add(sdoor);
  parts.object(sdoor, [dr0 + 0.004, dr1], { rot: [0, 1.1, 0] });
  // Header over the store door.
  const header = panelPool(0.8, DECK.under - FLOOR_TOP - 2.13, mats.charcoal);
  header.add({ p: [-2.0, FLOOR_TOP + 2.13 + (DECK.under - FLOOR_TOP - 2.13) / 2, -2.6 + FRAME_D / 2 + PANEL / 2] }, [T.cladding[0] + 0.01, T.cladding[0] + 0.018], { from: [0, 0, 0.5] });

  // Meeting room floor shadow under the glass line.
  decals.add("edge", (gx0 + gx1) / 2, FLOOR_TOP + 0.0034, gz + 0.16, gx1 - gx0, 0.3, (p) => window01(p, g0, g1) * 0.4);
}

function mergeBoxes(list: THREE.BufferGeometry[]) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const g of list) {
    const pos = g.attributes.position.array;
    const nor = g.attributes.normal.array;
    const uv = g.attributes.uv.array;
    positions.push(...pos);
    normals.push(...nor);
    uvs.push(...uv);
    const index = g.index!.array;
    for (let i = 0; i < index.length; i += 1) indices.push(index[i] + offset);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(indices);
  return out;
}
