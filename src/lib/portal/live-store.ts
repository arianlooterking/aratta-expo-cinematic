"use client";

import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/platform/database.types";
import { PortalStore, type AnyRow, type Collection, type HistoryQuery, type MyProfilePatch } from "./store.ts";
import type { AuditEntry, Insert, MutationResult, Patch, PortalTable, Row } from "./types";

const PAGE = 1000;

function friendly(message: string | undefined) {
  if (!message) return "not-permitted";
  // The staff guards in the database, as short codes the screens translate.
  if (/your own role or status/i.test(message)) return "self-role";
  if (/remove your own staff access/i.test(message)) return "self-remove";
  if (/Only an owner/i.test(message)) return "owner-only";
  if (/At least one active owner/i.test(message)) return "last-owner";
  if (/email of a signed-in colleague/i.test(message)) return "email-locked";
  if (/row-level security|permission denied|violates row/i.test(message)) return "not-permitted";
  if (/duplicate key|unique/i.test(message)) return "duplicate";
  if (/Failed to fetch|NetworkError|fetch failed/i.test(message)) return "offline";
  return message;
}

/** The shared Supabase database, kept current with realtime changes. */
export class LiveStore extends PortalStore {
  readonly mode = "live" as const;

  private client: SupabaseClient<Database> | null = null;
  private readonly connect: () => SupabaseClient<Database> | null;

  constructor(connect: () => SupabaseClient<Database> | null) {
    super();
    this.connect = connect;
  }

  // Connect on first use, in the browser only.
  private get sb(): SupabaseClient<Database> {
    this.client ??= this.connect();
    if (!this.client) throw new Error("Supabase is not configured");
    return this.client;
  }

  // postgrest-js can't infer rows from a generic table name; rows are typed by
  // the public methods instead.
  private from(table: PortalTable) {
    return this.sb.from(table as "booths");
  }

  protected start(c: Collection) {
    let cancelled = false;
    const realtimeFilter = c.filter ? `${c.filter.column}=eq.${c.filter.value}` : undefined;
    const onChange = (payload: RealtimePostgresChangesPayload<AnyRow>) => {
      if (payload.eventType === "DELETE") {
        const id = (payload.old as Partial<AnyRow>).id;
        if (id) this.applyLocal(c.table, { type: "delete", id });
      } else {
        this.applyLocal(c.table, { type: "upsert", row: payload.new as AnyRow, full: true });
      }
    };

    let channel = this.sb
      .channel(`portal:${c.key}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: c.table, filter: realtimeFilter }, onChange)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: c.table, filter: realtimeFilter }, onChange);
    // Deletes can't be filtered; listen to all of them (only ids arrive).
    channel = channel.on("postgres_changes", { event: "DELETE", schema: "public", table: c.table }, onChange);
    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED" && c.state.status === "offline") this.setState(c, { status: "live" });
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (c.state.status === "live") this.setState(c, { status: "offline" });
      }
    });

    (async () => {
      const all: AnyRow[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = this.from(c.table).select("*").order("id").range(from, from + PAGE - 1);
        if (c.filter) query = query.eq(c.filter.column as "id", c.filter.value);
        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
          this.setState(c, { status: "error", error: friendly(error.message) });
          return;
        }
        all.push(...(data as unknown as AnyRow[]));
        if (!data || data.length < PAGE) break;
      }
      // Realtime rows that arrived while loading are newer; keep them.
      const byId = new Map(all.map((row) => [row.id, row]));
      for (const row of c.state.rows) byId.set(row.id, row);
      this.setState(c, { rows: [...byId.values()], status: "live", error: null });
    })();

    return () => {
      cancelled = true;
      void this.sb.removeChannel(channel);
    };
  }

  async insert<T extends PortalTable>(table: T, row: Insert<T> & { id: string }): Promise<MutationResult<Row<T>>> {
    this.applyLocal(table, { type: "upsert", row: row as unknown as AnyRow, full: true });
    const { data, error } = await this.from(table).insert(row as never).select().maybeSingle();
    if (error || !data) {
      this.applyLocal(table, { type: "delete", id: row.id });
      const message = friendly(error?.message);
      this.notify({ kind: "error", message });
      return { ok: false, error: message };
    }
    this.applyLocal(table, { type: "upsert", row: data as unknown as AnyRow, full: true });
    return { ok: true, row: data as unknown as Row<T> };
  }

  async update<T extends PortalTable>(table: T, id: string, patch: Patch<T>): Promise<MutationResult<Row<T>>> {
    const before = this.findRow(table, id);
    this.applyLocal(table, { type: "upsert", row: { ...(patch as object), id } as AnyRow, full: false });
    const { data, error } = await this.from(table).update(patch as never).eq("id", id).select().maybeSingle();
    if (error || !data) {
      if (before) this.applyLocal(table, { type: "upsert", row: before, full: true });
      const message = friendly(error?.message);
      this.notify({ kind: "error", message });
      return { ok: false, error: message };
    }
    this.applyLocal(table, { type: "upsert", row: data as unknown as AnyRow, full: true });
    return { ok: true, row: data as unknown as Row<T> };
  }

  async remove<T extends PortalTable>(table: T, id: string): Promise<MutationResult<Row<T>>> {
    const before = this.findRow(table, id);
    this.applyLocal(table, { type: "delete", id });
    const { data, error } = await this.from(table).delete().eq("id", id).select().maybeSingle();
    if (error || !data) {
      if (before) this.applyLocal(table, { type: "upsert", row: before, full: true });
      const message = friendly(error?.message);
      this.notify({ kind: "error", message });
      return { ok: false, error: message };
    }
    return { ok: true, row: data as unknown as Row<T> };
  }

  async markNotificationsRead(ids?: string[]) {
    const now = new Date().toISOString();
    for (const c of this.collectionsOf("notifications")) {
      for (const row of c.state.rows) {
        if (!row.read_at && (!ids || ids.includes(row.id))) {
          this.applyLocal("notifications", { type: "upsert", row: { id: row.id, read_at: now }, full: false });
        }
      }
    }
    await this.sb.rpc("mark_notifications_read", ids ? { p_ids: ids } : {});
  }

  async openDirect(staffId: string) {
    const { data, error } = await this.sb.rpc("chat_open_direct", { p_staff: staffId });
    if (error || !data) {
      const message = friendly(error?.message);
      this.notify({ kind: "error", message });
      return { ok: false as const, error: message };
    }
    const id = data as string;
    // Show the conversation at once instead of waiting for the live update.
    const [channel, members] = await Promise.all([
      this.from("chat_channels").select("*").eq("id", id).maybeSingle(),
      this.from("chat_members").select("*").eq("channel_id" as "id", id),
    ]);
    if (channel.data) this.applyLocal("chat_channels", { type: "upsert", row: channel.data as unknown as AnyRow, full: true });
    for (const row of (members.data ?? []) as unknown as AnyRow[]) this.applyLocal("chat_members", { type: "upsert", row, full: true });
    return { ok: true as const, id };
  }

  async setMyAvatar(staffId: string, avatar: string | null): Promise<MutationResult<Row<"staff_members">>> {
    const before = this.findRow("staff_members", staffId);
    this.applyLocal("staff_members", { type: "upsert", row: { id: staffId, avatar_url: avatar } as AnyRow, full: false });
    const { data, error } = await this.sb.rpc("set_my_avatar", { p_avatar: avatar });
    if (error || !data) {
      if (before) this.applyLocal("staff_members", { type: "upsert", row: before, full: true });
      const message = friendly(error?.message);
      this.notify({ kind: "error", message });
      return { ok: false, error: message };
    }
    const row = data as unknown as Row<"staff_members">;
    this.applyLocal("staff_members", { type: "upsert", row: row as unknown as AnyRow, full: true });
    return { ok: true, row };
  }

  async updateMyProfile(staffId: string, patch: MyProfilePatch): Promise<MutationResult<Row<"staff_members">>> {
    const before = this.findRow("staff_members", staffId);
    this.applyLocal("staff_members", { type: "upsert", row: { ...(patch as object), id: staffId } as AnyRow, full: false });
    const { data, error } = await this.sb.rpc("update_my_profile", {
      p_display_name: patch.display_name ?? undefined,
      p_job_title: patch.job_title === undefined ? undefined : (patch.job_title ?? ""),
      p_phone: patch.phone === undefined ? undefined : (patch.phone ?? ""),
      p_locale: patch.locale ?? undefined,
      p_bio: patch.bio === undefined ? undefined : (patch.bio ?? ""),
      p_skills: patch.skills ?? undefined,
    });
    if (error || !data) {
      if (before) this.applyLocal("staff_members", { type: "upsert", row: before, full: true });
      const message = friendly(error?.message);
      this.notify({ kind: "error", message });
      return { ok: false, error: message };
    }
    const row = data as unknown as Row<"staff_members">;
    this.applyLocal("staff_members", { type: "upsert", row: row as unknown as AnyRow, full: true });
    return { ok: true, row };
  }

  async history(query: HistoryQuery) {
    let q = this.sb
      .from("audit_log")
      .select("id, occurred_at, table_name, row_id, action, actor_id, changes")
      .in("table_name", query.tables)
      .order("occurred_at", { ascending: false })
      .limit(query.limit ?? 100);
    if (query.rowId) q = q.eq("row_id", query.rowId);
    const { data, error } = await q;
    if (error) return { ok: false as const, error: friendly(error.message) };
    const entries = (data ?? []).map((e) => ({ ...e, id: String(e.id), changes: (e.changes ?? {}) as Record<string, unknown> })) as AuditEntry[];
    return { ok: true as const, entries };
  }

  async uploadFile(bucket: "hall-plans" | "documents", path: string, file: File) {
    const { error } = await this.sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) return { ok: false as const, error: friendly(error.message) };
    return { ok: true as const, path };
  }

  async fileUrl(bucket: "hall-plans" | "documents", path: string) {
    const { data } = await this.sb.storage.from(bucket).createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }
}
