// Physically based materials with canvas-generated maps: oak grain with
// roughness variation, carpet, brushed aluminium, powder-coated steel, stone,
// fabric weave and polished concrete. Palette: warm white and greige panels,
// oak, a graphite brand tower, brushed brass (#d3a84b), deep green as a small
// accent, and silver aluminium / galvanised steel for the build-phase frames.

import * as THREE from "three";
import { canvasTexture, rng } from "./core";

export const BRASS = "#d3a84b";
export const TEAL = "#63c9a4";
/** Aisle carpet colour per scene theme (the pile texture is neutral). */
export const AISLE = { dark: "#26343b", light: "#9e1b24" } as const;

type Track = <T extends { dispose(): void }>(item: T) => T;

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number, mono = true) {
  const image = ctx.getImageData(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    image.data[i] += n;
    image.data[i + 1] += mono ? n : (r() - 0.5) * amount;
    image.data[i + 2] += mono ? n : (r() - 0.5) * amount;
  }
  ctx.putImageData(image, 0, 0);
}

function blotches(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, seed: number, light: string, dark: string, maxR: number) {
  const r = rng(seed);
  for (let i = 0; i < count; i += 1) {
    const x = r() * w;
    const y = r() * h;
    const rad = maxR * (0.25 + r() * 0.75);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = r() > 0.5 ? light : dark;
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    // Wrap so the texture tiles without seams.
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      ctx.restore();
    }
  }
}

function repeat(texture: THREE.Texture, x: number, y: number) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(x, y);
  return texture;
}

export function createMaterials(track: Track, rich: boolean) {
  const S = rich ? 1024 : 512;
  const tex = <T extends THREE.Texture>(t: T) => track(t);

  // ---- polished concrete: dark, power-floated and sealed (8 m slabs with
  // saw-cut joints, soft mottling), with a low sheen that picks up the hall lights.
  const concreteMap = canvasTexture(S, S, (ctx, w, h) => {
    ctx.fillStyle = "#4c4e50";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 70, 11, "rgba(110,110,108,0.07)", "rgba(28,30,33,0.1)", w * 0.22);
    blotches(ctx, w, h, 260, 12, "rgba(120,118,114,0.06)", "rgba(24,26,28,0.07)", w * 0.05);
    noise(ctx, w, h, 9, 13);
    ctx.fillStyle = "rgba(18,19,21,0.85)";
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, 0, 2, h);
  });
  const concreteRough = canvasTexture(S / 2, S / 2, (ctx, w, h) => {
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 90, 14, "rgba(140,140,140,0.3)", "rgba(40,40,40,0.35)", w * 0.18);
    noise(ctx, w, h, 24, 15);
  }, true);
  const concrete = track(
    new THREE.MeshStandardMaterial({
      map: tex(repeat(concreteMap.texture, 1, 1)),
      roughnessMap: tex(repeat(concreteRough.texture, 1, 1)),
      roughness: 0.46,
      metalness: 0.0,
      envMapIntensity: 0.9,
    }),
  );

  // ---- oak planks: 2.4 m tile, 200 mm boards, staggered butt joints.
  const oakDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], seed: number, rough: boolean) => {
    const r = rng(seed);
    const rows = 12;
    const rowH = h / rows;
    ctx.fillStyle = rough ? "#808080" : `rgb(${base.join(",")})`;
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < rows; row += 1) {
      const shift = ((row * 7) % 5) * (w / 5);
      for (let col = -1; col < 2; col += 1) {
        const x0 = col * (w / 2) + shift;
        const tone = (r() - 0.5) * 26;
        if (rough) ctx.fillStyle = `rgb(${120 + tone},${120 + tone},${120 + tone})`;
        else ctx.fillStyle = `rgb(${base[0] + tone},${base[1] + tone * 0.85},${base[2] + tone * 0.7})`;
        ctx.fillRect(x0 % w, row * rowH, w / 2, rowH);
        if (x0 % w + w / 2 > w) ctx.fillRect((x0 % w) - w, row * rowH, w / 2, rowH);
        // Grain: long gently waving lines.
        const lines = 14;
        for (let i = 0; i < lines; i += 1) {
          const y = row * rowH + r() * rowH;
          const a = rough ? 0.18 : 0.06 + r() * 0.1;
          ctx.strokeStyle = rough ? `rgba(200,200,200,${a})` : r() > 0.5 ? `rgba(70,42,20,${a})` : `rgba(240,210,170,${a * 0.6})`;
          ctx.lineWidth = 0.6 + r() * 1.6;
          ctx.beginPath();
          const freq = 0.004 + r() * 0.01;
          const amp = 1 + r() * 3;
          for (let x = 0; x <= w / 2; x += 8) {
            const yy = y + Math.sin((x + r() * 2) * freq + i) * amp;
            if (x === 0) ctx.moveTo((x0 + x) % w, Math.min(row * rowH + rowH - 1, Math.max(row * rowH + 1, yy)));
            else ctx.lineTo((x0 + x) % w, Math.min(row * rowH + rowH - 1, Math.max(row * rowH + 1, yy)));
          }
          ctx.stroke();
        }
        // Butt joint.
        ctx.fillStyle = rough ? "#d0d0d0" : "rgba(40,24,12,0.55)";
        ctx.fillRect(x0 % w, row * rowH, 1.5, rowH);
      }
      ctx.fillStyle = rough ? "#d8d8d8" : "rgba(38,22,10,0.6)";
      ctx.fillRect(0, row * rowH, w, 1.5);
    }
    if (!rough) noise(ctx, w, h, 10, seed + 3);
  };
  const oakMap = canvasTexture(S, S, (ctx, w, h) => oakDraw(ctx, w, h, [176, 133, 92], 21, false));
  const oakRough = canvasTexture(S / 2, S / 2, (ctx, w, h) => oakDraw(ctx, w, h, [0, 0, 0], 21, true), true);
  const oakProps = {
    map: tex(repeat(oakMap.texture, 1, 1)),
    roughnessMap: tex(repeat(oakRough.texture, 1, 1)),
    roughness: 0.72,
    metalness: 0,
  };
  const oak = track(rich ? new THREE.MeshPhysicalMaterial({ ...oakProps, clearcoat: 0.35, clearcoatRoughness: 0.42 }) : new THREE.MeshStandardMaterial(oakProps));

  // Oak for treads and furniture: same grain, rotated, a little warmer.
  const oakSolidMap = canvasTexture(S / 2, S / 2, (ctx, w, h) => oakDraw(ctx, w, h, [164, 120, 80], 22, false));
  const oakSolid = track(new THREE.MeshStandardMaterial({ map: tex(repeat(oakSolidMap.texture, 1, 1)), roughness: 0.55, metalness: 0 }));

  // Timber slats: darker smoked oak, vertical grain.
  const slatMap = canvasTexture(S / 4, S, (ctx, w, h) => {
    const r = rng(31);
    ctx.fillStyle = "#6e4b2f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i += 1) {
      ctx.strokeStyle = r() > 0.5 ? `rgba(40,24,12,${0.1 + r() * 0.15})` : `rgba(200,160,110,${0.05 + r() * 0.08})`;
      ctx.lineWidth = 0.6 + r() * 1.4;
      const x = r() * w;
      ctx.beginPath();
      for (let y = 0; y <= h; y += 12) {
        const xx = x + Math.sin(y * 0.01 + i) * 2;
        if (y === 0) ctx.moveTo(xx, y);
        else ctx.lineTo(xx, y);
      }
      ctx.stroke();
    }
    noise(ctx, w, h, 8, 32);
  });
  const slat = track(new THREE.MeshStandardMaterial({ map: tex(slatMap.texture), roughness: 0.6, metalness: 0 }));

  // ---- carpet (charcoal inlay) and aisle carpet.
  const carpetDraw = (base: string, seed: number) =>
    canvasTexture(S / 4, S / 4, (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 36, seed);
      blotches(ctx, w, h, 30, seed + 1, "rgba(255,255,255,0.03)", "rgba(0,0,0,0.06)", w * 0.2);
    });
  const carpetMap = carpetDraw("#5f5a52", 41);
  const carpet = track(new THREE.MeshStandardMaterial({ map: tex(repeat(carpetMap.texture, 6, 6)), roughness: 1, metalness: 0 }));
  // Aisle carpet: a neutral pile texture tinted by the theme (deep petrol
  // graphite in the dark hall, a deep trade-fair red on the light opening day).
  const aisleMap = carpetDraw("#dcdcdc", 43);
  const aisle = track(new THREE.MeshStandardMaterial({ color: AISLE.dark, map: tex(repeat(aisleMap.texture, 1, 1)), roughness: 1, metalness: 0, envMapIntensity: 0.2 }));
  const rugMap = canvasTexture(S / 2, S / 2, (ctx, w, h) => {
    ctx.fillStyle = "#8a7d6c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(60,50,40,0.5)";
    ctx.lineWidth = w * 0.012;
    for (const rr of [0.47, 0.42]) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    noise(ctx, w, h, 30, 45);
  });
  const rug = track(new THREE.MeshStandardMaterial({ map: tex(rugMap.texture), roughness: 1, metalness: 0 }));

  // ---- brushed metal streaks (roughness + subtle colour).
  const brushedRough = canvasTexture(S / 2, S / 2, (ctx, w, h) => {
    const r = rng(51);
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i += 1) {
      const v = 60 + r() * 120;
      ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
      ctx.fillRect(r() * w, r() * h, 20 + r() * w * 0.6, 1);
    }
  }, true);
  repeat(brushedRough.texture, 2, 2);
  tex(brushedRough.texture);
  const alu = track(new THREE.MeshStandardMaterial({ color: "#c4c8cc", metalness: 1, roughness: 0.42, roughnessMap: brushedRough.texture }));
  const truss = track(new THREE.MeshStandardMaterial({ color: "#d3d6d9", metalness: 1, roughness: 0.34, roughnessMap: brushedRough.texture }));
  const aluBlack = track(new THREE.MeshStandardMaterial({ color: "#1d1e20", metalness: 0.7, roughness: 0.42, roughnessMap: brushedRough.texture }));
  const brassProps = { color: BRASS, metalness: 1, roughness: 0.34, roughnessMap: brushedRough.texture };
  const brass = track(rich ? new THREE.MeshPhysicalMaterial({ ...brassProps, clearcoat: 0.6, clearcoatRoughness: 0.2 }) : new THREE.MeshStandardMaterial(brassProps));

  // ---- powder-coated steel (fine orange-peel in roughness).
  const powderRough = canvasTexture(S / 4, S / 4, (ctx, w, h) => {
    ctx.fillStyle = "#909090";
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 60, 61);
  }, true);
  repeat(powderRough.texture, 4, 4);
  tex(powderRough.texture);
  const steel = track(new THREE.MeshStandardMaterial({ color: "#17181a", metalness: 0.45, roughness: 0.62, roughnessMap: powderRough.texture }));
  const galv = track(new THREE.MeshStandardMaterial({ color: "#b4b9bd", metalness: 0.8, roughness: 0.42, roughnessMap: powderRough.texture }));
  // Galvanised structural steel for the build-phase frames: mid-grey so it reads against the hall.
  const structure = track(new THREE.MeshStandardMaterial({ color: "#8f969c", metalness: 0.65, roughness: 0.46, roughnessMap: powderRough.texture }));

  // ---- wall finishes.
  const graphite = track(new THREE.MeshStandardMaterial({ color: "#3d4044", roughness: 0.72, metalness: 0.02, roughnessMap: powderRough.texture }));
  const charcoal = track(new THREE.MeshStandardMaterial({ color: "#1c1e20", roughness: 0.84, metalness: 0.02 }));
  const warmWhiteProps = { color: "#e6dfd2", roughness: 0.52, metalness: 0 };
  const warmWhite = track(rich ? new THREE.MeshPhysicalMaterial({ ...warmWhiteProps, clearcoat: 0.3, clearcoatRoughness: 0.35 }) : new THREE.MeshStandardMaterial(warmWhiteProps));
  const black = track(new THREE.MeshStandardMaterial({ color: "#09090a", roughness: 0.55, metalness: 0.2 }));
  // Raw access-floor panels: light zinc-grey, clearly lighter than the hall floor.
  const panelBoard = track(new THREE.MeshStandardMaterial({ color: "#c3c6c8", roughness: 0.62, metalness: 0.25, roughnessMap: powderRough.texture }));
  // Matt greige wall panels (the stand's main surface).
  const greigeMap = canvasTexture(S / 4, S / 4, (ctx, w, h) => {
    ctx.fillStyle = "#d8d1c4";
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 7, 91);
  });
  repeat(greigeMap.texture, 2, 2);
  const greige = track(new THREE.MeshStandardMaterial({ map: tex(greigeMap.texture), roughness: 0.86, metalness: 0 }));
  const planter = track(new THREE.MeshStandardMaterial({ color: "#cfc3ae", roughness: 0.8, metalness: 0, roughnessMap: powderRough.texture }));

  // ---- stone-look counter top.
  const stoneMap = canvasTexture(S, S / 2, (ctx, w, h) => {
    const r = rng(71);
    ctx.fillStyle = "#e9e5de";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 40, 72, "rgba(255,255,255,0.3)", "rgba(150,140,130,0.12)", w * 0.12);
    for (let i = 0; i < 14; i += 1) {
      ctx.strokeStyle = `rgba(120,112,104,${0.12 + r() * 0.2})`;
      ctx.lineWidth = 0.6 + r() * 2.2;
      ctx.beginPath();
      let x = r() * w;
      let y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 9; k += 1) {
        x += (r() - 0.3) * w * 0.12;
        y += (r() - 0.5) * h * 0.18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    noise(ctx, w, h, 6, 73);
  });
  const stoneProps = { map: tex(stoneMap.texture), roughness: 0.28, metalness: 0 };
  const stone = track(rich ? new THREE.MeshPhysicalMaterial({ ...stoneProps, clearcoat: 0.5, clearcoatRoughness: 0.15 }) : new THREE.MeshStandardMaterial(stoneProps));

  // ---- upholstery weave.
  const weave = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const v = ((x + y) / 4) % 2 ? 170 : 125;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 4, 2);
        ctx.fillStyle = `rgb(${v - 20},${v - 20},${v - 20})`;
        ctx.fillRect(x, y + 2, 2, 2);
      }
    }
    noise(ctx, w, h, 22, 81);
  });
  repeat(weave.texture, 10, 10);
  tex(weave.texture);
  const fabric = (color: string) => {
    const props = { color, map: weave.texture, roughness: 0.95, metalness: 0 };
    return track(rich ? new THREE.MeshPhysicalMaterial({ ...props, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35) }) : new THREE.MeshStandardMaterial(props));
  };
  const fabricCharcoal = fabric("#5a5d61");
  const fabricSand = fabric("#d4c3a6");
  const fabricTeal = fabric("#2f4b40"); // deep green, accent cushions only
  const fabricGraphite = fabric("#4a4d51");
  const leather = track(new THREE.MeshStandardMaterial({ color: "#6f4026", roughness: 0.48, metalness: 0 }));

  // ---- glass: transmission on the high tier, reflective transparency elsewhere.
  const glass = track(
    new THREE.MeshPhysicalMaterial({
      color: "#dfeeed",
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.2,
      envMapIntensity: 1.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const frost = track(new THREE.MeshStandardMaterial({ color: "#f4f3ee", roughness: 0.9, metalness: 0, transparent: true, opacity: 0.86, depthWrite: false }));

  // ---- emissive pieces (levels are driven by the light chapter).
  const lamp = track(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));
  const lens = track(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));
  const tealGlow = track(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));

  // ---- planting and samples.
  const leaf = track(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.62, metalness: 0, side: THREE.DoubleSide }));
  const pot = track(new THREE.MeshStandardMaterial({ color: "#2c2d2f", roughness: 0.82, metalness: 0.05, roughnessMap: powderRough.texture }));
  const soil = track(new THREE.MeshStandardMaterial({ color: "#211a14", roughness: 1, metalness: 0 }));
  const ore = track(new THREE.MeshStandardMaterial({ color: "#4a433d", roughness: 0.82, metalness: 0.35, flatShading: true }));
  const oreGold = track(new THREE.MeshStandardMaterial({ color: "#8f6a35", roughness: 0.5, metalness: 0.8, flatShading: true }));
  const copper = track(new THREE.MeshStandardMaterial({ color: "#c77a4d", roughness: 0.3, metalness: 1, roughnessMap: brushedRough.texture }));
  const coil = track(new THREE.MeshStandardMaterial({ color: "#a6acb2", roughness: 0.28, metalness: 1, roughnessMap: brushedRough.texture }));
  const cable = track(new THREE.MeshStandardMaterial({ color: "#20242a", roughness: 0.6, metalness: 0.1 }));
  const cableOrange = track(new THREE.MeshStandardMaterial({ color: "#d9692b", roughness: 0.55, metalness: 0.05 }));
  const cableBlue = track(new THREE.MeshStandardMaterial({ color: "#2f6fc0", roughness: 0.55, metalness: 0.05 }));
  const tape = track(new THREE.MeshStandardMaterial({ color: "#e9e2cf", roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 }));
  const hoist = track(new THREE.MeshStandardMaterial({ color: "#121314", roughness: 0.5, metalness: 0.4 }));
  const chain = track(new THREE.MeshStandardMaterial({ color: "#6c6e70", roughness: 0.35, metalness: 1 }));

  return {
    concrete,
    concreteMap: concreteMap.texture,
    oak,
    oakSolid,
    slat,
    carpet,
    aisle,
    rug,
    alu,
    truss,
    aluBlack,
    brass,
    steel,
    galv,
    structure,
    greige,
    planter,
    cableBlue,
    fabricGraphite,
    graphite,
    charcoal,
    warmWhite,
    black,
    panelBoard,
    stone,
    fabricCharcoal,
    fabricSand,
    fabricTeal,
    leather,
    glass,
    frost,
    lamp,
    lens,
    tealGlow,
    leaf,
    pot,
    soil,
    ore,
    oreGold,
    copper,
    coil,
    cable,
    cableOrange,
    tape,
    hoist,
    chain,
    /** LED strips: one shader, lit by a sweep that travels across the stand. */
    led: track(createLedLineMaterial()),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

/**
 * Shared materials for the hall and the neighbouring stands. Colours come from
 * per-instance colours (one batch per material), so the whole hall shell and
 * every neighbour's panels, frames and floors cost two draw calls.
 */
export function createSurroundMaterials(track: Track) {
  const matte = track(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, metalness: 0, side: THREE.DoubleSide }));
  const metal = track(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.42, metalness: 0.65 }));
  /** Self-lit pieces whose level is driven per frame (colour = level). */
  const glow = () => track(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));
  return { matte, metal, glow };
}

export type SurroundMaterials = ReturnType<typeof createSurroundMaterials>;

/** Hidden LED lines: dark until the sweep passes, then warm 3000 K. */
export function createLedLineMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSweep: { value: -4 },
      uLevel: { value: 0 },
      uColor: { value: new THREE.Color(2.4, 1.85, 1.2) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        vec4 w = modelMatrix * p;
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uSweep;
      uniform float uLevel;
      uniform vec3 uColor;
      varying vec3 vWorld;
      void main() {
        float d = (vWorld.x + 6.0) + (4.5 - vWorld.z) * 0.55 + vWorld.y * 0.35;
        float on = 1.0 - smoothstep(uSweep - 0.8, uSweep, d);
        float head = exp(-pow((d - uSweep + 0.4) * 2.2, 2.0)) * step(0.001, uLevel) * (1.0 - step(16.0, uSweep));
        vec3 base = vec3(0.035, 0.034, 0.032);
        vec3 c = base + uColor * (on * uLevel + head * 0.8);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}
