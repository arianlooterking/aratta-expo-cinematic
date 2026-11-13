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
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { canvasTexture, createCtx, preloadLogo } from "./core";
import { createMaterials } from "./materials";
import { buildHall } from "./hall";
import { buildHallArchitecture } from "./hall-architecture";
import { buildNeighbours } from "./neighbours";
import { applyTheme, initialTheme, type SceneTheme } from "./theme";
import { buildRigging } from "./rigging";
import { buildFloor } from "./floor";
import { buildStructure } from "./structure";
import { buildWalls } from "./walls";
import { buildLight } from "./light";
import { buildIdentity } from "./identity";
import { buildFurniture } from "./furniture";
import { buildSite } from "./site";
import { createCameraRig, pathStats, type CameraPose } from "./camera";
import { clamp01 } from "./timeline";
import type { ReelText } from "./reel";

export type BoothQuality = "auto" | "high" | "low";

export type BoothSceneOptions = {
  lang: "fa" | "en";
  compact: boolean; // phones: lighter renderer, portrait framing
  fontFamily: string;
  onFrame?: (progress: number) => void;
  /** Text for the LED wall's brand reel, from the site content. */
  reel?: ReelText;
  /** The free band for the closing elevation (fractions of the canvas height, 0 = top). */
  safeBand?: () => { top: number; bottom: number } | null;
  /** The free band between the header and the phone's copy card during the chapters. */
  freeBand?: () => { top: number; bottom: number } | null;
  /** Landscape screens: the free band between the header and the chapter copy under the stand. */
  chapterBand?: () => { top: number; bottom: number } | null;
  /** "auto" picks from `compact` and a short frame-time probe. */
  quality?: BoothQuality;
  /** Surroundings theme ("dark" default; `?booth-theme=light` for testing). */
  theme?: SceneTheme;
};

export type BoothScene = {
  setTarget(progress: number, immediate?: boolean): void;
  setPointer(x: number, y: number): void;
  setActive(active: boolean): void;
  resize(): void;
  /** Re-reads the free bands from the page layout (the copy or the header changed height). */
  relayout(): void;
  setTheme(theme: SceneTheme): void;
  dispose(): void;
};

/**
 * Runs before the bloom. A single invalid pixel (NaN or infinity, which some
 * graphics drivers produce where software rendering does not) is otherwise
 * blurred by every bloom level into a screen-sized black block. Invalid and
 * negative values become black, and highlights are capped.
 */
const GuardShader = {
  name: "BoothGuardShader",
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    // NaN fails every comparison, so it takes the zero branch.
    float safe(float v) { return v > 0.0 ? min(v, 64.0) : 0.0; }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(safe(c.r), safe(c.g), safe(c.b), 1.0);
    }`,
};

/** Rendering tiers: high = composer + bloom + shadows + transmission; mid = shadows; low = phones. */
export type BoothTier = "high" | "mid" | "low";

// Hall air: lit grey-blue while the stand is built, dimmed (never black) for the show.
const HALL = new THREE.Color("#3a4148");

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
  // Fonts and the official logo artwork are drawn into canvas textures: wait for them (briefly).
  const logo = preloadLogo(2500);
  try {
    await Promise.race([document.fonts.load(font(800, 64), fa ? "اَرَتَ" : "Aratta"), new Promise((resolve) => setTimeout(resolve, 1500))]);
  } catch {
    // fonts API missing: canvas falls back to system fonts
  }
  await logo;

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
  ctx.hooks.reel = options.reel;

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
  buildHallArchitecture(ctx);
  buildNeighbours(ctx);
  buildSite(ctx);
  buildRigging(ctx);
  buildFloor(ctx);
  buildStructure(ctx);
  buildWalls(ctx);
  const light = buildLight(ctx, { realSpots: rich });
  buildIdentity(ctx);
  buildFurniture(ctx);
  applyTheme(ctx, initialTheme(options.theme));
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
  let guard: ShaderPass | null = null;
  const buildComposer = () => {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    guard = new ShaderPass(GuardShader);
    composer.addPass(guard);
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.32, 0.55, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  };
  const dropComposer = () => {
    composer?.renderTarget1.dispose();
    composer?.renderTarget2.dispose();
    bloom?.dispose();
    guard?.dispose();
    composer?.dispose();
    composer = null;
    bloom = null;
    guard = null;
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

  const rig = createCameraRig(camera);
  // Debug only (with booth-debug): ?booth-cam=x,y,z,tx,ty,tz pins the camera to a pose.
  const debugCam = (() => {
    const q = new URLSearchParams(window.location.search);
    const v = (q.get("booth-cam") ?? "").split(",").map(Number);
    if (!q.has("booth-debug") || v.length !== 6 || v.some((n) => !Number.isFinite(n))) return null;
    return (c: THREE.PerspectiveCamera) => {
      c.clearViewOffset();
      c.position.set(v[0], v[1], v[2]);
      c.lookAt(v[3], v[4], v[5]);
      c.updateMatrixWorld(true);
    };
  })();
  const pointer = new THREE.Vector2();
  let width = 1;
  let height = 1;
  let frame = 0;
  let active = true;
  let disposed = false;
  let target = 0;
  let current = 0;
  let velocity = 0;
  let last = performance.now();
  let elapsed = 0;
  let lastRender = 0;
  let lastShadowAt = -1;
  let pointerAt = -1e9;
  let frozen = false;
  // Slow-motion playback: the build follows the scroll, but never faster than SPEED
  // progress per second (a chapter takes at least ~2.2 s), rising smoothly to SPEED_FAR only
  // when the visitor is far ahead, so a fast flick never rushes the build. The velocity
  // itself is smoothed, so starts and stops have no jerk; slow scrolling follows 1:1.
  const SPEED = 0.05;
  const SPEED_FAR = 0.2;
  const FAR_GAP: [number, number] = [0.18, 0.32];
  // When the scroll is still, the reel keeps playing at a capped frame rate.
  const IDLE_FPS = compact ? 20 : 30;
  const VELOCITY_TAU = 0.22; // s: how smoothly the speed itself changes
  const FOLLOW = 4 * VELOCITY_TAU; // s: gap closing time; 4x the velocity lag is critically damped (no overshoot)
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
    bands();
  };

  const bands = () => {
    const band = options.safeBand?.();
    if (band) rig.setSafeBand(band.top, band.bottom);
    const free = options.freeBand?.();
    if (free) rig.setFreeBand(free.top, free.bottom);
    const chapter = options.chapterBand?.();
    if (chapter) rig.setChapterBand(chapter.top, chapter.bottom);
    lastRender = 0;
  };

  let frameDt = 1 / 60;
  const draw = (p: number, time: number) => {
    for (const anim of ctx.anims) anim(p, time);
    ctx.parts.update(p);
    ctx.decals.update(p);
    ctx.sparkles.update(p, time);
    rig.apply(p, frameDt, width, height, pointer);
    if (debugCam) debugCam(camera);
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
    frameDt = dt;
    const before = current;
    // Speed-limited follower, frame-rate independent (ScrollTrigger hands over raw progress).
    const gap = target - current;
    const far = Math.abs(gap);
    const ramp = Math.min(1, Math.max(0, (far - FAR_GAP[0]) / (FAR_GAP[1] - FAR_GAP[0])));
    const limit = SPEED + (SPEED_FAR - SPEED) * ramp * ramp * (3 - 2 * ramp);
    const wanted = Math.max(-limit, Math.min(limit, gap / FOLLOW));
    velocity += (wanted - velocity) * (1 - Math.exp(-dt / VELOCITY_TAU));
    current += velocity * dt;
    // Never pass the target; settle exactly on it once the remaining motion is invisible.
    if ((gap > 0 && current > target) || (gap < 0 && current < target) || (far < 0.00002 && Math.abs(velocity) < 0.0005)) {
      current = target;
      velocity = 0;
    }
    const moving = before !== current || now - pointerAt < 1500;
    const probe = probing();
    // Settled frames still play the LED reel and the sign, at a capped rate.
    if (probe || moving || now - lastRender > 1000 / IDLE_FPS) {
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
    // Nothing is drawn while the hero is off screen or the tab is hidden.
    if (active && !frozen && !document.hidden) render(now);
    frame = requestAnimationFrame(loop);
  };

  resize();
  draw(0, 0);
  // Compile every program and upload every texture before the loader hides, so no part
  // or light pops in later: hidden objects are made visible for the compile only.
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  const textures = new Set<THREE.Texture>();
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (!m) return;
    for (const mm of Array.isArray(m) ? m : [m]) {
      for (const value of Object.values(mm)) if (value instanceof THREE.Texture) textures.add(value);
      const uniforms = (mm as THREE.ShaderMaterial).uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) if (u.value instanceof THREE.Texture) textures.add(u.value);
    }
  });
  for (const t of textures) renderer.initTexture(t);
  try {
    await Promise.race([renderer.compileAsync(scene, camera), new Promise((resolve) => setTimeout(resolve, 4000))]);
  } catch {
    renderer.compile(scene, camera);
  }
  for (const o of hidden) o.visible = false;
  draw(0, 0);
  frame = requestAnimationFrame(loop);
  // The LED film's photos load once the first frame is up.
  requestAnimationFrame(() => setTimeout(() => (ctx.hooks.loadReel as (() => void) | undefined)?.(), 100));

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
      /** The progress the scene shows (it follows the scroll with a speed limit), and the scroll target. */
      get shown() {
        return current;
      },
      get target() {
        return target;
      },
      /** The subject box's projected bounds at p, as fractions of the screen and of the free band. */
      subjectBounds(p: number) {
        return rig.subjectBounds(clamp01(p), width, height);
      },
      /** Hall or neighbour meshes between the camera and a grid over the stand's box. */
      occlusion(p: number) {
        draw(clamp01(p), elapsed);
        camera.updateMatrixWorld(true);
        const targets: THREE.Object3D[] = [];
        for (const child of scene.children) if (child !== root && !(child instanceof THREE.Light) && child.visible) targets.push(child);
        const ray = new THREE.Raycaster();
        const point = new THREE.Vector3();
        const dir = new THREE.Vector3();
        const hits: Array<{ point: number[]; object: string; distance: number }> = [];
        let rays = 0;
        for (let ix = 0; ix <= 8; ix += 1)
          for (let iy = 0; iy <= 6; iy += 1)
            for (let iz = 0; iz <= 4; iz += 1) {
              point.set(-6 + ix * 1.5, 0.15 + iy * 1.15, -4.5 + iz * 2.25);
              dir.copy(point).sub(camera.position);
              const far = dir.length();
              ray.set(camera.position, dir.normalize());
              ray.far = far - 0.05;
              rays += 1;
              const hit = ray.intersectObjects(targets, true)[0];
              if (hit) hits.push({ point: point.toArray(), object: hit.object.name || hit.object.type, distance: Math.round(hit.distance * 100) / 100 });
            }
        return { p, rays, hits: hits.length, sample: hits.slice(0, 6), camera: camera.position.toArray().map((v) => Math.round(v * 100) / 100) };
      },
      /**
       * Regression check for the bloom guard: `poison(true)` puts one small patch of
       * invalid (NaN) pixels over the plot, `guard(false)` switches the guard off.
       * With the guard on, the patch must stay a patch; with it off, the bloom
       * spreads it into a large black block.
       */
      poison(on: boolean) {
        const old = scene.getObjectByName("debug-poison");
        if (old) scene.remove(old);
        if (on) {
          const mesh = new THREE.Mesh(
            track(new THREE.PlaneGeometry(0.3, 0.3)),
            track(
              new THREE.ShaderMaterial({
                uniforms: { uMinus: { value: -1 } },
                vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
                fragmentShader: "uniform float uMinus; void main(){ gl_FragColor = vec4(vec3(sqrt(uMinus)), 1.0); }",
                side: THREE.DoubleSide,
                toneMapped: false,
              }),
            ),
          );
          mesh.name = "debug-poison";
          mesh.position.set(0, 1.6, 0);
          mesh.frustumCulled = false;
          scene.add(mesh);
        }
        draw(current, elapsed);
      },
      guard(on: boolean) {
        if (guard) guard.enabled = on;
        draw(current, elapsed);
        return guard ? guard.enabled : null;
      },
      /** Pin the LED reel to a time in seconds (null lets it run), and redraw. */
      reel(t: number | null) {
        (ctx.hooks.setReel as (t: number | null) => void)(t);
        draw(current, elapsed);
      },
      /** Per chapter and finale: camera travel, view rotation, azimuth, height, distance; monotone checks. */
      pathStats(step = 0.0005) {
        return pathStats(rig.at, width, height, step);
      },
      /** Largest per-step change of the scroll path (no pointer parallax), sampled every 0.001. */
      pathJumps(step = 0.001) {
        const a: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
        const b: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
        rig.at(0, width, height, a);
        const worst = { pos: 0, tgt: 0, off: 0, posAt: 0, tgtAt: 0, offAt: 0 };
        const steps: number[] = [];
        let accel = 0;
        let accelAt = 0;
        let prev = -1;
        for (let i = 1; i * step <= 1 + 1e-9; i += 1) {
          const p = i * step;
          rig.at(p, width, height, b);
          const dp = b.pos.distanceTo(a.pos);
          const dt = b.tgt.distanceTo(a.tgt);
          const doff = Math.hypot(b.offX - a.offX, b.offY - a.offY) / height;
          steps.push(dp);
          if (prev >= 0 && Math.abs(dp - prev) > accel) {
            accel = Math.abs(dp - prev);
            accelAt = p;
          }
          prev = dp;
          // Plain assignments: the production minifier turns a destructuring
          // assignment onto these fields into invalid code and the chunk fails to load.
          if (dp > worst.pos) {
            worst.pos = dp;
            worst.posAt = p;
          }
          if (dt > worst.tgt) {
            worst.tgt = dt;
            worst.tgtAt = p;
          }
          if (doff > worst.off) {
            worst.off = doff;
            worst.offAt = p;
          }
          a.pos.copy(b.pos);
          a.tgt.copy(b.tgt);
          a.offX = b.offX;
          a.offY = b.offY;
        }
        const profile: number[] = [];
        const bin = Math.round(0.01 / step);
        for (let i = 0; i < steps.length; i += bin) profile.push(Math.round(Math.max(...steps.slice(i, i + bin)) * 1000) / 1000);
        const sorted = [...steps].sort((x, y) => x - y);
        const r = (v: number) => Math.round(v * 10000) / 10000;
        return {
          maxPos: r(worst.pos), maxPosAt: r(worst.posAt), medianPos: r(sorted[Math.floor(sorted.length / 2)]),
          maxTgt: r(worst.tgt), maxTgtAt: r(worst.tgtAt),
          maxOffset: r(worst.off), maxOffsetAt: r(worst.offAt),
          maxStepChange: r(accel), maxStepChangeAt: r(accelAt),
          profile,
        };
      },
      measure(p: number) {
        target = clamp01(p);
        current = target;
        velocity = 0;
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
      if (immediate) {
        current = target;
        velocity = 0;
      }
    },
    setPointer(x, y) {
      pointer.set(x, y);
      pointerAt = performance.now();
    },
    setActive(value) {
      // Coming back into view (from above or below): show where the visitor is, at rest.
      if (value && !active) {
        current = target;
        velocity = 0;
      }
      active = value;
      last = performance.now();
    },
    resize,
    relayout: bands,
    setTheme(theme) {
      applyTheme(ctx, theme);
      renderer.shadowMap.needsUpdate = true;
    },
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
