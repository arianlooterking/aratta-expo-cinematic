// The build backdrops: quiet technical drawings of an exhibition stand going
// up, one per section, so the page tells the hero's build story again in
// miniature. Drawing units are centimetres unless noted, so the proportions are
// real: a 290 mm box truss, 1 m floor panels, 4 m wall frames, a 6 m tower.

import type { CSSProperties } from "react";
import { LOGO_BAND, LOGO_HEIGHT, LOGO_RECTS, type LogoRect } from "@/components/booth3d/brand-logo";
import {
  Arrive,
  Beam,
  BeamGradient,
  Bubble,
  Dim,
  Fade,
  Label,
  Ln,
  Path,
  StandUp,
  circlePath,
  digits,
  rectPath,
  type Motif,
  type MotifProps,
  type Span,
} from "./primitives";
import {
  CompassMotif,
  ConveyorMotif,
  LayoutMotif,
  LensMotif,
  PressWallMotif,
  RouteMotif,
  ScheduleMotif,
  ScreenMotif,
} from "./motifs-topics";

const at = (a: number, len: number): Span => [a, a + len];

/* ------------------------------------------------------------------ truss */
// Side elevation: a 12 m run of 290 mm box truss in four 3 m sections. The
// sections draw, slide together and pin; the run rises 4.2 m on three chain
// hoists to a 4.5 m trim; then five profile spots switch on.

const TRUSS = { x0: 100, top: 301, bottom: 330, floor: 780, roof: 40, seg: 300 };
const HOISTS = [250, 700, 1150];
const SPOTS = [
  { x: 220, aim: 250 },
  { x: 440, aim: 470 },
  { x: 700, aim: 700 },
  { x: 960, aim: 930 },
  { x: 1180, aim: 1150 },
];
const RISE = 420;

function trussSegment(x0: number) {
  const { top, bottom, seg } = TRUSS;
  let zig = `M${x0} ${bottom}`;
  for (let i = 0; i < 12; i += 1) zig += `L${x0 + 25 * (i + 1)} ${i % 2 === 0 ? top : bottom}`;
  return {
    chords: `M${x0} ${top}H${x0 + seg}M${x0} ${bottom}H${x0 + seg}M${x0 + 2} ${top}V${bottom}M${x0 + seg - 2} ${top}V${bottom}`,
    lacing: zig,
  };
}

function TrussMotif({ fa, id }: MotifProps) {
  const { x0, top, bottom, floor, roof, seg } = TRUSS;
  const order = (k: number) => (fa ? 3 - k : k);
  return (
    <>
      <defs>
        <BeamGradient id={`${id}-beam`} />
      </defs>
      {/* Hall roof steel and the floor. */}
      <Ln d={`M0 ${roof}H1400M0 ${roof + 16}H1400`} span={[0, 0.12]} w={2} tone="faint" />
      <Ln d={`M0 ${floor}H1400`} span={[0.02, 0.14]} w={2} tone="faint" />
      {/* Chain hoists hang from the roof. */}
      {HOISTS.map((x, i) => (
        <Fade key={x} span={at(0.08 + i * 0.03, 0.08)}>
          <Path d={`M${x - 3} ${roof + 16}V${roof + 26}M${x + 3} ${roof + 16}V${roof + 26}`} w={1} />
          <Path d={rectPath(x - 11, roof + 26, 22, 34)} w={2} />
          <Path d={`M${x} ${roof + 60}V${roof + 68}`} w={1} />
        </Fade>
      ))}
      {/* The run rises with the chains. */}
      <Arrive span={[0.44, 0.72]} dy={RISE} fade={false}>
        {[0, 1, 2, 3].map((k) => {
          const s = trussSegment(x0 + seg * k);
          const step = order(k);
          return (
            <Arrive key={k} span={at(0.24 + step * 0.035, 0.12)} dx={k < 2 ? -140 : 140} fade={false}>
              <Ln d={s.chords} span={at(0.1 + step * 0.035, 0.1)} w={3} />
              <Ln d={s.lacing} span={at(0.14 + step * 0.035, 0.12)} w={1} />
            </Arrive>
          );
        })}
        {/* Pins at the three joints, top and bottom chords. */}
        <Fade span={[0.39, 0.44]}>
          {[1, 2, 3].map((k) => (
            <g key={k}>
              <Path d={circlePath(x0 + seg * k, top + 4, 3)} w={2} tone="teal" />
              <Path d={circlePath(x0 + seg * k, bottom - 4, 3)} w={2} tone="teal" />
            </g>
          ))}
        </Fade>
        {/* Hooks on the top chord. */}
        <Fade span={[0.38, 0.44]}>
          {HOISTS.map((x) => (
            <Path key={x} d={`M${x - 8} ${top}V${top - 8}H${x + 8}V${top}`} w={1} />
          ))}
        </Fade>
      </Arrive>
      {/* Chains: pay out to the truss below, shorten as it rises, then tick idly. */}
      <Fade span={[0.36, 0.44]}>
        {HOISTS.map((x) => (
          <path
            key={x}
            d={`M${x} ${roof + 68}V${top - 8}`}
            className="bb-ln bb-w2 bb-chain bb-st bb-tick"
            style={{ "--a": 0.44, "--b": 0.72, "--k": RISE / (top - 8 - roof - 68) } as CSSProperties}
          />
        ))}
      </Fade>
      {/* Spots: clamp, yoke and body, aimed at the floor. */}
      {SPOTS.map((spot, i) => {
        const angle = Math.atan2(spot.aim - spot.x, floor - bottom) * (180 / Math.PI);
        return (
          <g key={spot.x}>
            <Fade span={at(0.72 + i * 0.015, 0.06)}>
              <g transform={`rotate(${-angle} ${spot.x} ${bottom + 12})`}>
                <Path d={rectPath(spot.x - 5, bottom, 10, 8)} w={1} />
                <Path d={`M${spot.x - 12} ${bottom + 10}V${bottom + 24}M${spot.x + 12} ${bottom + 10}V${bottom + 24}M${spot.x - 12} ${bottom + 10}H${spot.x + 12}`} w={1} />
                <Path d={rectPath(spot.x - 9, bottom + 14, 18, 30)} w={2} />
                <Path d={`M${spot.x - 7} ${bottom + 44}H${spot.x + 7}`} w={2} tone="teal" />
              </g>
            </Fade>
            <Beam
              x={spot.x + (spot.aim - spot.x) * 0.03}
              y={bottom + 46}
              x2={spot.aim}
              floor={floor}
              spread={74}
              gradient={`${id}-beam`}
              span={at(0.84 + i * 0.02, 0.06)}
              breathe={(i % 3) + 1}
            />
            <Fade span={at(0.88 + i * 0.02, 0.06)}>
              <Path d={`M${spot.aim - 74} ${floor}H${spot.aim + 74}`} w={2} tone="teal" />
            </Fade>
          </g>
        );
      })}
      {/* Dimensions: span, trim height, truss depth. */}
      <Dim x1={x0} y1={floor + 26} x2={x0 + 1200} y2={floor + 26} label={digits("12000", fa)} span={[0.56, 0.7]} tick={12} off={-14} ext={18} />
      <Dim x1={1350} y1={floor} x2={1350} y2={bottom} label={digits("4500", fa)} span={[0.7, 0.82]} tick={12} off={-16} />
      <Dim x1={60} y1={bottom} x2={60} y2={top} span={[0.72, 0.8]} tick={8} />
      <Fade span={[0.76, 0.82]}>
        <Label x={44} y={top - 18} anchor="start">
          {digits("290", fa)}
        </Label>
      </Fade>
    </>
  );
}

/* ------------------------------------------------------------------ floor */
// Isometric raised floor for a 6 x 4 m stand: the hall grid, 35 pedestals at
// 1 m centres, then 24 one-metre panels dropping in a wave, then the 15 cm edge.

const ISO = { ox: 390, oy: 130, c: 0.866 };
const iso = (x: number, y: number, z = 0): [number, number] => [ISO.ox + (x - y) * ISO.c, ISO.oy + (x + y) * 0.5 - z];
const pt = (x: number, y: number, z = 0) => iso(x, y, z).map((n) => Math.round(n * 10) / 10).join(" ");
const H = 15;

function FloorMotif({ fa }: MotifProps) {
  const order = (i: number, j: number) => (fa ? 5 - i + j : i + j);
  const grid: string[] = [];
  for (let x = -100; x <= 700; x += 100) grid.push(`M${pt(x, -100)}L${pt(x, 500)}`);
  for (let y = -100; y <= 500; y += 100) grid.push(`M${pt(-100, y)}L${pt(700, y)}`);
  const pedestals = [];
  for (let i = 0; i <= 6; i += 1)
    for (let j = 0; j <= 4; j += 1) {
      const x = i * 100;
      const y = j * 100;
      pedestals.push({
        key: `${i}-${j}`,
        d: `M${pt(x, y)}L${pt(x, y, H - 3)}M${pt(x - 6, y, H - 3)}L${pt(x + 6, y, H - 3)}M${pt(x, y - 6, H - 3)}L${pt(x, y + 6, H - 3)}`,
        a: 0.16 + 0.012 * (fa ? 6 - i + j : i + j),
      });
    }
  const panels = [];
  for (let i = 0; i < 6; i += 1)
    for (let j = 0; j < 4; j += 1) {
      const x = i * 100 + 2;
      const y = j * 100 + 2;
      panels.push({
        key: `${i}-${j}`,
        i,
        j,
        d: `M${pt(x, y, H)}L${pt(x + 96, y, H)}L${pt(x + 96, y + 96, H)}L${pt(x, y + 96, H)}Z`,
        a: 0.36 + 0.028 * order(i, j),
      });
    }
  const edge = `M${pt(0, 400, H)}L${pt(600, 400, H)}L${pt(600, 0, H)}M${pt(0, 400, 0)}L${pt(600, 400, 0)}L${pt(600, 0, 0)}M${pt(0, 400, 0)}L${pt(0, 400, H)}M${pt(600, 400, 0)}L${pt(600, 400, H)}M${pt(600, 0, 0)}L${pt(600, 0, H)}`;
  const [d1x, d1y] = iso(0, 470);
  const [d2x, d2y] = iso(600, 470);
  const [d3x, d3y] = iso(670, 400);
  const [d4x, d4y] = iso(670, 0);
  return (
    <>
      {grid.map((d, k) => (
        <Ln key={d} d={d} span={at(0.0 + k * 0.01, 0.12)} w={1} tone="tealFaint" />
      ))}
      {pedestals.map((p) => (
        <Ln key={p.key} d={p.d} span={at(p.a, 0.06)} w={2} />
      ))}
      {panels.map((p) => {
        const panel = (
          <Arrive key={p.key} span={at(p.a, 0.12)} dy={-70}>
            <Path d={p.d} w={2} className="bb-panel" />
          </Arrive>
        );
        // One panel is lifted and reset now and then, the way a fitter levels a floor.
        return p.i === 3 && p.j === 1 ? (
          <g key={p.key} className="bb-settle">
            {panel}
          </g>
        ) : (
          panel
        );
      })}
      <Ln d={edge} span={[0.74, 0.86]} w={3} />
      <Dim x1={d1x} y1={d1y} x2={d2x} y2={d2y} label={digits("6000", fa)} span={[0.8, 0.92]} tick={12} off={16} />
      <Dim x1={d3x} y1={d3y} x2={d4x} y2={d4y} label={digits("4000", fa)} span={[0.84, 0.96]} tick={12} off={-16} />
    </>
  );
}

/* ------------------------------------------------------------------ walls */
// Elevation of a 9 m wall line in six 1.5 m bays, 4 m high. Each frame stands
// up, then its two panels click onto the hooks, bay by bay in reading order.
// Grid bubbles number the bays to match the six exhibitor steps.

const WALL = { x0: 80, bay: 150, top: 120, floor: 520, rail: 320 };

function WallsMotif({ fa, id }: MotifProps) {
  const { x0, bay, top, floor, rail } = WALL;
  const bays = [0, 1, 2, 3, 4, 5];
  const step = (k: number) => (fa ? 5 - k : k);
  return (
    <>
      <defs>
        <BeamGradient id={`${id}-wash`} />
      </defs>
      <Ln d={`M20 ${floor}H1040`} span={[0, 0.1]} w={2} tone="faint" />
      {bays.map((k) => {
        const x = x0 + bay * k;
        const s = step(k);
        const a = 0.1 + s * 0.075;
        return (
          <g key={k}>
            <StandUp span={at(a, 0.09)}>
              <Path d={rectPath(x + 1, top, bay - 2, floor - top)} w={3} />
              <Path d={rectPath(x + 6, top + 5, bay - 12, floor - top - 10)} w={1} />
              <Path d={`M${x + 6} ${rail}H${x + bay - 6}`} w={2} />
              <Path d={`M${x - 4} ${floor}H${x + 14}M${x + bay - 14} ${floor}H${x + bay + 4}`} w={2} />
            </StandUp>
            <Arrive span={at(a + 0.08, 0.06)} dy={-26}>
              <Path d={rectPath(x + 10, top + 9, bay - 20, rail - top - 13)} w={1} tone="teal" className="bb-panel bb-panel--teal" />
            </Arrive>
            <Arrive span={at(a + 0.11, 0.06)} dy={-26}>
              <Path d={rectPath(x + 10, rail + 4, bay - 20, floor - rail - 13)} w={1} tone="teal" className="bb-panel bb-panel--teal" />
            </Arrive>
            <Ln d={`M${x + bay / 2} ${floor + 6}V${floor + 30}`} span={at(0.04 + s * 0.02, 0.06)} w={1} tone="faint" />
            <Bubble x={x + bay / 2} y={floor + 52} r={19} label={digits(s + 1, fa)} span={at(0.05 + s * 0.02, 0.08)} />
          </g>
        );
      })}
      {/* Header beam and wall-wash lights. */}
      <Ln d={`M${x0} ${top - 22}H${x0 + bay * 6}M${x0} ${top}H${x0 + bay * 6}M${x0} ${top - 22}V${top}M${x0 + bay * 6} ${top - 22}V${top}`} span={[0.74, 0.84]} w={3} />
      {bays.map((k) => (
        <Beam
          key={k}
          x={x0 + bay * k + bay / 2}
          y={top + 4}
          x2={x0 + bay * k + bay / 2}
          floor={top + 230}
          spread={58}
          gradient={`${id}-wash`}
          span={at(0.86 + step(k) * 0.015, 0.06)}
          breathe={k === 2 || k === 4 ? (k === 2 ? 1 : 2) : 0}
        />
      ))}
      <Dim x1={x0} y1={top - 52} x2={x0 + bay * 6} y2={top - 52} label={digits("9000", fa)} span={[0.8, 0.92]} tick={12} off={14} ext={26} />
      <Dim x1={1010} y1={floor} x2={1010} y2={top} label={digits("4000", fa)} span={[0.82, 0.94]} tick={12} off={-16} />
    </>
  );
}

/* ------------------------------------------------------------------ stand */
// Front elevation of a 12 m two-storey stand: 3 m ground storey, an upper
// meeting room and glass balustrade, a stair, and a 6 m tower that carries the
// logo. Drawn line by line in build order, then lit.

const ST = { floor: 700, deck: 400, beam: 370, roomTop: 130, towerTop: 100 };

function LogoMark({ x, y, w, span }: { x: number; y: number; w: number; span: Span }) {
  const [a, b] = span;
  const shapes = [...LOGO_RECTS, LOGO_BAND];
  return (
    <g>
      {shapes.map((r, i) => {
        const box = logoBox(r, w, x, y);
        return (
          <Fade key={i} span={at(a + (i / shapes.length) * (b - a) * 0.6, (b - a) * 0.4)}>
            <path d={rectPath(box.x, box.y, box.w, box.h)} className={r.kind === "gold" ? "bb-solid-gold" : "bb-solid-dark"} />
          </Fade>
        );
      })}
    </g>
  );
}

function StandMotif({ fa, id }: MotifProps) {
  const { floor, deck, beam, roomTop, towerTop } = ST;
  const risers = 18;
  let stair = `M180 ${floor}`;
  for (let i = 0; i < risers; i += 1) {
    const y = floor - ((i + 1) * (floor - deck)) / risers;
    const x = 180 + (i * 340) / risers;
    stair += `V${y}H${x + 340 / risers}`;
  }
  const mullions = [630, 700, 770, 840, 910, 980].map((x) => `M${x} ${roomTop + 6}V${beam}`).join("");
  const joints = [200, 300, 400, 500, 600].map((y) => `M1100 ${y}H1250`).join("");
  return (
    <>
      <defs>
        <BeamGradient id={`${id}-down`} />
        <BeamGradient id={`${id}-glow`} tone="teal" />
      </defs>
      <Ln d={`M0 ${floor}H1400`} span={[0, 0.08]} w={2} tone="faint" />
      {/* Ground-storey posts, bottom to top. */}
      {[100, 520, 1030].map((x, i) => (
        <Ln key={x} d={`M${x} ${floor}V${deck}M${x + 20} ${floor}V${deck}`} span={at(0.06 + i * 0.03, 0.1)} w={3} />
      ))}
      {/* Deck beam and its fascia. */}
      <Ln d={`M100 ${deck}H1050M100 ${beam}H1050M100 ${beam}V${deck}M1050 ${beam}V${deck}`} span={[0.16, 0.3]} w={3} />
      <Ln d={stair} span={[0.26, 0.4]} w={1} />
      <Ln d={`M180 ${floor}L520 ${deck}`} span={[0.28, 0.4]} w={2} />
      {/* Upper storey: meeting room, glazing, balustrade. */}
      <Ln d={`M560 ${beam}V${roomTop}M1030 ${beam}V${roomTop}M560 ${roomTop}H1050M560 ${roomTop + 20}H1030`} span={[0.32, 0.46]} w={3} />
      <Ln d={mullions} span={[0.46, 0.56]} w={1} />
      <Ln d={`M100 ${beam}V${beam - 110}H560M100 ${beam - 100}H560M330 ${beam}V${beam - 110}`} span={[0.44, 0.54]} w={2} tone="teal" />
      {/* The 6 m tower, drawn from the floor up. */}
      <Ln d={`M1100 ${floor}V${towerTop}H1250V${floor}`} span={[0.3, 0.52]} w={3} />
      <Ln d={joints} span={[0.5, 0.58]} w={1} />
      {/* Ground floor: back wall and reception counter. */}
      <Ln d={`M560 ${deck}V${floor}M560 ${deck + 40}H1030`} span={[0.54, 0.62]} w={1} tone="faint" />
      <Ln d={`M660 ${floor}V${floor - 110}H860V${floor}M650 ${floor - 110}H870`} span={[0.58, 0.66]} w={2} />
      {/* Logo panel at the top of the tower. */}
      <Ln d={rectPath(1112, towerTop + 16, 126, 126)} span={[0.6, 0.66]} w={1} />
      <LogoMark x={1120} y={towerTop + 28} w={110} span={[0.82, 0.94]} />
      {/* Lit: downlights under the deck, a glow line in the fascia, room glass. */}
      {[220, 400, 640, 900].map((x, i) => (
        <Beam key={x} x={x} y={deck + 2} x2={x} floor={floor} spread={66} gradient={`${id}-down`} span={at(0.82 + i * 0.02, 0.06)} breathe={i === 1 ? 1 : i === 3 ? 3 : 0} />
      ))}
      <Fade span={[0.86, 0.94]}>
        <path d={rectPath(104, beam + 12, 942, 5)} className="bb-solid-teal" />
        <path d={rectPath(564, roomTop + 22, 462, beam - roomTop - 24)} fill={`url(#${id}-glow)`} className="bb-breathe bb-breathe--2" opacity="0.6" />
      </Fade>
      <Dim x1={100} y1={floor + 30} x2={1250} y2={floor + 30} label={digits("12000", fa)} span={[0.64, 0.76]} tick={12} off={-14} ext={20} />
      <Dim x1={1310} y1={floor} x2={1310} y2={deck} label={digits("3000", fa)} span={[0.68, 0.78]} tick={12} off={-16} />
      <Dim x1={1360} y1={floor} x2={1360} y2={towerTop} label={digits("6000", fa)} span={[0.7, 0.82]} tick={12} off={-16} />
    </>
  );
}

/* ------------------------------------------------------------------ logo */
// The company logo assembled from its measured geometry (booth3d/brand-logo):
// construction lines first, then each block drawn and slid into place, then
// filled: gold blocks with a low gold tint, dark blocks hatched.

const LOGO = { w: 1000, ox: 90, oy: 90 };

function logoBox(r: LogoRect, w: number, ox: number, oy: number) {
  return {
    x: ox + (r.x - r.w / 2 + 0.5) * w,
    y: oy + (LOGO_HEIGHT / 2 - r.y - r.h / 2) * w,
    w: r.w * w,
    h: r.h * w,
  };
}

// Where each block comes from as it is assembled, in drawing units.
const LOGO_ARRIVALS: Array<[number, number]> = [
  [0, -120],
  [-120, 0],
  [90, 0],
  [90, 0],
  [0, -140],
  [0, 120],
  [130, 0],
];

function LogoMotif({ fa, id }: MotifProps) {
  const { w, ox, oy } = LOGO;
  const boxes = LOGO_RECTS.map((r) => ({ r, ...logoBox(r, w, ox, oy) }));
  const band = logoBox(LOGO_BAND, w, ox, oy);
  const xs = [...new Set(boxes.flatMap((b) => [b.x, b.x + b.w]).map((n) => Math.round(n)))].sort((p, q) => p - q);
  const ys = [...new Set(boxes.flatMap((b) => [b.y, b.y + b.h]).map((n) => Math.round(n)))].sort((p, q) => p - q);
  const bottom = band.y + band.h;
  const order = (i: number) => (fa ? LOGO_RECTS.length - 1 - i : i);
  return (
    <>
      <defs>
        <pattern id={`${id}-hatch`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V18" className="bb-ln bb-w1 bb-faint" />
        </pattern>
      </defs>
      {/* Construction lines through every edge of the mark. */}
      {xs.map((x, i) => (
        <Ln key={`x${x}`} d={`M${x} ${oy - 50}V${bottom + 40}`} span={at(i * 0.012, 0.14)} w={1} tone="tealFaint" />
      ))}
      {ys.map((y, i) => (
        <Ln key={`y${y}`} d={`M${ox - 50} ${y}H${ox + w + 50}`} span={at(0.02 + i * 0.012, 0.14)} w={1} tone="tealFaint" />
      ))}
      {boxes.map((b, i) => {
        const s = order(i);
        const [dx, dy] = LOGO_ARRIVALS[i] ?? [0, 0];
        return (
          <Arrive key={i} span={at(0.3 + s * 0.04, 0.16)} dx={dx} dy={dy} fade={false}>
            <Ln d={rectPath(b.x, b.y, b.w, b.h)} span={at(0.2 + s * 0.04, 0.12)} w={3} tone={b.r.kind === "gold" ? "gold" : "teal"} />
            <Fade span={at(0.6 + s * 0.025, 0.12)}>
              {b.r.kind === "gold" ? (
                <path d={rectPath(b.x, b.y, b.w, b.h)} className={i === 3 ? "bb-solid-gold bb-breathe bb-breathe--2" : "bb-solid-gold"} />
              ) : (
                <path d={rectPath(b.x, b.y, b.w, b.h)} fill={`url(#${id}-hatch)`} />
              )}
            </Fade>
          </Arrive>
        );
      })}
      <Ln d={rectPath(band.x, band.y, band.w, band.h)} span={[0.62, 0.76]} w={3} />
      <Fade span={[0.76, 0.88]}>
        <path d={rectPath(band.x, band.y, band.w, band.h)} className="bb-solid-gold" />
      </Fade>
      <Dim x1={ox} y1={oy - 30} x2={ox + w} y2={oy - 30} span={[0.8, 0.92]} tick={14} />
      <Dim x1={ox + w + 30} y1={bottom} x2={ox + w + 30} y2={oy} span={[0.84, 0.96]} tick={14} />
    </>
  );
}

/* ------------------------------------------------------------------ plan */
// Connective tissue: a hall plan with its column grid, lettered and numbered
// bubbles, stand footprints with codes, and a running dimension.

const PLAN = { x0: 120, y0: 90, gx: 240, gy: 150, cols: 6, rows: 3 };
const PLAN_STANDS: Array<{ c: number; r: number; w: number; h: number; code: string }> = [
  { c: 0, r: 0, w: 1, h: 1, code: "A1" },
  { c: 1, r: 0, w: 2, h: 1, code: "A2" },
  { c: 3, r: 0, w: 1, h: 2, code: "B1" },
  { c: 4, r: 1, w: 2, h: 1, code: "B2" },
  { c: 0, r: 2, w: 2, h: 1, code: "C1" },
  { c: 4, r: 2, w: 1, h: 1, code: "C2" },
];

function PlanMotif({ fa }: MotifProps) {
  const { x0, y0, gx, gy, cols, rows } = PLAN;
  const x1 = x0 + gx * cols;
  const y1 = y0 + gy * rows;
  // Grid letters and stand codes stay Latin, as on the venue drawings; numbers follow the page.
  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const colOrder = (c: number) => (fa ? cols - c : c);
  return (
    <>
      {Array.from({ length: cols + 1 }, (_, c) => (
        <g key={`c${c}`}>
          <Ln d={`M${x0 + c * gx} ${y0 - 30}V${y1 + 20}`} span={at(colOrder(c) * 0.03, 0.2)} w={1} tone="tealFaint" />
          <Bubble x={x0 + c * gx} y={y0 - 54} r={18} label={letters[c]} span={at(0.04 + colOrder(c) * 0.03, 0.1)} />
        </g>
      ))}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <g key={`r${r}`}>
          <Ln d={`M${x0 - 30} ${y0 + r * gy}H${x1 + 20}`} span={at(0.06 + r * 0.04, 0.2)} w={1} tone="tealFaint" />
          <Bubble x={x0 - 54} y={y0 + r * gy} r={18} label={digits(r + 1, fa)} span={at(0.1 + r * 0.04, 0.1)} />
        </g>
      ))}
      {PLAN_STANDS.map((s, i) => {
        const x = x0 + s.c * gx + 18;
        const y = y0 + s.r * gy + 18;
        const w = s.w * gx - 36;
        const h = s.h * gy - 36;
        return (
          <g key={s.code}>
            <Ln d={rectPath(x, y, w, h)} span={at(0.34 + i * 0.05, 0.14)} w={2} />
            {/* One stand is taken: it fills in last and glows faintly. */}
            {s.code === "B1" ? (
              <Fade span={[0.86, 0.96]}>
                <path d={rectPath(x, y, w, h)} className="bb-solid-gold bb-breathe bb-breathe--3" />
              </Fade>
            ) : null}
            <Fade span={at(0.44 + i * 0.05, 0.08)}>
              <Label x={x + w / 2} y={y + h / 2} size="md">
                {s.code}
              </Label>
            </Fade>
          </g>
        );
      })}
      <Dim x1={x0} y1={y1 + 50} x2={x0 + gx} y2={y1 + 50} label={digits("6000", fa)} span={[0.72, 0.84]} tick={12} off={-14} ext={24} />
      <Dim x1={x0 + gx} y1={y1 + 50} x2={x1} y2={y1 + 50} label={digits("30000", fa)} span={[0.76, 0.9]} tick={12} off={-14} ext={24} />
    </>
  );
}

export const motifs = {
  truss: { w: 1400, h: 840, render: (p) => <TrussMotif {...p} /> },
  floor: { w: 940, h: 700, render: (p) => <FloorMotif {...p} /> },
  walls: { w: 1060, h: 640, render: (p) => <WallsMotif {...p} /> },
  stand: { w: 1400, h: 770, render: (p) => <StandMotif {...p} /> },
  logo: { w: 1180, h: 1140, render: (p) => <LogoMotif {...p} /> },
  plan: { w: 1640, h: 620, render: (p) => <PlanMotif {...p} /> },
  schedule: { w: 1400, h: 560, render: (p) => <ScheduleMotif {...p} /> },
  presswall: { w: 1200, h: 740, render: (p) => <PressWallMotif {...p} /> },
  route: { w: 1400, h: 640, render: (p) => <RouteMotif {...p} /> },
  screen: { w: 1200, h: 700, render: (p) => <ScreenMotif {...p} /> },
  conveyor: { w: 1600, h: 500, render: (p) => <ConveyorMotif {...p} /> },
  layout: { w: 1160, h: 780, render: (p) => <LayoutMotif {...p} /> },
  lens: { w: 1200, h: 720, render: (p) => <LensMotif {...p} /> },
  compass: { w: 920, h: 900, render: (p) => <CompassMotif {...p} /> },
} satisfies Record<string, Motif>;

export type MotifName = keyof typeof motifs;
