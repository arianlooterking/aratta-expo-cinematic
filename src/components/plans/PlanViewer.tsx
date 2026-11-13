"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Download, Expand, Minus, Plus, RotateCcw, Shrink } from "lucide-react";
import { cn } from "@/lib/cn";

export type ViewerPage = {
  key: string;
  label: string;
  hint: string;
  src: string;
  width: number;
  height: number;
  alt: string;
};

type View = { s: number; x: number; y: number };

const MAX_ZOOM = 6;

/**
 * A calm zoom and pan viewer for plan pages: buttons, pinch and drag on
 * phones, ctrl/cmd + wheel or double click on desktops, and a full-screen
 * mode that works on iPhone too (an overlay, not the Fullscreen API).
 */
export function PlanViewer({
  lang,
  pages,
  downloadHref,
  downloadName,
  downloadLabel,
}: {
  lang: "fa" | "en";
  pages: ViewerPage[];
  downloadHref: string;
  downloadName: string;
  downloadLabel: string;
}) {
  const fa = lang === "fa";
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const [view, setView] = useState<View>({ s: 0, x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);
  const [fitS, setFitS] = useState(1);
  const stage = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const pointerType = useRef("mouse");
  const tap = useRef<{ x: number; y: number; t: number; moved: boolean; last: number }>({ x: 0, y: 0, t: 0, moved: false, last: 0 });
  const page = pages[index];

  const commit = useCallback((next: View, smooth: boolean) => {
    viewRef.current = next;
    setAnimate(smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setView(next);
  }, []);

  const fitScale = useCallback(() => {
    const box = stage.current?.getBoundingClientRect();
    if (!box || !page) return 1;
    return Math.min(box.width / page.width, box.height / page.height);
  }, [page]);

  /** Keeps at least part of the page in view and centres it when it is smaller than the stage. */
  const clamp = useCallback(
    (v: View): View => {
      const box = stage.current?.getBoundingClientRect();
      if (!box || !page) return v;
      const w = page.width * v.s;
      const h = page.height * v.s;
      const x = w <= box.width ? (box.width - w) / 2 : Math.min(0, Math.max(box.width - w, v.x));
      const y = h <= box.height ? (box.height - h) / 2 : Math.min(0, Math.max(box.height - h, v.y));
      return { s: v.s, x, y };
    },
    [page],
  );

  const fit = useCallback(
    (smooth = false) => {
      const s = fitScale();
      setFitS(s);
      commit(clamp({ s, x: 0, y: 0 }), smooth);
    },
    [clamp, commit, fitScale],
  );

  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number, smooth = false) => {
      const box = stage.current?.getBoundingClientRect();
      if (!box) return;
      const v = viewRef.current;
      const min = fitScale();
      const s = Math.min(min * MAX_ZOOM, Math.max(min, v.s * factor));
      const cx = px ?? box.width / 2;
      const cy = py ?? box.height / 2;
      commit(clamp({ s, x: cx - ((cx - v.x) * s) / v.s, y: cy - ((cy - v.y) * s) / v.s }), smooth);
    },
    [clamp, commit, fitScale],
  );

  // Fit on load, on page change and whenever the stage changes size (full screen, rotation).
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    fit();
    const observer = new ResizeObserver(() => fit());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit, index, full]);

  // Ctrl/cmd + wheel (and trackpad pinch, which arrives as ctrl + wheel) zooms; a plain wheel scrolls the page
  // unless the viewer is full screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!full && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const box = el.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.002), event.clientX - box.left, event.clientY - box.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [full, zoomAt]);

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const local = (event: ReactPointerEvent) => {
    const box = stage.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerType.current = event.pointerType;
    const point = local(event);
    pointers.current.set(event.pointerId, point);
    gesture.current = null;
    tap.current = { ...tap.current, x: point.x, y: point.y, t: event.timeStamp, moved: pointers.current.size > 1 };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = local(event);
    pointers.current.set(event.pointerId, point);
    if (Math.hypot(point.x - tap.current.x, point.y - tap.current.y) > 8) tap.current.moved = true;
    const all = [...pointers.current.values()];
    const v = viewRef.current;
    if (all.length === 1) {
      commit(clamp({ s: v.s, x: v.x + point.x - previous.x, y: v.y + point.y - previous.y }), false);
      return;
    }
    const [a, b] = all;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const last = gesture.current;
    gesture.current = { dist, mx, my };
    if (!last) return;
    const min = fitScale();
    const s = Math.min(min * MAX_ZOOM, Math.max(min, v.s * (dist / last.dist)));
    const x = mx - ((last.mx - v.x) * s) / v.s;
    const y = my - ((last.my - v.y) * s) / v.s;
    commit(clamp({ s, x, y }), false);
  };

  const toggleZoom = (x: number, y: number) => {
    if (viewRef.current.s > fitScale() * 1.05) fit(true);
    else zoomAt(2.5, x, y, true);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    gesture.current = null;
    // Double tap on touch screens (mouse users get the dblclick event).
    if (event.pointerType === "mouse" || tap.current.moved || event.timeStamp - tap.current.t > 250) return;
    if (event.timeStamp - tap.current.last < 320) {
      tap.current.last = 0;
      toggleZoom(tap.current.x, tap.current.y);
    } else {
      tap.current.last = event.timeStamp;
    }
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (pointerType.current !== "mouse") return;
    const box = stage.current!.getBoundingClientRect();
    toggleZoom(event.clientX - box.left, event.clientY - box.top);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const v = viewRef.current;
    const step = 60;
    const keys: Record<string, () => void> = {
      "+": () => zoomAt(1.4, undefined, undefined, true),
      "=": () => zoomAt(1.4, undefined, undefined, true),
      "-": () => zoomAt(1 / 1.4, undefined, undefined, true),
      "0": () => fit(true),
      ArrowLeft: () => commit(clamp({ ...v, x: v.x + step }), true),
      ArrowRight: () => commit(clamp({ ...v, x: v.x - step }), true),
      ArrowUp: () => commit(clamp({ ...v, y: v.y + step }), true),
      ArrowDown: () => commit(clamp({ ...v, y: v.y - step }), true),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const zoomPercent = Math.round((view.s / (fitS || 1)) * 100) || 100;
  const button =
    "grid h-11 w-11 place-items-center rounded-full border border-ink/12 bg-shade/40 text-ink backdrop-blur-xl transition hover:border-ink/30 disabled:opacity-40";

  const viewer = (
    <div
      dir={fa ? "rtl" : "ltr"}
      lang={lang}
      className={cn(
        "flex flex-col gap-3",
        full && "fixed inset-0 z-[80] bg-[var(--panel-strong)] p-3 backdrop-blur-xl sm:p-5",
      )}
      role={full ? "dialog" : undefined}
      aria-modal={full ? true : undefined}
      aria-label={full ? page.label : undefined}
    >
      <div role="tablist" aria-label={fa ? "سالن‌ها" : "Halls"} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {pages.map((p, i) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={(event) => {
              setIndex(i);
              event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            className={cn(
              "min-h-11 shrink-0 rounded-2xl border px-4 py-2 text-start transition",
              i === index ? "border-gilt-200/45 bg-gilt-200/12 text-ink" : "border-ink/12 bg-ink/[0.04] text-ink-70 hover:border-ink/25",
            )}
          >
            <span className="block text-sm font-black">{p.label}</span>
            <span className="font-latin block text-xs text-ink-55" dir="ltr">
              {p.hint}
            </span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[1.6rem] border border-ink/12 bg-white",
          full ? "min-h-0 flex-1" : "h-[min(72vh,620px)] min-h-[420px]",
        )}
      >
        <div
          ref={stage}
          tabIndex={0}
          role="img"
          aria-label={page.alt}
          className="absolute inset-0 cursor-grab touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
        >
          {view.s > 0 ? (
            <div
              className={cn("absolute left-0 top-0 origin-top-left will-change-transform", animate && "transition-transform duration-300 ease-out")}
              style={{ width: page.width, height: page.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
            >
              <Image src={page.src} alt="" width={page.width} height={page.height} unoptimized draggable={false} priority={index === 0} className="h-full w-full" />
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2" dir="ltr">
          <div className="pointer-events-auto flex gap-2">
            <button type="button" className={button} onClick={() => zoomAt(1 / 1.4, undefined, undefined, true)} aria-label={fa ? "کوچک‌نمایی" : "Zoom out"} disabled={zoomPercent <= 100}>
              <Minus size={18} />
            </button>
            <span className="font-latin grid min-w-16 place-items-center rounded-full border border-ink/12 bg-shade/40 px-3 text-xs font-bold text-ink backdrop-blur-xl" aria-live="polite">
              {zoomPercent}%
            </span>
            <button type="button" className={button} onClick={() => zoomAt(1.4, undefined, undefined, true)} aria-label={fa ? "بزرگ‌نمایی" : "Zoom in"} disabled={zoomPercent >= MAX_ZOOM * 100}>
              <Plus size={18} />
            </button>
            <button type="button" className={button} onClick={() => fit(true)} aria-label={fa ? "اندازه کامل صفحه" : "Fit the page"}>
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <a href={downloadHref} download={downloadName} className={button} aria-label={downloadLabel}>
              <Download size={18} />
            </a>
            <button type="button" className={button} onClick={() => setFull((value) => !value)} aria-label={full ? (fa ? "خروج از تمام صفحه" : "Exit full screen") : fa ? "تمام صفحه" : "Full screen"}>
              {full ? <Shrink size={18} /> : <Expand size={18} />}
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs leading-6 text-ink-55">
        {fa
          ? "با دو انگشت یا Ctrl و چرخ ماوس بزرگ‌نمایی کنید، بکشید تا جابه‌جا شود و دوبار بزنید تا بزرگ یا کوچک شود."
          : "Pinch, or hold Ctrl and use the mouse wheel, to zoom; drag to move; double-tap to zoom in or out."}
      </p>
    </div>
  );

  // Glass panels create their own containing block, so full screen is rendered at the document root.
  if (!full) return viewer;
  return (
    <>
      <div aria-hidden="true" className="h-[min(72vh,620px)] min-h-[420px]" />
      {createPortal(viewer, document.body)}
    </>
  );
}
