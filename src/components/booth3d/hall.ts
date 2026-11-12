// The floor of the hall around the stand (polished dark concrete, graphite
// aisle carpet with a fine light edge, the service duct behind the plot) and
// chapter 1: tape on the floor, the stand number and the plan projected onto
// the plot. The hall shell is in hall-architecture.ts, the neighbouring stands
// in neighbours.ts.

import * as THREE from "three";
import { canvasTexture, toFa, type Ctx } from "./core";
import { BOOTH_TIMELINE as T, clamp01, easeOutCubic, window01 } from "./timeline";
import { AISLE, TEAL } from "./materials";
import { onTheme } from "./theme";
import { hallPoolKind } from "./hall-architecture";
import { SURROUNDINGS as S } from "./surroundings-timeline";

export const PLOT = { x0: -6, x1: 6, z0: -4.5, z1: 4.5 };

export function buildHall(ctx: Ctx) {
  const { mats, scene, root, decals } = ctx;
  const track = ctx.track;

  // ---- floor: polished concrete, 8 m slabs.
  const floorSize = 220;
  mats.concrete.map!.repeat.set(floorSize / 8, floorSize / 8);
  mats.concrete.roughnessMap!.repeat.set(floorSize / 8, floorSize / 8);
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(floorSize, floorSize)), mats.concrete);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = ctx.shadows;
  scene.add(floor);

  // ---- aisle carpet: the deep main aisle in front, side aisles, the cross aisle
  // behind the plot and the long aisle between the rear stands. Each strip has a
  // fine light edge (it joins the tape batch).
  const carpet = (x: number, z: number, w: number, d: number) => {
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, 0.008, d)), mats.aisle);
    mesh.position.set(x, 0.004, z);
    mesh.receiveShadow = ctx.shadows;
    scene.add(mesh);
  };
  const edges = ctx.bars(mats.tape, root, { cast: false });
  const edge = (x: number, z: number, w: number, d: number) => edges.place({ p: [x, 0.0095, z], s: [w, 0.002, d] });
  const strip = (x0: number, x1: number, z0: number, z1: number, sides: { n?: boolean; s?: boolean; e?: boolean; w?: boolean } = {}) => {
    carpet((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0);
    const lw = 0.035;
    if (sides.n !== false) edge((x0 + x1) / 2, z0 + lw, x1 - x0, lw);
    if (sides.s !== false) edge((x0 + x1) / 2, z1 - lw, x1 - x0, lw);
    if (sides.w !== false) edge(x0 + lw, (z0 + z1) / 2, lw, z1 - z0);
    if (sides.e !== false) edge(x1 - lw, (z0 + z1) / 2, lw, z1 - z0);
  };
  // The front aisle is the hall's main aisle and runs deeper, so its near edge
  // stays below the closing frame instead of cutting across the closing copy.
  const mainAisleW = 9.5;
  const front = PLOT.z1 + 0.9; // leaves 0.9 m for the ramp and tape
  strip(-40, 40, front, front + mainAisleW, { w: false, e: false });
  strip(-11.6, -7.6, -8.6, front, { s: false });
  strip(7.6, 11.6, -8.6, front, { s: false });
  strip(-24, 24, -8.6, -5.8, { w: false, e: false });
  strip(1.2, 4.8, -32, -8.6, { s: false });
  (mats.aisle.map as THREE.Texture).repeat.set(20, 20);
  // Theme: carpet colour, and a lighter power-floated floor on the light opening day.
  onTheme(ctx, (theme) => {
    mats.aisle.color.set(theme === "light" ? AISLE.light : AISLE.dark);
    mats.concrete.color.setScalar(theme === "light" ? 1.85 : 1);
  });

  // ---- service duct cover behind the plot (power and data come from here).
  const duct = ctx.bars(mats.galv, scene);
  duct.place({ p: [0, 0.006, PLOT.z0 - 0.9], s: [48, 0.012, 0.6] });
  for (let x = -23.4; x <= 23.4; x += 1.2) duct.place({ p: [x, 0.0125, PLOT.z0 - 0.9], s: [0.02, 0.002, 0.58] });

  // ---- the empty plot waits in a pool of light until the raised floor covers it.
  hallPoolKind(ctx);
  const plotPool = (p: number) => 1 - window01(p, S.plotPool[0], S.plotPool[1]);
  const k = ctx.rich ? 1 : 0.7;
  decals.add("hallpool", 0, 0.0045, 0, 17, 13.5, (p) => plotPool(p) * 0.36 * k);
  decals.add("hallpool", 0, 0.005, 0.4, 30, 24, (p) => plotPool(p) * 0.14 * k);

  buildPlot(ctx);
}

function buildPlot(ctx: Ctx) {
  const { mats, root, track, fa, rich, font } = ctx;
  const { x0, x1, z0, z1 } = PLOT;

  // ---- 50 mm tape, laid edge by edge from the front-left corner.
  const tape = ctx.bars(mats.tape, root, { cast: false });
  const w = 0.05;
  const t0 = T.tape[0];
  const span = (T.tape[1] - T.tape[0]) / 4;
  const edges: Array<{ p: [number, number, number]; s: [number, number, number]; from: [number, number, number] }> = [
    { p: [0, 0.002, z1], s: [12 + w, 0.003, w], from: [-6, 0, 0] },
    { p: [x1, 0.002, 0], s: [w, 0.003, 9 + w], from: [0, 0, 4.5] },
    { p: [0, 0.002, z0], s: [12 + w, 0.003, w], from: [6, 0, 0] },
    { p: [x0, 0.002, 0], s: [w, 0.003, 9 + w], from: [0, 0, -4.5] },
  ];
  edges.forEach((edge, i) => {
    const alongX = edge.s[0] > 1;
    tape.add({ p: edge.p, s: edge.s }, [t0 + span * i, t0 + span * (i + 1)], {
      from: edge.from,
      scaleFrom: alongX ? [0.0001, 1, 1] : [1, 1, 0.0001],
      ease: (t) => t,
    });
  });
  // Corner crosses, each with a glint as the tape closes on it.
  const corners: Array<[number, number]> = [
    [x0, z1],
    [x1, z1],
    [x1, z0],
    [x0, z0],
  ];
  corners.forEach(([x, z], i) => {
    const at = t0 + span * (i + 1) - span * 0.2;
    const win: [number, number] = [at - 0.004, at];
    tape.add({ p: [x, 0.0025, z], s: [0.5, 0.003, w * 0.8] }, win, { scaleFrom: [0.2, 1, 1], glint: [x, 0.05, z] });
    tape.add({ p: [x, 0.0025, z], s: [w * 0.8, 0.003, 0.5] }, win, { scaleFrom: [1, 1, 0.2] });
  });

  // ---- stand number stencilled in the aisle and on a floor plate.
  const label = canvasTexture(1024, 256, (c, cw, ch) => {
    c.fillStyle = "rgba(0,0,0,0)";
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = "rgba(233,226,207,0.95)";
    c.textBaseline = "middle";
    c.font = font(800, 120);
    c.textAlign = "left";
    c.direction = "ltr";
    c.fillText("B12", 24, 120);
    c.font = font(700, 54);
    c.textAlign = "right";
    c.direction = fa ? "rtl" : "ltr";
    c.fillText(fa ? `سالن ${toFa(3)} · ${toFa(108)} متر مربع` : "HALL 3 · 108 m²", cw - 24, 92);
    c.font = font(600, 40);
    c.fillStyle = "rgba(233,226,207,0.6)";
    c.fillText(fa ? "سه طرف باز" : "PENINSULA · 3 SIDES OPEN", cw - 24, 170);
  });
  track(label.texture);
  const numberMat = track(new THREE.MeshBasicMaterial({ map: label.texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  const number = new THREE.Mesh(track(new THREE.PlaneGeometry(3.2, 0.8)), numberMat);
  number.rotation.x = -Math.PI / 2;
  number.position.set(x0 + 1.9, 0.003, z1 + 0.5);
  root.add(number);

  // ---- the plan, projected onto the plot (zones, dimensions, visitor path).
  const ppm = rich ? 128 : 72;
  const area = { x0: -8, z0: -6.5, w: 16, d: 13.5 };
  const L = fa
    ? {
        meeting: "اتاق جلسه",
        store: "انبار",
        bar: "قهوه",
        stair: "پله",
        deck: "طبقهٔ بالا (۱۵ متر مربع)",
        tower: "برج برند",
        led: "ویدئووال",
        products: "نمونهٔ محصول",
        lounge: "نشیمن",
        reception: "پذیرش",
        ramp: "رمپ",
        width: "۱۲ متر",
        depth: "۹ متر",
        open: "باز",
        closed: "دیوار پشت",
      }
    : {
        meeting: "Meeting room",
        store: "Store",
        bar: "Coffee bar",
        stair: "Stair",
        deck: "Upper deck above (15 m²)",
        tower: "Brand tower",
        led: "LED wall",
        products: "Products",
        lounge: "Lounge",
        reception: "Reception",
        ramp: "Ramp",
        width: "12 m",
        depth: "9 m",
        open: "open",
        closed: "closed back",
      };
  const plan = canvasTexture(area.w * ppm, area.d * ppm, (c) => {
    const X = (x: number) => (x - area.x0) * ppm;
    const Z = (z: number) => (z - area.z0) * ppm;
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    const line = (alpha: number, width: number) => {
      c.strokeStyle = `rgba(160,240,215,${alpha})`;
      c.lineWidth = width;
    };
    // 1 m module grid.
    line(0.18, ppm * 0.012);
    c.beginPath();
    for (let x = x0; x <= x1 + 1e-6; x += 1) {
      c.moveTo(X(x), Z(z0));
      c.lineTo(X(x), Z(z1));
    }
    for (let z = z0; z <= z1 + 1e-6; z += 1) {
      c.moveTo(X(x0), Z(z));
      c.lineTo(X(x1), Z(z));
    }
    c.stroke();
    // Plot outline: closed back drawn heavy, open sides light.
    line(0.95, ppm * 0.05);
    c.beginPath();
    c.moveTo(X(x0), Z(z0));
    c.lineTo(X(x1), Z(z0));
    c.stroke();
    line(0.7, ppm * 0.02);
    c.strokeRect(X(x0), Z(z0), 12 * ppm, 9 * ppm);
    const text = (s: string, x: number, z: number, size: number, alpha = 0.95, weight = 700) => {
      c.fillStyle = `rgba(225,250,240,${alpha})`;
      c.font = font(weight, size * ppm);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.direction = fa ? "rtl" : "ltr";
      c.fillText(s, X(x), Z(z));
    };
    const zone = (x0z: number, z0z: number, x1z: number, z1z: number, name: string, fill = 0.08, dashed = true, size = 0.26) => {
      c.fillStyle = `rgba(99,201,164,${fill})`;
      c.fillRect(X(x0z), Z(z0z), (x1z - x0z) * ppm, (z1z - z0z) * ppm);
      line(0.85, ppm * 0.018);
      c.setLineDash(dashed ? [ppm * 0.16, ppm * 0.1] : []);
      c.strokeRect(X(x0z), Z(z0z), (x1z - x0z) * ppm, (z1z - z0z) * ppm);
      c.setLineDash([]);
      if (name) text(name, (x0z + x1z) / 2, (z0z + z1z) / 2, size);
    };
    zone(-6, -4.5, -3, -1.5, L.meeting, 0.12, false);
    zone(-3, -4.5, -1, -2.6, L.store, 0.06, false, 0.22);
    zone(-3, -2.6, -1, -0.2, L.bar, 0.06, true, 0.22);
    zone(-1, -4.5, 2, -3.9, L.tower, 0.14, false, 0.2);
    zone(2.3, -4.5, 5.8, -4.2, L.led, 0.14, false, 0.16);
    zone(4.4, -2.8, 6, 3, L.products, 0.05, true, 0.24);
    zone(-1, 2.7, 2, 3.7, L.reception, 0.12, false, 0.24);
    zone(3.6, 4.5, 5.1, 5.7, L.ramp, 0.1, false, 0.2);
    // Stair: hatched with tread lines.
    zone(-5.9, -1.5, -4.9, 2.9, "", 0.08, false);
    line(0.6, ppm * 0.01);
    c.beginPath();
    for (let z = -1.5; z <= 2.9 + 1e-6; z += 0.275) {
      c.moveTo(X(-5.9), Z(z));
      c.lineTo(X(-4.9), Z(z));
    }
    c.stroke();
    text(L.stair, -5.4, 0.7, 0.22);
    // Upper deck outline above the block.
    line(0.9, ppm * 0.02);
    c.setLineDash([ppm * 0.3, ppm * 0.12, ppm * 0.05, ppm * 0.12]);
    c.strokeRect(X(-6) + 6, Z(-4.5) + 6, 5 * ppm - 12, 3 * ppm - 12);
    c.setLineDash([]);
    text(L.deck, -3.5, -1.85, 0.2, 0.8, 600);
    // Lounge: round rug.
    c.beginPath();
    c.arc(X(0.7), Z(0.3), 1.35 * ppm, 0, Math.PI * 2);
    c.fillStyle = "rgba(99,201,164,0.08)";
    c.fill();
    line(0.85, ppm * 0.018);
    c.setLineDash([ppm * 0.16, ppm * 0.1]);
    c.stroke();
    c.setLineDash([]);
    text(L.lounge, 0.7, 0.3, 0.26);
    // Dimension lines with ticks.
    const dim = (ax: number, az: number, bx: number, bz: number, s: string) => {
      line(0.95, ppm * 0.02);
      c.beginPath();
      c.moveTo(X(ax), Z(az));
      c.lineTo(X(bx), Z(bz));
      const vertical = ax === bx;
      for (const [px, pz] of [
        [ax, az],
        [bx, bz],
      ]) {
        if (vertical) {
          c.moveTo(X(px) - ppm * 0.2, Z(pz));
          c.lineTo(X(px) + ppm * 0.2, Z(pz));
        } else {
          c.moveTo(X(px), Z(pz) - ppm * 0.2);
          c.lineTo(X(px), Z(pz) + ppm * 0.2);
        }
      }
      c.stroke();
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      c.save();
      c.translate(X(mx), Z(mz));
      if (vertical) c.rotate(-Math.PI / 2);
      c.font = font(800, 0.42 * ppm);
      const wText = c.measureText(s).width + ppm * 0.4;
      c.clearRect(-wText / 2, -0.3 * ppm, wText, 0.6 * ppm);
      c.fillStyle = "rgba(230,252,244,1)";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.direction = fa ? "rtl" : "ltr";
      c.fillText(s, 0, 0);
      c.restore();
    };
    dim(x0, z1 + 1.5, x1, z1 + 1.5, L.width);
    dim(x1 + 1.2, z0, x1 + 1.2, z1, L.depth);
    // Open / closed annotations.
    text(L.closed, 0, z0 - 0.35, 0.2, 0.75, 600);
  });
  track(plan.texture);
  const planMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: plan.texture }, uReveal: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(TEAL).multiplyScalar(1.4) } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform float uReveal; uniform float uOpacity; uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(uMap, vUv);
          float d = length((vUv - vec2(0.12, 0.0)) * vec2(1.18, 1.0));
          float shown = 1.0 - smoothstep(uReveal - 0.04, uReveal, d);
          float scan = exp(-pow((d - uReveal) * 40.0, 2.0)) * step(uReveal, 1.6) * 0.35;
          vec3 c = t.rgb * t.a * shown + uColor * scan * 0.5;
          gl_FragColor = vec4(c * uOpacity, 1.0);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  const planMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(area.w, area.d)), planMat);
  planMesh.rotation.x = -Math.PI / 2;
  planMesh.position.set(area.x0 + area.w / 2, 0.012, area.z0 + area.d / 2);
  planMesh.renderOrder = 3;
  root.add(planMesh);

  // Visitor path: chevrons flowing in from the front aisle, through reception, past the products.
  const chevrons = canvasTexture(256, 64, (c) => {
    c.strokeStyle = "rgba(242,210,140,0.95)";
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(16, 32);
    c.lineTo(150, 32);
    c.moveTo(176, 14);
    c.lineTo(206, 32);
    c.lineTo(176, 50);
    c.stroke();
  });
  chevrons.texture.wrapS = THREE.RepeatWrapping;
  track(chevrons.texture);
  const pathMat = track(new THREE.MeshBasicMaterial({ map: chevrons.texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.2, 0.03, 8.5),
    new THREE.Vector3(2.8, 0.03, 4.6),
    new THREE.Vector3(2.6, 0.03, 2.2),
    new THREE.Vector3(3.6, 0.03, -0.4),
    new THREE.Vector3(2.4, 0.03, -2.6),
    new THREE.Vector3(-0.6, 0.03, -1.0),
    new THREE.Vector3(-4.2, 0.03, 0.6),
  ]);
  const path = new THREE.Mesh(track(ribbon(curve, 0.26, 120)), pathMat);
  path.renderOrder = 4;
  root.add(path);

  ctx.anims.push((p, time) => {
    numberMat.opacity = easeOutCubic(window01(p, T.standNumber[0], T.standNumber[1])) * 0.9;
    number.visible = numberMat.opacity > 0.001;
    const on = window01(p, T.plan[0], T.plan[1]);
    const off = 1 - window01(p, T.planOut[0], T.planOut[1]);
    const level = Math.min(1, on * 3) * off;
    planMat.uniforms.uReveal.value = easeOutCubic(on) * 1.7;
    planMat.uniforms.uOpacity.value = level;
    planMesh.visible = level > 0.001;
    pathMat.opacity = clamp01((on - 0.55) * 3) * off;
    path.visible = pathMat.opacity > 0.001;
    chevrons.texture.offset.x = -time * 0.4;
  });
}

/** A flat ribbon that follows a curve, with UVs running along it. */
export function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, segments: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3();
  const length = curve.getLength();
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    side.crossVectors(up, tangent).normalize().multiplyScalar(width / 2);
    positions.push(point.x + side.x, point.y, point.z + side.z, point.x - side.x, point.y, point.z - side.z);
    uvs.push((t * length) / 1.1, 1, (t * length) / 1.1, 0);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
