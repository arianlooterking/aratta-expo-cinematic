// Build-day props around the plot (chapters 2 to 5): tripod LED work floods
// (the motivated key light of the build), flight cases, a pallet of floor
// panels, a rolling ladder, a cable drum and a pallet truck. Small and cheap
// (they join the existing material batches), and they leave before the brand.
// Around the neighbouring stands, in the opening frame already: a scissor lift
// raised in the aisle behind the plot and timber crates (they leave as those stands finish).

import * as THREE from "three";
import { merge, rod, v3, type Ctx, type V3, type Win } from "./core";
import { floodLevel } from "./light";
import { BOOTH_TIMELINE as T } from "./timeline";
import { SURROUNDINGS as S } from "./surroundings-timeline";

type Piece = [THREE.BufferGeometry, THREE.Material];

export function buildSite(ctx: Ctx) {
  const { mats, root, track, parts, sparkles } = ctx;
  const byMat = (pieces: Piece[]): Piece[] => {
    const map = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const [g, m] of pieces) {
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(g);
    }
    return [...map].map(([m, list]) => [track(merge(list)), m] as Piece);
  };
  const rb = (w: number, h: number, d: number, x: number, y: number, z: number, r = 0.01) => ctx.rbox(w, h, d, r).clone().translate(x, y, z);
  const arrive: Win = [0.112, 0.118];
  const leave = (to: V3, win: Win = T.siteOut) => ({ out: { win, to } });
  const place = (pieces: Piece[], x: number, z: number, rotY: number, to: V3, win: Win = arrive, outWin: Win = T.siteOut) =>
    parts.compound(pieces, root, { p: [x, 0, z], r: [0, rotY, 0] }, win, { from: [0, 0, 0], scaleFrom: 0.9, ...leave(to, outWin) });

  // ---- tripod LED floods: three legs, a mast, a T-bar with two panels aimed at the plot.
  const faceMat = track(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));
  const tripod = (height: number): Piece[] => {
    const pieces: Piece[] = [];
    for (let k = 0; k < 3; k += 1) {
      const a = (k / 3) * Math.PI * 2;
      pieces.push([rod(v3(Math.sin(a) * 0.55, 0.01, Math.cos(a) * 0.55), v3(0, 0.75, 0), 0.016, 6), mats.aluBlack]);
    }
    pieces.push([rod(v3(0, 0.7, 0), v3(0, height, 0), 0.022, 8), mats.alu]);
    pieces.push([rod(v3(-0.42, height, 0), v3(0.42, height, 0), 0.02, 6), mats.aluBlack]);
    for (const x of [-0.26, 0.26]) {
      pieces.push([rb(0.44, 0.34, 0.08, x, height + 0.05, 0.06, 0.012), mats.graphite]);
      pieces.push([new THREE.PlaneGeometry(0.38, 0.28).translate(x, height + 0.05, 0.102), faceMat]);
    }
    return byMat(pieces);
  };
  const floods: Array<{ at: V3; aim: V3; h: number }> = [
    // (at the front corner, outside the camera's corridor to the open front)
    { at: [-7.3, 0, 4.9], aim: [-1, 0.8, 0], h: 2.8 },
    { at: [8.9, 0, -4.4], aim: [1, 0.8, -0.5], h: 2.6 },
    { at: [-8.8, 0, -4.8], aim: [-2, 0.6, -1], h: 2.4 },
  ];
  floods.forEach(({ at, aim, h }, i) => {
    const yaw = Math.atan2(aim[0] - at[0], aim[2] - at[2]);
    // The floods are struck as soon as the stand's own power is on, so they never stand in front of the light chapter.
    place(tripod(h), at[0], at[2], yaw, [Math.sign(at[0]) * 2.5, 0, 0], [0.112 + i * 0.002, 0.12 + i * 0.002], T.floodsOut);
    for (const x of [-0.26, 0.26]) {
      const off = new THREE.Vector3(x, h + 0.05, 0.14).applyAxisAngle(v3(0, 1, 0), yaw);
      sparkles.add([at[0] + off.x, off.y, at[2] + off.z], 0.55, new THREE.Color(1.3, 1.35, 1.4), (p) => floodLevel(p) * 0.55);
    }
  });

  // ---- flight cases: black ply with aluminium edge trim and castors.
  const caseParts = (w: number, h: number, d: number, y: number): Piece[] => {
    const pieces: Piece[] = [[rb(w, h, d, 0, y + h / 2, 0, 0.012), mats.black]];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pieces.push([rb(0.03, h + 0.004, 0.03, (sx * w) / 2, y + h / 2, (sz * d) / 2, 0.006), mats.alu]);
    pieces.push([rb(w + 0.01, 0.03, d + 0.01, 0, y + h * 0.62, 0, 0.006), mats.alu]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pieces.push([new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10).rotateZ(Math.PI / 2).translate(sx * (w / 2 - 0.08), 0.05, sz * (d / 2 - 0.08)), mats.hoist]);
    return pieces;
  };
  place(byMat([...caseParts(1.2, 0.72, 0.62, 0.0), ...caseParts(1.2, 0.52, 0.62, 0.72).filter((_, k) => k < 6)]), 8.2, -2.9, 0.15, [3, 0, 0]);
  place(byMat(caseParts(0.8, 0.9, 0.6, 0)), 8.7, -1.5, -0.35, [3, 0, 0], [0.114, 0.12]);

  // ---- pallet of floor panels (the stack the floor chapter draws from).
  const pallet: Piece[] = [];
  for (let k = 0; k < 5; k += 1) pallet.push([rb(1.1, 0.02, 0.1, 0, 0.13, -0.5 + k * 0.25, 0.003), mats.oakSolid]);
  for (const z of [-0.45, 0, 0.45]) pallet.push([rb(1.1, 0.1, 0.1, 0, 0.06, z, 0.004), mats.oakSolid]);
  for (let k = 0; k < 14; k += 1) pallet.push([rb(1.0, 0.03, 1.0, 0, 0.16 + k * 0.032, 0, 0.004), mats.panelBoard]);
  pallet.push([rb(0.03, 0.5, 1.02, 0.51, 0.39, 0, 0.002), mats.cableOrange]);
  place(byMat(pallet), -7.9, 2.3, 0.1, [-3, 0, 0]);

  // ---- rolling ladder: two rails, treads, a top platform and castors.
  const ladder: Piece[] = [];
  const lh = 2.2;
  for (const x of [-0.28, 0.28]) {
    ladder.push([rod(v3(x, 0.08, 0.55), v3(x, lh, -0.1), 0.02, 6), mats.alu]);
    ladder.push([rod(v3(x, 0.08, -0.45), v3(x, lh, -0.3), 0.02, 6), mats.alu]);
    ladder.push([rod(v3(x, lh + 0.9, -0.2), v3(x, lh, -0.1), 0.016, 6), mats.alu]);
  }
  for (let k = 1; k <= 6; k += 1) {
    const t = k / 7;
    ladder.push([rb(0.56, 0.025, 0.14, 0, 0.08 + t * (lh - 0.08), 0.55 - t * 0.65, 0.004), mats.alu]);
  }
  ladder.push([rb(0.6, 0.03, 0.4, 0, lh, -0.2, 0.004), mats.alu]);
  for (const x of [-0.28, 0.28]) for (const z of [0.55, -0.45]) ladder.push([new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10).rotateZ(Math.PI / 2).translate(x, 0.05, z), mats.hoist]);
  place(byMat(ladder), -7.4, -1.0, Math.PI / 2 + 0.2, [-3, 0, 0], [0.115, 0.121]);

  // ---- cable drum: two ply cheeks and an orange core.
  const drum: Piece[] = [
    [new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20).rotateZ(Math.PI / 2).translate(-0.22, 0.42, 0), mats.oakSolid],
    [new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20).rotateZ(Math.PI / 2).translate(0.22, 0.42, 0), mats.oakSolid],
    [new THREE.CylinderGeometry(0.3, 0.3, 0.4, 18).rotateZ(Math.PI / 2).translate(0, 0.42, 0), mats.cableOrange],
  ];
  place(byMat(drum), 8.0, -0.2, 0.4, [3, 0, 0], [0.116, 0.122]);

  // ---- pallet truck: forks, a hydraulic body and a handle.
  const truck: Piece[] = [
    [rb(0.16, 0.06, 1.15, -0.2, 0.05, 0.3, 0.008), mats.cableOrange],
    [rb(0.16, 0.06, 1.15, 0.2, 0.05, 0.3, 0.008), mats.cableOrange],
    [rb(0.56, 0.12, 0.2, 0, 0.1, -0.35, 0.012), mats.cableOrange],
    [rb(0.12, 0.35, 0.12, 0, 0.32, -0.38, 0.01), mats.hoist],
    [rod(v3(0, 0.45, -0.4), v3(0, 1.15, -0.72), 0.018, 6), mats.hoist],
    [rod(v3(-0.12, 1.15, -0.72), v3(0.12, 1.15, -0.72), 0.018, 6), mats.hoist],
  ];
  place(byMat(truck), -8.6, 4.6, 0.6, [-3, 0, 0], [0.117, 0.123]);

  // ---- scissor lift in the aisle behind the plot: chassis, four scissor stages, a railed deck.
  const lift: Piece[] = [];
  const deckY = 4.6;
  lift.push([rb(1.2, 0.45, 2.4, 0, 0.36, 0, 0.03), mats.cableOrange]);
  for (const x of [-0.5, 0.5]) for (const z of [-0.85, 0.85]) lift.push([new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12).rotateZ(Math.PI / 2).translate(x, 0.16, z), mats.hoist]);
  const stages = 4;
  const stageH = (deckY - 0.6) / stages;
  for (let k = 0; k < stages; k += 1) {
    const y0 = 0.6 + k * stageH;
    for (const x of [-0.52, 0.52]) {
      lift.push([rod(v3(x, y0, -1.0), v3(x, y0 + stageH, 1.0), 0.04, 5), mats.graphite]);
      lift.push([rod(v3(x, y0, 1.0), v3(x, y0 + stageH, -1.0), 0.04, 5), mats.graphite]);
    }
  }
  lift.push([rb(1.3, 0.12, 2.6, 0, deckY + 0.06, 0, 0.01), mats.cableOrange]);
  for (const x of [-0.63, 0.63]) lift.push([rb(0.04, 0.04, 2.6, x, deckY + 1.1, 0, 0.004), mats.alu]);
  for (const z of [-1.28, 1.28]) lift.push([rb(1.3, 0.04, 0.04, 0, deckY + 1.1, z, 0.004), mats.alu]);
  for (const x of [-0.63, 0.63]) for (const z of [-1.28, 0, 1.28]) lift.push([rb(0.04, 1.05, 0.04, x, deckY + 0.6, z, 0.004), mats.alu]);
  parts.compound(byMat(lift), root, { p: [3.0, 0, -10.9], r: [0, 0.12, 0] }, [-1.0001, -1], { ease: () => 1, out: { win: S.lift.out, to: [7, 0, 0] } });

  // ---- timber crates at the rotunda and the ribbon stand.
  const crate = (w: number, h: number, d: number): Piece[] => {
    const pieces: Piece[] = [[rb(w, h, d, 0, h / 2, 0, 0.01), mats.oakSolid]];
    for (const y of [0.08, h - 0.08]) pieces.push([rb(w + 0.03, 0.1, d + 0.03, 0, y, 0, 0.005), mats.oakSolid]);
    pieces.push([rb(w + 0.02, 0.06, 0.02, 0, h * 0.5, d / 2 + 0.01, 0.003), mats.black]);
    return pieces;
  };
  const crates: Array<[number, number, number, number, number, number]> = [
    // x, z, w, h, d, yaw
    [-11.3, 2.4, 1.4, 1.0, 1.0, 0.2],
    [-11.1, 1.0, 1.0, 0.8, 0.9, -0.15],
    [-12.3, -6.6, 1.6, 1.1, 1.1, 0.4],
    [0.4, -10.4, 1.2, 0.9, 1.0, -0.3],
    [-1.0, -10.8, 1.0, 1.2, 1.0, 0.1],
  ];
  crates.forEach(([x, z, w, h, d, yaw]) => parts.compound(byMat(crate(w, h, d)), root, { p: [x, 0, z], r: [0, yaw, 0] }, [-1.0001, -1], { ease: () => 1, out: { win: S.crates.out, to: [x < 0 ? -4 : 4, 0, 0] } }));

  ctx.anims.push((p) => {
    faceMat.color.setScalar(floodLevel(p) * 2.6);
  });
}
