// Chapter 7: brand and media. LED cabinets (7 x 5 of 500 mm, dark with their
// rear frames and handles showing) fly in and lock row by row, then boot
// cleanly: one white flash, colour bars for a moment, then slow brand content.
// A large backlit fabric lightbox hangs on the upper back wall, the 3D Aratta mark mounts on standoffs on the
// tower with a halo, the wordmarks follow, and the hanging sign fabric wraps
// its ring. The tower's backlit fabric face is installed with the cladding.

import * as THREE from "three";
import { canvasTexture, drawLogo, merge, type Ctx } from "./core";
import { LOGO_BAND, LOGO_COLORS, LOGO_HEIGHT, LOGO_LETTERING, LOGO_RECTS } from "./brand-logo";
import { FLOOR_TOP } from "./floor";
import { SIGN } from "./rigging";
import { DECK, TOWER } from "./structure";
import { BOOTH_TIMELINE as T, easeInOutCubic, easeOutCubic, lightboxLevel, window01 } from "./timeline";
import { BACK_Z, WALL_TOP } from "./walls";

export const LED = { x0: 2.3, cols: 7, rows: 5, tile: 0.5, bottom: FLOOR_TOP + 0.7 };

export function buildIdentity(ctx: Ctx) {
  const { mats, root, track, rich, parts, decals, font, fa } = ctx;
  const tw = TOWER.x1 - TOWER.x0;
  const tx = (TOWER.x0 + TOWER.x1) / 2;
  const faceZ = TOWER.z1 + 0.006;

  // ---- tower: backlit fabric face (graphite print, soft warm glow, survey contours).
  const faceTex = canvasTexture(rich ? 768 : 384, rich ? 1536 : 768, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1d1f21");
    g.addColorStop(0.55, "#16181a");
    g.addColorStop(1, "#202224");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(w / 2, h * 0.36, 0, w / 2, h * 0.36, w * 0.7);
    glow.addColorStop(0, "rgba(255,214,160,0.32)");
    glow.addColorStop(1, "rgba(255,214,160,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    c.lineWidth = w * 0.0025;
    for (let i = 0; i < 22; i += 1) {
      c.strokeStyle = `rgba(224,183,90,${0.05 + (i % 4) * 0.02})`;
      c.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.62 + i * h * 0.016 + Math.sin(x / (w * 0.18) + i * 0.6) * h * 0.012 + Math.sin(x / (w * 0.07) + i) * h * 0.004;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.fillStyle = "rgba(211,168,75,0.85)";
    c.fillRect(w * 0.18, h * 0.765, w * 0.64, h * 0.0016);
  });
  track(faceTex.texture);
  const faceMat = track(new THREE.MeshStandardMaterial({ map: faceTex.texture, emissiveMap: faceTex.texture, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, roughness: 0.92, metalness: 0 }));
  const face = ctx.mesh(track(new THREE.PlaneGeometry(tw - 0.06, 5.94)), faceMat, false);
  face.position.set(tx, FLOOR_TOP + 3, faceZ);
  root.add(face);
  parts.object(face, [T.cladding[1] - 0.01, T.cladding[1]], { from: [0, 0.6, 0], scaleFrom: [1, 0.02, 1], ease: easeInOutCubic });

  // ---- the official logo as a true relief: black back plate, dark satin-metal
  // blocks standing a little lower than the brushed-brass gold, the vertical
  // ARATTA as a raised dark layer, the Persian name backlit on the gold band.
  const LW = 2.4;
  const LH = LW * LOGO_HEIGHT;
  const margin = 0.1;
  const logoY = TOWER.top - 0.25 - margin - LH / 2;
  const plateZ = faceZ + 0.025;
  const plateFront = plateZ + 0.025;
  const [m0, m1] = T.mark;
  const plateWin: [number, number] = [m0, m0 + 0.008];
  parts.compound([[ctx.rbox(LW + margin * 2, LH + margin * 2, 0.05, 0.01), mats.black]], root, { p: [tx, logoY, plateZ] }, plateWin, { from: [0, -0.3, 0.9] });
  const logoDark = track(new THREE.MeshStandardMaterial({ color: LOGO_COLORS.dark, metalness: 0.55, roughness: 0.36 }));
  const shapes = [...LOGO_RECTS.filter((r) => r.kind === "dark"), ...LOGO_RECTS.filter((r) => r.kind === "gold"), LOGO_BAND];
  shapes.forEach((r, i) => {
    const depth = r.kind === "gold" ? 0.05 : 0.03;
    const w = r.w * LW;
    const h = r.h * LW;
    const x = tx + r.x * LW;
    const y = logoY + r.y * LW;
    const s = m0 + 0.006 + i * ((m1 - m0 - 0.02) / shapes.length);
    parts.compound([[ctx.rbox(w, h, depth, 0.006), r.kind === "gold" ? mats.brass : logoDark]], root, { p: [x, y, plateFront + depth / 2] }, [s, s + 0.01], { from: [0, -0.15, 0.9], rot: [0, 0.25, 0] });
    if (r.kind === "gold") ctx.sparkles.glint([x + w / 2 - 0.02, y + h / 2 - 0.02, plateFront + depth + 0.005], s + 0.01, 0.07);
  });
  // Lettering from the official masks (white on transparent), tinted.
  const loader = new THREE.TextureLoader();
  const mask = (src: string) => {
    const t = track(loader.load(src));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const bandTextMat = track(new THREE.MeshBasicMaterial({ map: mask(LOGO_LETTERING.bandText.src), color: new THREE.Color(1.35, 1.32, 1.28), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const bandText = new THREE.Mesh(track(new THREE.PlaneGeometry(LOGO_LETTERING.bandText.w * LW, LOGO_LETTERING.bandText.h * LW)), bandTextMat);
  bandText.position.set(tx + LOGO_LETTERING.bandText.x * LW, logoY + LOGO_LETTERING.bandText.y * LW, plateFront + 0.052);
  const wordMat = track(new THREE.MeshStandardMaterial({ map: mask(LOGO_LETTERING.wordmark.src), color: LOGO_COLORS.dark, metalness: 0.55, roughness: 0.36, transparent: true, alphaTest: 0.4 }));
  const wordmark = ctx.mesh(track(new THREE.PlaneGeometry(LOGO_LETTERING.wordmark.w * LW, LOGO_LETTERING.wordmark.h * LW)), wordMat, false);
  wordmark.position.set(tx + LOGO_LETTERING.wordmark.x * LW, logoY + LOGO_LETTERING.wordmark.y * LW, plateFront + 0.012);
  root.add(bandText, wordmark);
  parts.object(wordmark, [m0 + 0.008, m0 + 0.016], { from: [0, 0, 0.4] });
  // Soft halo behind the plate, and a grazing wash from a slim LED profile above it.
  const haloTex = canvasTexture(256, 256, (c) => {
    c.filter = "blur(22px)";
    c.fillStyle = "#ffffff";
    c.fillRect(48, 48, 160, 160);
    c.filter = "none";
  }, true);
  track(haloTex.texture);
  decals.kind("halo", haloTex.texture, new THREE.Color(1.6, 1.2, 0.75), true);
  decals.add("halo", tx, logoY, faceZ + 0.004, (LW + margin * 2) * 1.5, (LH + margin * 2) * 1.5, (p) => window01(p, m1 - 0.004, m1 + 0.014) * 0.5, 0, new THREE.Euler(Math.PI / 2, 0, 0));
  ctx.bars(mats.black, root).add({ p: [tx, logoY + LH / 2 + margin + 0.06, plateFront + 0.1], s: [LW + 0.1, 0.03, 0.06] }, plateWin, { from: [0, 0.4, 0] });
  ctx.bars(mats.lamp, root, { cast: false, receive: false }).add({ p: [tx, logoY + LH / 2 + margin + 0.044, plateFront + 0.1], s: [LW + 0.06, 0.004, 0.04] }, plateWin, {});
  decals.add("ledglow", tx, logoY + LH * 0.2, plateFront + 0.054, LW + 0.1, LH * 0.75, (p) => window01(p, m1, m1 + 0.016) * 0.32, 0, new THREE.Euler(Math.PI / 2, 0, 0));

  // ---- LED wall: 7 x 5 cabinets with a visible pixel grid, black surround, plinth.
  const { cols, rows, tile } = LED;
  const ledW = cols * tile;
  const ledH = rows * tile;
  const ledX = LED.x0 + ledW / 2;
  const ledZ = BACK_Z + 0.031 + 0.02 + 0.06;
  const surround = ctx.bars(mats.black, root);
  const [lt0, lt1] = T.ledTiles;
  surround.add({ p: [ledX, LED.bottom + ledH / 2, ledZ - 0.05], s: [ledW + 0.16, ledH + 0.16, 0.04] }, [lt0 - 0.008, lt0], { from: [0, 0, 0.6] });
  const plinth = parts.pool(ctx.rbox(ledW + 0.16, 0.42, 0.55, 0.006), mats.graphite, root);
  plinth.add({ p: [ledX, FLOOR_TOP + 0.21, ledZ + 0.2] }, [lt0 - 0.01, lt0 - 0.002], { from: [0, 0, 0.9] });
  ctx.bars(mats.led, root, { cast: false, receive: false }).add({ p: [ledX, FLOOR_TOP + 0.012, ledZ + 0.48], s: [ledW + 0.1, 0.008, 0.008] }, [lt0 - 0.004, lt0], {});
  decals.add("edge", ledX, FLOOR_TOP + 0.0036, ledZ + 0.6, ledW + 0.3, 0.3, (p) => window01(p, lt0 - 0.01, lt0) * 0.5);

  const content = canvasTexture(rich ? 840 : 560, rich ? 600 : 400, () => undefined);
  track(content.texture);
  content.texture.anisotropy = 4;
  const tileGeo = new THREE.BoxGeometry(tile - 0.002, tile - 0.002, 0.08);
  const tileAttr = new THREE.InstancedBufferAttribute(new Float32Array(cols * rows * 3), 3);
  tileGeo.setAttribute("aTile", tileAttr);
  const screenMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: content.texture }, uBoot: { value: 0 }, uGrid: { value: new THREE.Vector2(cols, rows) } },
      vertexShader: /* glsl */ `
        attribute vec3 aTile;
        varying vec2 vUv;
        varying vec3 vTile;
        void main() {
          vUv = uv;
          vTile = aTile;
          vec4 p = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            p = instanceMatrix * p;
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * p;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uBoot;
        uniform vec2 uGrid;
        varying vec2 vUv;
        varying vec3 vTile;
        vec3 bars(float x) {
          float i = floor(clamp(x, 0.0, 0.999) * 7.0);
          vec3 c = vec3(0.75);
          if (i == 1.0) c = vec3(0.75, 0.75, 0.0);
          else if (i == 2.0) c = vec3(0.0, 0.75, 0.75);
          else if (i == 3.0) c = vec3(0.0, 0.75, 0.0);
          else if (i == 4.0) c = vec3(0.75, 0.0, 0.75);
          else if (i == 5.0) c = vec3(0.75, 0.0, 0.0);
          else if (i == 6.0) c = vec3(0.0, 0.0, 0.75);
          return c;
        }
        void main() {
          vec2 suv = (vTile.xy + vUv) / uGrid;
          vec3 c = texture2D(uMap, suv).rgb;
          // Pixel structure: 64 LEDs per cabinet, faded out where it would alias.
          vec2 g = vUv * 64.0;
          vec2 fw = fwidth(g);
          vec2 f = abs(fract(g) - 0.5);
          vec2 dots = smoothstep(vec2(0.5), vec2(0.5) - max(fw, vec2(0.12)), f);
          float grid = dots.x * dots.y;
          float detail = 1.0 - smoothstep(0.2, 0.5, max(fw.x, fw.y));
          float pixel = mix(1.0, 0.55 + 0.45 * grid, detail);
          // Cabinet seams.
          vec2 e = min(vUv, 1.0 - vUv);
          float seam = smoothstep(0.0, 0.01 + fwidth(vUv.x) * 1.5, min(e.x, e.y));
          // Boot: dark glass, one white flash, colour bars, then the content fades up.
          float b = uBoot;
          float flash = smoothstep(0.0, 0.05, b) * (1.0 - smoothstep(0.08, 0.18, b));
          float barsOn = smoothstep(0.14, 0.2, b) * (1.0 - smoothstep(0.4, 0.5, b));
          float content = smoothstep(0.44, 0.8, b);
          vec3 col = vec3(0.016, 0.017, 0.018) + vec3(1.5) * flash + bars(suv.x) * barsOn + c * 1.3 * content;
          col *= pixel * mix(0.6, 1.0, seam);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      toneMapped: false,
    }),
  );
  const tileMats = [mats.black, mats.black, mats.black, mats.black, screenMat, mats.black];
  const tilePool = parts.pool(track(tileGeo), tileMats, root, { cast: true });
  const order: Array<[number, number]> = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) order.push([c, r]);
  // Rear frames and handles: what you see while a cabinet flies in and before it boots.
  const rear: THREE.BufferGeometry[] = [];
  const rt = tile - 0.01;
  for (const y of [-rt / 2 + 0.015, rt / 2 - 0.015]) rear.push(new THREE.BoxGeometry(rt, 0.03, 0.03).translate(0, y, -0.055));
  for (const x of [-rt / 2 + 0.015, rt / 2 - 0.015]) rear.push(new THREE.BoxGeometry(0.03, rt, 0.03).translate(x, 0, -0.055));
  rear.push(new THREE.BoxGeometry(rt, 0.025, 0.02).translate(0, 0, -0.05));
  for (const x of [-0.12, 0.12]) {
    rear.push(new THREE.BoxGeometry(0.014, 0.1, 0.014).translate(x, 0.12, -0.1));
    rear.push(new THREE.BoxGeometry(0.014, 0.014, 0.04).translate(x, 0.17, -0.08), new THREE.BoxGeometry(0.014, 0.014, 0.04).translate(x, 0.07, -0.08));
  }
  const rearPool = parts.pool(track(merge(rear)), mats.alu, root, { cast: false });
  // Row by row from the bottom, left to right, as a rigger locks them.
  order.sort((a, b) => a[1] * 10 + a[0] - (b[1] * 10 + b[0]));
  order.forEach(([c, r]) => {
    const s = lt0 + r * ((lt1 - lt0 - 0.01) / rows) + c * 0.0009;
    const x = LED.x0 + tile * (c + 0.5);
    const y = LED.bottom + tile * (r + 0.5);
    const motion = { from: [0.15, -0.25, 1.3] as [number, number, number], rot: [0.25, -0.5, 0] as [number, number, number] };
    const index = tilePool.add({ p: [x, y, ledZ] }, [s, s + 0.007], { ...motion, glint: c === cols - 1 ? [x + tile / 2, y + tile / 2, ledZ + 0.04] : undefined });
    rearPool.add({ p: [x, y, ledZ] }, [s, s + 0.007], motion);
    tileAttr.setXYZ(index, c, r, 0);
  });

  const copy = fa
    ? { brand: "اَرَتَ", line: "نمایشگاه‌های تخصصی صنعت و معدن", sub: "کرمان · ایران", tag: "مس · فولاد · سنگ آهن" }
    : { brand: "Aratta Expo", line: "Industry & mining exhibitions", sub: "Kerman · Iran", tag: "Copper · Steel · Iron ore" };
  let lastDraw = -1;
  const drawContent = (time: number) => {
    const c = content.ctx;
    const w = content.canvas.width;
    const h = content.canvas.height;
    const s = w / 840;
    // Deep green field, fine gold survey contours drifting slowly, the mark and a headline.
    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#0b2a21");
    bg.addColorStop(1, "#06150f");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.lineWidth = 1.6 * s;
    for (let i = 0; i < 16; i += 1) {
      c.strokeStyle = `rgba(224,183,90,${0.12 + (i % 4) * 0.05})`;
      c.beginPath();
      for (let x = 0; x <= w; x += 10 * s) {
        const y = h * 0.52 + i * 13 * s + Math.sin(x / (130 * s) + time * 0.18 + i * 0.5) * 18 * s + Math.sin(x / (47 * s) + i) * 4 * s;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    const sweep = ((time * 0.06) % 1.6) - 0.3;
    const sg = c.createLinearGradient(w * (sweep - 0.2), 0, w * (sweep + 0.2), 0);
    sg.addColorStop(0, "rgba(255,200,120,0)");
    sg.addColorStop(0.5, "rgba(255,210,140,0.12)");
    sg.addColorStop(1, "rgba(255,200,120,0)");
    c.fillStyle = sg;
    c.fillRect(0, 0, w, h);
    // The official logo carries the name, so the content shows it with one line under it.
    drawLogo(c, w / 2 - 92 * s, 52 * s, 184 * s, { plate: true });
    c.fillStyle = "#f5efe3";
    c.direction = fa ? "rtl" : "ltr";
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.font = font(700, 34 * s);
    c.fillText(copy.line, w / 2, 300 * s);
    c.font = font(700, 24 * s);
    c.fillStyle = "#e0b75a";
    c.fillText(`${copy.sub}   ·   ${copy.tag}`, w / 2, 344 * s);
    content.texture.needsUpdate = true;
  };
  drawContent(0);

  // ---- hanging sign: fabric wraps the ring, printed outside, lit from inside.
  const signTex = canvasTexture(rich ? 4096 : 2048, rich ? 260 : 130, (c, w, h) => {
    c.fillStyle = "#151617";
    c.fillRect(0, 0, w, h);
    const k = h / 260;
    c.fillStyle = "#d3a84b";
    c.fillRect(0, 10 * k, w, 3 * k);
    c.fillRect(0, h - 13 * k, w, 3 * k);
    const reps = 3;
    for (let r = 0; r < reps; r += 1) {
      const x0 = (w / reps) * r;
      const cw = w / reps;
      drawLogo(c, x0 + cw * 0.05, 40 * k, 190 * k, { plate: true });
      c.fillStyle = "#f6efe2";
      c.textBaseline = "middle";
      c.textAlign = "center";
      c.direction = "rtl";
      c.font = font(700, 70 * k);
      c.fillText("نمایشگاه‌های تخصصی صنعت و معدن", x0 + cw * 0.42, 134 * k);
      c.fillStyle = "#d3a84b";
      c.fillRect(x0 + cw * 0.64, 80 * k, 4 * k, 100 * k);
      c.fillStyle = "#f6efe2";
      c.direction = "ltr";
      c.font = font(700, 54 * k);
      c.letterSpacing = `${8 * k}px`;
      c.fillText("INDUSTRY · MINING", x0 + cw * 0.82, 136 * k);
      c.letterSpacing = "0px";
    }
  });
  track(signTex.texture);
  signTex.texture.anisotropy = 8;
  const signSegs = rich ? 96 : 64;
  const signGeo = track(new THREE.CylinderGeometry(SIGN.radius, SIGN.radius, 0.96, signSegs, 1, true));
  const signMat = track(new THREE.MeshStandardMaterial({ map: signTex.texture, emissiveMap: signTex.texture, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.15, roughness: 0.9, metalness: 0, side: THREE.FrontSide }));
  const innerMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.16, 0.14), side: THREE.BackSide, toneMapped: false }));
  const sign = new THREE.Mesh(signGeo, signMat);
  const inner = new THREE.Mesh(signGeo, innerMat);
  const signY = (SIGN.top + SIGN.bottom) / 2;
  sign.position.set(SIGN.x, signY, SIGN.z);
  inner.position.copy(sign.position);
  root.add(sign, inner);

  // ---- backlit fabric lightbox on the upper back wall: deep green, gold contours, headline, mark.
  const bw = 4.8;
  const bh = WALL_TOP - DECK.top - 0.14;
  const banner = canvasTexture(rich ? 2048 : 1024, Math.round((rich ? 2048 : 1024) * (bh / bw)), (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#0c3027");
    g.addColorStop(1, "#0a241d");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
    glow.addColorStop(0, "rgba(255,240,210,0.1)");
    glow.addColorStop(1, "rgba(255,240,210,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    const k = w / 2048;
    c.lineWidth = 2 * k;
    for (let i = 0; i < 26; i += 1) {
      c.strokeStyle = `rgba(222,184,98,${0.16 + (i % 5) * 0.05})`;
      c.beginPath();
      const cx0 = w * (fa ? 0.2 : 0.8);
      const cy0 = h * 0.55;
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
        const rr = (40 + i * 26) * k * (1 + 0.12 * Math.sin(a * 3 + i * 0.7) + 0.05 * Math.sin(a * 7 + i));
        const x = cx0 + Math.cos(a) * rr * 1.7;
        const y = cy0 + Math.sin(a) * rr * 0.62;
        if (a === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    const tx0 = fa ? w * 0.93 : w * 0.07;
    const logoW = (h * 0.68) / LOGO_HEIGHT;
    drawLogo(c, fa ? tx0 - logoW : tx0, h * 0.16, logoW, { plate: true });
    c.fillStyle = "#f6efe2";
    c.direction = fa ? "rtl" : "ltr";
    c.textAlign = fa ? "right" : "left";
    c.textBaseline = "alphabetic";
    c.font = font(800, 118 * k);
    c.fillText(fa ? "از معدن تا بازار" : "From mine to market", fa ? tx0 - logoW - 70 * k : tx0 + logoW + 70 * k, h * 0.5);
    c.font = font(600, 50 * k);
    c.fillStyle = "rgba(246,239,226,0.85)";
    const tx1 = fa ? tx0 - logoW - 70 * k : tx0 + logoW + 70 * k;
    c.fillText(copy.line, tx1, h * 0.74);
    c.fillStyle = "#e0b75a";
    c.fillRect(fa ? tx1 - 520 * k : tx1, h * 0.82, 520 * k, 4 * k);
  });
  track(banner.texture);
  const bannerMat = track(new THREE.MeshStandardMaterial({ map: banner.texture, emissiveMap: banner.texture, emissive: new THREE.Color(1, 0.97, 0.92), emissiveIntensity: 0.12, roughness: 0.95, metalness: 0 }));
  const bannerZ = BACK_Z + 0.031 + 0.02 + 0.05;
  const bannerBox = new THREE.Group();
  const bannerFace = ctx.mesh(track(new THREE.PlaneGeometry(bw - 0.04, bh - 0.04)), bannerMat, false);
  bannerFace.position.z = 0.051;
  const bannerFrame = ctx.mesh(ctx.rbox(bw, bh, 0.1, 0.01), mats.aluBlack);
  bannerBox.add(bannerFrame, bannerFace);
  bannerBox.position.set((DECK.x0 + DECK.x1) / 2, DECK.top + 0.07 + bh / 2, bannerZ);
  root.add(bannerBox);
  parts.object(bannerBox, [T.slats[1] - 0.006, T.slats[1] + 0.004], { from: [0, 0.8, 0.6] });

  ctx.anims.push((p, time) => {
    const lb = lightboxLevel(p);
    faceMat.emissiveIntensity = lb * 1.15;
    const textOn = easeOutCubic(window01(p, m1 - 0.004, m1 + 0.012));
    bandTextMat.opacity = textOn * (0.9 + 0.1 * lb);
    bandText.visible = textOn > 0.001;

    const boot = window01(p, T.ledBoot[0], T.ledBoot[1]);
    screenMat.uniforms.uBoot.value = boot;
    bannerMat.emissiveIntensity = 0.12 + lb * 1.05;
    if (boot > 0.4 && time - lastDraw > 1 / 15) {
      lastDraw = time;
      drawContent(time);
    }

    const wrap = easeInOutCubic(window01(p, T.sign[0], T.sign[1]));
    const count = Math.round(wrap * signSegs) * 6;
    sign.visible = inner.visible = count > 0;
    signGeo.setDrawRange(0, count);
    const lit = window01(p, T.sign[1] - 0.004, T.sign[1] + 0.01);
    signMat.emissiveIntensity = 0.08 + lit * 1.1;
    innerMat.color.setRGB(0.12 + lit * 1.1, 0.1 + lit * 0.95, 0.09 + lit * 0.75);
  });
}
