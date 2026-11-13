// Chapter 4: the two-storey frame. Steel columns go up, the upper deck is
// assembled with its glass balustrade at floor level and lifted onto the
// columns in one piece, the straight stair lands, the brand tower frames stack.

import * as THREE from "three";
import { merge, rod, v3, type Ctx, type V3 } from "./core";
import { FLOOR_TOP } from "./floor";
import { BOOTH_TIMELINE as T, easeInOutCubic, ledAt, window01 } from "./timeline";

export const DECK = { x0: -6, x1: -1, z0: -4.5, z1: -1.5, top: 2.9, under: 2.7 };
// The tower stands just in front of the back wall frames (62 mm + 20 mm cladding).
export const TOWER = { x0: -1, x1: 2, z0: -4.41, z1: -3.81, top: FLOOR_TOP + 6 };
export const STAIR = { x0: -5.9, x1: -4.9, zBottom: 2.9, zTop: -1.5, risers: 17, going: 0.275 };

export function buildStructure(ctx: Ctx) {
  const { mats, root, track, rich, parts, decals } = ctx;

  // ---- columns: 120 mm square hollow section with base and cap plates.
  const colH = DECK.under - FLOOR_TOP;
  const columnGeo = merge([
    ctx.rbox(0.12, colH, 0.12, 0.006).clone().translate(0, colH / 2, 0),
    new THREE.BoxGeometry(0.26, 0.015, 0.26).translate(0, 0.0075, 0),
    new THREE.BoxGeometry(0.2, 0.015, 0.2).translate(0, colH - 0.0075, 0),
  ]);
  const colPool = parts.pool(track(columnGeo), mats.structure, root);
  const boltPool = parts.pool(track(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6)), mats.galv, root, { cast: false });
  const columns: Array<[number, number]> = [
    [-5.94, -4.44],
    [-3.0, -4.44],
    [-1.06, -4.44],
    [-5.94, -1.56],
    [-3.0, -1.56],
    [-1.06, -1.56],
  ];
  const [c0, c1] = T.columns;
  columns.forEach(([x, z], i) => {
    const s = c0 + i * ((c1 - c0 - 0.01) / columns.length);
    colPool.add({ p: [x, FLOOR_TOP, z] }, [s, s + 0.01], { from: [0, 1.5, 0], glint: [x, FLOOR_TOP + 0.05, z] });
    for (const [bx, bz] of [
      [-0.1, -0.1],
      [0.1, -0.1],
      [-0.1, 0.1],
      [0.1, 0.1],
    ])
      boltPool.add({ p: [x + bx, FLOOR_TOP + 0.02, z + bz] }, [s + 0.01, s + 0.012], { from: [0, 0.12, 0] });
    decals.add("blob", x, FLOOR_TOP + 0.003, z, 0.7, 0.7, (p) => window01(p, s + 0.006, s + 0.012) * 0.5);
  });

  // ---- the deck: built on the floor between the columns, then lifted as one.
  const deck = new THREE.Group();
  deck.position.y = -(DECK.under - FLOOR_TOP);
  root.add(deck);
  const groundY = -(DECK.under - FLOOR_TOP);
  const steelD = ctx.bars(mats.structure, deck);
  const [d0, d1] = T.deck;
  const cx = (DECK.x0 + DECK.x1) / 2;
  const cz = (DECK.z0 + DECK.z1) / 2;
  const beamY = DECK.under + 0.09;
  const glintAt = (x: number, y: number, z: number): V3 => [x, y + groundY, z];
  // Perimeter beams lowered onto trestles, then joists every metre.
  steelD.add({ p: [cx, beamY, DECK.z1 - 0.06], s: [5, 0.18, 0.12] }, [d0, d0 + 0.008], { from: [0, 0.9, 0.6], glint: glintAt(cx, beamY, DECK.z1) });
  steelD.add({ p: [cx, beamY, DECK.z0 + 0.06], s: [5, 0.18, 0.12] }, [d0 + 0.003, d0 + 0.011], { from: [0, 0.9, -0.6] });
  steelD.add({ p: [DECK.x0 + 0.06, beamY, cz], s: [0.12, 0.18, 2.76] }, [d0 + 0.006, d0 + 0.014], { from: [-0.6, 0.9, 0], glint: glintAt(DECK.x0, beamY, cz) });
  steelD.add({ p: [DECK.x1 - 0.06, beamY, cz], s: [0.12, 0.18, 2.76] }, [d0 + 0.009, d0 + 0.017], { from: [0.6, 0.9, 0] });
  for (let i = 1; i < 5; i += 1) {
    const x = DECK.x0 + i;
    steelD.add({ p: [x, beamY + 0.01, cz], s: [0.06, 0.14, 2.76] }, [d0 + 0.012 + i * 0.0015, d0 + 0.018 + i * 0.0015], { from: [0, 0.6, 0] });
  }
  // Bolted joint plates where the joists meet the perimeter beams, and at the corners.
  const plates = ctx.bars(mats.galv, deck, { cast: false });
  const plateBolts = parts.pool(track(new THREE.CylinderGeometry(0.011, 0.011, 0.018, 6).rotateX(Math.PI / 2)), mats.galv, deck, { cast: false });
  for (let i = 1; i < 5; i += 1) {
    const x = DECK.x0 + i;
    for (const [z, side] of [
      [DECK.z1 + 0.006, 1],
      [DECK.z0 - 0.005, -1],
    ] as Array<[number, number]>) {
      const at = d0 + 0.016 + i * 0.0015;
      plates.add({ p: [x, beamY, z], s: [0.2, 0.16, 0.012] }, [at, at + 0.004], { scaleFrom: 0.3 });
      for (const bx of [-0.06, 0.06]) for (const by of [-0.045, 0.045]) plateBolts.add({ p: [x + bx, beamY + by, z + side * 0.009] }, [at + 0.003, at + 0.006], { from: [0, 0, side * 0.1] });
    }
  }
  for (const [x, z] of [
    [DECK.x0 - 0.006, DECK.z1 - 0.12],
    [DECK.x1 + 0.006, DECK.z1 - 0.12],
    [DECK.x0 - 0.006, DECK.z0 + 0.12],
    [DECK.x1 + 0.006, DECK.z0 + 0.12],
  ])
    plates.add({ p: [x, beamY, z], s: [0.012, 0.16, 0.2] }, [d0 + 0.014, d0 + 0.018], { scaleFrom: 0.3 });
  // Deck boards: five 1 x 3 m oak-faced panels.
  const boardGeo = ctx.rbox(0.994, 0.02, 2.994, 0.003);
  const boardPool = parts.pool(boardGeo, mats.oakSolid, deck);
  for (let i = 0; i < 5; i += 1) {
    const s = d0 + 0.018 + i * 0.0022;
    boardPool.add({ p: [DECK.x0 + 0.5 + i, DECK.top - 0.01, cz] }, [s, s + 0.006], { from: [0, 0.8, 0], glint: i === 2 ? glintAt(DECK.x0 + 2.5, DECK.top, cz) : undefined });
  }
  // Fascia (warm white lacquer) with an LED line washing the glass below.
  const fascia = ctx.bars(mats.warmWhite, deck);
  const led = ctx.bars(mats.led, deck, { cast: false, receive: false });
  fascia.add({ p: [cx, beamY, DECK.z1 + 0.011], s: [5.02, 0.24, 0.02] }, [d1 - 0.008, d1], { from: [0, 0, 0.5] });
  fascia.add({ p: [DECK.x1 + 0.011, beamY, cz], s: [0.02, 0.24, 3.02] }, [d1 - 0.006, d1 + 0.002], { from: [0.5, 0, 0] });
  fascia.add({ p: [DECK.x0 - 0.011, beamY, cz], s: [0.02, 0.24, 3.02] }, [d1 - 0.006, d1 + 0.002], { from: [-0.5, 0, 0] });
  led.add({ p: [cx, DECK.under - 0.006, DECK.z1 + 0.02], s: [4.9, 0.008, 0.012] }, [d1 - 0.004, d1], {});
  led.add({ p: [DECK.x1 + 0.02, DECK.under - 0.006, cz], s: [0.012, 0.008, 2.9] }, [d1 - 0.004, d1], {});
  // Soffit (ceiling of the meeting room and bar) with downlights.
  const soffit = ctx.bars(mats.greige, deck, { cast: false });
  soffit.add({ p: [cx, DECK.under - 0.004, cz], s: [4.98, 0.008, 2.98] }, [d0 + 0.014, d0 + 0.02], { from: [0, 0.3, 0] });
  const downlightPool = parts.pool(track(new THREE.CircleGeometry(0.045, 16).rotateX(Math.PI / 2)), mats.lamp, deck, { cast: false, receive: false });
  const downlights: Array<[number, number]> = [
    [-5.2, -3.6],
    [-3.8, -3.6],
    [-5.2, -2.3],
    [-3.8, -2.3],
    [-2.0, -2.1],
    [-2.0, -3.6],
  ];
  downlights.forEach(([x, z]) => downlightPool.add({ p: [x, DECK.under - 0.009, z] }, [d0 + 0.02, d0 + 0.021], { ease: () => 1 }));
  ctx.hooks.downlights = downlights;

  // ---- glass balustrade (1.1 m) in a shoe channel with a slim handrail.
  const [g0, g1] = T.balustrade;
  const alu = ctx.bars(mats.alu, deck);
  const railGeo = new THREE.CylinderGeometry(1, 1, 1, rich ? 12 : 8).rotateZ(Math.PI / 2);
  const railPool = parts.pool(track(railGeo), mats.alu, deck);
  const glassGeo = ctx.rbox(0.985, 1.0, 0.012, 0.004);
  const glassPool = parts.pool(glassGeo, mats.glass, deck, { cast: false });
  const runs: Array<{ x0: number; z0: number; x1: number; z1: number }> = [
    { x0: STAIR.x1 + 0.02, z0: DECK.z1 - 0.04, x1: DECK.x1 - 0.04, z1: DECK.z1 - 0.04 }, // front (stair opening on the left)
    { x0: DECK.x1 - 0.04, z0: DECK.z1 - 0.04, x1: DECK.x1 - 0.04, z1: DECK.z0 + 0.04 }, // right
    { x0: DECK.x0 + 0.04, z0: DECK.z1 - 0.04, x1: DECK.x0 + 0.04, z1: DECK.z0 + 0.3 }, // left
  ];
  runs.forEach((run, r) => {
    const len = Math.hypot(run.x1 - run.x0, run.z1 - run.z0);
    const alongX = Math.abs(run.x1 - run.x0) > 0.01;
    const midX = (run.x0 + run.x1) / 2;
    const midZ = (run.z0 + run.z1) / 2;
    const s = g0 + r * 0.004;
    alu.add({ p: [midX, DECK.top + 0.05, midZ], s: alongX ? [len, 0.1, 0.06] : [0.06, 0.1, len] }, [s, s + 0.006], { from: [0, 0.5, 0] });
    const n = Math.round(len / 1);
    const pane = len / n;
    for (let i = 0; i < n; i += 1) {
      const t = (i + 0.5) / n;
      const x = run.x0 + (run.x1 - run.x0) * t;
      const z = run.z0 + (run.z1 - run.z0) * t;
      const ps = g0 + 0.006 + (r * n + i) * 0.0009;
      glassPool.add({ p: [x, DECK.top + 0.6, z], r: [0, alongX ? 0 : Math.PI / 2, 0], s: [(pane - 0.012) / 0.985, 1, 1] }, [ps, ps + 0.006], { from: [0, 0.9, 0] });
    }
    railPool.add({ p: [midX, DECK.top + 1.1 - 0.021, midZ], r: [0, alongX ? 0 : Math.PI / 2, 0], s: [len + 0.04, 0.021, 0.021] }, [g1 - 0.006 + r * 0.002, g1 + r * 0.002], { from: [0, 0.4, 0], glint: glintAt(midX, DECK.top + 1.1, midZ) });
  });

  // ---- lifting: four straps to a spreader, visible only while the deck flies.
  const [lift0, lift1] = T.deckLift;
  const strapMat = track(new THREE.MeshStandardMaterial({ color: "#c0602a", roughness: 0.8 }));
  const strapGeo = new THREE.BoxGeometry(0.05, 1, 0.006).translate(0, 0.5, 0);
  const strapPool = parts.pool(track(strapGeo), strapMat, deck, { cast: false });
  const spreaderY = DECK.top + 2.4;
  const hookAt = v3(cx, spreaderY, cz);
  const strapCorners: Array<[number, number]> = [
    [DECK.x0 + 0.3, DECK.z0 + 0.3],
    [DECK.x1 - 0.3, DECK.z0 + 0.3],
    [DECK.x0 + 0.3, DECK.z1 - 0.3],
    [DECK.x1 - 0.3, DECK.z1 - 0.3],
  ];
  strapCorners.forEach(([x, z]) => {
    const a = v3(x, DECK.top, z);
    const top = v3(x * 0.5 + cx * 0.5, spreaderY, z);
    const dir = top.clone().sub(a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir.normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    strapPool.add({ p: [a.x, a.y, a.z], r: [e.x, e.y, e.z], s: [1, len, 1] }, [lift0 - 0.006, lift0], { scaleFrom: [1, 0.01, 1], ease: (t) => t, out: { win: [lift1 + 0.002, lift1 + 0.006], to: [0, 0, 0] } });
  });
  const spreader = ctx.bars(mats.structure, deck);
  spreader.add({ p: [hookAt.x, spreaderY, hookAt.z], s: [3.0, 0.12, 0.12] }, [lift0 - 0.006, lift0], { from: [0, 1, 0], out: { win: [lift1 + 0.002, lift1 + 0.006], to: [0, 0, 0] } });
  const wireGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 5).translate(0, 0.5, 0);
  const wirePool = parts.pool(track(wireGeo), mats.chain, deck, { cast: false });
  wirePool.add({ p: [hookAt.x, spreaderY, hookAt.z], s: [1, 6, 1] }, [lift0 - 0.006, lift0], { scaleFrom: [1, 0.01, 1], ease: (t) => t, out: { win: [lift1 + 0.002, lift1 + 0.006], to: [0, 0, 0] } });

  // Contact shadow under the deck once it sits (and a soft one while it is low).
  const deckShadow = (p: number) => window01(p, lift0, lift1);
  decals.add("blob", cx, FLOOR_TOP + 0.003, cz, 6.4, 4.2, (p) => (window01(p, d0, d0 + 0.02) * (1 - deckShadow(p)) * 0.6 + deckShadow(p) * 0.35));

  ctx.anims.push((p) => {
    const t = easeInOutCubic(window01(p, lift0, lift1));
    // A small settle as the deck lands on the column caps.
    const settleDip = Math.sin(window01(p, lift1 - 0.004, lift1 + 0.004) * Math.PI) * 0.012;
    deck.position.y = groundY * (1 - t) - settleDip;
  });
  ctx.sparkles.glint([DECK.x0 + 0.06, DECK.under, DECK.z1 + 0.06], lift1 + 0.002, 0.5);
  ctx.sparkles.glint([DECK.x1 - 0.06, DECK.under, DECK.z1 + 0.06], lift1 + 0.003, 0.5);
  ctx.sparkles.glint([-3.0, DECK.under, DECK.z1 + 0.06], lift1 + 0.004, 0.5);

  // ---- stair: black steel stringers, oak treads with LED under each nosing, glass both sides.
  const flight = new THREE.Group();
  root.add(flight);
  const angle = Math.atan2(DECK.top - FLOOR_TOP, STAIR.zBottom - STAIR.zTop);
  const treads = STAIR.risers - 1;
  const rise = (DECK.top - FLOOR_TOP) / STAIR.risers;
  const sBottom = v3(0, FLOOR_TOP + 0.05, STAIR.zBottom + 0.08);
  const sTop = v3(0, DECK.top - 0.1, STAIR.zTop);
  const stringerLen = sBottom.distanceTo(sTop);
  const stringerMid = sBottom.clone().add(sTop).multiplyScalar(0.5);
  const stringerGeo = ctx.rbox(0.014, 0.28, stringerLen, 0.003);
  const stringerPool = parts.pool(stringerGeo, mats.steel, flight);
  for (const x of [STAIR.x0 + 0.007, STAIR.x1 - 0.007]) stringerPool.place({ p: [x, stringerMid.y, stringerMid.z], r: [angle, 0, 0] });
  const treadGeo = ctx.rbox(STAIR.x1 - STAIR.x0 - 0.03, 0.04, STAIR.going + 0.015, 0.004);
  const treadPool = parts.pool(treadGeo, mats.oakSolid, flight);
  const nosingPool = ctx.bars(mats.led, flight, { cast: false, receive: false });
  const stairX = (STAIR.x0 + STAIR.x1) / 2;
  for (let k = 1; k <= treads; k += 1) {
    const top = FLOOR_TOP + k * rise;
    const zBack = STAIR.zBottom - k * STAIR.going;
    const zc = zBack + STAIR.going / 2 + 0.0075;
    treadPool.place({ p: [stairX, top - 0.02, zc] });
    nosingPool.place({ p: [stairX, top - 0.046, zBack + STAIR.going + 0.004], s: [0.9, 0.008, 0.01] });
  }
  // Parallelogram glass panes and a handrail on both sides.
  const nosing = (z: number) => FLOOR_TOP + ((STAIR.zBottom - z) / STAIR.going) * rise + 0.04;
  const glassParts: THREE.BufferGeometry[] = [];
  const railParts: THREE.BufferGeometry[] = [];
  const panes = 3;
  const zA = STAIR.zBottom - 0.15;
  const zB = STAIR.zTop + 0.05;
  for (const x of [STAIR.x0 + 0.03, STAIR.x1 - 0.03]) {
    for (let i = 0; i < panes; i += 1) {
      const za = zA + ((zB - zA) * i) / panes - (i ? 0.006 : 0);
      const zb = zA + ((zB - zA) * (i + 1)) / panes + (i < panes - 1 ? 0.006 : 0);
      const ya = nosing(za);
      const yb = nosing(zb);
      const g = new THREE.BufferGeometry();
      const pts = [x, ya, za, x, yb, zb, x, yb + 0.92, zb, x, ya + 0.92, za];
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      glassParts.push(g);
    }
    railParts.push(rod(v3(x, nosing(zA) + 0.94, zA), v3(x, nosing(zB) + 0.94, zB), 0.021, rich ? 10 : 6));
    railParts.push(rod(v3(x, nosing(zA) - 0.03, zA), v3(x, nosing(zB) - 0.03, zB), 0.03, 4));
  }
  const stairGlass = new THREE.Mesh(track(merge(glassParts)), mats.glass);
  flight.add(stairGlass);
  const stairRail = ctx.mesh(track(merge(railParts)), mats.alu);
  flight.add(stairRail);
  parts.object(flight, T.stair, { from: [0, 1.6, 0.4], glint: [stairX, DECK.top, STAIR.zTop] });
  ctx.sparkles.glint([stairX, FLOOR_TOP + 0.05, STAIR.zBottom], T.stair[1] + 0.002, 0.45);
  decals.add("blob", stairX, FLOOR_TOP + 0.003, 1.0, 1.6, 5.0, (p) => window01(p, T.stair[0], T.stair[1]) * 0.32);
  ctx.hooks.stairNosings = Array.from({ length: treads }, (_, i) => FLOOR_TOP + (i + 1) * rise);

  // ---- brand tower: six 3 x 1 x 0.6 m frame modules stacked bottom to top.
  const tw = TOWER.x1 - TOWER.x0;
  const td = TOWER.z1 - TOWER.z0;
  const frameParts: THREE.BufferGeometry[] = [];
  const pr = 0.04;
  for (const x of [-tw / 2 + pr / 2, tw / 2 - pr / 2]) for (const z of [-td / 2 + pr / 2, td / 2 - pr / 2]) frameParts.push(new THREE.BoxGeometry(pr, 1, pr).translate(x, 0.5, z));
  for (const y of [pr / 2, 1 - pr / 2]) {
    for (const z of [-td / 2 + pr / 2, td / 2 - pr / 2]) frameParts.push(new THREE.BoxGeometry(tw, pr, pr).translate(0, y, z));
    for (const x of [-tw / 2 + pr / 2, tw / 2 - pr / 2]) frameParts.push(new THREE.BoxGeometry(pr, pr, td).translate(x, y, 0));
  }
  frameParts.push(new THREE.BoxGeometry(0.03, 0.03, td).translate(0, 0.5, 0));
  frameParts.push(rod(v3(-tw / 2, 0.05, -td / 2 + 0.02), v3(0, 0.95, -td / 2 + 0.02), 0.01, 4), rod(v3(0, 0.95, -td / 2 + 0.02), v3(tw / 2, 0.05, -td / 2 + 0.02), 0.01, 4));
  const framePool = parts.pool(track(merge(frameParts)), mats.alu, root);
  const [t0, t1] = T.towerFrames;
  const tcx = (TOWER.x0 + TOWER.x1) / 2;
  const tcz = (TOWER.z0 + TOWER.z1) / 2;
  for (let i = 0; i < 6; i += 1) {
    const s = t0 + i * ((t1 - t0 - 0.008) / 6);
    framePool.add({ p: [tcx, FLOOR_TOP + i, tcz] }, [s, s + 0.008], { from: [0, 1.4, 0], glint: [tcx + tw / 2, FLOOR_TOP + i, TOWER.z1] });
  }
  decals.add("edge", tcx, FLOOR_TOP + 0.003, TOWER.z1 + 0.16, tw + 0.3, 0.34, (p) => window01(p, t0, t0 + 0.01) * 0.6);

  // Downlight glow on the floor under the deck, once the stand is lit.
  for (const [x, z] of downlights) decals.add("pool", x, FLOOR_TOP + 0.004, z, 1.6, 1.6, (p) => ledAt(p, x, 2.7, z) * 0.55);
}
