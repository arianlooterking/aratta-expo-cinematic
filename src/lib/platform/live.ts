"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Database } from "./database.types";
import { applyChange } from "./live-merge";

export { applyChange };

type PublicTables = Database["public"]["Tables"];
export type LiveTableName = {
  [K in keyof PublicTables]: PublicTables[K]["Row"] extends { id: string } ? K : never;
}[keyof PublicTables];
type Row<T extends LiveTableName> = PublicTables[T]["Row"];

export type LiveStatus = "idle" | "loading" | "live" | "offline" | "error";

/**
 * Loads rows from a table and keeps them current as colleagues edit them.
 * `filter` uses the realtime filter syntax, e.g. `exhibition_id=eq.<uuid>`,
 * and is applied to both the initial query and the subscription.
 */
export function useLiveTable<T extends LiveTableName>(
  table: T,
  options: { filter?: { column: keyof Row<T> & string; value: string }; enabled?: boolean } = {},
) {
  const { filter, enabled = true } = options;
  const [rows, setRows] = useState<Row<T>[]>([]);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const filterKey = filter ? `${filter.column}=eq.${filter.value}` : "";
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !enabled) {
      setStatus(supabase ? "idle" : "offline");
      return;
    }
    let cancelled = false;
    setStatus("loading");

    const channel = supabase
      .channel(`live:${table}:${filterKey || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filterKey ? { filter: filterKey } : {}) },
        (payload: RealtimePostgresChangesPayload<Row<T>>) => {
          setRows((current) =>
            applyChange(current, {
              eventType: payload.eventType,
              new: payload.new as Partial<Row<T>>,
              old: payload.old as Partial<Row<T>>,
            }),
          );
        },
      )
      .subscribe((state) => {
        if (cancelled) return;
        if (state === "SUBSCRIBED") setStatus((s) => (s === "loading" ? s : "live"));
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("offline");
      });

    // Subscribe first, then load, so no change between the two is missed.
    (async () => {
      const f = filterRef.current;
      // The generic table name defeats postgrest-js inference; rows are typed below.
      const base = supabase.from(table as "booths").select("*");
      const { data, error: loadError } = await (f ? base.eq(f.column as "id", f.value) : base);
      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        setStatus("error");
        return;
      }
      setRows((current) => {
        // Keep any realtime rows that arrived while the query was in flight.
        const byId = new Map((data as unknown as Row<T>[]).map((row) => [row.id, row]));
        for (const row of current) byId.set(row.id, row);
        return [...byId.values()];
      });
      setStatus("live");
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table, filterKey, enabled]);

  return useMemo(() => ({ rows, status, error }), [rows, status, error]);
}

/** Unread count and newest notifications for the signed-in staff member. */
export function useInbox() {
  const { rows, status } = useLiveTable("notifications");
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rows],
  );
  const unread = sorted.filter((n) => !n.read_at).length;

  async function markRead(ids?: string[]) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.rpc("mark_notifications_read", ids ? { p_ids: ids } : {});
  }

  return { notifications: sorted, unread, status, markRead };
}
