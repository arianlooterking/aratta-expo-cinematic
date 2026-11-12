// Shared building blocks for the booth scene: a part system that moves every
// construction part along its real assembly axis as a pure function of scroll,
// instanced pools for repeated parts, glints, glows, contact shadows and light
// pools. Nothing here keeps time-based state: scrubbing back and forth is exact.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pulse, settle, window01 } from "./timeline";
import type { Materials } from "./materials";
import { LOGO_ARTWORK, LOGO_BAND, LOGO_COLORS, LOGO_HEIGHT, LOGO_RECTS } from "./brand-logo";

export type V3 = [number, number, number];
export type Win = readonly [number, number];
export type Anim = (p: number, time: number) => void;

export type Motion = {
  /** Staging offset from home, in the parent's space. Keep it 1 to 2 m. */
  from?: V3;
  /** Staging rotation offset (radians, XYZ). */
  rot?: V3;
  /** Staging scale factor, per axis or uniform. */
  scaleFrom?: V3 | number;
  ease?: (t: number) => number;
  /** A faint gold glint when the part locks: true = at home, or a world position. */
  glint?: boolean | V3;
  /** Leave again (e.g. truss dollies rolling away). */
  out?: { win: Win; to: V3 };
};

export type Home = { p: V3; r?: V3; s?: V3 };

export type Pool = {
  add(home: Home, win: Win, motion?: Motion, color?: THREE.ColorRepresentation): number;
  /** Static instance that is shown from `at` onward (no travel). */
  place(home: Home, at?: number, color?: THREE.ColorRepresentation): number;
  readonly mesh: THREE.InstancedMesh | THREE.BatchedMesh | null;
  readonly count: number;
};

type Item = {
  home: Home;
  q: THREE.Quaternion;
  win: Win;
  motion: Motion;
  last: number;
  pool?: PoolImpl;
  index?: number;
  object?: THREE.Object3D;
};

type PoolImpl = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  parent: THREE.Object3D;
  cast: boolean;
  receive: boolean;
  colors: Array<THREE.Color | null>;
  count: number;
  mesh: THREE.InstancedMesh | null;
  /** Batched pools share one BatchedMesh per material and parent (one draw call). */
  batch: THREE.BatchedMesh | null;
  ids: number[];
  dirty: boolean;
};

const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpM = new THREE.Matrix4();
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);

export class Parts {
  private items: Item[] = [];
  private pools: PoolImpl[] = [];
  private compoundPools = new Map<string, Pool>();
  constructor(
    private readonly shadows: boolean,
    private readonly sparkles: Sparkles,
  ) {}

  pool(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], parent: THREE.Object3D, opts: { cast?: boolean; receive?: boolean } = {}): Pool {
    const impl: PoolImpl = {
      geometry,
      material,
      parent,
      cast: opts.cast ?? true,
      receive: opts.receive ?? true,
      colors: [],
      count: 0,
      mesh: null,
      batch: null,
      ids: [],
      dirty: true,
    };
    this.pools.push(impl);
    const add = (home: Home, win: Win, motion: Motion = {}, color?: THREE.ColorRepresentation) => {
      const index = impl.count;
      impl.count += 1;
      impl.colors.push(color === undefined ? null : new THREE.Color(color));
      this.register({ home, win, motion, pool: impl, index });
      return index;
    };
    return {
      add,
      place: (home, at = -1, color) => add(home, [at - 0.0001, at], { ease: () => 1 }, color),
      get mesh() {
        return impl.mesh ?? impl.batch;
      },
      get count() {
        return impl.count;
      },
    };
  }

  /** A multi-material part (furniture etc.): one batched instance per piece, moving together. */
  compound(pieces: Array<[THREE.BufferGeometry, THREE.Material]>, parent: THREE.Object3D, home: Home, win: Win, motion: Motion = {}, cast = true) {
    pieces.forEach(([geometry, material], i) => {
      const key = `${geometry.uuid}|${material.uuid}|${parent.uuid}|${cast}`;
      let pool = this.compoundPools.get(key);
      if (!pool) {
        pool = this.pool(geometry, material, parent, { cast });
        this.compoundPools.set(key, pool);
      }
      pool.add(home, win, i === 0 ? motion : { ...motion, glint: undefined });
    });
  }

  /** Animate a whole object (group or mesh) as one part. */
  object<O extends THREE.Object3D>(object: O, win: Win, motion: Motion = {}): O {
    const home: Home = {
      p: [object.position.x, object.position.y, object.position.z],
      r: [object.rotation.x, object.rotation.y, object.rotation.z],
      s: [object.scale.x, object.scale.y, object.scale.z],
    };
    this.register({ home, win, motion, object });
    return object;
  }

  private register(input: Omit<Item, "q" | "last">) {
    const item: Item = { ...input, q: new THREE.Quaternion(), last: Number.NaN };
    const r = item.home.r ?? [0, 0, 0];
    item.q.setFromEuler(tmpE.set(r[0], r[1], r[2]));
    this.items.push(item);
    const glint = item.motion.glint;
    if (glint) {
      const at = Array.isArray(glint) ? glint : this.worldOf(item);
      this.sparkles.glint(at, item.win[1]);
    }
  }

  private worldOf(item: Item): V3 {
    const parent = item.pool?.parent ?? item.object?.parent;
    tmpP.set(...item.home.p);
    if (parent) {
      parent.updateWorldMatrix(true, false);
      tmpP.applyMatrix4(parent.matrixWorld);
    }
    return [tmpP.x, tmpP.y, tmpP.z];
  }

  finalize() {
    const batches = new Map<string, PoolImpl[]>();
    for (const pool of this.pools) {
      if (pool.count === 0) continue;
      const material = pool.material;
      if (!Array.isArray(material) && !(material as THREE.ShaderMaterial).isShaderMaterial) {
        const key = `${material.uuid}|${pool.parent.uuid}|${pool.cast}|${pool.receive}`;
        if (!batches.has(key)) batches.set(key, []);
        batches.get(key)!.push(pool);
        continue;
      }
      const mesh = new THREE.InstancedMesh(pool.geometry, pool.material, pool.count);
      mesh.castShadow = pool.cast && this.shadows;
      mesh.receiveShadow = pool.receive && this.shadows;
      // Parts travel up to 2 m from home, so bounds from home poses would cull them.
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (pool.colors.some(Boolean)) {
        pool.colors.forEach((color, i) => mesh.setColorAt(i, color ?? new THREE.Color(1, 1, 1)));
      }
      pool.mesh = mesh;
      pool.parent.add(mesh);
    }
    // Every other pool with the same material and parent becomes one BatchedMesh:
    // many different part geometries, each instance animated on its own, one draw call.
    const prepared = new Map<string, THREE.BufferGeometry>();
    const prepare = (g: THREE.BufferGeometry) => {
      let out = prepared.get(g.uuid);
      if (!out) {
        out = g.index ? g.toNonIndexed() : g.clone();
        for (const name of Object.keys(out.attributes)) if (!["position", "normal", "uv"].includes(name)) out.deleteAttribute(name);
        if (!out.attributes.normal) out.computeVertexNormals();
        if (!out.attributes.uv) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
        prepared.set(g.uuid, out);
      }
      return out;
    };
    for (const pools of batches.values()) {
      const material = pools[0].material as THREE.Material;
      let vertices = 0;
      let instances = 0;
      const seen = new Set<string>();
      for (const pool of pools) {
        instances += pool.count;
        if (!seen.has(pool.geometry.uuid)) {
          seen.add(pool.geometry.uuid);
          vertices += prepare(pool.geometry).attributes.position.count;
        }
      }
      const batch = new THREE.BatchedMesh(instances, vertices, vertices, material);
      batch.castShadow = pools[0].cast && this.shadows;
      batch.receiveShadow = pools[0].receive && this.shadows;
      batch.frustumCulled = false;
      batch.perObjectFrustumCulled = true;
      batch.sortObjects = material.transparent;
      const geometryIds = new Map<string, number>();
      const colored = pools.some((pool) => pool.colors.some(Boolean));
      const white = new THREE.Color(1, 1, 1);
      for (const pool of pools) {
        let gid = geometryIds.get(pool.geometry.uuid);
        if (gid === undefined) {
          gid = batch.addGeometry(prepare(pool.geometry));
          geometryIds.set(pool.geometry.uuid, gid);
        }
        for (let i = 0; i < pool.count; i += 1) {
          const id = batch.addInstance(gid);
          pool.ids.push(id);
          if (colored) batch.setColorAt(id, pool.colors[i] ?? white);
        }
        pool.batch = batch;
      }
      pools[0].parent.add(batch);
    }
    for (const g of prepared.values()) g.dispose();
  }

  update(p: number) {
    for (const item of this.items) {
      const { win, motion } = item;
      const t = window01(p, win[0], win[1]);
      let out = 0;
      if (motion.out) out = window01(p, motion.out.win[0], motion.out.win[1]);
      const key = t + out * 2;
      if (key === item.last) continue;
      item.last = key;
      const hidden = t <= 0 || out >= 1;
      if (item.pool?.batch) {
        const pool = item.pool;
        const id = pool.ids[item.index!];
        pool.batch!.setVisibleAt(id, !hidden);
        if (hidden) continue;
        this.pose(item, t, out);
        pool.batch!.setMatrixAt(id, tmpM.compose(tmpP, tmpQ, tmpS));
      } else if (item.pool) {
        const pool = item.pool;
        pool.dirty = true;
        if (hidden) {
          pool.mesh!.setMatrixAt(item.index!, ZERO_M);
          continue;
        }
        this.pose(item, t, out);
        pool.mesh!.setMatrixAt(item.index!, tmpM.compose(tmpP, tmpQ, tmpS));
      } else if (item.object) {
        const object = item.object;
        object.visible = !hidden;
        if (hidden) continue;
        this.pose(item, t, out);
        object.position.copy(tmpP);
        object.quaternion.copy(tmpQ);
        object.scale.copy(tmpS);
      }
    }
    for (const pool of this.pools) {
      if (pool.dirty && pool.mesh) {
        pool.mesh.instanceMatrix.needsUpdate = true;
        pool.dirty = false;
      }
    }
  }

  private pose(item: Item, t: number, out: number) {
    const { home, motion } = item;
    const e = (motion.ease ?? settle)(t);
    const k = 1 - e;
    const from = motion.from;
    tmpP.set(home.p[0], home.p[1], home.p[2]);
    if (from) tmpP.add(tmpS.set(from[0] * k, from[1] * k, from[2] * k));
    if (out > 0 && motion.out) {
      const o = out * out * (3 - 2 * out);
      tmpP.add(tmpS.set(motion.out.to[0] * o, motion.out.to[1] * o, motion.out.to[2] * o));
    }
    if (motion.rot) {
      const r = home.r ?? [0, 0, 0];
      tmpQ.setFromEuler(tmpE.set(r[0] + motion.rot[0] * k, r[1] + motion.rot[1] * k, r[2] + motion.rot[2] * k));
    } else tmpQ.copy(item.q);
    const s = home.s ?? [1, 1, 1];
    tmpS.set(s[0], s[1], s[2]);
    const sf = motion.scaleFrom;
    if (sf !== undefined) {
      const f = typeof sf === "number" ? [sf, sf, sf] : sf;
      tmpS.x *= Math.max(1e-4, f[0] + (1 - f[0]) * e);
      tmpS.y *= Math.max(1e-4, f[1] + (1 - f[1]) * e);
      tmpS.z *= Math.max(1e-4, f[2] + (1 - f[2]) * e);
    }
  }
}

// ------------------------------------------------------------------ sparkles

/** Glints and glows as one additive point cloud: a single draw call. */
export class Sparkles {
  private fns: Array<(p: number, time: number) => number> = [];
  private positions: number[] = [];
  private colors: number[] = [];
  private sizes: number[] = [];
  private alpha!: THREE.BufferAttribute;
  readonly material: THREE.ShaderMaterial;
  points: THREE.Points | null = null;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        uniform float uScale;
        varying float vAlpha;
        varying vec3 vColor;
        varying float vStar;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha > 0.002 ? min(aSize * uScale / -mv.z, 512.0) : 0.0;
          vAlpha = aAlpha;
          vColor = aColor;
          vStar = aSize < 0.0 ? 0.0 : 1.0;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float core = exp(-r * r * 14.0);
          float halo = exp(-r * 4.0) * 0.35;
          float star = (max(0.0, 1.0 - abs(d.y) * 40.0) * max(0.0, 1.0 - abs(d.x) * 2.0)
                      + max(0.0, 1.0 - abs(d.x) * 40.0) * max(0.0, 1.0 - abs(d.y) * 2.0)) * 0.35;
          float a = (core + halo + star) * (1.0 - smoothstep(0.85, 1.0, r)) * vAlpha;
          gl_FragColor = vec4(vColor * a, 1.0);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }

  add(position: V3, size: number, color: THREE.ColorRepresentation, fn: (p: number, time: number) => number) {
    const c = new THREE.Color(color);
    this.positions.push(...position);
    this.colors.push(c.r, c.g, c.b);
    this.sizes.push(size);
    this.fns.push(fn);
  }

  /** Faint gold glint where a part locks. */
  glint(position: V3, at: number, size = 0.2) {
    this.add(position, Math.min(size, 0.26), new THREE.Color(1.5, 1.15, 0.55), (p) => pulse(p, at) * 0.75);
  }

  finalize(parent: THREE.Object3D) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("aColor", new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(this.sizes, 1));
    this.alpha = new THREE.Float32BufferAttribute(new Float32Array(this.fns.length), 1);
    this.alpha.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aAlpha", this.alpha);
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    parent.add(this.points);
    return geometry;
  }

  update(p: number, time: number) {
    const array = this.alpha.array as Float32Array;
    let dirty = false;
    for (let i = 0; i < this.fns.length; i += 1) {
      const value = this.fns[i](p, time);
      if (Math.abs(value - array[i]) > 1e-4) {
        array[i] = value;
        dirty = true;
      }
    }
    if (dirty) this.alpha.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ decals

const decalVertex = /* glsl */ `
  attribute float aStrength;
  varying vec2 vUv;
  varying float vStrength;
  void main() {
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
    vUv = uv;
    vStrength = aStrength;
  }`;

/** Flat quads for contact shadows and light pools, with per-instance strength. */
export class Decals {
  private pools: Array<{ mesh: THREE.InstancedMesh; strength: THREE.InstancedBufferAttribute; fns: Array<(p: number) => number>; items: Array<{ m: THREE.Matrix4; fn: (p: number) => number }> }> = [];
  private byKey = new Map<string, number>();

  constructor(private readonly parent: THREE.Object3D, private readonly track: <T extends { dispose(): void }>(item: T) => T) {}

  private material(map: THREE.Texture, color: THREE.Color, additive: boolean) {
    return this.track(
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: map }, uColor: { value: color } },
        vertexShader: decalVertex,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform vec3 uColor;
          varying vec2 vUv;
          varying float vStrength;
          void main() {
            float a = texture2D(uMap, vUv).r * vStrength;
            ${additive ? "gl_FragColor = vec4(uColor * a, 1.0);" : "gl_FragColor = vec4(uColor, a);"}
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
  }

  /** Register a decal kind once (map is a grayscale mask in the red channel). */
  kind(key: string, map: THREE.Texture, color: THREE.ColorRepresentation, additive: boolean) {
    const geometry = this.track(new THREE.PlaneGeometry(1, 1));
    geometry.rotateX(-Math.PI / 2);
    const mat = this.material(map, new THREE.Color(color), additive);
    this.byKey.set(key, this.pools.length);
    // Placeholder mesh carries geometry and material until finalize() knows the count.
    this.pools.push({ mesh: new THREE.InstancedMesh(geometry, mat, 1), strength: new THREE.InstancedBufferAttribute(new Float32Array(1), 1), fns: [], items: [] });
  }

  /** A flat decal at (x, y, z), size w x d, rotated about y, strength = fn(p). */
  add(key: string, x: number, y: number, z: number, w: number, d: number, fn: (p: number) => number, rotY = 0, tilt?: THREE.Euler) {
    const pool = this.pools[this.byKey.get(key)!];
    const q = new THREE.Quaternion().setFromEuler(tilt ?? new THREE.Euler(0, rotY, 0));
    pool.items.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(w, 1, d)), fn });
  }

  finalize() {
    for (const pool of this.pools) {
      const base = pool.mesh;
      const n = pool.items.length;
      if (n === 0) continue;
      const mesh = new THREE.InstancedMesh(base.geometry, base.material, n);
      const strength = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
      strength.setUsage(THREE.DynamicDrawUsage);
      mesh.geometry = base.geometry.clone();
      this.track(mesh.geometry);
      mesh.geometry.setAttribute("aStrength", strength);
      pool.items.forEach((item, i) => mesh.setMatrixAt(i, item.m));
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      pool.mesh = mesh;
      pool.strength = strength;
      pool.fns = pool.items.map((item) => item.fn);
      this.parent.add(mesh);
    }
  }

  update(p: number) {
    for (const pool of this.pools) {
      const array = pool.strength.array as Float32Array;
      let dirty = false;
      for (let i = 0; i < pool.fns.length; i += 1) {
        const v = pool.fns[i](p);
        if (Math.abs(v - array[i]) > 1e-4) {
          array[i] = v;
          dirty = true;
        }
      }
      if (dirty) pool.strength.needsUpdate = true;
    }
  }
}

// ------------------------------------------------------------------ context

export type Ctx = {
  scene: THREE.Scene;
  root: THREE.Group;
  /** Desktop build: richer textures, more leaves, real shadows. */
  rich: boolean;
  compact: boolean;
  fa: boolean;
  font: (weight: number, px: number) => string;
  track: <T extends { dispose(): void }>(item: T) => T;
  anims: Anim[];
  parts: Parts;
  sparkles: Sparkles;
  decals: Decals;
  mats: Materials;
  /** Cached bevelled box: real dimensions, soft 2-6 mm edges. */
  rbox: (w: number, h: number, d: number, radius?: number) => THREE.BufferGeometry;
  /** Shared unit box, scaled per instance (for straight profiles). */
  unitBox: THREE.BufferGeometry;
  /** Lazily created unit-box pool per material and parent. */
  bars: (material: THREE.Material, parent?: THREE.Object3D, opts?: { cast?: boolean; receive?: boolean }) => Pool;
  mesh: (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], cast?: boolean) => THREE.Mesh;
  shadows: boolean;
  /** Scene-wide hooks the light chapter registers (read by other modules). */
  hooks: Record<string, unknown>;
};

export function createCtx(init: Omit<Ctx, "parts" | "sparkles" | "decals" | "rbox" | "unitBox" | "bars" | "mesh" | "anims" | "hooks">): Ctx {
  const sparkles = new Sparkles();
  init.track(sparkles.material);
  const parts = new Parts(init.shadows, sparkles);
  const decals = new Decals(init.root, init.track);
  const cache = new Map<string, THREE.BufferGeometry>();
  const rbox = (w: number, h: number, d: number, radius = 0.004) => {
    const key = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${radius}`;
    let geometry = cache.get(key);
    if (!geometry) {
      const r = Math.min(radius, Math.min(w, h, d) * 0.45);
      geometry = init.track(r < 0.0015 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, r));
      cache.set(key, geometry);
    }
    return geometry;
  };
  const unitBox = init.track(new THREE.BoxGeometry(1, 1, 1));
  const barPools = new Map<string, Pool>();
  const bars = (material: THREE.Material, parent: THREE.Object3D = init.root, opts: { cast?: boolean; receive?: boolean } = {}) => {
    const key = `${material.uuid}|${parent.uuid}|${opts.cast ?? true}`;
    let pool = barPools.get(key);
    if (!pool) {
      pool = parts.pool(unitBox, material, parent, opts);
      barPools.set(key, pool);
    }
    return pool;
  };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], cast = true) => {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = cast && init.shadows;
    m.receiveShadow = init.shadows;
    return m;
  };
  return { ...init, parts, sparkles, decals, rbox, unitBox, bars, mesh, anims: [], hooks: {} };
}

/** Canvas texture helper (sRGB unless `data` is set for roughness/masks). */
export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, data = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, canvas, ctx };
}

/** Deterministic pseudo random, so every visitor sees the same stand. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- the official logo, drawn flat (counter front, LED content, totem, lightbox, sign).

const logoImages: { tight?: HTMLImageElement } = {};

/** Load the official artwork once; resolves when it arrives, fails or times out. */
export function preloadLogo(timeout = 2500) {
  if (logoImages.tight) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = () => {
      logoImages.tight = img;
      done();
    };
    img.onerror = done;
    setTimeout(done, timeout);
    img.src = LOGO_ARTWORK.tight;
  });
}

/**
 * Draw the official logo with its top-left corner at (x, y) and width w (height
 * w * LOGO_HEIGHT). The artwork is used once loaded; until then (or if it fails)
 * the same measured shapes are drawn without the lettering. `plate` puts it on
 * the black field with a small margin, as in the artwork, so the dark blocks
 * never vanish on a dark ground.
 */
export function drawLogo(c: CanvasRenderingContext2D, x: number, y: number, w: number, opts: { plate?: boolean } = {}) {
  const h = w * LOGO_HEIGHT;
  if (opts.plate) {
    const m = w * 0.07;
    c.fillStyle = LOGO_COLORS.ground;
    c.beginPath();
    c.roundRect(x - m, y - m, w + m * 2, h + m * 2, m * 0.35);
    c.fill();
  }
  const img = logoImages.tight;
  if (img) {
    c.drawImage(img, x, y, w, h);
    return;
  }
  for (const r of [...LOGO_RECTS, LOGO_BAND]) {
    c.fillStyle = r.kind === "gold" ? LOGO_COLORS.gold : LOGO_COLORS.dark;
    c.fillRect(x + (r.x - r.w / 2 + 0.5) * w, y + (LOGO_HEIGHT / 2 - r.y - r.h / 2) * w, r.w * w, r.h * w);
  }
}

export const toFa = (value: string | number) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

// ------------------------------------------------------------------ geometry helpers


/** Merge geometries, keeping only position/normal/uv so mixed sources combine. */
export function merge(list: THREE.BufferGeometry[]) {
  const prepared = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const name of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(name)) n.deleteAttribute(name);
    if (!n.attributes.uv) n.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2));
    return n;
  });
  const merged = mergeGeometries(prepared, false)!;
  for (const g of prepared) g.dispose();
  for (const g of list) g.dispose();
  return merged;
}

/** A round rod between two points. */
export function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, segments = 6) {
  const length = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

/** A box geometry placed at a position (for merging). */
export function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, rotY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
