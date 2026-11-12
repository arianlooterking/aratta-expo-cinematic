"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/lang";
import { motifs, type MotifName } from "./motifs";

type BuildBackdropProps = {
  motif: MotifName;
  lang: Lang;
  /** Size and placement of the drawing inside its section (absolute positioning classes). */
  className?: string;
  /**
   * "scroll": the drawing follows the section into the viewport and finishes as it settles.
   * "intro": it draws itself once over a few seconds (page headers, already in view on load).
   */
  mode?: "scroll" | "intro";
  /** "quiet" lowers contrast further, for inner page headers. */
  tone?: "default" | "quiet";
};

const INTRO_MS = 2600;

/**
 * A decorative line drawing of a stand being built, behind a section's content.
 * Purely visual: hidden from assistive tech, never takes pointer events, sized
 * by its container so it causes no layout shift. One CSS variable (--draw)
 * drives the whole drawing; the loop only runs while it is on screen.
 */
export function BuildBackdrop({ motif, lang, className, mode = "scroll", tone = "default" }: BuildBackdropProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `bb${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const spec = motifs[motif];

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;

    // Keep line weights and labels the same size on screen whatever the drawing's scale.
    const setUnit = () => {
      const box = svg.getBoundingClientRect();
      const scale = Math.min(box.width / spec.w, box.height / spec.h);
      if (scale > 0) svg.style.setProperty("--u", (1 / scale).toFixed(3));
    };
    setUnit();
    const resize = new ResizeObserver(setUnit);
    resize.observe(svg);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      svg.style.setProperty("--draw", "1");
      return () => resize.disconnect();
    }

    let inView = false;
    let frame = 0;
    let current = 0;
    let introStart = 0;

    const scrollTarget = () => {
      const box = svg.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Starts as the drawing's top enters at the bottom of the screen and is
      // complete once its middle reaches a little above the centre.
      const endTop = Math.min(vh * 0.6, vh * 0.48 - box.height * 0.3);
      return Math.min(1, Math.max(0, (vh - box.top) / Math.max(vh * 0.3, vh - endTop)));
    };

    const introTarget = (now: number) => {
      const t = Math.min(1, (now - introStart) / INTRO_MS);
      return 1 - Math.pow(1 - t, 3);
    };

    const tick = (now: number) => {
      frame = 0;
      const target = mode === "intro" ? introTarget(now) : scrollTarget();
      current += (target - current) * (mode === "intro" ? 1 : 0.14);
      if (Math.abs(target - current) < 0.002) current = target;
      svg.style.setProperty("--draw", current.toFixed(4));
      svg.classList.toggle("is-live", inView && current > 0.97);
      const settling = current !== target || (mode === "intro" && current < 1);
      if (inView && settling) frame = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (inView && !frame) frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {
          if (mode === "intro" && !introStart) introStart = performance.now();
          kick();
        } else {
          svg.classList.remove("is-live");
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "10% 0px" },
    );
    observer.observe(svg);
    if (mode === "scroll") window.addEventListener("scroll", kick, { passive: true });

    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", kick);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, spec.w, spec.h]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-x-clip">
      <svg
        ref={ref}
        viewBox={`0 0 ${spec.w} ${spec.h}`}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        className={cn("bb absolute", tone === "quiet" && "bb--quiet", className)}
        style={{ aspectRatio: `${spec.w} / ${spec.h}` }}
      >
        {spec.render({ fa: lang === "fa", id })}
      </svg>
    </div>
  );
}
