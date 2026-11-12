// Drawing primitives for the build backdrops.
//
// Every timed element carries its own window on the drawing timeline as two
// numbers, --a (start) and --b (end), between 0 and 1. The backdrop root sets
// --draw; CSS turns (draw - a) / (b - a) into --t for each element, and the
// element's class decides what --t drives (see "Build backdrops" in
// globals.css). Only stroke-dashoffset, opacity and transform ever change.

import type { CSSProperties, ReactNode, SVGProps } from "react";

export type Span = [a: number, b: number];

export type MotifProps = {
  /** Persian digits and right-to-left build order. */
  fa: boolean;
  /** Unique prefix for gradient and pattern ids. */
  id: string;
};

export type Motif = {
  w: number;
  h: number;
  render: (props: MotifProps) => ReactNode;
};

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export function win([a, b]: Span, extra?: Record<string, number>): Vars {
  const style: Vars = { "--a": round(a), "--b": round(Math.max(b, a + 0.001)) };
  if (extra) for (const [key, value] of Object.entries(extra)) style[`--${key}`] = value;
  return style;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function digits(n: number | string, fa: boolean) {
  const text = String(n);
  return fa ? text.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]) : text;
}

type LineTone = "gold" | "teal" | "faint" | "tealFaint";
type LineWeight = 1 | 2 | 3;

const toneClass: Record<LineTone, string> = {
  gold: "",
  teal: "bb-teal",
  faint: "bb-faint",
  tealFaint: "bb-teal-faint",
};

/** A line that draws itself over `span`. Weight 1 is hairline, 2 standard, 3 structure. */
export function Ln({
  d,
  span,
  tone = "gold",
  w = 2,
  className = "",
  ...rest
}: { d: string; span: Span; tone?: LineTone; w?: LineWeight; className?: string } & Omit<
  SVGProps<SVGPathElement>,
  "d" | "style"
>) {
  return (
    <path
      d={d}
      pathLength={1}
      className={`bb-ln bb-w${w} ${toneClass[tone]} bb-d ${className}`}
      style={win(span)}
      {...rest}
    />
  );
}

/** A static line, for parts that move or fade as a group. */
export function Path({
  d,
  tone = "gold",
  w = 2,
  className = "",
  ...rest
}: { d: string; tone?: LineTone; w?: LineWeight; className?: string } & Omit<SVGProps<SVGPathElement>, "d">) {
  return <path d={d} className={`bb-ln bb-w${w} ${toneClass[tone]} ${className}`} {...rest} />;
}

/** A group that fades in over `span`. */
export function Fade({ span, className = "", children }: { span: Span; className?: string; children: ReactNode }) {
  return (
    <g className={`bb-f ${className}`} style={win(span)}>
      {children}
    </g>
  );
}

/** A group that travels from (dx, dy) to its place over `span`, fading in on the way. */
export function Arrive({
  span,
  dx = 0,
  dy = 0,
  fade = true,
  className = "",
  children,
}: {
  span: Span;
  dx?: number;
  dy?: number;
  fade?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <g className={`${fade ? "bb-m" : "bb-mv"} ${className}`} style={win(span, { dx, dy })}>
      {children}
    </g>
  );
}

/** A group that stands up from its base line (an elevation of a frame being raised). */
export function StandUp({ span, children }: { span: Span; children: ReactNode }) {
  return (
    <g className="bb-sy" style={win(span)}>
      {children}
    </g>
  );
}

/** Small technical label, sized in screen pixels whatever the drawing's scale. */
export function Label({
  x,
  y,
  children,
  anchor = "middle",
  rotate,
  size = "sm",
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  rotate?: number;
  size?: "sm" | "md";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      className={size === "md" ? "bb-label bb-label--md" : "bb-label"}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  );
}

/**
 * A dimension line between two points with architectural ticks at both ends
 * and its label set off to one side. `off` is the offset of the label from the
 * line, `tick` the tick length, both in drawing units.
 */
export function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  span,
  tick = 10,
  off = 14,
  ext = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: ReactNode;
  span: Span;
  tick?: number;
  off?: number;
  /** Length of extension lines drawn back from each end, perpendicular to the dimension. */
  ext?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular, pointing "up" for a horizontal dimension.
  const px = uy;
  const py = -ux;
  const t = tick / 2;
  // 45 degree architectural tick.
  const tx = (ux + px) * t * 0.7071;
  const ty = (uy + py) * t * 0.7071;
  const ticks = `M${x1 - tx} ${y1 - ty}L${x1 + tx} ${y1 + ty}M${x2 - tx} ${y2 - ty}L${x2 + tx} ${y2 + ty}`;
  const exts = ext
    ? `M${x1 - px * ext} ${y1 - py * ext}L${x1 + px * 3} ${y1 + py * 3}M${x2 - px * ext} ${y2 - py * ext}L${x2 + px * 3} ${y2 + py * 3}`
    : "";
  const mx = (x1 + x2) / 2 + px * off;
  const my = (y1 + y2) / 2 + py * off;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const upright = angle > 90 || angle < -90 ? angle + 180 : angle;
  const [a, b] = span;
  return (
    <g>
      {exts ? <Ln d={exts} span={[a, a + (b - a) * 0.4]} w={1} tone="faint" /> : null}
      <Ln d={`M${x1} ${y1}L${x2} ${y2}`} span={span} w={1} />
      <Ln d={ticks} span={[a + (b - a) * 0.6, b]} w={2} />
      {label !== undefined ? (
        <Fade span={[a + (b - a) * 0.5, b]}>
          <Label x={mx} y={my} rotate={Math.abs(upright) > 0.5 ? upright : undefined}>
            {label}
          </Label>
        </Fade>
      ) : null}
    </g>
  );
}

/** A grid bubble: a circle with a bay number or letter, the way drawings mark grid lines. */
export function Bubble({ x, y, r = 16, label, span }: { x: number; y: number; r?: number; label: ReactNode; span: Span }) {
  const [a, b] = span;
  return (
    <g>
      <Ln d={circlePath(x, y, r)} span={span} w={1} />
      <Fade span={[a + (b - a) * 0.5, b]}>
        <Label x={x} y={y + 0.5} size="md">
          {label}
        </Label>
      </Fade>
    </g>
  );
}

export function circlePath(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx} ${cy + r}A${r} ${r} 0 1 1 ${cx} ${cy - r}`;
}

export function rectPath(x: number, y: number, w: number, h: number) {
  return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
}

/** A light beam from a fixture down to the floor: a soft gradient fan, no blur. */
export function Beam({
  x,
  y,
  x2,
  floor,
  spread,
  gradient,
  span,
  breathe = 0,
}: {
  x: number;
  y: number;
  /** Where the beam's centre meets the floor. */
  x2: number;
  floor: number;
  spread: number;
  gradient: string;
  span: Span;
  /** 0 for none, otherwise a stagger index for the idle breathing. */
  breathe?: number;
}) {
  return (
    <g className="bb-f" style={win(span)}>
      <path
        d={`M${x - 3} ${y}L${x + 3} ${y}L${x2 + spread} ${floor}L${x2 - spread} ${floor}Z`}
        fill={`url(#${gradient})`}
        className={breathe ? `bb-breathe bb-breathe--${breathe}` : undefined}
      />
    </g>
  );
}
