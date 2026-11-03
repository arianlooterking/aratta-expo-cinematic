"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import { clampRect, fitLabel, fitView, focusView, rectFromPoints, round, snap, toPlan, wrapLabel, zoomAt, type Rect, type View } from "@/lib/portal/geometry";
import type { FeatureKind } from "@/lib/portal/types";
import { IconButton } from "../ui";
import { sep } from "@/lib/portal/format";

export type CanvasBooth = Rect & {
  id: string;
  code: string;
  rotation: number;
  tone: string;
  title?: string;
  subtitle?: string;
  badge?: string | null;
  progress?: number | null;
  dim?: boolean;
  flagged?: boolean;
  /** Shown in the hover card on desktop. */
  hover?: { title: string; lines: string[] };
};

export type CanvasFeature = Rect & { id: string; kind: FeatureKind; label?: string | null; locked?: boolean; note?: string | null };

export type CanvasTool = "select" | "booth" | FeatureKind;

type Kind = "booth" | "feature";
type Corner = "nw" | "ne" | "sw" | "se";

type Gesture =
  | { type: "pan"; startView: View; sx: number; sy: number; moved: boolean; tapId: string | null; tapKind: Kind | null }
  | { type: "move"; ids: string[]; kind: Kind; px: number; py: number; moved: boolean; sx: number; sy: number }
  | { type: "resize"; id: string; kind: Kind; corner: Corner; start: Rect }
  | { type: "draw"; px: number; py: number }
  | { type: "pinch"; startView: View; dist: number; mx: number; my: number };

export type HallCanvasProps = {
  lang: "fa" | "en";
  hall: { id: string; width_m: number; depth_m: number; grid_m: number };
  background?: { url: string; opacity: number } | null;
  booths: CanvasBooth[];
  features: CanvasFeature[];
  selected: ReadonlySet<string>;
  editing: boolean;
  tool: CanvasTool;
  /** Change the nonce to pan/zoom to this item. */
  focus?: { id: string; nonce: number } | null;
  onSelect: (id: string | null, kind: Kind | null, additive: boolean) => void;
  onMove: (ids: string[], kind: Kind, dx: number, dy: number) => void;
  onResize: (id: string, kind: Kind, rect: Rect) => void;
  onDraw: (rect: Rect) => void;
  onDelete: () => void;
  onOpen?: (id: string) => void;
  /** Right click, or a long press on touch screens. The point is relative to the canvas. */
  onContext?: (id: string, kind: Kind, point: { x: number; y: number }) => void;
  /** A tap on a corridor, column or other structure while not editing. */
  onStructureTap?: (id: string) => void;
};

const HANDLE_PX = 11;
/** Room kept free at the top for the floating edit tool bar. */
const TOOLBAR_INSET = 56;

export function HallCanvas(props: HallCanvasProps) {
  const { hall, booths, features, selected, editing, tool, lang } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 10 });
  const [fittedFor, setFittedFor] = useState<string | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);
  const [resize, setResize] = useState<{ id: string; rect: Rect } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverCard = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const pressTimer = useRef<number | null>(null);
  const step = hall.grid_m || 1;

  const cancelPress = () => {
    if (pressTimer.current != null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  // Track the viewport size.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let last: { width: number; height: number } | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Keep the middle of the view still when a panel opens or the window resizes.
      if (last && (last.width !== width || last.height !== height)) {
        const dw = width - last.width;
        const dh = height - last.height;
        setView((v) => ({ ...v, x: v.x + dw / 2, y: v.y + dh / 2 }));
      }
      last = { width, height };
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // In edit mode the tool bar floats over the top of the canvas.
  const fit = (withToolbar: boolean) => fitView(hall, size, 32, withToolbar ? TOOLBAR_INSET : 0);

  // Fit the hall when it changes or the viewport first gets a size.
  const fitKey = size.width > 0 ? `${hall.id}:${hall.width_m}x${hall.depth_m}` : null;
  if (fitKey && fittedFor !== fitKey) {
    setFittedFor(fitKey);
    setView(fit(editing));
  }

  // Entering or leaving edit mode: if the hall is still at its fitted view,
  // refit it so the tool bar never covers the top row. A view the user
  // panned or zoomed stays where it is.
  const [fitMode, setFitMode] = useState(editing);
  if (fitMode !== editing) {
    setFitMode(editing);
    const before = fit(fitMode);
    if (Math.abs(view.x - before.x) < 1 && Math.abs(view.y - before.y) < 1 && Math.abs(view.scale - before.scale) < 0.01) setView(fit(editing));
  }

  // Focus requests from search or the booth list.
  const lastFocus = useRef<number | null>(null);
  useEffect(() => {
    const f = props.focus;
    if (!f || !size.width || lastFocus.current === f.nonce) return;
    const item = booths.find((b) => b.id === f.id) ?? features.find((x) => x.id === f.id);
    if (!item) return;
    lastFocus.current = f.nonce;
    const target = focusView(item, size, fit(editing));
    // Animate a short glide.
    const from = { ...view };
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 320);
      const e = 1 - (1 - t) ** 3;
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, scale: from.scale + (target.scale - from.scale) * e });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run per focus request only
  }, [props.focus?.nonce, size.width, booths.length]);

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (e.shiftKey && !e.ctrlKey) {
        setView((v) => ({ ...v, x: v.x - e.deltaY, y: v.y - e.deltaX }));
        return;
      }
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
      setView((v) => zoomAt(v, factor, point));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const local = useCallback((e: { clientX: number; clientY: number }) => {
    const rect = svg.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const boothById = useMemo(() => new Map(booths.map((b) => [b.id, b])), [booths]);
  const featureById = useMemo(() => new Map(features.map((f) => [f.id, f])), [features]);
  const rectOf = useCallback((id: string, kind: Kind) => (kind === "booth" ? boothById.get(id) : featureById.get(id)), [boothById, featureById]);

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    svg.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    setHoverId(null);
    cancelPress();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { type: "pinch", startView: view, dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      setDrag(null);
      setResize(null);
      setDraft(null);
      return;
    }
    const target = e.target as Element;
    const handle = target.closest<SVGElement>("[data-handle]");
    const item = target.closest<SVGElement>("[data-id]");
    const plan = toPlan(view, p);
    if (handle && editing) {
      const id = handle.dataset.handle!;
      const kind = handle.dataset.kind as Kind;
      const r = rectOf(id, kind);
      if (r) gesture.current = { type: "resize", id, kind, corner: handle.dataset.corner as Corner, start: { x: r.x, y: r.y, width: r.width, depth: r.depth } };
      return;
    }
    if (item) {
      const id = item.dataset.id!;
      const kind = item.dataset.kind as Kind;
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      // Long press on touch opens the quick menu, like a right click.
      if (e.pointerType !== "mouse" && props.onContext) {
        pressTimer.current = window.setTimeout(() => {
          pressTimer.current = null;
          const g = gesture.current;
          if (!g || (g.type !== "pan" && g.type !== "move") || g.moved) return;
          gesture.current = null;
          pointers.current.clear();
          navigator.vibrate?.(12);
          props.onContext?.(id, kind, p);
        }, 520);
      }
      const locked = kind === "feature" && featureById.get(id)?.locked;
      if (editing && tool === "select" && !locked) {
        if (!selected.has(id) || additive) props.onSelect(id, kind, additive);
        const ids = selected.has(id) && !additive ? [...selected].filter((s) => (kind === "booth" ? boothById.has(s) : featureById.has(s))) : [id];
        gesture.current = { type: "move", ids, kind, px: plan.x, py: plan.y, moved: false, sx: p.x, sy: p.y };
        return;
      }
      if (!editing || tool === "select") {
        gesture.current = { type: "pan", startView: view, sx: p.x, sy: p.y, moved: false, tapId: id, tapKind: kind };
        return;
      }
    }
    if (editing && tool !== "select") {
      gesture.current = { type: "draw", px: plan.x, py: plan.y };
      setDraft({ x: snap(plan.x, step), y: snap(plan.y, step), width: 0, depth: 0 });
      return;
    }
    gesture.current = { type: "pan", startView: view, sx: p.x, sy: p.y, moved: false, tapId: null, tapKind: null };
  }

  // Place the card as soon as it mounts, not only on the next mouse move.
  useLayoutEffect(() => {
    if (hoverId) placeHoverCard();
  });

  /** Keeps the hover card next to the pointer and inside the canvas. */
  function placeHoverCard() {
    const card = hoverCard.current;
    const box = wrap.current;
    const p = lastPointer.current;
    if (!card || !box || !p) return;
    const maxX = box.clientWidth - card.offsetWidth - 8;
    const maxY = box.clientHeight - card.offsetHeight - 8;
    const left = Math.max(8, Math.min(maxX, p.x + 16));
    const top = p.y + 18 > maxY ? Math.max(8, p.y - card.offsetHeight - 12) : p.y + 18;
    card.style.transform = `translate(${left}px, ${top}px)`;
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) {
      // Plain mouse movement: the hover card follows the pointer.
      if (e.pointerType !== "mouse") return;
      const item = (e.target as Element).closest<SVGElement>("[data-kind='booth']");
      const id = item?.dataset.id ?? null;
      lastPointer.current = local(e);
      if (id !== hoverId) setHoverId(id);
      else if (id) placeHoverCard();
      return;
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (pressTimer.current != null && g.type !== "pinch") {
      const sx = "sx" in g ? g.sx : p.x;
      const sy = "sy" in g ? g.sy : p.y;
      if (Math.hypot(p.x - sx, p.y - sy) > 6) cancelPress();
    }
    if (g.type === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const zoomed = zoomAt(g.startView, dist / g.dist, { x: g.mx, y: g.my });
      setView({ ...zoomed, x: zoomed.x + (mx - g.mx), y: zoomed.y + (my - g.my) });
      return;
    }
    if (g.type === "pan") {
      const dx = p.x - g.sx;
      const dy = p.y - g.sy;
      if (!g.moved && Math.hypot(dx, dy) < 5) return;
      g.moved = true;
      setView({ ...g.startView, x: g.startView.x + dx, y: g.startView.y + dy });
      return;
    }
    const plan = toPlan(view, p);
    if (g.type === "move") {
      if (!g.moved && Math.hypot(p.x - g.sx, p.y - g.sy) < 4) return;
      g.moved = true;
      setDrag({ ids: g.ids, dx: snap(plan.x - g.px, step), dy: snap(plan.y - g.py, step) });
      return;
    }
    if (g.type === "resize") {
      const s = g.start;
      const fixed = {
        x: g.corner === "nw" || g.corner === "sw" ? s.x + s.width : s.x,
        y: g.corner === "nw" || g.corner === "ne" ? s.y + s.depth : s.y,
      };
      const r = rectFromPoints(fixed, plan, step);
      if (r.width >= step && r.depth >= step) setResize({ id: g.id, rect: clampRect(r, hall) });
      return;
    }
    if (g.type === "draw") {
      setDraft(clampRect(rectFromPoints({ x: g.px, y: g.py }, plan, step), hall));
    }
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    cancelPress();
    const g = gesture.current;
    if (g?.type === "pinch") {
      if (pointers.current.size === 0) gesture.current = null;
      else {
        const [rest] = [...pointers.current.values()];
        gesture.current = { type: "pan", startView: view, sx: rest.x, sy: rest.y, moved: true, tapId: null, tapKind: null };
      }
      return;
    }
    gesture.current = null;
    if (!g) return;
    if (g.type === "pan" && !g.moved) {
      if (!editing && g.tapKind === "feature" && g.tapId) {
        props.onStructureTap?.(g.tapId);
        return;
      }
      props.onSelect(g.tapId, g.tapKind, e.shiftKey || e.metaKey || e.ctrlKey);
      if (g.tapId && e.detail === 2) props.onOpen?.(g.tapId);
    }
    if (g.type === "move") {
      if (drag && (drag.dx || drag.dy)) props.onMove(drag.ids, g.kind, round(drag.dx), round(drag.dy));
      setDrag(null);
    }
    if (g.type === "resize") {
      if (resize) props.onResize(resize.id, g.kind, resize.rect);
      setResize(null);
    }
    if (g.type === "draw") {
      if (draft && draft.width >= step * 0.99 && draft.depth >= step * 0.99) props.onDraw(draft);
      else if (draft && tool !== "booth") {
        // A tap with a point tool (column, label) drops a default-sized item.
        const sizeM = tool === "column" ? 0.6 : 2;
        props.onDraw(clampRect({ x: draft.x, y: draft.y, width: sizeM, depth: sizeM }, hall));
      }
      setDraft(null);
    }
  }

  function zoomBy(factor: number) {
    setView((v) => zoomAt(v, factor, { x: size.width / 2, y: size.height / 2 }));
  }

  const px = 1 / view.scale;
  const showGrid = editing || view.scale > 14;

  const displayRect = (id: string, r: Rect): Rect => {
    if (resize?.id === id) return resize.rect;
    if (drag?.ids.includes(id)) return { ...r, x: r.x + drag.dx, y: r.y + drag.dy };
    return r;
  };

  const single = selected.size === 1 ? [...selected][0] : null;
  const singleKind: Kind | null = single ? (boothById.has(single) ? "booth" : featureById.has(single) ? "feature" : null) : null;
  const singleRect = single && singleKind ? rectOf(single, singleKind) : undefined;

  return (
    <div
      ref={wrap}
      className="relative h-full min-h-0 w-full overflow-hidden"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("input, textarea, select, button")) return;
        // Zoom and pan work in every mode.
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoomBy(1.25);
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          zoomBy(1 / 1.25);
          return;
        }
        if (e.key === "0") {
          e.preventDefault();
          setView(fit(editing));
          return;
        }
        if (!editing || !selected.size) {
          const pan: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
          const d = pan[e.key];
          if (d) {
            e.preventDefault();
            setView((v) => ({ ...v, x: v.x + d[0], y: v.y + d[1] }));
          }
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          props.onDelete();
        }
        const delta = e.shiftKey ? step * 5 : step;
        const arrows: Record<string, [number, number]> = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
        const move = arrows[e.key];
        if (move && selected.size) {
          e.preventDefault();
          const ids = [...selected];
          const kind: Kind = boothById.has(ids[0]) ? "booth" : "feature";
          props.onMove(ids.filter((i) => (kind === "booth" ? boothById.has(i) : featureById.has(i))), kind, move[0], move[1]);
        }
      }}
    >
      <svg
        ref={svg}
        className={cn("hall-map block h-full w-full", editing && tool !== "select" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHoverId(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const item = (e.target as Element).closest<SVGElement>("[data-id]");
          if (!item || !props.onContext) return;
          // Touch screens report a long press here too; the timer above handles those.
          if ((e.nativeEvent as PointerEvent).pointerType && (e.nativeEvent as PointerEvent).pointerType !== "mouse") return;
          setHoverId(null);
          props.onContext(item.dataset.id!, item.dataset.kind as Kind, local(e));
        }}
        role="application"
        aria-label={lang === "fa" ? "نقشه سالن" : "Hall map"}
      >
        <defs>
          <pattern id={`grid-${hall.id}`} width={step} height={step} patternUnits="userSpaceOnUse">
            <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke="var(--map-grid)" strokeWidth={px} />
          </pattern>
          <pattern id={`grid5-${hall.id}`} width={step * 5} height={step * 5} patternUnits="userSpaceOnUse">
            <path d={`M ${step * 5} 0 L 0 0 0 ${step * 5}`} fill="none" stroke="var(--map-grid-major)" strokeWidth={px * 1.2} />
          </pattern>
          <pattern id={`hatch-${hall.id}`} width={0.8} height={0.8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={0.8} stroke="var(--map-hall-stroke)" strokeOpacity={0.35} strokeWidth={0.12} />
          </pattern>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <rect x={0} y={0} width={hall.width_m} height={hall.depth_m} fill="var(--map-hall)" />
          {props.background ? (
            <image
              href={props.background.url}
              x={0}
              y={0}
              width={hall.width_m}
              height={hall.depth_m}
              opacity={props.background.opacity}
              preserveAspectRatio="none"
              style={{ pointerEvents: "none" }}
            />
          ) : null}
          {showGrid ? (
            <>
              <rect x={0} y={0} width={hall.width_m} height={hall.depth_m} fill={`url(#grid-${hall.id})`} style={{ pointerEvents: "none" }} />
              <rect x={0} y={0} width={hall.width_m} height={hall.depth_m} fill={`url(#grid5-${hall.id})`} style={{ pointerEvents: "none" }} />
            </>
          ) : null}

          {features.map((f) => {
            const r = displayRect(f.id, f);
            return <Feature key={f.id} f={{ ...f, ...r }} px={px} hatch={`url(#hatch-${hall.id})`} selected={selected.has(f.id)} scale={view.scale} lang={lang} editing={editing} />;
          })}

          {booths.map((b) => {
            const r = displayRect(b.id, b);
            return <BoothShape key={b.id} b={{ ...b, ...r }} scale={view.scale} selected={selected.has(b.id)} lang={lang} />;
          })}

          <rect x={0} y={0} width={hall.width_m} height={hall.depth_m} fill="none" stroke="var(--map-hall-stroke)" strokeWidth={Math.max(0.12, px * 2)} style={{ pointerEvents: "none" }} />

          {editing && singleRect && singleKind ? (
            <Handles id={single!} kind={singleKind} r={displayRect(single!, singleRect)} px={px} />
          ) : null}

          {draft && draft.width > 0 && draft.depth > 0 ? (
            <g style={{ pointerEvents: "none" }}>
              <rect x={draft.x} y={draft.y} width={draft.width} height={draft.depth} fill="var(--p-brand-soft)" stroke="var(--p-brand)" strokeWidth={px * 2} strokeDasharray={`${px * 6} ${px * 4}`} />
              <text
                x={draft.x + draft.width / 2}
                y={draft.y + draft.depth / 2}
                fontSize={Math.max(px * 12, Math.min(1.2, draft.depth / 3))}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--p-brand)"
                fontWeight={700}
                direction="ltr"
              >
                {`${round(draft.width, 1)} × ${round(draft.depth, 1)} m`}
              </text>
            </g>
          ) : null}
        </g>
      </svg>

      {/* Hover card (mouse only) */}
      {hoverId && !drag && !resize ? (
        <HoverCard ref={hoverCard} booth={boothById.get(hoverId) ?? null} />
      ) : null}

      {/* Zoom controls */}
      <div className="absolute bottom-3 end-3 flex flex-col overflow-hidden rounded-2xl border border-p-line bg-p-surface shadow-[var(--p-shadow-lg)]">
        <IconButton label={lang === "fa" ? "بزرگنمایی" : "Zoom in"} onClick={() => zoomBy(1.35)}>
          <Plus className="size-4" />
        </IconButton>
        <IconButton label={lang === "fa" ? "کوچک نمایی" : "Zoom out"} onClick={() => zoomBy(1 / 1.35)}>
          <Minus className="size-4" />
        </IconButton>
        <IconButton label={lang === "fa" ? "نمایش کامل سالن" : "Fit hall"} onClick={() => setView(fit(editing))}>
          <Maximize2 className="size-4" />
        </IconButton>
      </div>
      <ScaleBar scale={view.scale} lang={lang} />
    </div>
  );
}

function BoothShape({ b, scale, selected, lang }: { b: CanvasBooth; scale: number; selected: boolean; lang: "fa" | "en" }) {
  const wPx = b.width * scale;
  const dPx = b.depth * scale;
  const showCode = wPx > 22 && dPx > 14;
  const codeSize = Math.min(0.75, b.depth * 0.18, b.width * 0.2, 13 / scale);
  const pad = Math.min(0.3, b.width * 0.06);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.depth / 2;
  const barH = Math.min(0.28, b.depth * 0.07);
  const hasBar = b.progress != null && wPx > 30;
  // The full company name, wrapped over as many lines as the booth allows.
  const boxTop = b.y + pad + (showCode ? codeSize * 1.15 : 0);
  const boxBottomBase = b.y + b.depth - pad - (hasBar ? barH + pad * 0.6 : 0);
  const boxWidth = b.width - pad * 2;
  const subSize = Math.min(0.62, 11 / scale, b.depth * 0.12);
  let showSub = Boolean(b.subtitle) && wPx > 56 && dPx > 48;
  const titleMax = Math.min(0.9, 15 / scale);
  let title = b.title ? wrapLabel(b.title, boxWidth, boxBottomBase - boxTop - (showSub ? subSize * 1.35 : 0), titleMax) : null;
  if (title && !title.complete && showSub) {
    showSub = false;
    title = wrapLabel(b.title!, boxWidth, boxBottomBase - boxTop, titleMax);
  }
  const showTitle = Boolean(title?.lines.length) && title!.size * scale >= 4.5 && wPx > 30 && dPx > 22;
  const sub = showSub && b.subtitle ? fitLabel(b.subtitle, b.width, b.depth, subSize) : null;
  const lineH = title ? title.size * 1.18 : 0;
  const blockH = (showTitle ? title!.lines.length * lineH : 0) + (sub ? sub.size * 1.35 : 0);
  const blockTop = boxTop + Math.max(0, (boxBottomBase - boxTop - blockH) / 2);
  const transform = b.rotation ? `rotate(${b.rotation} ${cx} ${cy})` : undefined;
  return (
    <g
      className="booth cursor-pointer"
      data-id={b.id}
      data-kind="booth"
      data-tone={b.tone}
      data-selected={selected}
      data-dim={b.dim ? "true" : "false"}
      transform={transform}
    >
      <rect className="booth-shape" x={b.x + 0.04} y={b.y + 0.04} width={Math.max(0, b.width - 0.08)} height={Math.max(0, b.depth - 0.08)} rx={Math.min(0.25, b.width * 0.05)} />
      {b.flagged ? (
        <rect x={b.x + 0.04} y={b.y + 0.04} width={Math.max(0, b.width - 0.08)} height={Math.max(0, b.depth - 0.08)} fill="none" stroke="var(--p-danger)" strokeWidth={0.12} strokeDasharray="0.4 0.25" rx={0.2} />
      ) : null}
      {showCode ? (
        <text className="booth-text" x={b.x + pad} y={b.y + pad + codeSize * 0.85} fontSize={codeSize} fontWeight={700} direction="ltr" textAnchor="start">
          {b.code}
        </text>
      ) : null}
      {showTitle && title ? (
        <text className="booth-text" fontSize={title.size} fontWeight={600} textAnchor="middle" direction={lang === "fa" ? "rtl" : "ltr"}>
          {title.lines.map((line, i) => (
            <tspan key={i} x={cx} y={blockTop + lineH * i + title.size * 0.92}>
              {line}
            </tspan>
          ))}
        </text>
      ) : null}
      {sub ? (
        <text
          className="booth-text"
          x={cx}
          y={blockTop + (showTitle && title ? title.lines.length * lineH : 0) + sub.size * 1.15}
          fontSize={sub.size}
          opacity={0.8}
          textAnchor="middle"
          direction={lang === "fa" ? "rtl" : "ltr"}
        >
          {sub.label}
        </text>
      ) : null}
      {b.badge && wPx > 30 && dPx > 24 ? (
        <g>
          <circle cx={b.x + b.width - pad - codeSize * 0.7} cy={b.y + pad + codeSize * 0.6} r={codeSize * 0.75} fill="var(--tone-stroke)" />
          <text
            className="booth-text"
            x={b.x + b.width - pad - codeSize * 0.7}
            y={b.y + pad + codeSize * 0.6}
            fontSize={codeSize * 0.82}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fill: "var(--p-surface)" }}
            direction="ltr"
          >
            {b.badge}
          </text>
        </g>
      ) : null}
      {hasBar ? (
        <g style={{ pointerEvents: "none" }}>
          <rect x={b.x + pad} y={b.y + b.depth - pad - barH} width={b.width - pad * 2} height={barH} rx={0.1} fill="var(--tone-stroke)" opacity={0.25} />
          <rect
            x={b.x + pad}
            y={b.y + b.depth - pad - barH}
            width={Math.max(0, (b.width - pad * 2) * (b.progress ?? 0))}
            height={barH}
            rx={0.1}
            fill="var(--tone-text)"
            opacity={0.85}
          />
        </g>
      ) : null}
    </g>
  );
}

function Feature({
  f,
  px,
  hatch,
  selected,
  scale,
  lang,
  editing,
}: {
  f: CanvasFeature;
  px: number;
  hatch: string;
  selected: boolean;
  scale: number;
  lang: "fa" | "en";
  editing: boolean;
}) {
  const style: Record<string, { fill: string; stroke: string; dash?: string; text: string }> = {
    aisle: { fill: "var(--map-aisle)", stroke: "var(--map-aisle-stroke)", dash: `${px * 6} ${px * 5}`, text: "var(--p-brand)" },
    column: { fill: "var(--map-column)", stroke: "var(--map-column)", text: "transparent" },
    wall: { fill: "var(--map-column)", stroke: "var(--map-column)", text: "var(--p-surface)" },
    door: { fill: "var(--p-ok-soft)", stroke: "var(--p-ok)", text: "var(--p-ok)" },
    entrance: { fill: "var(--p-ok-soft)", stroke: "var(--p-ok)", text: "var(--p-ok)" },
    loading: { fill: hatch, stroke: "var(--map-hall-stroke)", text: "var(--p-ink-2)" },
    zone: { fill: "var(--p-gold-soft)", stroke: "var(--p-gold)", dash: `${px * 4} ${px * 3}`, text: "var(--p-gold)" },
    stage: { fill: "var(--p-violet-soft)", stroke: "var(--p-violet)", text: "var(--p-violet)" },
    service: { fill: "var(--map-feature)", stroke: "var(--p-line-strong)", text: "var(--p-ink-2)" },
    utility: { fill: "var(--p-warn-soft)", stroke: "var(--p-warn)", text: "var(--p-warn)" },
    label: { fill: "transparent", stroke: editing ? "var(--p-line-strong)" : "transparent", dash: `${px * 3} ${px * 3}`, text: "var(--p-ink-2)" },
  };
  const s = style[f.kind] ?? style.service;
  const minSide = Math.min(f.width, f.depth);
  const vertical = f.depth > f.width * 1.6;
  const run = (vertical ? f.depth : f.width) * 0.92;
  const size = Math.min(f.kind === "label" ? 1.4 : 0.8, minSide * 0.42, 14 / scale, run / Math.max(1, (f.label?.length ?? 0) * 0.55));
  const fits = size * scale >= 7;
  const cx = f.x + f.width / 2;
  const cy = f.y + f.depth / 2;
  return (
    <g
      data-id={f.id}
      data-kind="feature"
      className={editing ? (f.locked ? "cursor-not-allowed" : "cursor-pointer") : undefined}
      style={editing ? undefined : { pointerEvents: f.kind === "label" ? "none" : undefined }}
    >
      <rect
        x={f.x}
        y={f.y}
        width={f.width}
        height={f.depth}
        fill={s.fill}
        stroke={selected ? "var(--map-select)" : s.stroke}
        strokeWidth={selected ? 0.2 : Math.max(0.05, px)}
        strokeDasharray={selected ? undefined : s.dash}
        rx={f.kind === "column" ? 0.05 : 0.15}
      />
      {f.label && fits && size * scale > 7 ? (
        <text
          className="booth-text"
          x={cx}
          y={cy}
          fontSize={size}
          fill={s.text}
          fontWeight={f.kind === "label" ? 700 : 600}
          textAnchor="middle"
          dominantBaseline="central"
          direction={lang === "fa" ? "rtl" : "ltr"}
          transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
          opacity={f.kind === "aisle" ? 0.75 : 1}
        >
          {f.label}
          {editing && (f.kind === "aisle" || f.kind === "entrance" || f.kind === "door") ? `${sep(lang)}${round(vertical ? f.width : f.depth, 2)} m` : ""}
        </text>
      ) : null}
      {editing && f.locked && minSide * scale > 14 ? (
        <g transform={`translate(${f.x + f.width - Math.min(0.5, minSide * 0.3) - 0.1} ${f.y + 0.1}) scale(${Math.min(0.5, minSide * 0.3) / 10})`} style={{ pointerEvents: "none" }}>
          <rect x={1.5} y={4.5} width={7} height={5.5} rx={1} fill="var(--p-ink-2)" />
          <path d="M3 4.5 V3 a2 2 0 0 1 4 0 V4.5" fill="none" stroke="var(--p-ink-2)" strokeWidth={1.4} />
        </g>
      ) : null}
    </g>
  );
}

const HoverCard = forwardRef<HTMLDivElement, { booth: CanvasBooth | null }>(function HoverCard({ booth }, ref) {
  if (!booth?.hover) return null;
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-30 max-w-72 rounded-2xl border border-p-line bg-p-surface px-3.5 py-2.5 shadow-[var(--p-shadow-lg)]"
      style={{ left: 0, top: 0, transform: "translate(-9999px, -9999px)" }}
    >
      <p className="text-[13px] font-bold leading-snug text-p-ink">{booth.hover.title}</p>
      {booth.hover.lines.map((line, i) => (
        <p key={i} className="mt-0.5 text-xs leading-snug text-p-ink-3">
          {line}
        </p>
      ))}
    </div>
  );
});

function Handles({ id, kind, r, px }: { id: string; kind: Kind; r: Rect; px: number }) {
  const h = HANDLE_PX * px;
  const corners: Array<[Corner, number, number]> = [
    ["nw", r.x, r.y],
    ["ne", r.x + r.width, r.y],
    ["sw", r.x, r.y + r.depth],
    ["se", r.x + r.width, r.y + r.depth],
  ];
  return (
    <g>
      {corners.map(([corner, x, y]) => (
        <rect
          key={corner}
          data-handle={id}
          data-kind={kind}
          data-corner={corner}
          x={x - h / 2}
          y={y - h / 2}
          width={h}
          height={h}
          rx={h * 0.25}
          fill="var(--p-surface)"
          stroke="var(--map-select)"
          strokeWidth={px * 2}
          className={corner === "nw" || corner === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}
        />
      ))}
    </g>
  );
}

function ScaleBar({ scale, lang }: { scale: number; lang: "fa" | "en" }) {
  // Pick a round length that is 60-140 px on screen.
  const options = [0.5, 1, 2, 5, 10, 20, 50];
  const metres = options.find((m) => m * scale >= 60) ?? 50;
  return (
    <div className="pointer-events-none absolute bottom-3 start-3 rounded-xl border border-p-line bg-p-surface/90 px-2.5 py-1.5 text-[11px] font-medium text-p-ink-2 shadow-[var(--p-shadow)]">
      <div className="h-1.5 border-x-2 border-b-2 border-p-ink-2" style={{ width: metres * scale }} />
      <div className="mt-0.5 text-center">
        {metres.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} {lang === "fa" ? "متر" : "m"}
      </div>
    </div>
  );
}
