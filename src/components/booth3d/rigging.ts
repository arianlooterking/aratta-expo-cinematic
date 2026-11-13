// Chapter 2: rigging first. A 10 x 7 m rectangle of 290 mm box truss is laid
// out at chest height on rolling trestles, the segments slide together and are pinned, the spot
// fixtures clamp on, chain hoists drop their chains and the whole rig rises to
// 6.4 m. The circular hanging sign ring is rigged at the same time.

import * as THREE from "three";
import { merge, rod, v3, type Ctx, type V3 } from "./core";
import { BOOTH_TIMELINE as T, easeInOutCubic, window01 } from "./timeline";

export const RIG = { x: 5, z: 3.5, groundY: 1.15, height: 6.4, size: 0.29 };
export const SIGN = { x: 0.5, z: 0.3, radius: 2.5, bottom: 6.0, top: 7.0 };

export type Fixture = { world: THREE.Vector3; target: THREE.Vector3; order: number };

const C = 0.12; // chord offset from the truss centre line (290 mm truss, 50 mm chords)

function trussSegment(length: number, radial: number) {
  const parts: THREE.BufferGeometry[] = [];
  const half = length / 2 - 0.012;
  for (const y of [-C, C]) for (const z of [-C, C]) parts.push(rod(v3(-half, y, z), v3(half, y, z), 0.025, radial));
  // Zig-zag diagonals on all four faces, roughly every 0.5 m.
  const n = Math.max(2, Math.round(length / 0.5));
  const step = (half * 2) / n;
  const faces: Array<(s: number, a: number) => THREE.Vector3> = [
    (x, a) => v3(x, C, a * C),
    (x, a) => v3(x, -C, a * C),
    (x, a) => v3(x, a * C, C),
    (x, a) => v3(x, a * C, -C),
  ];
  for (const face of faces) {
    for (let i = 0; i < n; i += 1) {
      const x0 = -half + i * step;
      const a = i % 2 ? 1 : -1;
      parts.push(rod(face(x0, a), face(x0 + step, -a), 0.01, 4));
    }
  }
  // End frames (the ladder that carries the fork ends).
  for (const x of [-half + 0.03, half - 0.03]) {
    parts.push(rod(v3(x, -C, -C), v3(x, C, -C), 0.012, 4), rod(v3(x, -C, C), v3(x, C, C), 0.012, 4));
    parts.push(rod(v3(x, C, -C), v3(x, C, C), 0.012, 4), rod(v3(x, -C, -C), v3(x, -C, C), 0.012, 4));
  }
  return merge(parts);
}

function cornerBlock(radial: number) {
  const parts: THREE.BufferGeometry[] = [];
  const h = 0.145;
  for (const x of [-C, C]) for (const z of [-C, C]) parts.push(rod(v3(x, -h, z), v3(x, h, z), 0.025, radial));
  for (const y of [-C, C]) {
    for (const z of [-C, C]) parts.push(rod(v3(-h, y, z), v3(h, y, z), 0.022, radial));
    for (const x of [-C, C]) parts.push(rod(v3(x, y, -h), v3(x, y, h), 0.022, radial));
  }
  for (const y of [-C, C]) parts.push(rod(v3(-C, y, -C), v3(C, y, C), 0.01, 4));
  return merge(parts);
}

export function buildRigging(ctx: Ctx) {
  const { mats, root, track, rich, parts } = ctx;
  const radial = rich ? 10 : 6;
  const rig = new THREE.Group();
  rig.position.y = RIG.groundY;
  root.add(rig);
  ctx.hooks.rig = rig;

  // ---- truss: corner blocks, segments, couplers and pins.
  const longL = (RIG.x * 2 - RIG.size) / 4;
  const shortL = (RIG.z * 2 - RIG.size) / 3;
  const longPool = parts.pool(track(trussSegment(longL, radial)), mats.truss, rig);
  const shortPool = parts.pool(track(trussSegment(shortL, radial)), mats.truss, rig);
  const cornerPool = parts.pool(track(cornerBlock(radial)), mats.truss, rig);
  const coupler = new THREE.CylinderGeometry(0.034, 0.034, 0.1, radial);
  coupler.rotateZ(Math.PI / 2);
  const couplerPool = parts.pool(track(coupler), mats.galv, rig);
  const couplerZ = new THREE.CylinderGeometry(0.034, 0.034, 0.1, radial);
  couplerZ.rotateX(Math.PI / 2);
  const couplerZPool = parts.pool(track(couplerZ), mats.galv, rig);
  const pin = new THREE.CylinderGeometry(0.007, 0.007, 0.11, 5);
  const pinPool = parts.pool(track(pin), mats.galv, rig, { cast: false });

  const [a, b] = T.truss;
  const corners: Array<[number, number]> = [
    [-RIG.x, RIG.z],
    [RIG.x, RIG.z],
    [RIG.x, -RIG.z],
    [-RIG.x, -RIG.z],
  ];
  corners.forEach(([x, z], i) => {
    cornerPool.add({ p: [x, 0, z] }, [a + i * 0.003, a + 0.01 + i * 0.003], { from: [0, 0.9, 0] });
  });
  const span = b - a - 0.012;
  const joints: Array<{ x: number; z: number; alongX: boolean; at: number }> = [];
  // Long sides (front and back).
  for (const z of [RIG.z, -RIG.z]) {
    for (let i = 0; i < 4; i += 1) {
      const x = -RIG.x + RIG.size / 2 + longL * (i + 0.5);
      const order = [1, 2, 0, 3][i];
      const start = a + 0.012 + (order / 4) * span * 0.7 + (z < 0 ? 0.004 : 0);
      const dir = x < 0 ? -1 : 1;
      longPool.add({ p: [x, 0, z] }, [start, start + span * 0.3], { from: [dir * 1.1, 0, 0] });
      joints.push({ x: x - longL / 2, z, alongX: true, at: start + span * 0.3 });
      if (i === 3) joints.push({ x: x + longL / 2, z, alongX: true, at: start + span * 0.3 });
    }
  }
  // Short sides (left and right).
  for (const x of [-RIG.x, RIG.x]) {
    for (let i = 0; i < 3; i += 1) {
      const z = -RIG.z + RIG.size / 2 + shortL * (i + 0.5);
      const order = [1, 0, 2][i];
      const start = a + 0.016 + (order / 3) * span * 0.7 + (x > 0 ? 0.004 : 0);
      const dir = z < 0 ? -1 : 1;
      shortPool.add({ p: [x, 0, z], r: [0, Math.PI / 2, 0] }, [start, start + span * 0.3], { from: [0, 0, dir * 1.1] });
      joints.push({ x, z: z - shortL / 2, alongX: false, at: start + span * 0.3 });
      if (i === 2) joints.push({ x, z: z + shortL / 2, alongX: false, at: start + span * 0.3 });
    }
  }
  // Couplers on each chord at each joint; the pins slide in a moment later and glint.
  const [c0, c1] = T.couplers;
  joints.forEach((joint, j) => {
    const at = Math.min(c1, Math.max(c0 + 0.004, joint.at + 0.006)) + (j % 5) * 0.0012;
    for (const y of [-C, C]) {
      for (const o of [-C, C]) {
        const x = joint.alongX ? joint.x : joint.x + o;
        const z = joint.alongX ? joint.z + o : joint.z;
        (joint.alongX ? couplerPool : couplerZPool).add({ p: [x, y, z] }, [joint.at - 0.004, joint.at], { from: joint.alongX ? [0.06, 0, 0] : [0, 0, 0.06] });
        pinPool.add({ p: [x, y, z] }, [at - 0.006, at], { from: [0, 0.22, 0] });
      }
    }
    ctx.sparkles.glint([joint.x, RIG.groundY + C, joint.z], at, 0.42);
  });

  // ---- rolling trestles under the corners and mid-joints (the truss sits at chest
  // height for pinning); they roll away once the rig is up.
  const saddle = RIG.groundY - C - 0.03;
  const dollyParts: THREE.BufferGeometry[] = [
    ctx.rbox(0.56, 0.04, 0.5, 0.008).clone().translate(0, 0.1, 0),
    ctx.rbox(0.42, 0.05, 0.36, 0.008).clone().translate(0, saddle - 0.025, 0),
  ];
  for (const sx of [-0.17, 0.17]) {
    dollyParts.push(rod(v3(sx * 1.4, 0.12, 0), v3(sx, saddle - 0.04, 0), 0.02, 6));
    dollyParts.push(rod(v3(sx * 1.4, 0.12, -0.18), v3(sx * 1.4, 0.12, 0.18), 0.016, 5));
  }
  dollyParts.push(rod(v3(-0.2, saddle * 0.5, 0), v3(0.2, saddle * 0.5, 0), 0.012, 5));
  for (const sx of [-0.22, 0.22]) for (const sz of [-0.19, 0.19]) dollyParts.push(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 10).rotateZ(Math.PI / 2).translate(sx, 0.045, sz));
  const dollyPool = parts.pool(track(merge(dollyParts)), mats.structure, root);
  const dollySpots: Array<[number, number]> = [...corners, [0, RIG.z], [0, -RIG.z], [-RIG.x, 0], [RIG.x, 0]];
  dollySpots.forEach(([x, z], i) => {
    const out: V3 = [x > 0.1 ? 1.6 : x < -0.1 ? -1.6 : 0, 0, z > 0.1 ? 1.6 : -1.6];
    dollyPool.add({ p: [x, 0, z] }, [a - 0.006 + i * 0.001, a + 0.002 + i * 0.001], { from: [0, 0, 0.8], out: { win: [T.rigRise[1] + 0.001, T.rigRise[1] + 0.009], to: out } });
  });

  // ---- spot fixtures: clamp + yoke + body + lens, aimed at their real targets.
  const height = RIG.height;
  const inner = (v: number, limit: number) => v - Math.sign(v) * (C + 0.02) * (Math.abs(v) >= limit - 0.01 ? 1 : 0);
  const spots: Array<{ at: V3; target: V3 }> = [
    { at: [-3.6, 0, RIG.z], target: [-5.4, 1.4, 1.2] },
    { at: [-1.2, 0, RIG.z], target: [-0.3, 1.1, 3.2] },
    { at: [1.2, 0, RIG.z], target: [1.4, 1.1, 3.2] },
    { at: [3.6, 0, RIG.z], target: [3.1, 1.0, 1.6] },
    { at: [-3.6, 0, -RIG.z], target: [-3.6, 3.2, -3.0] },
    { at: [-1.2, 0, -RIG.z], target: [-2.0, 1.1, -0.9] },
    { at: [1.2, 0, -RIG.z], target: [0.5, 4.3, -3.9] },
    { at: [3.6, 0, -RIG.z], target: [0.8, 0.5, 0.3] },
    { at: [-RIG.x, 0, -1.75], target: [-4.4, 1.2, -1.6] },
    { at: [-RIG.x, 0, 0], target: [-5.4, 1.6, 0.2] },
    { at: [-RIG.x, 0, 1.75], target: [-1.6, 1.0, 3.7] },
    { at: [RIG.x, 0, -1.75], target: [5.2, 1.0, -1.8] },
    { at: [RIG.x, 0, 0], target: [5.2, 1.0, 0.2] },
    { at: [RIG.x, 0, 1.75], target: [5.2, 1.0, 2.2] },
  ];
  const clampGeo = merge([
    new THREE.BoxGeometry(0.07, 0.07, 0.09).translate(0, 0, 0),
    new THREE.BoxGeometry(0.02, 0.14, 0.02).translate(0, -0.1, 0),
    new THREE.BoxGeometry(0.26, 0.02, 0.04).translate(0, -0.17, 0),
    new THREE.BoxGeometry(0.02, 0.2, 0.04).translate(-0.12, -0.26, 0),
    new THREE.BoxGeometry(0.02, 0.2, 0.04).translate(0.12, -0.26, 0),
  ]);
  const clampPool = parts.pool(track(clampGeo), mats.aluBlack, rig);
  const body = merge([
    new THREE.CylinderGeometry(0.09, 0.1, 0.3, radial).rotateX(Math.PI / 2),
    new THREE.CylinderGeometry(0.105, 0.105, 0.05, radial).rotateX(Math.PI / 2).translate(0, 0, 0.13),
    new THREE.BoxGeometry(0.12, 0.08, 0.12).translate(0, 0, -0.17),
  ]);
  const bodyPool = parts.pool(track(body), mats.hoist, rig);
  const lensGeo = new THREE.CircleGeometry(0.085, radial);
  lensGeo.translate(0, 0, 0.157);
  const lensPool = parts.pool(track(lensGeo), mats.lens, rig, { cast: false });
  const fixtures: Fixture[] = [];
  const [f0, f1] = T.fixtures;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  spots.forEach((spot, i) => {
    const x = inner(spot.at[0], RIG.x);
    const z = inner(spot.at[2], RIG.z);
    const clampLocal = v3(x, -C - 0.035, z);
    const bodyLocal = clampLocal.clone().add(v3(0, -0.28, 0));
    const world = bodyLocal.clone().add(v3(0, height, 0));
    const target = v3(...spot.target);
    const dir = target.clone().sub(world).normalize();
    const pan = Math.atan2(dir.x, dir.z);
    m.lookAt(world, target, v3(0, 1, 0));
    q.setFromRotationMatrix(m);
    // Matrix4.lookAt points -z at the target; turn the body so +z (the lens) faces it.
    q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), Math.PI));
    e.setFromQuaternion(q);
    const start = f0 + (i / spots.length) * (f1 - f0 - 0.008);
    const toward: V3 = [-Math.sign(x) * (Math.abs(x) > 4 ? 0.7 : 0), 0, -Math.sign(z) * (Math.abs(z) > 3 ? 0.7 : 0)];
    clampPool.add({ p: [clampLocal.x, clampLocal.y, clampLocal.z], r: [0, pan, 0] }, [start, start + 0.008], { from: toward, glint: [clampLocal.x, RIG.groundY + clampLocal.y, clampLocal.z] });
    bodyPool.add({ p: [bodyLocal.x, bodyLocal.y, bodyLocal.z], r: [e.x, e.y, e.z] }, [start, start + 0.008], { from: toward });
    lensPool.add({ p: [bodyLocal.x, bodyLocal.y, bodyLocal.z], r: [e.x, e.y, e.z] }, [start, start + 0.008], { from: toward });
    fixtures.push({ world, target, order: i });
  });
  ctx.hooks.fixtures = fixtures;

  // ---- sign ring frames (fabric arrives in chapter 7), rigged with the truss.
  const ringLocalY = (SIGN.bottom + SIGN.top) / 2 - height;
  const ringParts: THREE.BufferGeometry[] = [];
  for (const y of [-0.5, 0.5]) ringParts.push(new THREE.TorusGeometry(SIGN.radius - 0.03, 0.025, 6, rich ? 96 : 48).rotateX(Math.PI / 2).translate(0, y, 0));
  for (let i = 0; i < 16; i += 1) {
    const ang = (i / 16) * Math.PI * 2;
    const r = SIGN.radius - 0.05;
    ringParts.push(new THREE.BoxGeometry(0.025, 1, 0.025).translate(Math.sin(ang) * r, 0, Math.cos(ang) * r));
  }
  const ring = ctx.mesh(track(merge(ringParts)), mats.alu);
  ring.position.set(SIGN.x, ringLocalY, SIGN.z);
  rig.add(ring);
  parts.object(ring, [b - 0.006, b + 0.006], { from: [0, 1.0, 0] });

  // ---- chain hoists: motors hang from the roof steel, chains drop to the truss.
  const hoistPoints: Array<[number, number]> = [...corners, [0, RIG.z], [0, -RIG.z], [-RIG.x, 0], [RIG.x, 0]];
  const signWires: Array<[number, number]> = [0, 1, 2].map((i) => {
    const ang = (i / 3) * Math.PI * 2 + 0.3;
    return [SIGN.x + Math.sin(ang) * (SIGN.radius - 0.05), SIGN.z + Math.cos(ang) * (SIGN.radius - 0.05)];
  });
  const motorY = 9.6;
  const motorGeo = merge([
    new THREE.BoxGeometry(0.3, 0.42, 0.26),
    new THREE.CylinderGeometry(0.09, 0.09, 0.34, 10).rotateZ(Math.PI / 2).translate(0.2, 0.05, 0),
    new THREE.BoxGeometry(0.2, 0.26, 0.2).translate(-0.05, -0.36, 0.18),
    new THREE.TorusGeometry(0.05, 0.012, 5, 10).translate(0, 0.27, 0),
  ]);
  const motorPool = parts.pool(track(motorGeo), mats.hoist, root);
  const wireTop = 18.1;
  const chainGeo = track(new THREE.CylinderGeometry(0.012, 0.012, 1, 5, 1, true).translate(0, -0.5, 0));
  const chainCount = hoistPoints.length * 2 + signWires.length;
  const chainMesh = new THREE.InstancedMesh(chainGeo, mats.chain, chainCount);
  chainMesh.frustumCulled = false;
  chainMesh.castShadow = false;
  root.add(chainMesh);
  const [k0, k1] = T.chains;
  hoistPoints.forEach(([x, z], i) => {
    motorPool.add({ p: [x, motorY, z] }, [k0 - 0.012 + i * 0.001, k0 - 0.002 + i * 0.001], { from: [0, 2, 0], ease: easeInOutCubic });
  });
  const slingPool = parts.pool(track(new THREE.TorusGeometry(0.08, 0.012, 5, 12)), mats.galv, rig, { cast: false });
  hoistPoints.forEach(([x, z], i) => slingPool.add({ p: [x, C + 0.08, z], r: [0, Math.abs(x) === RIG.x ? 0 : Math.PI / 2, 0] }, [k0 + 0.004 + i * 0.0012, k0 + 0.01 + i * 0.0012], { scaleFrom: 0.2, glint: [x, RIG.groundY + C + 0.08, z] }));

  const tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const ident = new THREE.Quaternion();
  let lastKey = -1;
  const rigY = (p: number) => RIG.groundY + (height - RIG.groundY) * easeInOutCubic(window01(p, T.rigRise[0], T.rigRise[1]));
  ctx.hooks.rigY = rigY;
  ctx.anims.push((p) => {
    const y = rigY(p);
    rig.position.y = y;
    const drop = window01(p, k0, k1);
    const key = y * 10 + drop;
    if (key === lastKey) return;
    lastKey = key;
    let index = 0;
    const set = (x: number, top: number, bottom: number, z: number, visible: boolean) => {
      const len = Math.max(0.0001, top - bottom);
      tmpM.compose(tmpP.set(x, top, z), ident, tmpS.set(visible ? 1 : 0, len, visible ? 1 : 0));
      chainMesh.setMatrixAt(index, tmpM);
      index += 1;
    };
    const motorOn = p >= k0 - 0.002;
    hoistPoints.forEach(([x, z], i) => {
      const local = Math.min(1, Math.max(0, drop * 1.3 - i * 0.04));
      const full = motorY - 0.3 - (y + C + 0.08);
      set(x, wireTop, motorY + 0.27, z, motorOn);
      set(x, motorY - 0.3, motorY - 0.3 - full * local, z, local > 0);
    });
    signWires.forEach(([x, z]) => {
      const ringTop = y + ringLocalY + 0.5;
      set(x, wireTop, ringTop, z, p >= b);
    });
    chainMesh.instanceMatrix.needsUpdate = true;
  });

  return { rig, fixtures };
}
