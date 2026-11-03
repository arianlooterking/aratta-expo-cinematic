"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function columnAt<K extends string>(x: number, y: number) {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-column]");
  return (el?.dataset.column as K | undefined) ?? null;
}

export type DragState<K extends string> = { id: string; x: number; y: number; over: K | null; width: number };

/**
 * Drag cards between board columns with a mouse, a pen or a finger.
 * Mouse: drag after moving a few pixels. Touch: press and hold briefly, then drag, so normal
 * scrolling still works. Columns are elements with data-column="<key>".
 */
export function useBoardDrag<K extends string>(onDrop: (id: string, column: K) => void, scroller?: React.RefObject<HTMLElement | null>) {
  const [drag, setDrag] = useState<DragState<K> | null>(null);
  const start = useRef<{ id: string; x: number; y: number; pointerId: number; touch: boolean; width: number; armed: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

  const end = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    start.current = null;
    setDrag(null);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = start.current;
      if (!s || e.pointerId !== s.pointerId) return;
      const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
      if (!s.armed) {
        if (s.touch) {
          // Moving before the hold finishes means the person is scrolling.
          if (dist > 8) end();
          return;
        }
        if (dist < 6) return;
        s.armed = true;
      }
      const box = scroller?.current;
      if (box) {
        const r = box.getBoundingClientRect();
        if (e.clientX < r.left + 48) box.scrollLeft -= 14;
        else if (e.clientX > r.right - 48) box.scrollLeft += 14;
      }
      setDrag({ id: s.id, x: e.clientX, y: e.clientY, over: columnAt<K>(e.clientX, e.clientY), width: s.width });
    };
    const onUp = (e: PointerEvent) => {
      const s = start.current;
      if (!s || e.pointerId !== s.pointerId) return;
      if (s.armed) {
        const column = columnAt<K>(e.clientX, e.clientY);
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 50);
        if (column) dropRef.current(s.id, column);
      }
      end();
    };
    // While a touch drag is on, stop the page from scrolling underneath.
    const onTouchMove = (e: TouchEvent) => {
      if (start.current?.armed) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", end);
    window.addEventListener("keydown", onKey);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [end, scroller]);

  /** Spread on each card: onPointerDown={(e) => cardDown(e, id)} */
  const cardDown = useCallback((e: ReactPointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, [data-no-drag]")) return;
    const width = e.currentTarget.getBoundingClientRect().width;
    const touch = e.pointerType !== "mouse";
    start.current = { id, x: e.clientX, y: e.clientY, pointerId: e.pointerId, touch, width, armed: false };
    if (touch) {
      const { clientX, clientY } = e;
      holdTimer.current = setTimeout(() => {
        if (!start.current) return;
        start.current.armed = true;
        navigator.vibrate?.(12);
        setDrag({ id, x: clientX, y: clientY, over: columnAt<K>(clientX, clientY), width });
      }, 280);
    }
  }, []);

  /** Call at the top of a card's onClick: true means the click was the end of a drag. */
  const wasDrag = useCallback(() => suppressClick.current, []);

  return { drag, cardDown, wasDrag };
}
