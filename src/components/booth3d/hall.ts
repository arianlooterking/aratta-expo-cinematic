// The trade hall around the stand (polished concrete, aisle carpet, service
// duct, roof steel, distant neighbours) and chapter 1: tape on the floor,
// the stand number and the plan projected onto the plot.

import * as THREE from "three";
import { canvasTexture, merge, toFa, type Ctx } from "./core";
import { BOOTH_TIMELINE as T, clamp01, easeOutCubic, hallLight, window01 } from "./timeline";
import { TEAL } from "./materials";

export const PLOT = { x0: -6, x1: 6, z0: -4.5, z1: 4.5 };

export function buildHall(ctx: Ctx) {
  const { mats, scene, track, rich, parts, font, fa } = ctx;

  // ---- floor: polished concrete, 8 m slabs.
  const floorSize = 220;
  mats.concrete.map!.repeat.set(floorSize / 8, floorSize / 8);
  mats.concrete.roughnessMap!.repeat.set(floorSize / 8, floorSize / 8);
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(floorSize, floorSize)), mats.concrete);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = ctx.shadows;
  scene.add(floor);

  // ---- aisle carpet: 4 m aisles on the three open sides.
  const carpetStrip = (x: number, z: number, w: number, d: number) => {
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, 0.008, d)), mats.aisle);
    mesh.position.set(x, 0.004, z);
    mesh.receiveShadow = ctx.shadows;
    (mats.aisle.map as THREE.Texture).repeat.set(1, 1);
    scene.add(mesh);
  };
  const aisleW = 4;
  // The front aisle is the hall's main aisle and runs deeper, so its near edge
  // stays below the closing frame instead of cutting across the closing copy.
  const mainAisleW = 9.5;
  carpetStrip(0, PLOT.z1 + 0.9 + mainAisleW / 2, 80, mainAisleW); // front aisle (leaves 0.9 m for the ramp and tape)
  carpetStrip(PLOT.x0 - 1.6 - aisleW / 2, -2, aisleW, 40);
  carpetStrip(PLOT.x1 + 1.6 + aisleW / 2, -2, aisleW, 40);
  const aisleTex = mats.aisle.map as THREE.Texture;
  aisleTex.repeat.set(20, 20);

  // ---- service duct cover behind the plot (power and data come from here).
  const duct = ctx.bars(mats.galv, scene);
  duct.place({ p: [0, 0.006, PLOT.z0 - 0.9], s: [90, 0.012, 0.6] });
  for (let x = -44; x <= 44; x += 1.2) duct.place({ p: [x, 0.0125, PLOT.z0 - 0.9], s: [0.02, 0.002, 0.58] });

  // ---- hall steel: columns (with bay numbers), roof girders, purlins and high-bay lights.
  const hallSteel = track(new THREE.MeshStandardMaterial({ color: "#6a7076", roughness: 0.6, metalness: 0.4 }));
  const steelBars = ctx.bars(hallSteel, scene, { cast: false, receive: false });
  const columns: Array<[number, number]> = [];
  // Hall columns stand well outside the camera orbit.
  for (let x = -36; x <= 36; x += 24) for (const z of [-52, 52]) columns.push([x, z]);
  for (const z of [-24, 0, 24]) for (const x of [-60, 60]) columns.push([x, z]);
  for (const [x, z] of columns) {
    steelBars.place({ p: [x, 10, z], s: [0.9, 20, 0.9] });
    steelBars.place({ p: [x, 0.15, z], s: [1.4, 0.3, 1.4] });
  }
  // Bay numbers: one atlas, one merged mesh of plates facing the stand.
  const bayNames = columns.map(([x, z]) => `${String.fromCharCode(67 + Math.round((z + 52) / 26))}${Math.round((x + 60) / 12) + 1}`);
  const cells = 4;
  const atlas = canvasTexture(1024, 512, (c, w, h) => {
    c.fillStyle = "#d9d4c4";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#1c2026";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = font(800, 92);
    bayNames.forEach((name, i) => {
      const cx = (i % cells) * (w / cells) + w / cells / 2;
      const cy = Math.floor(i / cells) * (h / cells) + h / cells / 2;
      c.fillText(name, cx, cy + 4);
    });
  });
  track(atlas.texture);
  const plates: THREE.BufferGeometry[] = [];
  columns.forEach(([x, z], i) => {
    const g = new THREE.PlaneGeometry(1.4, 0.7);
    const u0 = (i % cells) / cells;
    const v0 = 1 - (Math.floor(i / cells) + 1) / cells;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k += 1) uv.setXY(k, u0 + uv.getX(k) / cells, v0 + uv.getY(k) / cells);
    const face = Math.atan2(-x, -z);
    g.rotateY(face);
    g.translate(x - Math.sin(face) * -0.47, 5.2, z - Math.cos(face) * -0.47);
    plates.push(g);
  });
  const plateMesh = new THREE.Mesh(track(merge(plates)), track(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.7 })));
  scene.add(plateMesh);
  // Lattice roof girders every 12 m: top and bottom chords plus verticals.
  for (let z = -42; z <= 42; z += 12) {
    steelBars.place({ p: [0, 19.6, z], s: [130, 0.25, 0.3] });
    steelBars.place({ p: [0, 18.2, z], s: [130, 0.2, 0.25] });
    for (let x = -60; x <= 60; x += rich ? 3 : 6) steelBars.place({ p: [x, 18.9, z], s: [0.08, 1.4, 0.08] });
  }
  for (let x = -54; x <= 54; x += 9) steelBars.place({ p: [x, 19.85, 0], s: [0.18, 0.18, 90] });
  // High-bay fittings: a housing and a lit diffuser; bright for the build, dimmed for the show.
  const roofLightMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.1), toneMapped: false }));
  const housing = parts.pool(track(new THREE.CylinderGeometry(0.22, 0.36, 0.4, 12, 1, true).translate(0, 0.2, 0)), hallSteel, scene, { cast: false, receive: false });
  const diffuser = parts.pool(track(new THREE.CircleGeometry(0.34, 16).rotateX(Math.PI / 2)), roofLightMat, scene, { cast: false, receive: false });
  for (let z = -36; z <= 36; z += 12) {
    for (let x = -54; x <= 54; x += rich ? 6 : 9) {
      housing.place({ p: [x + 3, 17.6, z + 6] });
      diffuser.place({ p: [x + 3, 17.6, z + 6] });
      steelBars.place({ p: [x + 3, 18.0, z + 6], s: [0.02, 0.6, 0.02] });
    }
  }

  // ---- end wall behind the stand: panels, loading doors and a large hall number.
  const endWall = canvasTexture(2048, 320, (c, w, h) => {
    c.fillStyle = "#6f767d";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(0,0,0,0.12)";
    for (let x = 0; x < w; x += 28) c.fillRect(x, 0, 2, h);
    for (let i = 0; i < 6; i += 1) {
      const x = w * (0.08 + i * 0.16);
      c.fillStyle = "#3a3f45";
      c.fillRect(x, h - 96, 72, 96);
      c.fillStyle = "rgba(255,255,255,0.08)";
      for (let y = h - 92; y < h; y += 8) c.fillRect(x + 4, y, 64, 2);
      c.fillStyle = "#c9a54a";
      c.fillRect(x, h - 100, 72, 4);
    }
    c.fillStyle = "#858c93";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = font(800, 56);
    c.direction = fa ? "rtl" : "ltr";
    c.fillText(fa ? `سالن ${toFa(3)}` : "HALL 3", w * 0.22, h * 0.3);
  });
  track(endWall.texture);
  const wall = new THREE.Mesh(track(new THREE.PlaneGeometry(128, 20)), track(new THREE.MeshStandardMaterial({ map: endWall.texture, roughness: 0.85 })));
  wall.position.set(0, 10, -58);
  scene.add(wall);

  // ---- neighbour stands: white shell scheme with fascia boards, varied sizes,
  // a few with a small truss or a lit panel; desaturated so they never compete.
  const nFloor = track(new THREE.MeshStandardMaterial({ color: "#5d5a56", roughness: 0.95, metalness: 0 }));
  const nWhite = track(new THREE.MeshStandardMaterial({ color: "#9b9e9f", roughness: 0.75, metalness: 0 }));
  const nBand = track(new THREE.MeshStandardMaterial({ color: "#3b4148", roughness: 0.7, metalness: 0 }));
  const nPost = track(new THREE.MeshStandardMaterial({ color: "#9aa0a5", roughness: 0.4, metalness: 0.8 }));
  const nGlowWarm = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.66, 0.5), toneMapped: false }));
  const nGlowCool = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.62, 0.68), toneMapped: false }));
  const floors = ctx.bars(nFloor, scene, { cast: false });
  const whites = ctx.bars(nWhite, scene, { cast: false });
  const bands = ctx.bars(nBand, scene, { cast: false });
  const posts = ctx.bars(nPost, scene, { cast: false });
  const warm = ctx.bars(nGlowWarm, scene, { cast: false, receive: false });
  const cool = ctx.bars(nGlowCool, scene, { cast: false, receive: false });
  const neighbours: Array<[number, number, number, number, "panel" | "truss" | "plain", boolean]> = [
    // x, z, width, depth, feature, cool accent
    [-18, -12, 9, 6, "truss", false],
    [-9, -12, 6, 4, "plain", true],
    [18, -12, 10, 7, "panel", true],
    [9, -13, 4, 3, "plain", false],
    [-19, 15, 8, 6, "panel", true],
    [20, 15, 9, 6, "truss", false],
    [0, -22, 14, 7, "panel", false],
    [-36, 0, 10, 8, "truss", true],
    [36, 0, 10, 8, "panel", false],
    [-27, 25, 12, 7, "plain", true],
    [27, 26, 6, 4, "panel", true],
  ];
  const H = 2.5;
  for (const [x, z, w, d, feature, isCool] of neighbours) {
    const back = z < 0 ? -1 : 1; // back wall faces away from our aisle
    const front = -back;
    floors.place({ p: [x, 0.03, z], s: [w, 0.06, d] });
    whites.place({ p: [x, H / 2, z + (back * d) / 2], s: [w, H, 0.05] });
    whites.place({ p: [x - w / 2, H / 2, z], s: [0.05, H, d] });
    // Shell-scheme posts every metre on the back wall, and the fascia with a name band.
    for (let k = 0; k <= w; k += 1) posts.place({ p: [x - w / 2 + k, H / 2, z + (back * d) / 2 + front * 0.03], s: [0.03, H, 0.03] });
    whites.place({ p: [x, H + 0.15, z + (front * d) / 2], s: [w, 0.3, 0.04] });
    bands.place({ p: [x, H + 0.15, z + (front * d) / 2 + front * 0.022], s: [w * 0.4, 0.14, 0.005] });
    posts.place({ p: [x - w / 2, (H + 0.3) / 2, z + (front * d) / 2], s: [0.04, H + 0.3, 0.04] });
    posts.place({ p: [x + w / 2, (H + 0.3) / 2, z + (front * d) / 2], s: [0.04, H + 0.3, 0.04] });
    whites.place({ p: [x + w * 0.15, 0.5, z + front * d * 0.15], s: [1.6, 1.0, 0.5] });
    if (feature === "panel") (isCool ? cool : warm).place({ p: [x + w * 0.1, H * 0.6, z + (back * d) / 2 + front * 0.04], s: [Math.min(3, w * 0.4), 1.1, 0.02] });
    if (feature === "truss") {
      for (const zz of [z - d / 2 + 0.5, z + d / 2 - 0.5]) posts.place({ p: [x, 3.8, zz], s: [w - 1, 0.25, 0.25] });
      for (const xx of [x - w / 2 + 0.5, x + w / 2 - 0.5]) posts.place({ p: [xx, 3.8, z], s: [0.25, 0.25, d - 1] });
      for (let k = 0; k < 3; k += 1) (isCool ? cool : warm).place({ p: [x - w / 4 + (k * w) / 4, 3.6, z + (front * (d / 2 - 0.5))], s: [0.16, 0.12, 0.16] });
    } else (isCool ? cool : warm).place({ p: [x - w * 0.3, H - 0.05, z + (front * d) / 2 + front * 0.3], s: [0.12, 0.06, 0.12] });
  }

  ctx.anims.push((p) => {
    const h = hallLight(p);
    roofLightMat.color.setRGB(0.4 + 1.8 * h, 0.44 + 1.76 * h, 0.5 + 1.6 * h);
  });

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
