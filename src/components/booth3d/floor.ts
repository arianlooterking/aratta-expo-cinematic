// Chapter 3: the raised floor. Adjustable pedestals appear in a wave and level,
// orange power and blue data runs come in from the service duct, 1 x 1 m
// panels drop in a diagonal wave (a few stay open for a beat so the feet and
// cables show), the aluminium edge profile (with its LED line) and the ramp
// close it, then the finish rolls out: oak, a carpet inlay and brass lines.

import * as THREE from "three";
import { merge, type Ctx } from "./core";
import { PLOT } from "./hall";
import { BOOTH_TIMELINE as T, easeInOutCubic, ledAt, window01 } from "./timeline";

export const FLOOR_TOP = 0.1;
export const CARPET = { x0: -1.4, x1: 2.8, z0: -1.6, z1: 2.2 };

export function buildFloor(ctx: Ctx) {
  const { mats, root, track, rich, parts, decals } = ctx;
  const radial = rich ? 10 : 6;

  // ---- pedestals: base plate + threaded rod, then the levelling heads.
  const pedestal = merge([
    new THREE.CylinderGeometry(0.05, 0.05, 0.006, radial).translate(0, 0.003, 0),
    new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6).translate(0, 0.03, 0),
    new THREE.CylinderGeometry(0.022, 0.022, 0.008, 6).translate(0, 0.045, 0),
  ]);
  const head = merge([new THREE.CylinderGeometry(0.045, 0.045, 0.006, radial).translate(0, -0.003, 0), new THREE.BoxGeometry(0.09, 0.004, 0.006).translate(0, 0.002, 0), new THREE.BoxGeometry(0.006, 0.004, 0.09).translate(0, 0.002, 0)]);
  const pedPool = parts.pool(track(pedestal), mats.galv, root, { cast: false });
  const headPool = parts.pool(track(head), mats.galv, root, { cast: false });
  const [w0, w1] = T.pedestals;
  const [l0, l1] = T.level;
  const maxD = Math.hypot(12, 9);
  for (let ix = 0; ix <= 12; ix += 1) {
    for (let iz = 0; iz <= 9; iz += 1) {
      const x = PLOT.x0 + ix;
      const z = PLOT.z0 + iz;
      // The wave starts at the open front-right corner (where the close camera sits).
      const d = Math.hypot(12 - ix, 9 - iz) / maxD;
      const s = w0 + d * (w1 - w0 - 0.006);
      pedPool.add({ p: [x, 0, z] }, [s, s + 0.006], { scaleFrom: [0.3, 0.05, 0.3] });
      const ls = l0 + d * (l1 - l0 - 0.004);
      // Heads arrive low and are wound up to the 70 mm level line.
      headPool.add({ p: [x, 0.048, z] }, [s, s + 0.004], { scaleFrom: 0.4, out: { win: [ls, ls + 0.0004], to: [0, 0, 0] } });
      headPool.add({ p: [x, 0.07, z] }, [ls, ls + 0.004], { from: [0, -0.022, 0], rot: [0, Math.PI * 1.5, 0], glint: ix % 4 === 0 && iz % 3 === 0 ? [x, 0.08, z] : undefined });
    }
  }
  // (each node has two head instances: the low one is swapped for the levelled one)
  // A faint laser level line sweeps across while the heads are set.
  const laserMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.12, 0.08), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  const laser = new THREE.Mesh(track(new THREE.PlaneGeometry(12.4, 0.012)), laserMat);
  laser.rotation.x = -Math.PI / 2;
  laser.position.y = 0.071;
  root.add(laser);

  // ---- cable trunking from the service duct, with power and data inside.
  const trayGeo = merge([
    new THREE.BoxGeometry(0.12, 0.003, 1).translate(0, 0.0015, 0),
    new THREE.BoxGeometry(0.003, 0.04, 1).translate(-0.06, 0.02, 0),
    new THREE.BoxGeometry(0.003, 0.04, 1).translate(0.06, 0.02, 0),
  ]);
  const trayPool = parts.pool(track(trayGeo), mats.galv, root, { cast: false });
  const cableGeo = merge([
    new THREE.CylinderGeometry(0.014, 0.014, 1, 6).rotateX(Math.PI / 2).translate(-0.03, 0.017, 0),
    new THREE.CylinderGeometry(0.012, 0.012, 1, 6).rotateX(Math.PI / 2).translate(-0.004, 0.015, 0),
  ]);
  const cablePool = parts.pool(track(cableGeo), mats.cableOrange, root, { cast: false });
  const dataGeo = merge([
    new THREE.CylinderGeometry(0.01, 0.01, 1, 6).rotateX(Math.PI / 2).translate(0.022, 0.013, 0),
    new THREE.CylinderGeometry(0.01, 0.01, 1, 6).rotateX(Math.PI / 2).translate(0.042, 0.013, 0),
  ]);
  const dataPool = parts.pool(track(dataGeo), mats.cableBlue, root, { cast: false });
  const [k0, k1] = T.trunking;
  const runs = [-3.5, 0.5, 4.5];
  runs.forEach((x, r) => {
    const z0 = PLOT.z0 - 0.9;
    const z1 = r === 1 ? 3.0 : 2.0;
    const n = Math.ceil(z1 - z0);
    for (let i = 0; i < n; i += 1) {
      const zc = z0 + i + 0.5;
      const s = k0 + (i / n) * (k1 - k0 - 0.004) + r * 0.0015;
      const home = { p: [x, 0, zc] as [number, number, number] };
      trayPool.add(home, [s, s + 0.003], { from: [0, 0, -0.6], scaleFrom: [1, 1, 0.01], ease: (t) => t });
      cablePool.add(home, [s + 0.001, s + 0.004], { from: [0, 0, -0.5], scaleFrom: [1, 1, 0.01], ease: (t) => t });
      dataPool.add(home, [s + 0.001, s + 0.004], { from: [0, 0, -0.5], scaleFrom: [1, 1, 0.01], ease: (t) => t });
    }
  });
  // Floor boxes where the runs end.
  const boxPool = ctx.bars(mats.steel, root, { cast: false });
  runs.forEach((x, r) => boxPool.add({ p: [x, 0.03, r === 1 ? 3.0 : 2.0], s: [0.22, 0.06, 0.22] }, [k1 - 0.004, k1], { scaleFrom: 0.2, glint: true }));

  // ---- floor panels: 108 bevelled 1 x 1 m panels in a diagonal wave from the back-left
  // corner; a few near the front-right corner wait a beat so the void stays readable.
  const panelGeo = ctx.rbox(0.994, 0.03, 0.994, 0.004);
  const panelPool = parts.pool(panelGeo, mats.panelBoard, root, { cast: false });
  const [p0, p1] = T.panels;
  const late = new Set(["9|6", "10|7", "8|7", "10|5", "11|6"]);
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      const x = PLOT.x0 + col + 0.5;
      const z = PLOT.z0 + row + 0.5;
      const wave = (col + row) / 19;
      const s = late.has(`${col}|${row}`) ? p1 - 0.008 + (col % 2) * 0.0012 : p0 + wave * (p1 - p0 - 0.02) + (col % 2) * 0.0008;
      panelPool.add({ p: [x, FLOOR_TOP - 0.015, z] }, [s, s + 0.007], { from: [0, 1.2, 0.15], rot: [0.05, 0, 0], glint: col % 5 === 2 && row % 3 === 1 });
    }
  }

  // ---- aluminium edge profile with its LED line, then the ramp.
  const [e0, e1] = T.edge;
  const alu = ctx.bars(mats.alu, root, { cast: false });
  const led = ctx.bars(mats.led, root, { cast: false, receive: false });
  const sides: Array<{ p: [number, number, number]; s: [number, number, number]; out: [number, number, number] }> = [
    { p: [0, 0, PLOT.z1 + 0.002], s: [12.01, 1, 0.004], out: [0, 0, 1] },
    { p: [PLOT.x0 - 0.002, 0, 0], s: [0.004, 1, 9.01], out: [-1, 0, 0] },
    { p: [PLOT.x1 + 0.002, 0, 0], s: [0.004, 1, 9.01], out: [1, 0, 0] },
    { p: [0, 0, PLOT.z0 - 0.002], s: [12.01, 1, 0.004], out: [0, 0, -1] },
  ];
  sides.forEach((side, i) => {
    const s = e0 + i * 0.003;
    const win: [number, number] = [s, s + 0.008];
    const [x, , z] = side.p;
    const from: [number, number, number] = [side.out[0] * 0.5, 0, side.out[2] * 0.5];
    // Face (100 mm), top lip and the recessed LED line under it.
    alu.add({ p: [x, 0.05, z], s: [side.s[0], 0.1, side.s[2]] }, win, { from });
    alu.add({ p: [x - side.out[0] * 0.012, FLOOR_TOP + 0.001, z - side.out[2] * 0.012], s: [side.s[0] === 0.004 ? 0.03 : side.s[0], 0.003, side.s[2] === 0.004 ? 0.03 : side.s[2]] }, win, { from });
    if (i < 3) led.add({ p: [x + side.out[0] * 0.004, 0.018, z + side.out[2] * 0.004], s: [side.s[0] === 0.004 ? 0.008 : side.s[0], 0.008, side.s[2] === 0.004 ? 0.008 : side.s[2]] }, win, { from });
  });
  // Glow the LED line throws on the hall floor, plus the platform's contact shadow.
  // Continuous strips (overlapping segments) so the glow follows the sweep without beads.
  for (let i = 0; i < 6; i += 1) {
    const x = PLOT.x0 + (i + 0.5) * 2;
    decals.add("ledglow", x, 0.0035, PLOT.z1 + 0.22, 2.25, 0.45, (p) => ledAt(p, x, 0, PLOT.z1) * 0.5);
  }
  for (const [sx, rot] of [
    [PLOT.x0 - 0.22, -Math.PI / 2],
    [PLOT.x1 + 0.22, Math.PI / 2],
  ]) {
    for (let i = 0; i < 4; i += 1) {
      const z = PLOT.z0 + (i + 0.5) * 2.25;
      decals.add("ledglow", sx, 0.0035, z, 2.5, 0.45, (p) => ledAt(p, sx, 0, z) * 0.5, rot);
    }
  }
  const edgeIn = (p: number) => window01(p, e0, e1 + 0.01);
  decals.add("edge", 0, 0.0025, PLOT.z1 + 0.15, 12.4, 0.3, (p) => edgeIn(p) * 0.55);
  decals.add("edge", PLOT.x0 - 0.15, 0.0025, 0, 9.4, 0.3, (p) => edgeIn(p) * 0.55, -Math.PI / 2);
  decals.add("edge", PLOT.x1 + 0.15, 0.0025, 0, 9.4, 0.3, (p) => edgeIn(p) * 0.55, Math.PI / 2);

  // Ramp (1.5 m wide, 1.2 m long) at the front right, aluminium with anti-slip.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1.2, 0);
  shape.lineTo(0, FLOOR_TOP);
  shape.lineTo(0, 0);
  const rampGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: false });
  rampGeo.rotateY(-Math.PI / 2);
  const ramp = ctx.mesh(track(rampGeo), mats.panelBoard); // matt, so the floods never burn a hotspot into it
  ramp.position.set(5.1, 0, PLOT.z1);
  root.add(ramp);
  parts.object(ramp, T.ramp, { from: [0, 0, 1.2], glint: [4.35, 0.12, PLOT.z1] });
  const ribs = ctx.bars(mats.aluBlack, root, { cast: false });
  for (let i = 1; i < 8; i += 1) {
    const s = i * 0.15;
    const y = FLOOR_TOP * (1 - s / 1.2) + 0.002;
    ribs.add({ p: [4.35, y, PLOT.z1 + s], r: [Math.atan2(FLOOR_TOP, 1.2), 0, 0], s: [1.42, 0.004, 0.02] }, T.ramp, { from: [0, 0, 1.2] });
  }
  decals.add("edge", 4.35, 0.0026, PLOT.z1 + 1.25, 1.7, 0.2, (p) => window01(p, T.ramp[0], T.ramp[1]) * 0.4);

  // ---- finish: oak rolls out left to right, carpet inlay back to front, brass lines draw in.
  const [f0, f1] = T.finish;
  const oakPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -6.1);
  const carpetPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), CARPET.z0 - 0.1);
  const oakTex = mats.oak.map!;
  oakTex.repeat.set(12 / 2.4, 9 / 2.4);
  mats.oak.roughnessMap!.repeat.set(12 / 2.4, 9 / 2.4);
  mats.oak.clippingPlanes = [oakPlane];
  const oakFloor = ctx.mesh(track(new THREE.PlaneGeometry(12, 9).rotateX(-Math.PI / 2)), mats.oak, false);
  oakFloor.position.y = FLOOR_TOP + 0.0012;
  root.add(oakFloor);
  const carpetMat = mats.carpet;
  carpetMat.clippingPlanes = [carpetPlane];
  const carpet = ctx.mesh(track(new THREE.BoxGeometry(CARPET.x1 - CARPET.x0, 0.006, CARPET.z1 - CARPET.z0)), carpetMat, false);
  carpet.position.set((CARPET.x0 + CARPET.x1) / 2, FLOOR_TOP + 0.003, (CARPET.z0 + CARPET.z1) / 2);
  root.add(carpet);
  const roll = ctx.mesh(track(new THREE.CylinderGeometry(1, 1, 9, rich ? 24 : 12).rotateX(Math.PI / 2)), mats.oakSolid);
  root.add(roll);
  const carpetRoll = ctx.mesh(track(new THREE.CylinderGeometry(1, 1, CARPET.x1 - CARPET.x0, rich ? 20 : 10).rotateZ(Math.PI / 2)), mats.carpet);
  carpetRoll.material = track(new THREE.MeshStandardMaterial({ color: "#2b2c2e", roughness: 1 }));
  root.add(carpetRoll);
  const oakT = (p: number) => easeInOutCubic(window01(p, f0, f0 + (f1 - f0) * 0.62));
  const carpetT = (p: number) => easeInOutCubic(window01(p, f0 + (f1 - f0) * 0.5, f1 - (f1 - f0) * 0.1));
  // Brass inlay lines (10 mm) frame the carpet and run out to the front edge.
  const brass = ctx.bars(mats.brass, root, { cast: false });
  const bl = 0.01;
  const b0 = f1 - (f1 - f0) * 0.2;
  const brassLine = (x: number, z: number, len: number, alongX: boolean, delay: number) =>
    brass.add({ p: [x, FLOOR_TOP + 0.0022, z], s: alongX ? [len, 0.002, bl] : [bl, 0.002, len] }, [b0 + delay, b0 + delay + 0.006], { scaleFrom: alongX ? [0.001, 1, 1] : [1, 1, 0.001], ease: (t) => t, glint: delay === 0 });
  const cx = (CARPET.x0 + CARPET.x1) / 2;
  const cz = (CARPET.z0 + CARPET.z1) / 2;
  brassLine(cx, CARPET.z0 - 0.04, CARPET.x1 - CARPET.x0 + 0.09, true, 0);
  brassLine(cx, CARPET.z1 + 0.04, CARPET.x1 - CARPET.x0 + 0.09, true, 0.001);
  brassLine(CARPET.x0 - 0.04, cz, CARPET.z1 - CARPET.z0 + 0.09, false, 0.002);
  brassLine(CARPET.x1 + 0.04, cz, CARPET.z1 - CARPET.z0 + 0.09, false, 0.003);
  brassLine(CARPET.x0 - 0.04, (CARPET.z1 + PLOT.z1) / 2 + 0.03, PLOT.z1 - CARPET.z1 - 0.1, false, 0.004);
  brassLine(CARPET.x1 + 0.04, (CARPET.z1 + PLOT.z1) / 2 + 0.03, PLOT.z1 - CARPET.z1 - 0.1, false, 0.004);
  brassLine(-3.5, -1.5 + 0.12, 5.0, true, 0.005);

  ctx.anims.push((p) => {
    // Laser line sweeps front to back while the heads are levelled.
    const lt = window01(p, l0 - 0.004, l1 + 0.002);
    laser.visible = lt > 0 && lt < 1;
    laserMat.opacity = Math.sin(lt * Math.PI) * 0.8;
    laser.position.z = PLOT.z1 - lt * 9;

    const ot = oakT(p);
    oakFloor.visible = ot > 0;
    const xEdge = -6 + ot * 12;
    oakPlane.constant = ot >= 1 ? 7 : xEdge;
    const r = 0.16 * (1 - ot) + 0.02;
    roll.visible = ot > 0 && ot < 1;
    roll.scale.set(r, r, 1);
    roll.position.set(xEdge + r, FLOOR_TOP + r, 0);
    roll.rotation.y = 0;
    roll.rotation.z = -ot * 40;

    const ct = carpetT(p);
    carpet.visible = ct > 0;
    const zEdge = CARPET.z0 + ct * (CARPET.z1 - CARPET.z0);
    carpetPlane.constant = ct >= 1 ? 10 : zEdge;
    const cr = 0.1 * (1 - ct) + 0.015;
    carpetRoll.visible = ct > 0 && ct < 1;
    carpetRoll.scale.set(1, cr, cr);
    carpetRoll.position.set(cx, FLOOR_TOP + cr, zEdge + cr);
    carpetRoll.rotation.x = ct * 30;
  });
}
