"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "./database.types";
import { applyChange } from "./live-merge";

export { applyChange };

type PublicTables = Database["public"]["Tables"];
export type LiveTableName = {
  [K in keyof PublicTables]: PublicTables[K]["Row"] extends { id: string } ? K : never;
}[keyof PublicTables];
type Row<T extends LiveTableName> = PublicTables[T]["Row"];

export type LiveStatus = "idle" | "loading" | "live" | "offline" | "error";

type LiveState<R> = {
  key: string;
  rows: R[];
  loaded: boolean;
  channel: "pending" | "ok" | "down";
  error: string | null;
};

function emptyState<R>(key: string): LiveState<R> {
  return { key, rows: [], loaded: false, channel: "pending", error: null };
}

/**
 * Loads rows from a table and keeps them current as colleagues edit them.
 * An optional equality filter (e.g. exhibition_id) applies to both the
 * initial query and the realtime subscription.
 */
export function useLiveTable<T extends LiveTableName>(
  table: T,
  options: { filter?: { column: keyof Row<T> & string; value: string }; enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const filterColumn = options.filter?.column ?? null;
  const filterValue = options.filter?.value ?? null;
  const key = `${table}:${filterColumn ?? "*"}=${filterValue ?? "*"}`;
  const [live, setLive] = useState<LiveState<Row<T>>>(() => emptyState(key));
  const current = live.key === key ? live : emptyState<Row<T>>(key);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !enabled) return;
    let cancelled = false;
    const update = (fn: (state: LiveState<Row<T>>) => LiveState<Row<T>>) =>
      setLive((prev) => fn(prev.key === key ? prev : emptyState(key)));
    const realtimeFilter = filterColumn && filterValue ? `${filterColumn}=eq.${filterValue}` : undefined;

    const channel = supabase
      .channel(`live:${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(realtimeFilter ? { filter: realtimeFilter } : {}) },
        (payload: RealtimePostgresChangesPayload<Row<T>>) => {
          update((state) => ({
            ...state,
            rows: applyChange(state.rows, {
              eventType: payload.eventType,
              new: payload.new as Partial<Row<T>>,
              old: payload.old as Partial<Row<T>>,
            }),
          }));
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") update((state) => ({ ...state, channel: "ok" }));
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          update((state) => ({ ...state, channel: "down" }));
        }
      });

    // Subscribe first, then load, so no change between the two is missed.
    (async () => {
      // The generic table name defeats postgrest-js inference; rows are typed below.
      const base = supabase.from(table as "booths").select("*");
      const { data, error } = await (filterColumn && filterValue
        ? base.eq(filterColumn as "id", filterValue)
        : base);
      if (cancelled) return;
      update((state) => {
        if (error) return { ...state, loaded: true, error: error.message };
        // Keep any realtime rows that arrived while the query was in flight.
        const byId = new Map((data as unknown as Row<T>[]).map((row) => [row.id, row]));
        for (const row of state.rows) byId.set(row.id, row);
        return { ...state, loaded: true, error: null, rows: [...byId.values()] };
      });
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [key, table, filterColumn, filterValue, enabled]);

  const status: LiveStatus = !isSupabaseConfigured()
    ? "offline"
    : !enabled
      ? "idle"
      : current.error
        ? "error"
        : !current.loaded
          ? "loading"
          : current.channel === "down"
            ? "offline"
            : "live";

  return useMemo(
    () => ({ rows: current.rows, status, error: current.error }),
    [current.rows, status, current.error],
  );
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
