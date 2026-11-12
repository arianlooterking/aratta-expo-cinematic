// A real-time 3D exhibition booth that assembles itself as the visitor scrolls.
// Everything is procedural (no model files): the hall, the plan, the platform,
// the structure, walls and glass, the Aratta mark, signage, screens and furniture.
// The React hero owns scroll; this module only turns a 0..1 progress into a frame.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BOOTH_TIMELINE, CAMERA_KEYS, clamp01, easeOutBack, easeOutCubic, easeInOutCubic, window01 } from "./timeline";

export type BoothSceneOptions = {
  lang: "fa" | "en";
  compact: boolean; // phones: lighter renderer, portrait framing
  fontFamily: string;
  onFrame?: (progress: number) => void;
};

export type BoothScene = {
  setTarget(progress: number, immediate?: boolean): void;
  setPointer(x: number, y: number): void;
  setActive(active: boolean): void;
  resize(): void;
  dispose(): void;
};

const GOLD = new THREE.Color("#d3a84b");
const GOLD_SOFT = new THREE.Color("#f2d28c");
const CYAN = new THREE.Color("#63c9a4");
const HALL = new THREE.Color("#06080a");

const W = 10; // booth width (x)
const D = 7; // booth depth (z)
const H = 3.7; // structure height
const X0 = -W / 2;
const X1 = W / 2;
const Z0 = -D / 2;
const Z1 = D / 2;

type Anim = (p: number, time: number) => void;

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, canvas, ctx };
}

/** The Aratta mark drawn on a 1000-unit square (same geometry as the official logo). */
const MARK_BLOCKS: Array<[number, number, number, number]> = [
  // x, y (top), w, h on a 1000 grid
  [593, 131, 190, 735], // tall bar
  [218, 720, 565, 146], // base bar
  [218, 345, 170, 168], // upper square
  [218, 533, 170, 169], // lower square
];

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  for (const [bx, by, bw, bh] of MARK_BLOCKS) {
    ctx.fillRect(x + (bx / 1000) * size, y + (by / 1000) * size, (bw / 1000) * size, (bh / 1000) * size);
  }
}

export async function createBoothScene(canvas: HTMLCanvasElement, options: BoothSceneOptions): Promise<BoothScene> {
  const { compact, lang } = options;
  const fa = lang === "fa";
  const font = (weight: number, px: number) => `${weight} ${px}px ${options.fontFamily}`;
  try {
    await Promise.race([
      document.fonts.load(font(800, 64), fa ? "اَرَتَ" : "Aratta"),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // fonts API missing: canvas falls back to system fonts
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !compact || window.devicePixelRatio < 2,
    alpha: false,
    powerPreference: "high-performance",
  });
  const maxDpr = compact ? 1.6 : 1.9;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !compact;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(HALL, 1);

  const scene = new THREE.Scene();
  scene.background = HALL;
  scene.fog = new THREE.FogExp2(HALL, compact ? 0.02 : 0.017);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(compact ? 50 : 38, 1, 0.1, 260);
  const anims: Anim[] = [];
  const disposables: Array<{ dispose(): void }> = [envTexture, pmrem];
  const track = <T extends { dispose(): void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  // ---------------------------------------------------------------- materials
  const mat = {
    floor: track(new THREE.MeshStandardMaterial({ color: "#0d1012", roughness: 0.46, metalness: 0.12 })),
    hallSteel: track(new THREE.MeshStandardMaterial({ color: "#14181b", roughness: 0.7, metalness: 0.4 })),
    neighbour: track(new THREE.MeshStandardMaterial({ color: "#101417", roughness: 0.8, metalness: 0.1 })),
    platform: track(new THREE.MeshStandardMaterial({ color: "#16191b", roughness: 0.55, metalness: 0.25 })),
    steel: track(new THREE.MeshStandardMaterial({ color: "#1b1f22", roughness: 0.38, metalness: 0.85 })),
    wall: track(new THREE.MeshStandardMaterial({ color: "#1d2124", roughness: 0.86, metalness: 0.05 })),
    wallLight: track(new THREE.MeshStandardMaterial({ color: "#ebe6dc", roughness: 0.9, metalness: 0 })),
    gold: track(new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 0.9, emissive: GOLD, emissiveIntensity: 0 })),
    goldGlow: track(new THREE.MeshBasicMaterial({ color: GOLD_SOFT, toneMapped: false })),
    led: track(new THREE.MeshBasicMaterial({ color: "#fff3d6", toneMapped: false })),
    cyanGlow: track(new THREE.MeshBasicMaterial({ color: CYAN, toneMapped: false, transparent: true, opacity: 0 })),
    glass: track(new THREE.MeshStandardMaterial({ color: "#a9d7dc", roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.26, depthWrite: false })),
    counter: track(new THREE.MeshStandardMaterial({ color: "#efebe4", roughness: 0.42, metalness: 0.05 })),
    fabric: track(new THREE.MeshStandardMaterial({ color: "#2d3a3c", roughness: 0.95, metalness: 0 })),
    fabricWarm: track(new THREE.MeshStandardMaterial({ color: "#8c6a46", roughness: 0.9, metalness: 0 })),
    wood: track(new THREE.MeshStandardMaterial({ color: "#6b4c32", roughness: 0.6, metalness: 0.05 })),
    leaf: track(new THREE.MeshStandardMaterial({ color: "#35603f", roughness: 0.75, metalness: 0 })),
    pot: track(new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.7, metalness: 0 })),
  };

  const box = (w: number, h: number, d: number, material: THREE.Material, cast = true) => {
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), material);
    mesh.castShadow = cast && !compact;
    mesh.receiveShadow = !compact;
    return mesh;
  };
  /** Box whose origin sits on its base, so scale.y grows it out of the floor. */
  const pillar = (w: number, h: number, d: number, material: THREE.Material) => {
    const geometry = track(new THREE.BoxGeometry(w, h, d));
    geometry.translate(0, h / 2, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = !compact;
    mesh.receiveShadow = !compact;
    return mesh;
  };

  // ---------------------------------------------------------------- hall
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(260, 260)), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = !compact;
  scene.add(floor);

  // Large polished tiles: faint seams every 2 m.
  const seams = new THREE.GridHelper(120, 60, 0x1c2226, 0x151a1d);
  (seams.material as THREE.Material).transparent = true;
  (seams.material as THREE.Material).opacity = 0.55;
  seams.position.y = 0.002;
  track(seams.geometry);
  track(seams.material as THREE.Material);
  scene.add(seams);

  // Soft pool of light that grows under the booth as it gets lit.
  const pool = canvasTexture(512, 512, (ctx) => {
    const g = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
    g.addColorStop(0, "rgba(255,226,170,0.55)");
    g.addColorStop(0.45, "rgba(255,210,140,0.16)");
    g.addColorStop(1, "rgba(255,210,140,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  });
  track(pool.texture);
  const poolMaterial = track(new THREE.MeshBasicMaterial({ map: pool.texture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const poolMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(26, 20)), poolMaterial);
  poolMesh.rotation.x = -Math.PI / 2;
  poolMesh.position.y = 0.004;
  scene.add(poolMesh);

  // Contact shadow under the platform (cheap, works on every phone).
  const contact = canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 128);
    g.addColorStop(0, "rgba(0,0,0,0.85)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
  track(contact.texture);
  const contactMaterial = track(new THREE.MeshBasicMaterial({ map: contact.texture, transparent: true, opacity: 0, depthWrite: false }));
  const contactMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(W * 1.5, D * 1.6)), contactMaterial);
  contactMesh.rotation.x = -Math.PI / 2;
  contactMesh.position.y = 0.006;
  scene.add(contactMesh);

  // Hall columns and roof lights far away give the space its scale.
  const columnGeometry = track(new THREE.BoxGeometry(1.1, 20, 1.1));
  columnGeometry.translate(0, 10, 0);
  const columnSpots: Array<[number, number]> = [];
  for (let x = -40; x <= 40; x += 16) {
    columnSpots.push([x, -34], [x, 34]);
  }
  for (let z = -18; z <= 18; z += 18) {
    columnSpots.push([-48, z], [48, z]);
  }
  const columns = new THREE.InstancedMesh(columnGeometry, mat.hallSteel, columnSpots.length);
  const m4 = new THREE.Matrix4();
  columnSpots.forEach(([x, z], i) => columns.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
  scene.add(columns);

  const lightStep = compact ? 9 : 6;
  const lightSpots: Array<[number, number]> = [];
  for (let x = -60; x <= 60; x += lightStep) for (let z = -60; z <= 60; z += lightStep) lightSpots.push([x, z]);
  const roofLightGeometry = track(new THREE.PlaneGeometry(0.9, 0.9));
  roofLightGeometry.rotateX(Math.PI / 2);
  const roofLights = new THREE.InstancedMesh(roofLightGeometry, track(new THREE.MeshBasicMaterial({ color: "#cfd8dc", toneMapped: false })), lightSpots.length);
  lightSpots.forEach(([x, z], i) => roofLights.setMatrixAt(i, m4.makeTranslation(x, 18.6, z)));
  scene.add(roofLights);

  // Roof trusses: long dark beams between the light rows.
  for (let z = -54; z <= 54; z += 18) {
    const beam = box(130, 0.9, 0.5, mat.hallSteel, false);
    beam.position.set(0, 19.8, z);
    scene.add(beam);
  }

  // Neighbouring stands, dim and out of focus, so the booth sits in a real fair.
  const neighbours: Array<[number, number, number, number, number]> = [
    [-19, -13, 7, 2.8, 6],
    [18, -14, 8, 3.2, 6],
    [-21, 12, 6, 2.4, 6],
    [21, 13, 7, 3, 5],
    [0, -24, 12, 3.4, 6],
  ];
  const neighbourTrim = track(new THREE.MeshBasicMaterial({ color: "#c9b48a", toneMapped: false }));
  const neighbourFloor = track(new THREE.MeshStandardMaterial({ color: "#2a2622", roughness: 0.7 }));
  for (const [x, z, w, h, d] of neighbours) {
    const base = pillar(w, 0.12, d, neighbourFloor);
    base.position.set(x, 0, z);
    const back = pillar(w, h, 0.12, mat.neighbour);
    back.position.set(x, 0, z - d / 2);
    const side = pillar(0.12, h, d, mat.neighbour);
    side.position.set(x - w / 2, 0, z);
    const header = box(w * 0.6, 0.5, 0.1, mat.neighbour, false);
    header.position.set(x, h + 0.4, z + d / 2 - 0.2);
    const glow = box(w * 0.56, 0.04, 0.02, neighbourTrim, false);
    glow.position.set(x, h + 0.2, z + d / 2 - 0.14);
    scene.add(base, back, side, header, glow);
  }

  // ---------------------------------------------------------------- lighting
  scene.add(new THREE.HemisphereLight(0xb8c4cc, 0x0c0907, 0.62));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.55);
  key.position.set(9, 16, 11);
  key.target.position.set(0, 0, 0);
  if (!compact) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -11;
    key.shadow.camera.right = 11;
    key.shadow.camera.top = 11;
    key.shadow.camera.bottom = -11;
    key.shadow.camera.near = 4;
    key.shadow.camera.far = 40;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
  }
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fb8c4, 0.3);
  rim.position.set(-12, 7, -10);
  scene.add(rim);

  const boothWarm = new THREE.PointLight(0xffd9a0, 0, 16, 1.6);
  boothWarm.position.set(0, 3.2, 0.5);
  scene.add(boothWarm);

  const spots: THREE.SpotLight[] = [];
  if (!compact) {
    for (const x of [-3.4, 0.4]) {
      const spot = new THREE.SpotLight(0xffe2b0, 0, 14, 0.42, 0.65, 1.4);
      spot.position.set(x, H - 0.1, Z1 - 0.3);
      spot.target.position.set(x - 0.4, 1.6, Z0);
      scene.add(spot, spot.target);
      spots.push(spot);
    }
  }

  // A soft cone of light on the empty plot: the stage waiting for its booth.
  const coneTexture = canvasTexture(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,232,190,0)");
    g.addColorStop(0.35, "rgba(255,232,190,0.05)");
    g.addColorStop(1, "rgba(255,226,170,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
  });
  track(coneTexture.texture);
  const coneMaterial = track(new THREE.MeshBasicMaterial({ map: coneTexture.texture, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
  const coneMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.6, 7.2, 18, 48, 1, true)), coneMaterial);
  coneMesh.position.set(0, 9, 0);
  scene.add(coneMesh);
  anims.push((p) => {
    const level = 1 - window01(p, 0.22, 0.34);
    coneMesh.visible = level > 0.001;
    coneMaterial.opacity = level;
  });

  // ---------------------------------------------------------------- booth root
  const booth = new THREE.Group();
  scene.add(booth);
  const T = BOOTH_TIMELINE;

  // 1. Footprint: four gold edges that draw themselves.
  const edge = 0.05;
  const edges: Array<{ mesh: THREE.Mesh; axis: "x" | "z"; from: number; window: [number, number] }> = [];
  const edgeSpecs: Array<{ x: number; z: number; len: number; axis: "x" | "z"; dir: 1 | -1 }> = [
    { x: X0, z: Z1, len: W, axis: "x", dir: 1 },
    { x: X1, z: Z1, len: D, axis: "z", dir: -1 },
    { x: X1, z: Z0, len: W, axis: "x", dir: -1 },
    { x: X0, z: Z0, len: D, axis: "z", dir: 1 },
  ];
  edgeSpecs.forEach((spec, i) => {
    const geometry = track(new THREE.BoxGeometry(spec.axis === "x" ? spec.len : edge, 0.02, spec.axis === "z" ? spec.len : edge));
    // Pivot at the start corner so scaling draws the line along its direction.
    if (spec.axis === "x") geometry.translate((spec.dir * spec.len) / 2, 0, 0);
    else geometry.translate(0, 0, (spec.dir * spec.len) / 2);
    const mesh = new THREE.Mesh(geometry, mat.goldGlow);
    mesh.position.set(spec.x, 0.012, spec.z);
    booth.add(mesh);
    const span = (T.footprint[1] - T.footprint[0]) / 4;
    edges.push({ mesh, axis: spec.axis, from: 0, window: [T.footprint[0] + span * i, T.footprint[0] + span * (i + 1)] });
  });
  // Corner markers pulse once the outline closes.
  const cornerGeometry = track(new THREE.RingGeometry(0.16, 0.22, 32));
  cornerGeometry.rotateX(-Math.PI / 2);
  const corners = [
    [X0, Z0],
    [X1, Z0],
    [X0, Z1],
    [X1, Z1],
  ].map(([x, z]) => {
    const ring = new THREE.Mesh(cornerGeometry, mat.goldGlow);
    ring.position.set(x, 0.014, z);
    booth.add(ring);
    return ring;
  });
  anims.push((p, time) => {
    for (const item of edges) {
      const t = easeInOutCubic(window01(p, item.window[0], item.window[1]));
      item.mesh.visible = t > 0.001;
      item.mesh.scale[item.axis] = Math.max(0.0001, t);
    }
    const closed = window01(p, T.footprint[1] - 0.01, T.footprint[1] + 0.03);
    corners.forEach((ring) => {
      ring.visible = closed > 0;
      ring.scale.setScalar(0.6 + closed * 0.4 + Math.sin(time * 2.4) * 0.05 * closed);
    });
  });

  // 2. Blueprint: fine grid, zones, dimensions and a moving visitor path.
  const blueprint = new THREE.Group();
  booth.add(blueprint);
  const gridPoints: number[] = [];
  for (let x = X0; x <= X1 + 1e-6; x += 0.5) gridPoints.push(x, 0, Z0, x, 0, Z1);
  for (let z = Z0; z <= Z1 + 1e-6; z += 0.5) gridPoints.push(X0, 0, z, X1, 0, z);
  const gridGeometry = track(new THREE.BufferGeometry());
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
  const gridMaterial = track(new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  grid.position.y = 0.016;
  blueprint.add(grid);

  const zoneLabels = fa
    ? { reception: "پذیرش", meeting: "اتاق جلسه", lounge: "نشیمن", media: "نمایشگر", entry: "ورودی", width: "۱۰ متر", depth: "۷ متر" }
    : { reception: "Reception", meeting: "Meeting room", lounge: "Lounge", media: "Media wall", entry: "Entrance", width: "10 m", depth: "7 m" };

  const zonePlane = (label: string, w: number, d: number, x: number, z: number) => {
    const scale = 128;
    const tex = canvasTexture(Math.round(w * scale), Math.round(d * scale), (ctx) => {
      const cw = ctx.canvas.width;
      const ch = ctx.canvas.height;
      ctx.fillStyle = "rgba(99,201,164,0.08)";
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = "rgba(99,201,164,0.9)";
      ctx.lineWidth = 5;
      ctx.setLineDash([22, 14]);
      ctx.strokeRect(4, 4, cw - 8, ch - 8);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(222,246,236,0.96)";
      ctx.font = font(700, 46);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = fa ? "rtl" : "ltr";
      ctx.fillText(label, cw / 2, ch / 2);
    });
    track(tex.texture);
    const material = track(new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(w, d)), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    blueprint.add(mesh);
    return material;
  };
  const zoneMaterials = [
    zonePlane(zoneLabels.reception, 3.2, 1.8, -2.2, 2.2),
    zonePlane(zoneLabels.meeting, 3, 2.7, 3.5, -2.15),
    zonePlane(zoneLabels.lounge, 2.4, 3.2, -3.8, -1.2),
    zonePlane(zoneLabels.entry, 2.6, 1.4, 2.6, 2.6),
  ];

  const dimension = (label: string, length: number, x: number, z: number, rotate: boolean) => {
    const tex = canvasTexture(1024, 128, (ctx) => {
      ctx.strokeStyle = "rgba(99,201,164,0.95)";
      ctx.fillStyle = "rgba(222,246,236,0.98)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(8, 64);
      ctx.lineTo(1016, 64);
      ctx.moveTo(8, 36);
      ctx.lineTo(8, 92);
      ctx.moveTo(1016, 36);
      ctx.lineTo(1016, 92);
      ctx.stroke();
      ctx.font = font(800, 54);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = fa ? "rtl" : "ltr";
      const metrics = ctx.measureText(label).width + 48;
      ctx.clearRect(512 - metrics / 2, 20, metrics, 88);
      ctx.fillText(label, 512, 66);
    });
    track(tex.texture);
    const material = track(new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(length, length / 8)), material);
    mesh.rotation.x = -Math.PI / 2;
    if (rotate) mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    blueprint.add(mesh);
    return material;
  };
  const dimensionMaterials = [dimension(zoneLabels.width, W, 0, Z1 + 0.9, false), dimension(zoneLabels.depth, D, X1 + 0.9, 0, true)];

  // Visitor path: chevrons that flow from the entrance into the booth.
  const chevrons = canvasTexture(256, 64, (ctx) => {
    ctx.strokeStyle = "rgba(242,210,140,0.95)";
    // A clean dashed line with one arrowhead per repeat.
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(16, 32);
    ctx.lineTo(150, 32);
    ctx.moveTo(176, 14);
    ctx.lineTo(206, 32);
    ctx.lineTo(176, 50);
    ctx.stroke();
  });
  chevrons.texture.wrapS = THREE.RepeatWrapping;
  chevrons.texture.repeat.set(0.7, 1);
  track(chevrons.texture);
  const pathMaterial = track(new THREE.MeshBasicMaterial({ map: chevrons.texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const pathCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.2, 0.03, 6.2),
    new THREE.Vector3(2.4, 0.03, 2.4),
    new THREE.Vector3(0.2, 0.03, 0.6),
    new THREE.Vector3(-2.2, 0.03, 1.6),
  ]);
  const pathGeometry = track(ribbon(pathCurve, 0.26, 60));
  const path = new THREE.Mesh(pathGeometry, pathMaterial);
  blueprint.add(path);

  anims.push((p, time) => {
    const on = easeOutCubic(window01(p, T.blueprint[0], T.blueprint[1]));
    const off = 1 - window01(p, T.blueprintOut[0], T.blueprintOut[1]);
    const level = on * off;
    blueprint.visible = level > 0.001;
    gridMaterial.opacity = 0.32 * level;
    zoneMaterials.forEach((m, i) => (m.opacity = level * clamp01((p - T.blueprint[0]) * 22 - i * 0.6)));
    dimensionMaterials.forEach((m) => (m.opacity = level));
    pathMaterial.opacity = level * easeOutCubic(window01(p, T.blueprint[0] + 0.03, T.blueprint[1] + 0.02));
    chevrons.texture.offset.x = -time * 0.35;
  });

  // 3. Platform: the raised floor slab, wood deck and edge light.
  const platformHeight = 0.16;
  const platform = pillar(W, platformHeight, D, mat.platform);
  booth.add(platform);
  const deck = canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#8a6a4c";
    ctx.fillRect(0, 0, 1024, 1024);
    // Long, quiet oak planks: low contrast so the deck reads as one surface.
    for (let row = 0; row < 16; row += 1) {
      const shift = ((row * 389) % 512);
      for (let col = -1; col < 2; col += 1) {
        const tone = Math.round(Math.sin(row * 12.9 + col * 4.1) * 6);
        ctx.fillStyle = `rgb(${142 + tone},${108 + tone},${78 + tone})`;
        ctx.fillRect(col * 512 + shift, row * 64, 510, 62);
      }
    }
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 2600; i += 1) {
      ctx.fillStyle = i % 2 ? "#2a1a0c" : "#f4dfc4";
      ctx.fillRect(Math.random() * 1024, Math.floor(Math.random() * 16) * 64 + Math.random() * 60, 40 + Math.random() * 160, 1);
    }
  });
  deck.texture.wrapS = deck.texture.wrapT = THREE.RepeatWrapping;
  deck.texture.repeat.set(2.4, 1.7);
  track(deck.texture);
  const deckMaterial = track(new THREE.MeshStandardMaterial({ map: deck.texture, roughness: 0.52, metalness: 0.04 }));
  const deckMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(W - 0.12, D - 0.12)), deckMaterial);
  deckMesh.rotation.x = -Math.PI / 2;
  deckMesh.receiveShadow = !compact;
  booth.add(deckMesh);
  const edgeLights = [
    { w: W, d: 0.03, x: 0, z: Z1 + 0.005 },
    { w: 0.03, d: D, x: X1 + 0.005, z: 0 },
  ].map((spec) => {
    const mesh = box(spec.w, 0.025, spec.d, mat.led, false);
    mesh.position.set(spec.x, 0.05, spec.z);
    booth.add(mesh);
    return mesh;
  });
  anims.push((p) => {
    const rise = easeOutCubic(window01(p, T.platform[0], T.platform[1]));
    platform.visible = rise > 0.001;
    platform.scale.y = Math.max(0.0001, rise);
    const deckOn = easeOutCubic(window01(p, T.deck[0], T.deck[1]));
    deckMesh.visible = deckOn > 0.001;
    deckMesh.position.y = platformHeight * rise + 0.002;
    deckMesh.scale.set(Math.max(0.0001, deckOn), 1, 1);
    deckMesh.position.x = (-(1 - deckOn) * (W - 0.12)) / 2;
    contactMaterial.opacity = 0.75 * rise;
    const led = window01(p, T.deck[1] - 0.01, T.deck[1] + 0.03);
    edgeLights.forEach((m) => {
      m.visible = led > 0;
      m.scale.set(m.scale.x, 1, 1);
    });
    mat.led.color.setRGB(1, 0.95 * led + 0.05, 0.84 * led + 0.1);
  });
  const floorTop = platformHeight;

  // 4. Structure: columns rise, then the roof frame slides in.
  const columnSpecs: Array<[number, number]> = [
    [X0 + 0.08, Z0 + 0.08],
    [X1 - 0.08, Z0 + 0.08],
    [X0 + 0.08, Z1 - 0.08],
    [X1 - 0.08, Z1 - 0.08],
  ];
  const posts = columnSpecs.map(([x, z]) => {
    const post = pillar(0.16, H, 0.16, mat.steel);
    post.position.set(x, floorTop, z);
    booth.add(post);
    return post;
  });
  const beamSpecs = [
    { w: W, d: 0.22, x: 0, z: Z1 - 0.08, from: new THREE.Vector3(0, 0, 3) },
    { w: W, d: 0.22, x: 0, z: Z0 + 0.08, from: new THREE.Vector3(0, 0, -3) },
    { w: 0.22, d: D, x: X0 + 0.08, z: 0, from: new THREE.Vector3(-3, 0, 0) },
    { w: 0.22, d: D, x: X1 - 0.08, z: 0, from: new THREE.Vector3(3, 0, 0) },
  ];
  const beams = beamSpecs.map((spec) => {
    const beam = box(spec.w, 0.32, spec.d, mat.steel);
    beam.position.set(spec.x, floorTop + H, spec.z);
    booth.add(beam);
    return { beam, spec };
  });
  // Suspended ceiling slats over the lounge, a signature premium detail.
  const slats: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i += 1) {
    const slat = box(0.08, 0.14, D - 0.5, mat.wood, false);
    slat.position.set(X0 + 0.6 + i * 0.42, floorTop + H - 0.18, 0);
    booth.add(slat);
    slats.push(slat);
  }
  anims.push((p) => {
    posts.forEach((post, i) => {
      const t = easeOutCubic(window01(p, T.columns[0] + i * 0.012, T.columns[1] + i * 0.012));
      post.visible = t > 0.001;
      post.scale.y = Math.max(0.0001, t);
    });
    beams.forEach(({ beam, spec }, i) => {
      const t = easeOutCubic(window01(p, T.beams[0] + i * 0.01, T.beams[1] + i * 0.01));
      beam.visible = t > 0.001;
      beam.position.set(spec.x + spec.from.x * (1 - t), floorTop + H + (1 - t) * 2.2, spec.z + spec.from.z * (1 - t));
    });
    slats.forEach((slat, i) => {
      const t = easeOutCubic(window01(p, T.beams[1] - 0.01 + i * 0.004, T.beams[1] + 0.04 + i * 0.004));
      slat.visible = t > 0.001;
      slat.scale.z = Math.max(0.0001, t);
    });
  });

  // 5. Walls, glass room and linear light.
  const wallThickness = 0.14;
  const wallHeight = H - 0.3;
  const backPanels = [0, 1, 2].map((i) => {
    const panelWidth = (W - 0.32) / 3;
    const panel = pillar(panelWidth - 0.02, wallHeight, wallThickness, i === 1 ? mat.wallLight : mat.wall);
    panel.position.set(X0 + 0.16 + panelWidth * (i + 0.5), floorTop, Z0 + 0.16);
    booth.add(panel);
    return panel;
  });
  const sidePanels = [0, 1].map((i) => {
    const panelDepth = (D - 0.32) / 2;
    const panel = pillar(wallThickness, wallHeight, panelDepth - 0.02, mat.wall);
    panel.position.set(X0 + 0.16, floorTop, Z0 + 0.16 + panelDepth * (i + 0.5));
    booth.add(panel);
    return panel;
  });
  // Vertical gold fins on the dark back panels.
  const fins: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i += 1) {
    const fin = pillar(0.05, wallHeight - 0.4, 0.06, mat.gold);
    const x = i < 3 ? X0 + 0.6 + i * 0.5 : X1 - 0.9 - (i - 3) * 0.5;
    fin.position.set(x, floorTop + 0.2, Z0 + 0.25);
    booth.add(fin);
    fins.push(fin);
  }
  // Glass meeting room in the back-right corner.
  const roomX0 = 2;
  const roomZ1 = -0.8;
  const glassHeight = 2.7;
  const glassFront = box(X1 - 0.16 - roomX0, glassHeight, 0.03, mat.glass, false);
  glassFront.position.set((roomX0 + X1 - 0.16) / 2, floorTop + glassHeight / 2, roomZ1);
  const glassSide = box(0.03, glassHeight, roomZ1 - Z0 - 0.3, mat.glass, false);
  glassSide.position.set(roomX0, floorTop + glassHeight / 2, (Z0 + 0.3 + roomZ1) / 2);
  const glassTop = box(X1 - 0.16 - roomX0, 0.06, 0.06, mat.steel, false);
  glassTop.position.set((roomX0 + X1 - 0.16) / 2, floorTop + glassHeight, roomZ1);
  const glassTopSide = box(0.06, 0.06, roomZ1 - Z0 - 0.3, mat.steel, false);
  glassTopSide.position.set(roomX0, floorTop + glassHeight, (Z0 + 0.3 + roomZ1) / 2);
  const glassGroup = new THREE.Group();
  glassGroup.add(glassFront, glassSide, glassTop, glassTopSide);
  booth.add(glassGroup);
  // Linear light along the top of the back wall and under the front beam.
  const linearLights = [
    { w: W - 0.4, x: 0, z: Z0 + 0.25, y: floorTop + wallHeight - 0.05 },
    { w: W - 0.4, x: 0, z: Z1 - 0.2, y: floorTop + H - 0.2 },
  ].map((spec) => {
    const strip = box(spec.w, 0.04, 0.04, mat.led, false);
    strip.position.set(spec.x, spec.y, spec.z);
    booth.add(strip);
    return strip;
  });
  anims.push((p) => {
    backPanels.forEach((panel, i) => {
      const t = easeOutCubic(window01(p, T.walls[0] + i * 0.012, T.walls[1] + i * 0.012));
      panel.visible = t > 0.001;
      panel.scale.y = Math.max(0.0001, t);
    });
    sidePanels.forEach((panel, i) => {
      const t = easeOutCubic(window01(p, T.walls[0] + 0.02 + i * 0.012, T.walls[1] + 0.02 + i * 0.012));
      panel.visible = t > 0.001;
      panel.scale.y = Math.max(0.0001, t);
    });
    fins.forEach((fin, i) => {
      const t = easeOutCubic(window01(p, T.walls[1] + i * 0.004, T.walls[1] + 0.03 + i * 0.004));
      fin.visible = t > 0.001;
      fin.scale.y = Math.max(0.0001, t);
    });
    const g = easeOutCubic(window01(p, T.glass[0], T.glass[1]));
    glassGroup.visible = g > 0.001;
    glassGroup.position.y = (1 - g) * 3;
    mat.glass.opacity = 0.26 * g;
    const lit = window01(p, T.glass[1], T.glass[1] + 0.03);
    linearLights.forEach((strip) => {
      strip.visible = lit > 0;
      strip.scale.x = Math.max(0.0001, lit);
    });
  });

  // 6. Identity: the Aratta mark in 3D, the header sign and the media screen.
  const markSize = 2.1;
  const markOrigin = new THREE.Vector3(-0.15 - markSize / 2, floorTop + 0.75 + markSize, Z0 + 0.25);
  const markPieces = MARK_BLOCKS.map(([bx, by, bw, bh], i) => {
    const w = (bw / 1000) * markSize;
    const h = (bh / 1000) * markSize;
    const piece = box(w, h, 0.12, mat.gold);
    const home = new THREE.Vector3(markOrigin.x + (bx / 1000) * markSize + w / 2, markOrigin.y - (by / 1000) * markSize - h / 2, markOrigin.z + 0.06);
    piece.position.copy(home);
    booth.add(piece);
    const from = new THREE.Vector3([2.5, -2, -2.4, -2.4][i], [0, -1.2, 1.4, 0.4][i], 2.4);
    return { piece, home, from };
  });
  // Brand words under the mark, on the light centre panel.
  const words = canvasTexture(1024, 256, (ctx) => {
    ctx.fillStyle = "#1a1d20";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.font = font(800, 112);
    ctx.fillText("اَرَتَ", 512, 92);
    ctx.direction = "ltr";
    ctx.font = font(700, 54);
    ctx.letterSpacing = "18px";
    ctx.fillText("ARATTA EXPO", 512, 200);
  });
  track(words.texture);
  const wordsMaterial = track(new THREE.MeshBasicMaterial({ map: words.texture, transparent: true, opacity: 0, depthWrite: false }));
  const wordsMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(2.4, 0.6)), wordsMaterial);
  wordsMesh.position.set(-0.15, floorTop + 0.42, Z0 + 0.235);
  booth.add(wordsMesh);
  // Remove the words if the mark sits on a dark panel: centre panel is light.

  // Header lightbox on the front beam.
  const signLength = 5.2;
  const sign = canvasTexture(2048, 256, (ctx) => {
    ctx.fillStyle = "#0b0d0f";
    ctx.fillRect(0, 0, 2048, 256);
    const g = ctx.createLinearGradient(0, 0, 2048, 0);
    g.addColorStop(0, "rgba(211,168,75,0)");
    g.addColorStop(0.5, "rgba(211,168,75,0.22)");
    g.addColorStop(1, "rgba(211,168,75,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2048, 256);
    drawMark(ctx, 120, 28, 200, "#e0b75a");
    ctx.fillStyle = "#f5efe3";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.font = font(800, 104);
    ctx.fillText("اَرَتَ", 760, 132);
    ctx.fillStyle = "#e0b75a";
    ctx.fillRect(1010, 70, 4, 116);
    ctx.direction = "ltr";
    ctx.fillStyle = "#f5efe3";
    ctx.font = font(700, 80);
    ctx.letterSpacing = "14px";
    ctx.fillText("ARATTA EXPO", 1500, 136);
  });
  track(sign.texture);
  const signMaterial = track(new THREE.MeshStandardMaterial({ map: sign.texture, emissiveMap: sign.texture, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0, roughness: 0.4, metalness: 0.1 }));
  const signBox = new THREE.Mesh(track(new THREE.BoxGeometry(signLength, signLength / 8, 0.16)), [mat.steel, mat.steel, mat.steel, mat.steel, signMaterial, mat.steel]);
  signBox.position.set(0.4, floorTop + H + 0.48, Z1 - 0.08);
  booth.add(signBox);

  // Media screen on the side wall, with live-feeling content.
  const screenW = 2.9;
  const screenH = screenW * (9 / 16);
  const screen = canvasTexture(compact ? 640 : 960, compact ? 360 : 540, () => undefined);
  track(screen.texture);
  const screenMaterial = track(new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false, color: new THREE.Color(0, 0, 0) }));
  const screenFrame = box(0.08, screenH + 0.1, screenW + 0.1, mat.steel, false);
  const screenFace = new THREE.Mesh(track(new THREE.PlaneGeometry(screenW, screenH)), screenMaterial);
  screenFace.rotation.y = Math.PI / 2;
  const screenGroup = new THREE.Group();
  screenGroup.add(screenFrame, screenFace);
  screenFace.position.x = 0.045;
  screenGroup.position.set(X0 + 0.27, floorTop + 2.05, 0.9);
  booth.add(screenGroup);
  const screenCopy = fa
    ? { title: "نمایشگاه‌های تخصصی صنعت و معدن", sub: "کرمان · ایران", brand: "اَرَتَ" }
    : { title: "Industry & mining exhibitions", sub: "Kerman · Iran", brand: "Aratta Expo" };
  let lastScreenDraw = -1;
  const drawScreen = (time: number) => {
    const ctx = screen.ctx;
    const cw = screen.canvas.width;
    const ch = screen.canvas.height;
    const s = cw / 960;
    const g = ctx.createLinearGradient(0, 0, cw, ch);
    g.addColorStop(0, "#071216");
    g.addColorStop(1, "#14100a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    // Slow contour lines, like a geological survey.
    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 9; i += 1) {
      ctx.strokeStyle = `rgba(99,201,164,${0.08 + i * 0.018})`;
      ctx.beginPath();
      for (let x = 0; x <= cw; x += 16 * s) {
        const y = ch * 0.62 + i * 18 * s + Math.sin(x / (120 * s) + time * 0.6 + i * 0.7) * 22 * s;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Light sweep.
    const sweep = ((time * 0.18) % 1.4) - 0.2;
    const sg = ctx.createLinearGradient(cw * (sweep - 0.15), 0, cw * (sweep + 0.15), 0);
    sg.addColorStop(0, "rgba(255,226,170,0)");
    sg.addColorStop(0.5, "rgba(255,226,170,0.12)");
    sg.addColorStop(1, "rgba(255,226,170,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, cw, ch);
    drawMark(ctx, fa ? cw - 190 * s : 60 * s, 52 * s, 130 * s, "#e0b75a");
    ctx.fillStyle = "#f5efe3";
    ctx.direction = fa ? "rtl" : "ltr";
    ctx.textAlign = fa ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    const textX = fa ? cw - 64 * s : 64 * s;
    ctx.font = font(800, 58 * s);
    ctx.fillText(screenCopy.brand, textX, 250 * s);
    ctx.font = font(600, 34 * s);
    ctx.fillStyle = "rgba(245,239,227,0.82)";
    ctx.fillText(screenCopy.title, textX, 306 * s);
    ctx.font = font(600, 26 * s);
    ctx.fillStyle = "#e0b75a";
    ctx.fillText(screenCopy.sub, textX, 350 * s);
    screen.texture.needsUpdate = true;
  };
  drawScreen(0);

  anims.push((p, time) => {
    markPieces.forEach(({ piece, home, from }, i) => {
      const t = easeOutBack(window01(p, T.mark[0] + i * 0.012, T.mark[1] + i * 0.012), 1.1);
      piece.visible = t > 0.001;
      piece.position.set(home.x + from.x * (1 - t), home.y + from.y * (1 - t), home.z + from.z * (1 - t));
      piece.rotation.y = (1 - t) * 0.9;
    });
    const glow = window01(p, T.mark[1] + 0.02, T.mark[1] + 0.06);
    mat.gold.emissiveIntensity = 0.06 + glow * 0.16;
    wordsMaterial.opacity = easeOutCubic(window01(p, T.mark[1], T.mark[1] + 0.04));
    wordsMesh.visible = wordsMaterial.opacity > 0.001;
    const s = easeOutCubic(window01(p, T.sign[0], T.sign[1]));
    signBox.visible = s > 0.001;
    signBox.position.y = floorTop + H + 0.48 + (1 - s) * 1.6;
    signMaterial.emissiveIntensity = window01(p, T.sign[1] - 0.01, T.sign[1] + 0.03) * 0.95;
    const sc = easeOutCubic(window01(p, T.screen[0], T.screen[1]));
    screenGroup.visible = sc > 0.001;
    screenGroup.scale.set(1, Math.max(0.0001, sc), Math.max(0.0001, sc));
    const power = window01(p, T.screen[1] - 0.005, T.screen[1] + 0.03);
    screenMaterial.color.setScalar(power);
    if (power > 0 && time - lastScreenDraw > 1 / 24) {
      lastScreenDraw = time;
      drawScreen(time);
    }
  });

  // 7. Hospitality: counter, meeting furniture, lounge, plants, brochures.
  const furniture: Array<{ object: THREE.Object3D; window: [number, number] }> = [];
  const place = (object: THREE.Object3D, x: number, z: number, start: number, rotation = 0) => {
    object.position.set(x, floorTop, z);
    object.rotation.y = rotation;
    booth.add(object);
    furniture.push({ object, window: [start, start + 0.045] });
  };
  const group = (...meshes: THREE.Object3D[]) => {
    const g = new THREE.Group();
    g.add(...meshes);
    return g;
  };
  const at = <M extends THREE.Object3D>(mesh: M, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    return mesh;
  };

  // Reception counter with gold top and the mark on its face.
  const counterFace = canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#efebe4";
    ctx.fillRect(0, 0, 512, 256);
    drawMark(ctx, 196, 58, 120, "#c99a3c");
  });
  track(counterFace.texture);
  const counterFront = track(new THREE.MeshStandardMaterial({ map: counterFace.texture, roughness: 0.42 }));
  const counterBody = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 1.02, 0.62)), [mat.counter, mat.counter, mat.counter, mat.counter, counterFront, mat.counter]);
  counterBody.castShadow = !compact;
  counterBody.position.y = 0.51;
  place(group(counterBody, at(box(2.5, 0.05, 0.72, mat.gold), 0, 1.045, 0), at(box(2.3, 0.02, 0.02, mat.led, false), 0, 0.04, 0.32)), -2.3, 2.3, T.furniture[0]);

  // High table with two stools at the entrance.
  const stool = () => group(at(box(0.04, 0.72, 0.04, mat.steel), 0, 0.36, 0), at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24)), mat.fabricWarm), 0, 0.75, 0), at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24)), mat.steel), 0, 0.01, 0));
  const highTable = group(
    at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 40)), mat.counter), 0, 1.05, 0),
    at(box(0.06, 1.04, 0.06, mat.steel), 0, 0.52, 0),
    at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 32)), mat.steel), 0, 0.01, 0),
  );
  place(highTable, 1.1, 1.9, T.furniture[0] + 0.012);
  place(stool(), 1.75, 1.75, T.furniture[0] + 0.02);
  place(stool(), 0.55, 2.35, T.furniture[0] + 0.024);

  // Meeting table and chairs inside the glass room.
  const chair = () => group(at(box(0.46, 0.06, 0.46, mat.fabric), 0, 0.46, 0), at(box(0.46, 0.5, 0.06, mat.fabric), 0, 0.72, -0.2), at(box(0.04, 0.44, 0.04, mat.steel), 0, 0.22, 0));
  const meetingTable = group(at(box(1.6, 0.05, 0.9, mat.wood), 0, 0.74, 0), at(box(0.08, 0.72, 0.5, mat.steel), -0.6, 0.36, 0), at(box(0.08, 0.72, 0.5, mat.steel), 0.6, 0.36, 0));
  place(meetingTable, 3.55, -2.15, T.furniture[0] + 0.03);
  place(chair(), 3.15, -1.45, T.furniture[0] + 0.036, Math.PI);
  place(chair(), 3.95, -1.45, T.furniture[0] + 0.04, Math.PI);
  place(chair(), 3.15, -2.85, T.furniture[0] + 0.044);
  place(chair(), 3.95, -2.85, T.furniture[0] + 0.048);

  // Lounge under the screen.
  const sofa = group(at(box(0.8, 0.42, 2.2, mat.fabric), 0, 0.21, 0), at(box(0.22, 0.42, 2.2, mat.fabric), -0.32, 0.62, 0), at(box(0.8, 0.3, 0.18, mat.fabric), 0, 0.54, 1.0), at(box(0.8, 0.3, 0.18, mat.fabric), 0, 0.54, -1.0));
  place(sofa, -4.25, 0.9, T.furniture[0] + 0.05);
  const coffee = group(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 40)), mat.gold), 0, 0.42, 0), at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.12, 0.4, 16)), mat.steel), 0, 0.2, 0));
  place(coffee, -3.15, 0.9, T.furniture[0] + 0.056);
  const armchair = group(at(box(0.8, 0.42, 0.8, mat.fabricWarm), 0, 0.21, 0), at(box(0.8, 0.42, 0.2, mat.fabricWarm), 0, 0.62, -0.3));
  place(armchair, -3.0, -0.6, T.furniture[0] + 0.06, 0.25);

  // Plants and a brochure stand.
  const plant = (scale: number) => {
    const foliage = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.42 * scale, 2)), mat.leaf);
    foliage.castShadow = !compact;
    return group(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.24 * scale, 0.19 * scale, 0.55 * scale, 24)), mat.pot), 0, 0.275 * scale, 0), at(foliage, 0, 0.95 * scale, 0), at(new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.3 * scale, 2)), mat.leaf), 0.12 * scale, 1.35 * scale, 0.05));
  };
  place(plant(1.1), X1 - 0.45, Z1 - 0.45, T.furniture[0] + 0.066);
  place(plant(0.9), -0.9, 2.95, T.furniture[0] + 0.07);
  place(plant(1.25), X0 + 0.5, Z0 + 0.55, T.furniture[0] + 0.072);
  const brochures = group(at(box(0.5, 1.3, 0.04, mat.steel), 0, 0.65, 0), ...[0, 1, 2].map((i) => at(box(0.42, 0.28, 0.02, i === 1 ? mat.gold : mat.counter, false), 0, 0.45 + i * 0.32, 0.04)));
  place(brochures, X1 - 0.5, 1.2, T.furniture[0] + 0.074, -Math.PI / 2.4);

  anims.push((p) => {
    for (const item of furniture) {
      const t = window01(p, item.window[0], item.window[1]);
      item.object.visible = t > 0.001;
      const k = easeOutBack(t, 1.4);
      item.object.scale.setScalar(Math.max(0.0001, 0.3 + 0.7 * k));
      item.object.position.y = floorTop + (1 - easeOutCubic(t)) * 1.4;
    }
    const lit = easeOutCubic(window01(p, T.lights[0], T.lights[1]));
    boothWarm.intensity = lit * (compact ? 14 : 18);
    spots.forEach((spot) => (spot.intensity = lit * 60));
    poolMaterial.opacity = 0.3 + lit * 0.45;
  });

  // ---------------------------------------------------------------- camera
  const positions = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k.position)), false, "centripetal");
  const targets = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k.target)), false, "centripetal");
  const keyTimes = CAMERA_KEYS.map((k) => k.at);
  const curveAt = (p: number) => {
    let i = 0;
    while (i < keyTimes.length - 2 && p > keyTimes[i + 1]) i += 1;
    const local = clamp01((p - keyTimes[i]) / (keyTimes[i + 1] - keyTimes[i]));
    return (i + easeInOutCubic(local) * 0.6 + local * 0.4) / (keyTimes.length - 1);
  };

  const camPos = new THREE.Vector3();
  const boothCentre = new THREE.Vector3(0, 1.2, 0);
  const camTarget = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
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

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? 52 : camera.aspect < 1.2 ? 46 : 38;
    camera.updateProjectionMatrix();
  };

  const applyCamera = (p: number, time: number) => {
    const u = curveAt(p);
    positions.getPoint(Math.min(1, u), camPos);
    targets.getPoint(Math.min(1, u), camTarget);
    // Portrait screens: step back so the whole booth stays in frame.
    const aspect = width / height;
    // Portrait screens: aim closer to the booth's centre so it never leaves frame.
    if (aspect < 1) camTarget.lerp(boothCentre, 0.7);
    const closing = window01(p, 0.89, 0.95);
    const distance = aspect < 1 ? Math.min(1.7, 0.82 / aspect) * (1 - closing * 0.22) : aspect < 1.3 ? 1.12 : 1;
    camPos.sub(camTarget).multiplyScalar(distance).add(camTarget);
    pointerSmooth.lerp(pointer, 0.06);
    camPos.x += pointerSmooth.x * 0.7 + Math.sin(time * 0.25) * 0.12;
    camPos.y += pointerSmooth.y * 0.35 + Math.sin(time * 0.31) * 0.06;
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    // Leave room for the copy: on phones the card sits at the bottom, on
    // desktop the copy sits on the reading-start side.
    const middle = window01(p, 0.05, 0.1) * (1 - window01(p, 0.89, 0.93));
    const finale = window01(p, 0.89, 0.95);
    if (aspect < 1) {
      camera.setViewOffset(width, height, 0, height * (0.14 + finale * 0.04), width, height);
    } else {
      const side = (fa ? 1 : -1) * width * 0.17 * middle;
      camera.setViewOffset(width, height, side, height * 0.2 * finale, width, height);
    }
  };

  const render = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    elapsed += dt;
    const before = current;
    current += (target - current) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(target - current) < 0.00005) current = target;
    const moving = before !== current || pointerSmooth.distanceToSquared(pointer) > 1e-6;
    // Settled frames still animate the screen and path, at a gentler rate.
    if (moving || now - lastRender > 1000 / 30) {
      lastRender = now;
      for (const anim of anims) anim(current, elapsed);
      applyCamera(current, elapsed);
      renderer.render(scene, camera);
      options.onFrame?.(current);
    }
  };

  const loop = (now: number) => {
    if (disposed) return;
    if (active) render(now);
    frame = requestAnimationFrame(loop);
  };

  resize();
  for (const anim of anims) anim(0, 0);
  applyCamera(0, 0);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  frame = requestAnimationFrame(loop);

  return {
    setTarget(progress, immediate) {
      target = clamp01(progress);
      if (immediate) current = target;
    },
    setPointer(x, y) {
      pointer.set(x, y);
    },
    setActive(value) {
      active = value;
      last = performance.now();
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}

/** A flat ribbon that follows a curve, with UVs running along it. */
function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, segments: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3();
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    side.crossVectors(up, tangent).normalize().multiplyScalar(width / 2);
    positions.push(point.x + side.x, point.y, point.z + side.z, point.x - side.x, point.y, point.z - side.z);
    uvs.push(t * 6, 1, t * 6, 0);
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
