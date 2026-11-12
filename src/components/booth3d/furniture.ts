// Chapter 8: hosting. The reception counter (stone top, backlit front with the
// mark), product vitrines with ore, copper cathodes and a steel coil, the
// coffee bar under the deck edge, the lounge and high table downstairs,
// meeting furniture upstairs and in the glass room, plants built from many
// instanced leaves, a brochure rack and a touchscreen totem.

import * as THREE from "three";
import { canvasTexture, drawMark, merge, rng, type Ctx, type Motion, type V3, type Win } from "./core";
import { FLOOR_TOP } from "./floor";
import { DECK } from "./structure";
import { BOOTH_TIMELINE as T, lightboxLevel, window01 } from "./timeline";

type Piece = [THREE.BufferGeometry, THREE.Material];

export function buildFurniture(ctx: Ctx) {
  const { mats, root, track, rich, parts, decals, font, fa } = ctx;

  /** Merge pieces per material; placed pieces join their material's batch (one draw call). */
  const compound = (pieces: Piece[]): Piece[] => {
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const [g, m] of pieces) {
      if (!byMat.has(m)) byMat.set(m, []);
      byMat.get(m)!.push(g);
    }
    return [...byMat].map(([m, list]) => [track(merge(list)), m] as Piece);
  };
  const rb = (w: number, h: number, d: number, x: number, y: number, z: number, r = 0.01, rotY = 0) => {
    const g = ctx.rbox(w, h, d, r).clone();
    if (rotY) g.rotateY(rotY);
    return g.translate(x, y, z);
  };
  const cyl = (rt: number, rbm: number, h: number, x: number, y: number, z: number, seg = rich ? 24 : 14) => new THREE.CylinderGeometry(rt, rbm, h, seg).translate(x, y, z);
  const place = (pieces: Piece[], x: number, y: number, z: number, rotY: number, win: Win, motion: Motion, cast = true) => {
    parts.compound(pieces, root, { p: [x, y, z], r: [0, rotY, 0] }, win, motion, cast);
  };
  const plane = (w: number, h: number, x: number, y: number, z: number) => new THREE.PlaneGeometry(w, h).translate(x, y, z);
  const shadow = (x: number, z: number, w: number, d: number, win: Win, strength = 0.5, y = FLOOR_TOP, rotY = 0) =>
    decals.add("blob", x, y + 0.0045, z, w, d, (p) => window01(p, win[0] + (win[1] - win[0]) * 0.6, win[1]) * strength, rotY);

  // ---- reception counter: 3 m, 1.1 m high, stone top, backlit front with the mark.
  const front = canvasTexture(1024, 384, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f4ead8");
    g.addColorStop(1, "#e8dbc2");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    drawMark(c, w / 2 - 110, h / 2 - 120, 220, "#9c7631");
    c.fillStyle = "rgba(156,118,49,0.8)";
    c.fillRect(w * 0.06, h - 18, w * 0.88, 3);
  });
  track(front.texture);
  const frontMat = track(new THREE.MeshStandardMaterial({ map: front.texture, emissiveMap: front.texture, emissive: new THREE.Color(1, 0.92, 0.8), emissiveIntensity: 0, roughness: 0.4 }));
  const counter = compound([
    [rb(3.0, 0.98, 0.56, 0, 0.08 + 0.49, -0.02, 0.02), mats.warmWhite],
    [rb(2.94, 0.08, 0.5, 0, 0.04, -0.04, 0.004), mats.black],
    [rb(3.06, 0.04, 0.68, 0, 1.08, 0.0, 0.012), mats.stone],
    [rb(3.07, 0.012, 0.012, 0, 1.054, 0.335, 0.003), mats.brass],
    [rb(2.9, 0.025, 0.36, 0, 0.74, -0.12, 0.004), mats.oakSolid],
    [rb(0.24, 0.17, 0.012, 0.9, 1.19, -0.15, 0.004), mats.black],
    [rb(0.03, 0.08, 0.06, 0.9, 1.12, -0.17, 0.004), mats.alu],
    [plane(2.92, 0.9, 0, 0.56, 0.262), frontMat],
  ]);
  const counterWin: Win = [T.counter[0], T.counter[0] + 0.016];
  place(counter, 0.5, FLOOR_TOP, 3.2, 0, counterWin, { from: [0, 0, 1.4], glint: [0.5, FLOOR_TOP + 1.1, 3.55] });
  shadow(0.5, 3.2, 3.5, 1.1, counterWin, 0.65);
  // Styling on the top: a laptop, a fan of brochures and a small vase.
  const laptopScreen = new THREE.BoxGeometry(0.33, 0.22, 0.006).translate(0, 0.11, 0).rotateX(-0.28).translate(-0.75, 1.106, -0.16);
  const counterProps = compound([
    [rb(0.33, 0.014, 0.23, -0.75, 1.107, -0.05, 0.004), mats.alu],
    [laptopScreen, mats.aluBlack],
    [rb(0.21, 0.006, 0.29, 0.25, 1.103, -0.06, 0.002), mats.warmWhite],
    [rb(0.21, 0.006, 0.29, 0.29, 1.109, -0.03, 0.002), mats.warmWhite],
    [cyl(0.045, 0.035, 0.16, 1.1, 1.18, -0.08), mats.warmWhite],
  ]);
  place(counterProps, 0.5, FLOOR_TOP, 3.2, 0, [T.counter[1] - 0.008, T.counter[1]], { from: [0, 0.4, 0] });

  // ---- vitrines: plinth, sample, glass hood, all instanced across the three.
  const vitrines: Array<[number, number]> = [
    [5.2, -1.8],
    [5.2, 0.2],
    [5.2, 2.2],
  ];
  const plinthPool = parts.pool(ctx.rbox(0.62, 0.92, 0.62, 0.02), mats.graphite, root);
  const hoodPool = parts.pool(ctx.rbox(0.58, 0.5, 0.58, 0.006), mats.glass, root, { cast: false });
  const capPool = parts.pool(ctx.rbox(0.6, 0.03, 0.6, 0.004), mats.aluBlack, root);
  const baseLed = ctx.bars(mats.led, root, { cast: false, receive: false });
  const [v0, v1] = T.vitrines;
  vitrines.forEach(([x, z], i) => {
    const s = v0 + i * 0.006;
    plinthPool.add({ p: [x, FLOOR_TOP + 0.46, z] }, [s, s + 0.012], { from: [1.2, 0, 0] });
    baseLed.add({ p: [x - 0.312, FLOOR_TOP + 0.03, z], s: [0.006, 0.008, 0.56] }, [s, s + 0.012], { from: [1.2, 0, 0] });
    hoodPool.add({ p: [x, FLOOR_TOP + 0.92 + 0.25, z] }, [v1 - 0.012 + i * 0.003, v1 - 0.002 + i * 0.003], { from: [0, 0.8, 0] });
    capPool.add({ p: [x, FLOOR_TOP + 0.92 + 0.5 + 0.015, z] }, [v1 - 0.012 + i * 0.003, v1 - 0.002 + i * 0.003], { from: [0, 0.8, 0], glint: [x, FLOOR_TOP + 1.45, z + 0.3] });
    shadow(x, z, 0.95, 0.95, [s, s + 0.012], 0.55);
    // Light from the cap onto the sample (fake).
    decals.add("pool", x, FLOOR_TOP + 0.925, z, 0.6, 0.6, (p) => lightboxLevel(p) * window01(p, v1, v1 + 0.004) * 0.6);
  });
  const sampleWin = (i: number): Win => [v0 + 0.012 + i * 0.004, v0 + 0.022 + i * 0.004];
  // Small brass-edged labels under the samples (one atlas, one mesh).
  const names = fa ? ["سنگ آهن", "کاتد مس", "کلاف فولاد"] : ["Iron ore", "Copper cathode", "Steel coil"];
  const labelTex = canvasTexture(512, 384, (c, w, h) => {
    names.forEach((name, i) => {
      const y0 = (i * h) / 3;
      c.fillStyle = "#1d2023";
      c.fillRect(0, y0, w, h / 3);
      c.fillStyle = "#d3a84b";
      c.fillRect(24, y0 + h / 3 - 22, w - 48, 3);
      c.fillStyle = "#f2ece0";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.direction = fa ? "rtl" : "ltr";
      c.font = font(700, 44);
      c.fillText(name, w / 2, y0 + h / 6 - 6);
    });
  });
  track(labelTex.texture);
  const labelGeos = vitrines.map(([x, z], i) => {
    const g = new THREE.PlaneGeometry(0.34, 0.085);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k += 1) uv.setY(k, 1 - (i + 1 - uv.getY(k)) / 3);
    return g.rotateY(Math.PI / 2).translate(x + 0.312, FLOOR_TOP + 0.78, z);
  });
  const labels = ctx.mesh(track(merge(labelGeos)), track(new THREE.MeshStandardMaterial({ map: labelTex.texture, roughness: 0.5 })), false);
  root.add(labels);
  parts.object(labels, [v1 - 0.004, v1 + 0.004], { from: [0.3, 0, 0] });
  const plinthTop = FLOOR_TOP + 0.92;
  // Ore: a cluster of faceted rocks with metallic veins.
  const r = rng(7);
  const ore: Piece[] = [[rb(0.3, 0.03, 0.22, 0, 0.015, 0, 0.004), mats.black]];
  for (let k = 0; k < 7; k += 1) {
    const g = new THREE.IcosahedronGeometry(0.05 + r() * 0.05, 0);
    g.scale(1, 0.7 + r() * 0.4, 1);
    g.rotateY(r() * 3);
    g.translate((r() - 0.5) * 0.22, 0.06 + r() * 0.04, (r() - 0.5) * 0.12);
    ore.push([g, k % 3 === 0 ? mats.oreGold : mats.ore]);
  }
  place(compound(ore), vitrines[0][0], plinthTop, vitrines[0][1], 0.4, sampleWin(0), { from: [0, 0.35, 0] });
  // Copper cathodes: four sheets standing in a slim rack.
  const cath: Piece[] = [[rb(0.34, 0.02, 0.18, 0, 0.01, 0, 0.004), mats.aluBlack]];
  for (let k = 0; k < 4; k += 1) cath.push([rb(0.3, 0.34, 0.006, 0, 0.19, -0.06 + k * 0.04, 0.002), mats.copper]);
  cath.push([rb(0.32, 0.012, 0.012, 0, 0.36, -0.06, 0.002), mats.copper]);
  place(compound(cath), vitrines[1][0], plinthTop, vitrines[1][1], -Math.PI / 2 + 0.3, sampleWin(1), { from: [0, 0.35, 0] });
  // Steel coil on its saddle, with two bands.
  const coilShape = new THREE.Shape();
  coilShape.absarc(0, 0, 0.18, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.08, 0, Math.PI * 2, true);
  coilShape.holes.push(hole);
  const coilGeo = new THREE.ExtrudeGeometry(coilShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1, curveSegments: rich ? 40 : 20 });
  coilGeo.translate(0, 0, -0.08);
  coilGeo.translate(0, 0.21, 0);
  const coil: Piece[] = [
    [coilGeo, mats.coil],
    [rb(0.34, 0.05, 0.22, 0, 0.025, 0, 0.004), mats.steel],
    [new THREE.TorusGeometry(0.185, 0.006, 4, 40).translate(0, 0.21, 0.04), mats.black],
    [new THREE.TorusGeometry(0.185, 0.006, 4, 40).translate(0, 0.21, -0.04), mats.black],
  ];
  place(compound(coil), vitrines[2][0], plinthTop, vitrines[2][1], -Math.PI / 2 + 0.25, sampleWin(2), { from: [0, 0.35, 0] });

  // ---- touchscreen totem at the front-right corner.
  const ui = canvasTexture(256, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a1416");
    g.addColorStop(1, "#16100a");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    drawMark(c, w / 2 - 40, 50, 80, "#e0b75a");
    c.fillStyle = "#f5efe3";
    c.textAlign = "center";
    c.direction = fa ? "rtl" : "ltr";
    c.font = font(800, 30);
    c.fillText(fa ? "اَرَتَ" : "Aratta Expo", w / 2, 180);
    const items = fa ? ["محصولات", "پروژه‌ها", "تماس"] : ["Products", "Projects", "Contact"];
    items.forEach((t, i) => {
      c.fillStyle = i === 0 ? "rgba(211,168,75,0.92)" : "rgba(255,255,255,0.1)";
      c.beginPath();
      c.roundRect(28, 230 + i * 78, w - 56, 58, 14);
      c.fill();
      c.fillStyle = i === 0 ? "#06100d" : "#f5efe3";
      c.font = font(700, 24);
      c.fillText(t, w / 2, 268 + i * 78);
    });
  });
  track(ui.texture);
  const uiMat = track(new THREE.MeshBasicMaterial({ map: ui.texture, toneMapped: false, color: new THREE.Color(0, 0, 0) }));
  const totem = compound([
    [rb(0.52, 1.9, 0.06, 0, 0.95 + 0.02, 0, 0.008), mats.black],
    [rb(0.4, 0.02, 0.3, 0, 0.01, 0, 0.004), mats.aluBlack],
    [plane(0.44, 0.88, 0, 1.3, 0.031), uiMat],
  ]);
  const totemWin: Win = [v1 - 0.004, v1 + 0.008];
  place(totem, 5.55, FLOOR_TOP, 4.05, -0.55, totemWin, { from: [0.6, 0, 0.8] });
  shadow(5.55, 4.05, 0.7, 0.5, totemWin, 0.55, FLOOR_TOP, -0.55);

  // ---- coffee bar under the deck edge, with back counter, machine and pendants.
  const [b0, b1] = T.bar;
  const bar = compound([
    [rb(1.8, 1.02, 0.5, 0, 0.08 + 0.51, 0, 0.016), mats.oakSolid],
    [rb(1.74, 0.08, 0.44, 0, 0.04, -0.02, 0.004), mats.black],
    [rb(1.86, 0.04, 0.6, 0, 1.08, 0.02, 0.012), mats.stone],
    [cyl(0.04, 0.032, 0.085, -0.5, 1.142, 0.1, 12), mats.warmWhite],
    [cyl(0.04, 0.032, 0.085, -0.32, 1.142, 0.14, 12), mats.warmWhite],
    [cyl(0.075, 0.075, 0.008, -0.5, 1.104, 0.1, 16), mats.warmWhite],
    [cyl(0.075, 0.075, 0.008, -0.32, 1.104, 0.14, 16), mats.warmWhite],
  ]);
  const barWin: Win = [b0, b0 + 0.012];
  place(bar, -2.0, FLOOR_TOP, -1.05, 0, barWin, { from: [0, 0, 1.2], glint: [-2.0, FLOOR_TOP + 1.1, -0.75] });
  shadow(-2.0, -1.05, 2.2, 0.9, barWin, 0.6);
  const back = compound([
    [rb(1.8, 0.88, 0.5, 0, 0.44, 0, 0.008), mats.graphite],
    [rb(1.84, 0.03, 0.54, 0, 0.895, 0, 0.004), mats.stone],
    [rb(0.42, 0.42, 0.4, -0.45, 1.12, 0, 0.02), mats.alu],
    [rb(0.36, 0.06, 0.3, -0.45, 0.95, 0.03, 0.01), mats.black],
    [cyl(0.04, 0.035, 0.09, 0.2, 0.955, 0.05), mats.warmWhite],
    [cyl(0.04, 0.035, 0.09, 0.32, 0.955, 0.05), mats.warmWhite],
    [cyl(0.04, 0.035, 0.09, 0.44, 0.955, 0.05), mats.warmWhite],
  ]);
  place(back, -2.0, FLOOR_TOP, -2.28, 0, [b0 + 0.004, b0 + 0.014], { from: [0, 0, 0.9] });
  const pendant = compound([
    [cyl(0.004, 0.004, 0.9, 0, -0.45, 0, 4), mats.black],
    [cyl(0.07, 0.07, 0.16, 0, -0.98, 0), mats.brass],
  ]);
  for (let k = 0; k < 3; k += 1) {
    place(pendant, -2.6 + k * 0.6, DECK.under, -1.05, 0, [b1 - 0.012 + k * 0.003, b1 - 0.004 + k * 0.003], { from: [0, 0.6, 0] }, false);
    ctx.sparkles.add([-2.6 + k * 0.6, DECK.under - 1.07, -1.05], 0.22, new THREE.Color(1.4, 1.05, 0.65), (p) => (p > b1 ? lightboxLevel(p) * 0.8 : 0));
  }
  // Stools: instanced seat + column + base + foot ring (bar and high table).
  const stoolSeat = parts.pool(track(new THREE.CylinderGeometry(0.19, 0.18, 0.06, rich ? 24 : 14).translate(0, 0.75, 0)), mats.leather, root);
  const stoolFrame = parts.pool(track(merge([cyl(0.022, 0.022, 0.72, 0, 0.37, 0, 8), cyl(0.21, 0.22, 0.015, 0, 0.0075, 0), new THREE.TorusGeometry(0.17, 0.008, 4, 20).rotateX(Math.PI / 2).translate(0, 0.32, 0)])), mats.alu, root);
  const stool = (x: number, z: number, win: Win, from: V3) => {
    stoolSeat.add({ p: [x, FLOOR_TOP, z] }, win, { from });
    stoolFrame.add({ p: [x, FLOOR_TOP, z] }, win, { from });
    shadow(x, z, 0.6, 0.6, win, 0.5);
  };
  for (let k = 0; k < 3; k += 1) stool(-2.6 + k * 0.6, -0.45, [b0 + 0.01 + k * 0.003, b0 + 0.02 + k * 0.003], [0, 0, 0.9]);

  // ---- lounge: round rug, sofa, two armchairs and a stone coffee table.
  const [lo0, lo1] = T.lounge;
  place([[track(new THREE.CylinderGeometry(1.35, 1.35, 0.01, rich ? 64 : 32)), mats.rug]], 0.7, FLOOR_TOP + 0.011, 0.3, 0, [lo0, lo0 + 0.008], { scaleFrom: [0.05, 1, 0.05] }, false);
  const sofa = compound([
    [rb(2.2, 0.08, 0.84, 0, 0.19, 0, 0.02), mats.fabricGraphite],
    ...[-1.0, 1.0].flatMap((x) => [-0.34, 0.34].map((z) => [cyl(0.014, 0.01, 0.15, x, 0.075, z, 8), mats.brass] as Piece)),
    [rb(1.04, 0.2, 0.68, -0.53, 0.33, 0.07, 0.05), mats.fabricCharcoal],
    [rb(1.04, 0.2, 0.68, 0.53, 0.33, 0.07, 0.05), mats.fabricCharcoal],
    [rb(1.04, 0.44, 0.2, -0.53, 0.55, -0.32, 0.06), mats.fabricCharcoal],
    [rb(1.04, 0.44, 0.2, 0.53, 0.55, -0.32, 0.06), mats.fabricCharcoal],
    [rb(0.12, 0.42, 0.86, -1.1, 0.4, 0, 0.04), mats.fabricCharcoal],
    [rb(0.12, 0.42, 0.86, 1.1, 0.4, 0, 0.04), mats.fabricCharcoal],
    [rb(0.36, 0.3, 0.1, -0.7, 0.55, -0.18, 0.05), mats.fabricTeal],
    [rb(0.36, 0.3, 0.1, 0.72, 0.55, -0.18, 0.05), mats.fabricSand],
  ]);
  const sofaWin: Win = [lo0 + 0.004, lo0 + 0.016];
  place(sofa, 0.7, FLOOR_TOP + 0.011, -0.75, 0, sofaWin, { from: [0, 0.8, 0] });
  shadow(0.7, -0.75, 2.7, 1.3, sofaWin, 0.7);
  const armchair = compound([
      [rb(0.78, 0.18, 0.74, 0, 0.36, 0, 0.05), mats.fabricSand],
      [rb(0.78, 0.4, 0.14, 0, 0.62, -0.31, 0.05), mats.fabricSand],
      [rb(0.1, 0.24, 0.66, -0.36, 0.52, 0, 0.04), mats.fabricSand],
      [rb(0.1, 0.24, 0.66, 0.36, 0.52, 0, 0.04), mats.fabricSand],
      [cyl(0.011, 0.008, 0.27, -0.32, 0.135, 0.28, 8), mats.brass],
      [cyl(0.011, 0.008, 0.27, 0.32, 0.135, 0.28, 8), mats.brass],
      [cyl(0.011, 0.008, 0.27, -0.32, 0.135, -0.28, 8), mats.brass],
      [cyl(0.011, 0.008, 0.27, 0.32, 0.135, -0.28, 8), mats.brass],
  ]);
  const chairs: Array<[number, number, number]> = [
    [-0.45, 1.25, 2.5],
    [1.85, 1.25, -2.5],
  ];
  chairs.forEach(([x, z, ry], i) => {
    const win: Win = [lo0 + 0.01 + i * 0.004, lo0 + 0.022 + i * 0.004];
    place(armchair, x, FLOOR_TOP + 0.011, z, ry, win, { from: [0, 0, 1.0] });
    shadow(x, z, 1.1, 1.1, win, 0.6);
  });
  const coffee = compound([
    [cyl(0.5, 0.5, 0.035, 0, 0.4, 0, rich ? 48 : 24), mats.stone],
    [cyl(0.12, 0.16, 0.38, 0, 0.19, 0, 16), mats.brass],
  ]);
  const coffeeWin: Win = [lo0 + 0.016, lo0 + 0.026];
  place(coffee, 0.7, FLOOR_TOP + 0.011, 0.35, 0, coffeeWin, { from: [0, 0.6, 0] });
  shadow(0.7, 0.35, 1.2, 1.2, coffeeWin, 0.55);
  // High table with stools near the products.
  const highTable = compound([
    [cyl(0.42, 0.42, 0.035, 0, 1.06, 0, rich ? 40 : 20), mats.stone],
    [cyl(0.03, 0.03, 1.04, 0, 0.53, 0, 10), mats.steel],
    [cyl(0.28, 0.3, 0.02, 0, 0.01, 0, 24), mats.steel],
  ]);
  const htWin: Win = [lo1 - 0.014, lo1 - 0.004];
  place(highTable, 3.1, FLOOR_TOP, 1.6, 0, htWin, { from: [0.8, 0, 0] });
  shadow(3.1, 1.6, 0.9, 0.9, htWin, 0.55);
  stool(3.65, 1.25, [lo1 - 0.01, lo1], [0.8, 0, 0]);
  stool(2.6, 2.05, [lo1 - 0.008, lo1 + 0.002], [0.8, 0, 0]);

  // ---- meeting room: oak table and six chairs, a screen on the back wall.
  // Chairs: a rounded upholstered shell on a slim column and a four-star base.
  const chairOf = (fabric: THREE.Material) => {
    const back = ctx.rbox(0.46, 0.4, 0.05, 0.024).clone().rotateX(-0.16).translate(0, 0.7, -0.22);
    const pieces: Piece[] = [
      [ctx.rbox(0.48, 0.06, 0.46, 0.028).clone().translate(0, 0.46, 0), fabric],
      [back, fabric],
      [cyl(0.014, 0.014, 0.4, 0, 0.23, 0, 8), mats.alu],
    ];
    for (let k = 0; k < 4; k += 1) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const foot = new THREE.Vector3(Math.sin(a) * 0.28, 0.02, Math.cos(a) * 0.28);
      pieces.push([new THREE.CylinderGeometry(0.009, 0.012, 0.29, 6).rotateZ(Math.PI / 2).rotateY(a - Math.PI / 2).translate(foot.x / 2, 0.03, foot.z / 2), mats.alu]);
      pieces.push([new THREE.SphereGeometry(0.014, 8, 6).translate(foot.x, 0.014, foot.z), mats.aluBlack]);
    }
    return compound(pieces);
  };
  const meetingChair = chairOf(mats.fabricGraphite);
  const upChair = chairOf(mats.fabricSand);
  const meetingTable = compound([
    [rb(2.0, 0.04, 0.95, 0, 0.72, 0, 0.01), mats.oakSolid],
    [rb(0.04, 0.7, 0.04, -0.85, 0.35, -0.36, 0.008), mats.steel],
    [rb(0.04, 0.7, 0.04, 0.85, 0.35, -0.36, 0.008), mats.steel],
    [rb(0.04, 0.7, 0.04, -0.85, 0.35, 0.36, 0.008), mats.steel],
    [rb(0.04, 0.7, 0.04, 0.85, 0.35, 0.36, 0.008), mats.steel],
  ]);
  const [up0, up1] = T.upstairs;
  const mWin: Win = [lo1 - 0.006, lo1 + 0.006];
  place(meetingTable, -4.5, FLOOR_TOP, -3.05, 0, mWin, { from: [0, 0.6, 0] });
  shadow(-4.5, -3.05, 2.4, 1.4, mWin, 0.55);
  [
    [-5.15, -2.35, Math.PI],
    [-4.5, -2.35, Math.PI],
    [-3.85, -2.35, Math.PI],
    [-5.15, -3.75, 0],
    [-4.5, -3.75, 0],
    [-3.85, -3.75, 0],
  ].forEach(([x, z, ry], i) => place(meetingChair, x, FLOOR_TOP, z, ry, [lo1 - 0.004 + i * 0.002, lo1 + 0.006 + i * 0.002], { from: [0, 0, ry ? 0.5 : -0.5] }));
  place([[ctx.rbox(1.4, 0.8, 0.04, 0.006), mats.black]], -4.5, FLOOR_TOP + 1.45, -4.39, 0, [lo1 - 0.01, lo1], { from: [0, 0, 0.4] });

  // ---- upstairs: a table for four for serious conversations, a sofa and side table.
  const upY = DECK.top;
  const roundTable = compound([
    [cyl(0.55, 0.55, 0.035, 0, 0.73, 0, rich ? 40 : 20), mats.oakSolid],
    [cyl(0.04, 0.04, 0.7, 0, 0.36, 0, 10), mats.steel],
    [cyl(0.3, 0.32, 0.02, 0, 0.01, 0, 20), mats.steel],
  ]);
  const rtWin: Win = [up0, up0 + 0.01];
  place(roundTable, -4.4, upY, -3.0, 0, rtWin, { from: [0, 0.8, 0] });
  shadow(-4.4, -3.0, 1.4, 1.4, rtWin, 0.5, upY);
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const x = -4.4 + Math.sin(a) * 0.8;
    const z = -3.0 + Math.cos(a) * 0.8;
    place(upChair, x, upY, z, a + Math.PI, [up0 + 0.006 + k * 0.002, up0 + 0.016 + k * 0.002], { from: [0, 0.7, 0] });
  }
  const sofa2 = compound([
    [rb(1.7, 0.08, 0.8, 0, 0.18, 0, 0.02), mats.fabricGraphite],
    ...[-0.78, 0.78].flatMap((x) => [-0.32, 0.32].map((z) => [cyl(0.012, 0.009, 0.14, x, 0.07, z, 8), mats.brass] as Piece)),
    [rb(1.6, 0.2, 0.66, 0, 0.3, 0.06, 0.05), mats.fabricSand],
    [rb(1.6, 0.42, 0.18, 0, 0.53, -0.3, 0.06), mats.fabricSand],
    [rb(0.36, 0.3, 0.1, -0.5, 0.52, -0.16, 0.05), mats.fabricCharcoal],
  ]);
  const s2Win: Win = [up0 + 0.012, up0 + 0.022];
  place(sofa2, -2.2, upY, -4.0, 0, s2Win, { from: [0, 0.8, 0] });
  shadow(-2.2, -4.0, 2.0, 1.0, s2Win, 0.55, upY);
  const side = compound([
    [cyl(0.26, 0.26, 0.03, 0, 0.5, 0, 24), mats.stone],
    [cyl(0.02, 0.02, 0.5, 0, 0.25, 0, 8), mats.brass],
    [cyl(0.18, 0.18, 0.015, 0, 0.008, 0, 20), mats.brass],
  ]);
  place(side, -2.2, upY, -3.15, 0, [up1 - 0.01, up1], { from: [0, 0.6, 0] });

  // ---- plants: many instanced leaves on stems, in graphite planters.
  const leafGeo = (() => {
    // A lance-shaped leaf with a folded midrib, 1 unit long, along +y.
    const pts: number[] = [];
    const segs = 6;
    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.16;
      const bend = t * t * 0.18;
      pts.push(-w, t, bend + w * 0.25, 0, t, bend, w, t, bend + w * 0.25);
    }
    const idx: number[] = [];
    for (let i = 0; i < segs; i += 1) {
      const a = i * 3;
      const b = a + 3;
      idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pts.length / 3) * 2), 2));
    return g;
  })();
  const leafPool = parts.pool(track(leafGeo), mats.leaf, root);
  const stemPool = parts.pool(track(new THREE.CylinderGeometry(0.006, 0.009, 1, 5).translate(0, 0.5, 0)), track(new THREE.MeshStandardMaterial({ color: "#4a3a26", roughness: 0.8 })), root, { cast: false });
  // Fluted planters: vertical ribs pressed into a tapered cylinder.
  const potGeo = new THREE.CylinderGeometry(1, 0.86, 1, rich ? 72 : 40, 1, false).translate(0, 0.5, 0);
  const pp = potGeo.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < pp.count; k += 1) {
    const x = pp.getX(k);
    const z = pp.getZ(k);
    const rr = Math.hypot(x, z);
    if (rr < 0.5) continue;
    const f = 1 + 0.035 * Math.cos(Math.atan2(z, x) * 18);
    pp.setX(k, x * f);
    pp.setZ(k, z * f);
  }
  potGeo.computeVertexNormals();
  const potPool = parts.pool(track(potGeo), mats.planter, root);
  const soilPool = parts.pool(track(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), mats.soil, root, { cast: false, receive: false });
  const leafColors = ["#2f5a35", "#3b6b3e", "#467a44", "#2a4f30", "#55854a"];
  const [pl0, pl1] = T.plants;
  const plant = (x: number, y: number, z: number, height: number, potR: number, potH: number, leaves: number, seed: number, order: number) => {
    const rr = rng(seed);
    const s = pl0 + order * ((pl1 - pl0 - 0.012) / 6);
    const win: Win = [s, s + 0.012];
    potPool.add({ p: [x, y, z], s: [potR, potH, potR] }, [s - 0.006, s], { from: [0, 0.5, 0] });
    soilPool.add({ p: [x, y + potH - 0.03, z], s: [potR * 0.92, 1, potR * 0.92] }, [s - 0.006, s], { from: [0, 0.5, 0] });
    shadow(x, z, potR * 3.2, potR * 3.2, [s - 0.006, s], 0.6, y);
    const stems = Math.max(5, Math.round(leaves / 9));
    for (let k = 0; k < stems; k += 1) {
      const ang = rr() * Math.PI * 2;
      const lean = 0.08 + rr() * 0.28;
      const len = height * (0.55 + rr() * 0.45);
      const base = new THREE.Vector3(x + Math.cos(ang) * potR * 0.3, y + potH - 0.03, z + Math.sin(ang) * potR * 0.3);
      stemPool.add({ p: [base.x, base.y, base.z], r: [Math.sin(ang) * lean, 0, -Math.cos(ang) * lean], s: [1, len, 1] }, win, { scaleFrom: [1, 0.05, 1] });
      const tip = new THREE.Vector3(0, len, 0).applyEuler(new THREE.Euler(Math.sin(ang) * lean, 0, -Math.cos(ang) * lean)).add(base);
      const per = Math.round(leaves / stems);
      for (let j = 0; j < per; j += 1) {
        const t = 0.35 + (j / per) * 0.65;
        const at = base.clone().lerp(tip, t);
        const yaw = ang + (rr() - 0.5) * 2.2;
        const pitch = 0.5 + rr() * 0.9;
        const size = (0.16 + rr() * 0.16) * (height / 1.4);
        const ls = s + (j / per) * 0.006;
        leafPool.add(
          { p: [at.x, at.y, at.z], r: [Math.cos(yaw) * pitch, yaw, Math.sin(yaw) * pitch], s: [size * 1.6, size * 2.2, size * 1.6] },
          [ls, ls + 0.008],
          { scaleFrom: 0.05, rot: [0.4, 0, 0] },
          leafColors[Math.floor(rr() * leafColors.length)],
        );
      }
    }
  };
  const L = rich ? 130 : 70;
  plant(-5.5, FLOOR_TOP, 4.0, 1.7, 0.26, 0.55, L, 101, 0);
  plant(2.55, FLOOR_TOP, 3.9, 1.3, 0.22, 0.48, Math.round(L * 0.8), 202, 1);
  plant(2.15, FLOOR_TOP, -3.45, 1.9, 0.16, 0.6, Math.round(L * 0.8), 303, 2);
  plant(-5.55, DECK.top, -4.05, 1.3, 0.22, 0.45, Math.round(L * 0.7), 404, 3);
  plant(-1.4, DECK.top, -2.85, 1.0, 0.18, 0.4, Math.round(L * 0.55), 505, 4);
  plant(-5.6, FLOOR_TOP, -4.1, 1.1, 0.18, 0.42, Math.round(L * 0.5), 606, 5);

  // ---- brochure rack: slim steel frame, angled shelves, brochures dropping in.
  const [br0] = T.brochures;
  const rack = compound([
    [rb(0.03, 1.5, 0.03, -0.22, 0.75, 0, 0.004), mats.steel],
    [rb(0.03, 1.5, 0.03, 0.22, 0.75, 0, 0.004), mats.steel],
    [rb(0.5, 0.012, 0.3, 0, 0.006, 0.05, 0.003), mats.steel],
    ...[0, 1, 2, 3].map((k) => [rb(0.44, 0.01, 0.07, 0, 0.42 + k * 0.3, 0.04, 0.002), mats.steel] as Piece),
  ]);
  const rackX = -1.75;
  const rackZ = 3.75;
  place(rack, rackX, FLOOR_TOP, rackZ, 0.35, [br0, br0 + 0.008], { from: [0, 0, 0.8] });
  shadow(rackX, rackZ, 0.7, 0.5, [br0, br0 + 0.008], 0.5);
  const cover = canvasTexture(256, 360, (c, w, h) => {
    c.fillStyle = "#1e2022";
    c.fillRect(0, 0, w, h);
    drawMark(c, w / 2 - 45, 60, 90, "#d3a84b");
    c.fillStyle = "#f1eadc";
    c.textAlign = "center";
    c.direction = fa ? "rtl" : "ltr";
    c.font = font(800, 30);
    c.fillText(fa ? "اَرَتَ" : "ARATTA", w / 2, 210);
    c.fillStyle = "rgba(211,168,75,0.9)";
    c.fillRect(40, h - 70, w - 80, 4);
  });
  track(cover.texture);
  const brochureMat = track(new THREE.MeshStandardMaterial({ map: cover.texture, roughness: 0.6 }));
  const brochurePool = parts.pool(ctx.rbox(0.19, 0.27, 0.008, 0.002), brochureMat, root, { cast: false });
  const q = new THREE.Euler();
  for (let k = 0; k < 4; k += 1) {
    for (const side of [-0.105, 0.105]) {
      const local = new THREE.Vector3(side, 0.42 + k * 0.3 + 0.135, 0.06).applyEuler(new THREE.Euler(0, 0.35, 0));
      q.set(-0.22, 0.35, 0);
      const s = br0 + 0.006 + (k * 2 + (side > 0 ? 1 : 0)) * 0.0016;
      brochurePool.add({ p: [rackX + local.x, FLOOR_TOP + local.y, rackZ + local.z], r: [q.x, q.y, q.z] }, [s, s + 0.006], { from: [0, 0.4, 0.15] });
    }
  }

  ctx.anims.push((p) => {
    const lb = lightboxLevel(p);
    frontMat.emissiveIntensity = lb * 0.9;
    uiMat.color.setScalar(window01(p, totemWin[1], totemWin[1] + 0.006) * 1.1);
  });
}
