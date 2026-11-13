// Topic drawings for the build backdrops: one per section subject, so no two
// sections on a page share a drawing. Same technical-drawing language as
// motifs.tsx (gold structure, teal services, dimension lines, grid bubbles),
// the same draw-on timeline, and only slow idle motion once a drawing is
// complete and on screen. Persian drawings are mirrored so they build and
// read from the right; labels are never mirrored.

import type { CSSProperties } from "react";
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
  mirror,
  rectPath,
  type MotifProps,
  type Span,
} from "./primitives";

const at = (a: number, len: number): Span => [a, a + len];
const vars = (v: Record<string, number>) => v as CSSProperties;
const r1 = (n: number) => Math.round(n * 10) / 10;

/* --------------------------------------------------------------- schedule */
// The calendar section: a build programme on a twelve-day grid. Build-up,
// deliveries, show days and breakdown arrive as bars; the opening day is
// flagged. Day numbers are positions on the grid, not calendar dates.

const SCH = { w: 1400, h: 560, x0: 100, cw: 100, cols: 12, top: 130, rh: 78, rows: 4 };
const SCH_BARS: Array<{ row: number; from: number; to: number; kind: "build" | "deliver" | "show" | "strike" }> = [
  { row: 0, from: 0, to: 4, kind: "build" },
  { row: 1, from: 2, to: 5, kind: "deliver" },
  { row: 2, from: 4, to: 8, kind: "show" },
  { row: 3, from: 8, to: 10, kind: "strike" },
];

export function ScheduleMotif({ fa }: MotifProps) {
  const { w, x0, cw, cols, top, rh, rows } = SCH;
  const m = mirror(fa, w);
  const bottom = top + rh * rows;
  const opening = m.x(x0 + 4 * cw);
  const closing = m.x(x0 + 8 * cw);
  const flagDir = fa ? -1 : 1;
  const ticks = Array.from({ length: cols * 2 + 1 }, (_, i) => {
    const x = m.x(x0 + (i * cw) / 2);
    return `M${x} ${bottom + 10}V${bottom + (i % 2 === 0 ? 26 : 18)}`;
  }).join("");
  return (
    <>
      <Ln d={rectPath(x0, top, cw * cols, rh * rows)} span={[0, 0.12]} w={2} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <Ln key={`c${i}`} d={`M${m.x(x0 + (i + 1) * cw)} ${top}V${bottom}`} span={at(0.04 + i * 0.012, 0.1)} w={1} tone="tealFaint" />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <Ln key={`r${i}`} d={fa ? `M${x0 + cw * cols} ${top + (i + 1) * rh}H${x0}` : `M${x0} ${top + (i + 1) * rh}H${x0 + cw * cols}`} span={at(0.1 + i * 0.03, 0.12)} w={1} tone="faint" />
      ))}
      {Array.from({ length: cols }, (_, i) => {
        const x = m.x(x0 + i * cw + cw / 2);
        return (
          <g key={`d${i}`}>
            <Ln d={`M${x} ${top - 22}V${top}`} span={at(0.12 + i * 0.014, 0.05)} w={1} tone="faint" />
            <Bubble x={x} y={top - 42} r={17} label={digits(i + 1, fa)} span={at(0.14 + i * 0.014, 0.08)} />
          </g>
        );
      })}
      {SCH_BARS.map((bar, i) => {
        const bw = (bar.to - bar.from) * cw - 20;
        const x = m.box(x0 + bar.from * cw + 10, bw);
        const y = top + bar.row * rh + 20;
        const d = rectPath(x, y, bw, rh - 40);
        const span = at(0.34 + i * 0.08, 0.12);
        return (
          <Arrive key={bar.kind} span={span} dx={fa ? 70 : -70}>
            {bar.kind === "show" ? (
              <>
                <path d={d} className="bb-solid-gold bb-breathe bb-breathe--2" />
                <Path d={d} w={3} />
              </>
            ) : bar.kind === "strike" ? (
              <Path d={d} w={2} tone="faint" />
            ) : (
              <Path d={d} w={2} tone="teal" className="bb-panel bb-panel--teal" />
            )}
          </Arrive>
        );
      })}
      {/* Opening day: a flagged line through the grid; closing day: a diamond. */}
      <Ln d={`M${opening} ${top - 78}V${bottom + 30}`} span={[0.64, 0.74]} w={2} />
      <Fade span={[0.72, 0.8]}>
        <path d={`M${opening} ${top - 78}L${opening + flagDir * 34} ${top - 68}L${opening} ${top - 58}Z`} className="bb-solid-gold" />
        <Path d={`M${closing} ${top - 8}L${closing + 8} ${top}L${closing} ${top + 8}L${closing - 8} ${top}Z`} w={2} />
      </Fade>
      <Ln d={ticks} span={[0.74, 0.86]} w={1} tone="faint" />
      <Dim x1={m.x(x0 + 4 * cw)} y1={bottom + 52} x2={m.x(x0 + 8 * cw)} y2={bottom + 52} span={[0.82, 0.94]} tick={12} />
    </>
  );
}

/* -------------------------------------------------------------- presswall */
// The partners section: an 8 m step-and-repeat sponsor wall on two truss
// towers. Towers stand up, the header truss lands, the banner drops in and the
// supporters' marks appear in the staggered pattern, then three spots light it.

const PW = { w: 1200, h: 740, floor: 640, beamTop: 70, beamBottom: 100, bx: 200, by: 140, bw: 800, bh: 420 };

function trussColumn(x: number, top: number, bottom: number) {
  let zig = `M${x} ${bottom}`;
  const n = Math.round((bottom - top) / 30);
  for (let i = 1; i <= n; i += 1) zig += `L${x + (i % 2 === 1 ? 30 : 0)} ${bottom - ((bottom - top) * i) / n}`;
  return { chords: `M${x} ${top}V${bottom}M${x + 30} ${top}V${bottom}`, lacing: zig };
}

export function PressWallMotif({ fa, id }: MotifProps) {
  const { w, floor, beamTop, beamBottom, bx, by, bw, bh } = PW;
  const m = mirror(fa, w);
  const towers = [150, 1020].map((x) => trussColumn(x, beamTop, floor));
  let beamZig = `M150 ${beamBottom}`;
  for (let i = 1; i <= 30; i += 1) beamZig += `L${150 + i * 30} ${i % 2 === 1 ? beamTop : beamBottom}`;
  const rows = 5;
  const cols = 6;
  const cw = bw / cols;
  const rh = bh / rows;
  const marks: Array<{ cx: number; cy: number; kind: number; order: number }> = [];
  for (let r = 0; r < rows; r += 1)
    for (let k = 0; k < cols; k += 1) {
      const cx = bx + (k + 0.5) * cw + (r % 2 ? cw / 2 : 0);
      if (cx > bx + bw - 30) continue;
      marks.push({ cx: m.x(cx), cy: by + (r + 0.5) * rh, kind: (k + r) % 2, order: k + r });
    }
  return (
    <>
      <defs>
        <BeamGradient id={`${id}-spot`} />
      </defs>
      <Ln d={`M40 ${floor}H${w - 40}`} span={[0, 0.08]} w={2} tone="faint" />
      {towers.map((t, i) => (
        <StandUp key={i} span={at(0.06 + (fa ? 1 - i : i) * 0.06, 0.12)}>
          <Path d={t.chords} w={3} />
          <Path d={t.lacing} w={1} />
          <Path d={rectPath(i === 0 ? 125 : 995, floor - 8, 80, 8)} w={2} />
        </StandUp>
      ))}
      <Arrive span={[0.22, 0.34]} dy={-60}>
        <Path d={`M150 ${beamTop}H1050M150 ${beamBottom}H1050`} w={3} />
        <Path d={beamZig} w={1} />
      </Arrive>
      <Arrive span={[0.32, 0.44]} dy={-40}>
        <Path d={rectPath(bx, by, bw, bh)} w={2} className="bb-panel" />
        <Path d={`M${bx} ${by - 14}V${by}M${bx + bw} ${by - 14}V${by}M${bx + bw / 2} ${by - 14}V${by}`} w={1} />
      </Arrive>
      {marks.map((mk, i) => (
        <Fade key={i} span={at(0.44 + mk.order * 0.035, 0.08)}>
          {mk.kind === 0 ? (
            <>
              <Path d={rectPath(mk.cx - 26, mk.cy - 16, 52, 32)} w={2} />
              <Path d={`M${mk.cx - 14} ${mk.cy}H${mk.cx + 14}`} w={2} tone="teal" />
            </>
          ) : (
            <>
              <Path d={circlePath(mk.cx, mk.cy - 2, 14)} w={2} tone="teal" />
              <Path d={`M${mk.cx - 22} ${mk.cy + 22}H${mk.cx + 22}`} w={1} />
            </>
          )}
        </Fade>
      ))}
      {/* Carpet in front of the wall. */}
      <Fade span={[0.7, 0.8]}>
        <Path d={rectPath(120, floor + 6, 960, 34)} w={1} tone="tealFaint" className="bb-panel bb-panel--teal" />
      </Fade>
      {[330, 600, 870].map((x, i) => (
        <g key={x}>
          <Fade span={at(0.74 + i * 0.02, 0.05)}>
            <Path d={rectPath(x - 9, beamBottom + 2, 18, 24)} w={2} />
          </Fade>
          <Beam x={x} y={beamBottom + 28} x2={x} floor={by + bh} spread={120} gradient={`${id}-spot`} span={at(0.8 + i * 0.03, 0.08)} breathe={i + 1} />
        </g>
      ))}
      <Dim x1={bx} y1={by + bh + 30} x2={bx + bw} y2={by + bh + 30} label={digits("8000", fa)} span={[0.84, 0.94]} tick={12} off={14} ext={18} />
      <Dim x1={m.x(1100)} y1={by + bh} x2={m.x(1100)} y2={by} label={digits("4200", fa)} span={[0.86, 0.96]} tick={12} off={fa ? 16 : -16} />
    </>
  );
}

/* ------------------------------------------------------------------ route */
// The exhibitor journey: a hall plan with stand blocks and aisles, and one
// route through it from the entrance, past six numbered stops, to a lit stand.
// Once drawn, a dashed line walks the route slowly.

const RT = { w: 1400, h: 640 };
const RT_BLOCKS_X = [110, 410, 710, 1010];
const RT_BLOCKS_Y = [100, 340];
const RT_PATH: Array<[number, number]> = [
  [85, 620],
  [85, 310],
  [385, 310],
  [385, 80],
  [685, 80],
  [685, 310],
  [985, 310],
  [985, 540],
  [1295, 540],
  [1295, 330],
];
// Stops sit in the aisle beside each turn.
const RT_STOPS: Array<[number, number]> = [
  [130, 420],
  [430, 200],
  [640, 190],
  [940, 420],
  [1140, 540],
  [1295, 270],
];

export function RouteMotif({ fa }: MotifProps) {
  const { w } = RT;
  const m = mirror(fa, w);
  const route = RT_PATH.map(([x, y], i) => `${i === 0 ? "M" : "L"}${m.x(x)} ${y}`).join("");
  const blockOrder = (c: number) => (fa ? 3 - c : c);
  return (
    <>
      {/* Hall outline with the entrance left open. */}
      <Ln d={fa ? `M${m.x(130)} 560H${m.x(1340)}V60H${m.x(60)}V560H${m.x(40)}` : `M130 560H1340V60H60V560H40`} span={[0, 0.16]} w={2} tone="faint" />
      {RT_BLOCKS_X.map((bx, c) =>
        RT_BLOCKS_Y.map((by, r) => {
          const x = m.box(bx, 240);
          const a = 0.1 + blockOrder(c) * 0.05 + r * 0.03;
          const cells = `M${x + 80} ${by}V${by + 180}M${x + 160} ${by}V${by + 180}M${x} ${by + 90}H${x + 240}`;
          const lit = c === 3 && r === 1;
          return (
            <g key={`${c}-${r}`}>
              <Ln d={rectPath(x, by, 240, 180)} span={at(a, 0.1)} w={2} />
              <Ln d={cells} span={at(a + 0.06, 0.1)} w={1} tone="faint" />
              {lit ? (
                <Fade span={[0.86, 0.96]}>
                  <path d={rectPath(m.box(1170, 80), 342, 78, 88)} className="bb-solid-gold bb-breathe" />
                </Fade>
              ) : null}
            </g>
          );
        }),
      )}
      <Ln d={route} span={[0.4, 0.8]} w={2} tone="tealFaint" />
      <Fade span={[0.78, 0.9]}>
        <path d={route} className="bb-ln bb-w2 bb-teal bb-dash bb-flow" />
      </Fade>
      {/* Entrance arrow. */}
      <Fade span={[0.38, 0.46]}>
        <Path d={`M${m.x(70)} 600L${m.x(85)} 580L${m.x(100)} 600`} w={2} tone="teal" />
      </Fade>
      {RT_STOPS.map(([x, y], i) => (
        <Bubble key={i} x={m.x(x)} y={y} r={19} label={digits(i + 1, fa)} span={at(0.46 + i * 0.06, 0.08)} />
      ))}
      <Dim x1={m.x(110)} y1={600} x2={m.x(1250)} y2={600} label={digits("48000", fa)} span={[0.84, 0.96]} tick={12} off={-14} />
    </>
  );
}

/* ----------------------------------------------------------------- screen */
// The news section: a 4 x 2 m LED wall of 500 mm cabinets on ground-support
// posts. Cabinets light in a wave, then a headline, a picture of an open pit
// and a slow ticker appear; a faint scan line drifts down and back.

const SC = { w: 1200, h: 700, floor: 640, x0: 200, y0: 110, mod: 100, cols: 8, rows: 4 };

export function ScreenMotif({ fa, id }: MotifProps) {
  const { w, floor, x0, y0, mod, cols, rows } = SC;
  const m = mirror(fa, w);
  const x1 = x0 + mod * cols;
  const y1 = y0 + mod * rows;
  const order = (c: number, r: number) => (fa ? cols - 1 - c : c) + r;
  const imgX = m.box(240, 320);
  const textX = (left: number, len: number) => m.box(left, len);
  // Terraces of an open pit: concentric half rings in the picture box.
  const pit = [0, 1, 2, 3].map((k) => {
    const rx = 140 - k * 30;
    const ry = 70 - k * 15;
    const cx = imgX + 160;
    const cy = y0 + 250;
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`;
  });
  const tickerY = y1 - 50;
  // Equal dashes one pitch apart, reaching a pitch past both ends, so a one-pitch crawl loops seamlessly.
  const dashes = Array.from({ length: 14 }, (_, i) => rectPath(x0 - 124 + i * 70, tickerY + 15, 34, 6)).join("");
  return (
    <>
      <defs>
        <clipPath id={`${id}-ticker`}>
          <rect x={x0 + 8} y={tickerY} width={x1 - x0 - 16} height={36} />
        </clipPath>
        <clipPath id={`${id}-wall`}>
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} />
        </clipPath>
      </defs>
      <Ln d={`M60 ${floor}H${w - 60}`} span={[0, 0.08]} w={2} tone="faint" />
      {[x0 - 24, x1].map((x, i) => (
        <StandUp key={x} span={at(0.04 + (fa ? 1 - i : i) * 0.05, 0.12)}>
          <Path d={`M${x} ${y0 - 40}V${floor}M${x + 24} ${y0 - 40}V${floor}`} w={3} />
          <Path d={`M${x - 60} ${floor}L${x + 12} ${floor - 70}L${x + 84} ${floor}`} w={1} />
        </StandUp>
      ))}
      <Arrive span={[0.18, 0.3]} dy={-50}>
        <Path d={`M${x0 - 24} ${y0 - 40}H${x1 + 24}M${x0 - 24} ${y0 - 14}H${x1 + 24}`} w={3} />
      </Arrive>
      {Array.from({ length: cols }, (_, c) =>
        Array.from({ length: rows }, (_, r) => {
          const x = x0 + c * mod;
          const y = y0 + r * mod;
          return (
            <Fade key={`${c}-${r}`} span={at(0.28 + order(c, r) * 0.022, 0.08)}>
              <Path d={rectPath(x + 2, y + 2, mod - 4, mod - 4)} w={1} className="bb-panel bb-panel--teal" tone="tealFaint" />
            </Fade>
          );
        }),
      )}
      <Ln d={rectPath(x0, y0, x1 - x0, y1 - y0)} span={[0.26, 0.4]} w={3} />
      {/* Picture: an open pit in terraces. */}
      <Ln d={rectPath(imgX, y0 + 30, 320, 260)} span={[0.56, 0.66]} w={2} />
      {pit.map((d, k) => (
        <Ln key={k} d={d} span={at(0.62 + k * 0.03, 0.08)} w={1} tone={k % 2 ? "teal" : "gold"} />
      ))}
      {/* Headline and standfirst. */}
      <Fade span={[0.66, 0.74]}>
        <path d={rectPath(textX(600, 360), y0 + 40, 360, 22)} className="bb-solid-gold" />
      </Fade>
      {[
        [y0 + 92, 330],
        [y0 + 122, 300],
        [y0 + 152, 340],
        [y0 + 182, 220],
      ].map(([y, len], i) => {
        const left = textX(600, len);
        return <Ln key={i} d={fa ? `M${left + len} ${y}H${left}` : `M${left} ${y}H${left + len}`} span={at(0.7 + i * 0.03, 0.06)} w={2} />;
      })}
      {/* Ticker band with a slow crawl. */}
      <Ln d={rectPath(x0 + 8, tickerY, x1 - x0 - 16, 36)} span={[0.78, 0.86]} w={1} tone="teal" />
      <Fade span={[0.84, 0.92]}>
        <g clipPath={`url(#${id}-ticker)`}>
          <path d={dashes} className="bb-solid-teal bb-drift" style={vars({ "--px": fa ? 70 : -70, "--py": 0 })} />
        </g>
      </Fade>
      <Fade span={[0.92, 1]}>
        <g clipPath={`url(#${id}-wall)`}>
          <path d={`M${x0} ${y0 + 2}H${x1}`} className="bb-ln bb-w1 bb-teal bb-scan" style={vars({ "--sy": rows * mod - 4 })} />
        </g>
      </Fade>
      <Dim x1={x0} y1={y0 - 70} x2={x1} y2={y0 - 70} label={digits("4000", fa)} span={[0.86, 0.96]} tick={12} off={14} ext={20} />
      <Dim x1={m.x(fa ? x0 - 70 : x1 + 70)} y1={y1} x2={m.x(fa ? x0 - 70 : x1 + 70)} y2={y0} label={digits("2000", fa)} span={[0.88, 0.98]} tick={12} off={fa ? 16 : -16} />
    </>
  );
}

/* --------------------------------------------------------------- conveyor */
// Industry news: a belt conveyor of the kind the region's mines and steel
// plants run, in elevation. Frames stand, idlers and pulleys go on, the belt
// is drawn, then ore travels slowly up to the head and onto the stockpile.

const CV = { w: 1600, h: 500, floor: 450, tail: [150, 350] as const, head: [1360, 210] as const, r: 28 };

export function ConveyorMotif({ fa, id }: MotifProps) {
  const { w, floor, tail, head, r } = CV;
  const m = mirror(fa, w);
  const len = Math.hypot(head[0] - tail[0], head[1] - tail[1]);
  const dx = (head[0] - tail[0]) / len;
  const dy = (head[1] - tail[1]) / len;
  // Upward normal of the belt.
  const nx = dy;
  const ny = -dx;
  const along = (s: number, off = 0): [number, number] => [r1(m.x(tail[0] + dx * s + nx * off)), r1(tail[1] + dy * s + ny * off)];
  const P = (p: [number, number]) => `${p[0]} ${p[1]}`;
  const topBelt = `M${P(along(0, r))}L${P(along(len, r))}`;
  const returnBelt = `M${P(along(0, -r))}L${P(along(len, -r))}`;
  const idlers = [];
  for (let s = 90; s < len - 60; s += 100) idlers.push(s);
  const legs = idlers.filter((_, i) => i % 2 === 0);
  const pitch = 64;
  const lumps = [];
  for (let s = -pitch; s < len; s += pitch) {
    const [x, y] = along(s, r + 7);
    lumps.push(`M${x - 7} ${y + 3}L${x - 3} ${y - 5}L${x + 5} ${y - 6}L${x + 8} ${y + 2}L${x + 2} ${y + 6}Z`);
  }
  const beltClip = [along(0, r - 2), along(len, r - 2), along(len, r + 22), along(0, r + 22)].map(P).join("L");
  const hx = m.x(head[0]);
  const sgn = fa ? -1 : 1;
  const chute = `M${hx + sgn * r} ${head[1] - 6}L${hx + sgn * 64} ${head[1] + 30}V${head[1] + 96}M${hx + sgn * 30} ${head[1] + 34}V${head[1] + 96}`;
  const pileX = m.x(1490);
  const pile = `M${pileX - 120} ${floor}L${pileX} ${head[1] + 120}L${pileX + 120} ${floor}`;
  const pileLines = [0.35, 0.6, 0.82].map((t) => {
    const y = floor - (floor - head[1] - 120) * t;
    const half = 120 * (1 - t);
    return `M${pileX - half} ${y}H${pileX + half}`;
  });
  return (
    <>
      <defs>
        <clipPath id={`${id}-belt`}>
          <path d={`M${beltClip}Z`} />
        </clipPath>
      </defs>
      <Ln d={`M30 ${floor}H${w - 30}`} span={[0, 0.08]} w={2} tone="faint" />
      {legs.map((s, i) => {
        const [x, y] = along(s, -r - 6);
        return (
          <StandUp key={s} span={at(0.06 + i * 0.03, 0.1)}>
            <Path d={`M${x - 16} ${floor}L${x} ${y}L${x + 16} ${floor}M${x - 10} ${(floor + y) / 2 + 8}H${x + 10}`} w={2} />
          </StandUp>
        );
      })}
      <Ln d={`M${P(along(0, -r - 6))}L${P(along(len, -r - 6))}`} span={[0.24, 0.36]} w={3} />
      {idlers.map((s, i) => {
        const [x, y] = along(s, r - 10);
        return <Ln key={s} d={circlePath(x, y, 9)} span={at(0.3 + i * 0.012, 0.06)} w={1} tone="teal" />;
      })}
      {[0, len].map((s, i) => {
        const [x, y] = along(s);
        return (
          <g key={s}>
            <Ln d={circlePath(x, y, r)} span={at(0.36 + i * 0.04, 0.08)} w={3} />
            <Fade span={at(0.42 + i * 0.04, 0.06)}>
              <Path d={circlePath(x, y, 5)} w={2} tone="teal" />
            </Fade>
          </g>
        );
      })}
      {/* Drive unit at the head. */}
      <Fade span={[0.46, 0.54]}>
        <Path d={rectPath(m.box(head[0] - 110, 70), head[1] + 44, 70, 40)} w={2} />
        <Path d={`M${m.x(head[0] - 40)} ${head[1] + 64}L${hx} ${head[1]}`} w={1} />
      </Fade>
      <Ln d={topBelt} span={[0.5, 0.64]} w={3} />
      <Ln d={returnBelt} span={[0.54, 0.66]} w={2} tone="faint" />
      <Ln d={chute} span={[0.64, 0.72]} w={2} />
      <Ln d={pile} span={[0.7, 0.8]} w={2} />
      {pileLines.map((d, i) => (
        <Ln key={i} d={d} span={at(0.76 + i * 0.03, 0.06)} w={1} tone="faint" />
      ))}
      <Fade span={[0.82, 0.92]}>
        <g clipPath={`url(#${id}-belt)`}>
          <path d={lumps.join("")} className="bb-solid-gold bb-drift" style={vars({ "--px": r1(sgn * dx * pitch), "--py": r1(dy * pitch) })} />
        </g>
      </Fade>
      <Dim x1={m.x(tail[0])} y1={floor + 26} x2={m.x(head[0])} y2={floor + 26} label={digits("30000", fa)} span={[0.86, 0.96]} tick={12} off={-14} ext={16} />
    </>
  );
}

/* ----------------------------------------------------------------- layout */
// The journal: an open magazine spread on the layout grid. Crop marks and
// margins first, then the picture frames, headlines and text lines in reading
// order (right-hand page first in Persian).

const LY = { w: 1160, h: 780, top: 80, bottom: 700, pageW: 480 };

export function LayoutMotif({ fa, id }: MotifProps) {
  const { w, top, bottom, pageW } = LY;
  const m = mirror(fa, w);
  const spine = w / 2;
  const first = 100; // first page's outer edge in the LTR drawing
  const line = (left: number, y: number, len: number, span: Span, tone: "gold" | "faint" = "faint", weight: 1 | 2 = 1) => {
    const a = m.x(left);
    const b = m.x(left + len);
    return <Ln key={`${left}-${y}`} d={`M${a} ${y}H${b}`} span={span} w={weight} tone={tone} />;
  };
  const crop = (x: number, y: number, sx: number, sy: number) => `M${x + sx * 14} ${y}H${x + sx * 44}M${x} ${y + sy * 14}V${y + sy * 44}`;
  const corners = [
    crop(first, top, -1, -1),
    crop(first, bottom, -1, 1),
    crop(first + pageW * 2, top, 1, -1),
    crop(first + pageW * 2, bottom, 1, 1),
  ].join("");
  const body1 = Array.from({ length: 7 }, (_, i) => 556 + i * 18);
  const colA = Array.from({ length: 22 }, (_, i) => 214 + i * 18).filter((y) => y < 446 || y > 600);
  const colB = Array.from({ length: 26 }, (_, i) => 214 + i * 18).filter((y) => y < 300 || y > 396);
  const imgL = m.box(140, 400);
  const imgR = m.box(620, 190);
  return (
    <>
      <defs>
        <pattern id={`${id}-dots`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1.4" className="bb-solid-teal" />
        </pattern>
      </defs>
      {/* The spread is symmetric about the spine, so crop marks and frames need no mirroring. */}
      <Ln d={corners} span={[0, 0.1]} w={1} />
      <Ln d={circlePath(spine, 40, 12) + `M${spine - 20} 40H${spine + 20}M${spine} 20V60`} span={[0.02, 0.1]} w={1} tone="teal" />
      <Ln d={rectPath(first, top, pageW * 2, bottom - top) + `M${spine} ${top}V${bottom}`} span={[0.06, 0.2]} w={2} />
      <Ln d={rectPath(first + 40, top + 40, pageW - 80, bottom - top - 80) + rectPath(spine + 40, top + 40, pageW - 80, bottom - top - 80)} span={[0.14, 0.26]} w={1} tone="tealFaint" />
      {/* First page: picture, caption, headline and body. */}
      <Ln d={rectPath(imgL, 120, 400, 280)} span={[0.26, 0.36]} w={2} />
      <Fade span={[0.34, 0.42]}>
        <path d={rectPath(imgL, 120, 400, 280)} fill={`url(#${id}-dots)`} className="bb-breathe bb-breathe--3" />
        <Path d={`M${imgL} 400L${imgL + 140} 300L${imgL + 220} 350L${imgL + 300} 260L${imgL + 400} 400`} w={1} tone="teal" />
      </Fade>
      {line(140, 418, 180, [0.4, 0.46])}
      <Fade span={[0.44, 0.52]}>
        <path d={rectPath(m.box(140, 360), 458, 360, 22)} className="bb-solid-gold" />
        <path d={rectPath(m.box(140, 260), 492, 260, 22)} className="bb-solid-gold" />
      </Fade>
      {body1.map((y, i) => line(140, y, i === body1.length - 1 ? 220 : 400, at(0.5 + i * 0.02, 0.06)))}
      {/* Second page: kicker, headline, two columns with a quote and a picture. */}
      <Fade span={[0.58, 0.64]}>
        <path d={rectPath(m.box(620, 80), 124, 80, 8)} className="bb-solid-teal" />
        <path d={rectPath(m.box(620, 380), 146, 380, 24)} className="bb-solid-gold" />
      </Fade>
      {colA.map((y, i) => line(620, y, 190, at(0.64 + i * 0.008, 0.05)))}
      {colB.map((y, i) => line(830, y, 190, at(0.68 + i * 0.008, 0.05)))}
      <Ln d={`M${m.x(830)} 308V388`} span={[0.74, 0.8]} w={3} tone="teal" />
      {line(846, 330, 160, [0.76, 0.82], "gold", 2)}
      {line(846, 360, 120, [0.78, 0.84], "gold", 2)}
      <Ln d={rectPath(imgR, 452, 190, 140)} span={[0.8, 0.88]} w={2} />
      <Ln d={`M${imgR} 452L${imgR + 190} 592M${imgR + 190} 452L${imgR} 592`} span={[0.84, 0.9]} w={1} tone="faint" />
      <Fade span={[0.88, 0.96]}>
        <Label x={m.x(first + 40)} y={bottom - 20} anchor={fa ? "end" : "start"}>
          {digits(12, fa)}
        </Label>
        <Label x={m.x(first + pageW * 2 - 40)} y={bottom - 20} anchor={fa ? "start" : "end"}>
          {digits(13, fa)}
        </Label>
      </Fade>
    </>
  );
}

/* ------------------------------------------------------------------- lens */
// The gallery: a camera viewfinder framing a finished stand. Frame brackets,
// thirds and focus points, then the stand drawn inside, then the exposure
// scale. The focus box breathes and the exposure needle sways slowly.

const LN = { w: 1200, h: 720, x0: 100, y0: 60, x1: 1100, y1: 620 };

export function LensMotif({ fa }: MotifProps) {
  const { w, x0, y0, x1, y1 } = LN;
  const m = mirror(fa, w);
  const L = 64;
  const brackets = `M${x0} ${y0 + L}V${y0}H${x0 + L}M${x1 - L} ${y0}H${x1}V${y0 + L}M${x1} ${y1 - L}V${y1}H${x1 - L}M${x0 + L} ${y1}H${x0}V${y1 - L}`;
  const tw = (x1 - x0) / 3;
  const th = (y1 - y0) / 3;
  const thirds = `M${x0 + tw} ${y0}V${y1}M${x0 + 2 * tw} ${y0}V${y1}M${x0} ${y0 + th}H${x1}M${x0} ${y0 + 2 * th}H${x1}`;
  const cx = 600;
  const cy = 360;
  const af = [-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => [cx + i * 150, cy + j * 110] as const));
  const floor = 540;
  // A finished stand in the frame: tower with the logo, deck, upper room.
  const tower = m.box(780, 80);
  const stand = [
    `M${m.x(260)} ${floor}H${m.x(940)}`,
    rectPath(tower, 220, 80, floor - 220),
    rectPath(m.box(300, 480), 392, 480, 18),
    `M${m.x(320)} ${floor}V410M${m.x(560)} ${floor}V410M${m.x(760)} ${floor}V410`,
    rectPath(m.box(520, 240), 270, 240, 122),
    `M${m.x(580)} 270V392M${m.x(640)} 270V392M${m.x(700)} 270V392`,
  ];
  const fs = 64;
  const focus = `M${cx - fs} ${cy - fs + 18}V${cy - fs}H${cx - fs + 18}M${cx + fs - 18} ${cy - fs}H${cx + fs}V${cy - fs + 18}M${cx + fs} ${cy + fs - 18}V${cy + fs}H${cx + fs - 18}M${cx - fs + 18} ${cy + fs}H${cx - fs}V${cy + fs - 18}`;
  const scaleY = y1 + 50;
  const scaleTicks = Array.from({ length: 13 }, (_, i) => `M${420 + i * 30} ${scaleY}V${scaleY - (i % 3 === 0 ? 18 : 9)}`).join("");
  return (
    <>
      <Ln d={brackets} span={[0, 0.14]} w={3} />
      <Ln d={thirds} span={[0.1, 0.24]} w={1} tone="tealFaint" />
      {af.map(([x, y], i) => (
        <Fade key={i} span={at(0.2 + i * 0.012, 0.05)}>
          <Path d={rectPath(x - 7, y - 7, 14, 14)} w={1} tone={i === 4 ? "teal" : "faint"} />
        </Fade>
      ))}
      {stand.map((d, i) => (
        <Ln key={i} d={d} span={at(0.32 + i * 0.05, 0.1)} w={i === 1 || i === 0 ? 2 : 1} />
      ))}
      <Fade span={[0.62, 0.7]}>
        <path d={rectPath(tower + 14, 236, 52, 52)} className="bb-solid-gold" />
        <path d={rectPath(m.box(300, 480), 404, 480, 4)} className="bb-solid-teal" />
      </Fade>
      <Fade span={[0.66, 0.76]}>
        <g className="bb-breathe bb-breathe--2">
          <Path d={focus} w={2} tone="teal" />
        </g>
      </Fade>
      <Ln d={`M${x0 + 14} ${cy}H${x0 + 70}M${x1 - 70} ${cy}H${x1 - 14}`} span={[0.7, 0.78]} w={2} tone="faint" />
      <Ln d={scaleTicks} span={[0.76, 0.86]} w={1} />
      <Fade span={[0.84, 0.94]}>
        <g className="bb-sway" style={vars({ "--sx": 28 })}>
          <path d={`M600 ${scaleY + 4}L590 ${scaleY + 18}H610Z`} className="bb-solid-gold" />
        </g>
        <Label x={m.x(x1 - 10)} y={scaleY - 6} anchor={fa ? "start" : "end"} size="md">
          {digits(24, fa)}
        </Label>
        <Label x={m.x(x0 + 10)} y={scaleY - 6} anchor={fa ? "end" : "start"}>
          f/8
        </Label>
      </Fade>
    </>
  );
}

/* ---------------------------------------------------------------- compass */
// Contact: a location plan around the office. Streets and blocks, distance
// rings, the north point and a scale bar; the pin drops last and a slow ring
// spreads from it now and then.

const CP = { w: 920, h: 900, cx: 470, cy: 500 };
const CP_BLOCKS: Array<[number, number, number, number]> = [
  [70, 90, 160, 110],
  [260, 70, 190, 130],
  [650, 260, 150, 120],
  [90, 300, 150, 120],
  [600, 640, 190, 120],
  [120, 640, 170, 140],
  [300, 700, 120, 110],
  [660, 400, 130, 80],
  [270, 260, 110, 90],
];

export function CompassMotif({ fa }: MotifProps) {
  const { w, cx: cx0, cy } = CP;
  const m = mirror(fa, w);
  const cx = m.x(cx0);
  const roadA = (o: number) => `M0 ${560 + o}C300 ${520 + o} 600 ${610 + o} ${w} ${500 + o}`;
  const roadB = (o: number) => `M${m.x(560 + o)} 0L${m.x(500 + o)} ${900}`;
  const rose = { x: m.x(780), y: 150, r: 56 };
  const pin = `M${cx} ${cy}C${cx - 22} ${cy - 34} ${cx - 34} ${cy - 56} ${cx - 34} ${cy - 76}A34 34 0 1 1 ${cx + 34} ${cy - 76}C${cx + 34} ${cy - 56} ${cx + 22} ${cy - 34} ${cx} ${cy}Z`;
  const bar = { x: m.box(70, 240), y: 840 };
  return (
    <>
      {CP_BLOCKS.map(([x, y, bw, bh], i) => (
        <Ln key={i} d={rectPath(m.box(x, bw), y, bw, bh)} span={at(0.04 + i * 0.025, 0.1)} w={1} tone="faint" />
      ))}
      <Ln d={roadA(-16) + roadA(16)} span={[0.12, 0.3]} w={2} />
      <Ln d={roadB(-14) + roadB(14)} span={[0.18, 0.34]} w={2} />
      <Fade span={[0.3, 0.38]}>
        <path d={roadA(0)} className="bb-ln bb-w1 bb-faint bb-chain" />
        <path d={roadB(0)} className="bb-ln bb-w1 bb-faint bb-chain" />
      </Fade>
      {[130, 240, 350].map((r, i) => (
        <g key={r}>
          <Ln d={circlePath(cx, cy, r)} span={at(0.36 + i * 0.06, 0.12)} w={1} tone="tealFaint" />
          <Fade span={at(0.44 + i * 0.06, 0.06)}>
            <Label x={cx + r * 0.707 + 10} y={cy - r * 0.707 - 6} anchor="start">
              {digits(250 * (i + 1), fa)}
            </Label>
          </Fade>
        </g>
      ))}
      {/* North point. */}
      <Ln d={circlePath(rose.x, rose.y, rose.r) + `M${rose.x - rose.r - 12} ${rose.y}H${rose.x + rose.r + 12}M${rose.x} ${rose.y - rose.r - 12}V${rose.y + rose.r + 12}`} span={[0.5, 0.62]} w={1} />
      <Fade span={[0.6, 0.68]}>
        <path d={`M${rose.x} ${rose.y - rose.r + 6}L${rose.x + 12} ${rose.y}H${rose.x - 12}Z`} className="bb-solid-gold" />
        <Path d={`M${rose.x} ${rose.y + rose.r - 6}L${rose.x + 12} ${rose.y}H${rose.x - 12}Z`} w={1} />
        <Label x={rose.x} y={rose.y - rose.r - 26} size="md">
          N
        </Label>
      </Fade>
      {/* Scale bar. */}
      <Ln d={rectPath(bar.x, bar.y, 240, 10)} span={[0.64, 0.72]} w={1} />
      <Fade span={[0.7, 0.78]}>
        <path d={rectPath(bar.x, bar.y, 60, 10) + rectPath(bar.x + 120, bar.y, 60, 10)} className="bb-solid-gold" />
        <Label x={bar.x} y={bar.y - 14}>
          {digits(0, fa)}
        </Label>
        <Label x={bar.x + 240} y={bar.y - 14}>
          {digits(500, fa)}
        </Label>
      </Fade>
      {/* The pin drops in, then a slow ring spreads from it. */}
      <Fade span={[0.86, 1]}>
        <circle cx={cx} cy={cy} r={30} className="bb-ln bb-w2 bb-teal bb-ripple" />
      </Fade>
      <Arrive span={[0.78, 0.9]} dy={-80}>
        <path d={pin} className="bb-solid-gold" />
        <Path d={pin} w={3} />
        <Path d={circlePath(cx, cy - 76, 12)} w={2} tone="teal" />
      </Arrive>
    </>
  );
}
