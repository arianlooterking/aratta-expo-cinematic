// A real-time 3D exhibition stand that assembles itself as the visitor scrolls:
// a 12 x 9 m peninsula with a two-storey block, built from real construction
// parts in the real order (plan, rigging, raised floor, structure, walls,
// power and light, brand and media, hosting). Everything is procedural (no
// model files). The React hero owns scroll; this module turns a 0..1 progress
// into a frame. Modules: materials, hall, rigging, floor, structure, walls,
// light, identity, furniture, site (build-day props), camera.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { canvasTexture, createCtx, MARK_BLOCKS } from "./core";
import { createMaterials } from "./materials";
import { buildHall } from "./hall";
import { buildRigging } from "./rigging";
import { buildFloor } from "./floor";
import { buildStructure } from "./structure";
import { buildWalls } from "./walls";
import { buildLight } from "./light";
import { buildIdentity } from "./identity";
import { buildFurniture } from "./furniture";
import { buildSite } from "./site";
import { createCameraRig } from "./camera";
import { clamp01 } from "./timeline";

export type BoothQuality = "auto" | "high" | "low";

export type BoothSceneOptions = {
  lang: "fa" | "en";
  compact: boolean; // phones: lighter renderer, portrait framing
  fontFamily: string;
  onFrame?: (progress: number) => void;
  /** "auto" picks from `compact` and a short frame-time probe. */
  quality?: BoothQuality;
};

export type BoothScene = {
  setTarget(progress: number, immediate?: boolean): void;
  setPointer(x: number, y: number): void;
  setActive(active: boolean): void;
  resize(): void;
  dispose(): void;
};

/** Rendering tiers: high = composer + bloom + shadows + transmission; mid = shadows; low = phones. */
export type BoothTier = "high" | "mid" | "low";

// Hall air: lit grey-blue while the stand is built, dimmed (never black) for the show.
const HALL = new THREE.Color("#3a4148");
// Keep the brand geometry referenced here too: the mark is the same in every module.
void MARK_BLOCKS;

/** A grey hall with bright roof strips and a lit floor, for image-based lighting. */
function hallEnvironment() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(80, 30, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.17, 0.18), side: THREE.BackSide }));
  room.position.y = 14;
  env.add(room);
  const strip = (w: number, d: number, x: number, y: number, z: number, color: THREE.Color, rotX = Math.PI / 2, rotY = 0) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, 0);
    env.add(mesh);
  };
  for (let i = -2; i <= 2; i += 1) strip(28, 0.9, 0, 26, i * 7, new THREE.Color(5.5, 5.3, 5.0));
  strip(10, 4, -26, 8, 0, new THREE.Color(3.2, 2.6, 1.9), 0, Math.PI / 2);
  strip(10, 4, 26, 9, -4, new THREE.Color(2.0, 2.2, 2.4), 0, -Math.PI / 2);
  strip(18, 3, 0, 7, -30, new THREE.Color(1.6, 1.4, 1.2), 0, 0);
  strip(60, 60, 0, -0.5, 0, new THREE.Color(0.22, 0.22, 0.21));
  return env;
}

export async function createBoothScene(canvas: HTMLCanvasElement, options: BoothSceneOptions): Promise<BoothScene> {
  const { compact, lang } = options;
  const fa = lang === "fa";
  const quality = options.quality ?? "auto";
  const font = (weight: number, px: number) => `${weight} ${px}px ${options.fontFamily}`;
  try {
    await Promise.race([document.fonts.load(font(800, 64), fa ? "اَرَتَ" : "Aratta"), new Promise((resolve) => setTimeout(resolve, 1500))]);
  } catch {
    // fonts API missing: canvas falls back to system fonts
  }

  // Desktop builds the rich stand (bigger maps, more leaves, real shadows);
  // phones build the light one. The runtime tier can then only step down.
  const rich = quality === "high" || (quality === "auto" && !compact);
  let tier: BoothTier = rich ? "high" : "low";

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !rich ? window.devicePixelRatio < 2 : true,
    alpha: false,
    powerPreference: "high-performance",
  });
  const maxDpr = compact ? 1.6 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = compact ? 1.1 : 1.22;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = !compact && rich;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(HALL, 1);

  const scene = new THREE.Scene();
  scene.background = HALL.clone();
  scene.fog = new THREE.FogExp2(HALL.clone(), 0.0115);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = hallEnvironment();
  const envTexture = pmrem.fromScene(envScene, 0.03).texture;
  envScene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  scene.environment = envTexture;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 240);
  const disposables: Array<{ dispose(): void }> = [envTexture, pmrem];
  const track = <T extends { dispose(): void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  scene.add(root);
  const mats = createMaterials(track, rich);
  const ctx = createCtx({ scene, root, rich, compact, fa, font, track, mats, shadows: renderer.shadowMap.enabled });

  // Decal masks: soft contact blob, linear wall-foot gradient, light pool.
  const blob = canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#d8d8d8");
    g.addColorStop(0.5, "#6a6a6a");
    g.addColorStop(1, "#000000");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, true);
  const edge = canvasTexture(64, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, "#5a5a5a");
    g.addColorStop(1, "#000000");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const fade = c.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(0.06, "rgba(0,0,0,0)");
    fade.addColorStop(0.94, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    c.fillStyle = fade;
    c.fillRect(0, 0, w, h);
  }, true);
  const pool = canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.4, "#7a7a7a");
    g.addColorStop(0.75, "#1c1c1c");
    g.addColorStop(1, "#000000");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, true);
  for (const t of [blob, edge, pool]) track(t.texture);
  ctx.decals.kind("blob", blob.texture, "#000000", false);
  ctx.decals.kind("edge", edge.texture, "#000000", false);
  ctx.decals.kind("pool", pool.texture, new THREE.Color(1.0, 0.78, 0.5), true);
  ctx.decals.kind("ledglow", edge.texture, new THREE.Color(1.0, 0.78, 0.5), true);

  // ---- build the stand in its real order.
  buildHall(ctx);
  buildSite(ctx);
  buildRigging(ctx);
  buildFloor(ctx);
  buildStructure(ctx);
  buildWalls(ctx);
  const light = buildLight(ctx, { realSpots: rich });
  buildIdentity(ctx);
  buildFurniture(ctx);
  ctx.parts.finalize();
  ctx.decals.finalize();
  track(ctx.sparkles.finalize(root));

  // Glass: real transmission on the high tier only.
  const setGlass = (transmission: boolean) => {
    const g = mats.glass;
    g.transmission = transmission ? 1 : 0;
    g.thickness = transmission ? 0.01 : 0;
    g.ior = 1.5;
    g.opacity = transmission ? 1 : 0.2;
    g.transparent = !transmission;
    g.depthWrite = false;
    g.roughness = transmission ? 0.02 : 0.04;
    g.needsUpdate = true;
  };
  setGlass(tier === "high");

  // ---- post: MSAA target, subtle bloom, output (tone mapping + sRGB).
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  const buildComposer = () => {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.32, 0.55, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  };
  const dropComposer = () => {
    composer?.renderTarget1.dispose();
    composer?.renderTarget2.dispose();
    bloom?.dispose();
    composer?.dispose();
    composer = null;
    bloom = null;
  };
  if (tier === "high") buildComposer();

  const stepDown = () => {
    if (tier === "high") {
      tier = "mid";
      dropComposer();
      setGlass(false);
    } else if (tier === "mid") {
      tier = "low";
      renderer.shadowMap.enabled = false;
      light.setShadows(false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      scene.traverse((o) => {
        if ((o as THREE.Mesh).material) {
          const m = (o as THREE.Mesh).material;
          for (const mm of Array.isArray(m) ? m : [m]) mm.needsUpdate = true;
        }
      });
      resize();
    }
    canvas.dataset.tier = tier;
  };
  canvas.dataset.tier = tier;

  const rig = createCameraRig(camera, fa);
  const pointer = new THREE.Vector2();
  let width = 1;
  let height = 1;
  let frame = 0;
  let active = true;
  let disposed = false;
  let target = 0;
  let current = 0;
  let last = performance.now();
  let elapsed = 0;
  let lastRender = 0;
  let lastShadowAt = -1;
  let pointerAt = -1e9;
  let frozen = false;
  // Frame-time probe: render every frame for a short window and step down if slow.
  let probeFrames = 0;
  let probeTime = 0;
  let probeSkip = 8;
  const PROBE_DONE = 1e9;
  const probing = () => quality === "auto" && tier !== "low" && probeFrames < PROBE_DONE;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = rig.fov(camera.aspect);
    camera.updateProjectionMatrix();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (composer) {
      composer.setPixelRatio(1);
      composer.setSize(size.x, size.y);
    }
    ctx.sparkles.material.uniforms.uScale.value = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  };

  const draw = (p: number, time: number) => {
    for (const anim of ctx.anims) anim(p, time);
    ctx.parts.update(p);
    ctx.decals.update(p);
    ctx.sparkles.update(p, time);
    rig.apply(p, time, width, height, pointer);
    if (renderer.shadowMap.enabled && p !== lastShadowAt) {
      renderer.shadowMap.needsUpdate = true;
      lastShadowAt = p;
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
    options.onFrame?.(p);
  };

  const render = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    const rawDt = now - last;
    last = now;
    elapsed += dt;
    const before = current;
    current += (target - current) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(target - current) < 0.00005) current = target;
    const moving = before !== current || now - pointerAt < 1500;
    const probe = probing();
    // Settled frames still animate the LED wall and the sign, at a gentler rate.
    if (probe || moving || now - lastRender > 1000 / 30) {
      lastRender = now;
      draw(current, elapsed);
      if (probe) {
        if (probeSkip > 0) probeSkip -= 1;
        else {
          probeFrames += 1;
          probeTime += rawDt;
          // Decide after 45 frames, or sooner (3+ frames) when 1.5 s has already gone by.
          if (probeFrames >= 45 || (probeFrames >= 3 && probeTime > 1500)) {
            const avg = probeTime / probeFrames;
            if (avg > 1000 / 36 && tier !== "low") {
              stepDown();
              probeFrames = 0;
              probeTime = 0;
              probeSkip = 4;
            } else probeFrames = PROBE_DONE;
          }
        }
      }
    }
  };

  const loop = (now: number) => {
    if (disposed) return;
    if (active && !frozen) render(now);
    frame = requestAnimationFrame(loop);
  };

  resize();
  draw(0, 0);
  renderer.compile(scene, camera);
  frame = requestAnimationFrame(loop);

  if (new URLSearchParams(window.location.search).has("booth-debug")) {
    (window as unknown as { __booth: unknown }).__booth = {
      renderer,
      scene,
      get tier() {
        return tier;
      },
      freeze(value: boolean) {
        frozen = value;
      },
      measure(p: number) {
        current = target = clamp01(p);
        renderer.info.autoReset = false;
        renderer.info.reset();
        const t0 = performance.now();
        draw(current, elapsed);
        renderer.getContext().finish();
        const ms = Math.round(performance.now() - t0);
        const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, tier, ms, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures };
        renderer.info.autoReset = true;
        return info;
      },
    };
  }

  return {
    setTarget(progress, immediate) {
      target = clamp01(progress);
      if (immediate) current = target;
    },
    setPointer(x, y) {
      pointer.set(x, y);
      pointerAt = performance.now();
    },
    setActive(value) {
      active = value;
      last = performance.now();
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      dropComposer();
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh || object instanceof THREE.BatchedMesh) object.dispose();
      });
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}
