"use client";

import { afterChatMessage, dmKey } from "./chat.ts";
import { carryFurniture, cleanStaffIds, deriveBooth, deriveHandoverPeople, deriveOrder, deriveProblem, deriveTeam, staffChangeError } from "./rules.ts";
import { DEMO_STAFF_ID } from "./demo-seed.ts";
import { PortalStore, newId, type AnyRow, type Collection, type HistoryQuery, type MyProfilePatch } from "./store.ts";
import { passwordProblem } from "./team.ts";
import type { AuditEntry, Insert, MutationResult, Patch, PortalTable, Row } from "./types";

const STORAGE_KEY = "aratta.portal.demo.v1";
const HISTORY_KEY = "aratta.portal.demo.history.v1";
/** Tables whose changes are kept in the history, as the audit triggers do. */
const AUDITED = new Set<PortalTable>(["staff_members", "teams", "exhibitions", "halls", "booths", "deals", "invoices", "payments", "tasks", "equipment_orders"]);
const HISTORY_MAX = 400;

type Tables = Record<PortalTable, Map<string, AnyRow>>;
export type DemoSnapshot = Partial<Record<PortalTable, AnyRow[]>>;

const TABLES: PortalTable[] = [
  "exhibitions",
  "halls",
  "hall_features",
  "booths",
  "companies",
  "contacts",
  "deals",
  "activities",
  "invoices",
  "invoice_lines",
  "payments",
  "inventory_items",
  "equipment_orders",
  "tasks",
  "problems",
  "staff_members",
  "teams",
  "notifications",
  "chat_channels",
  "chat_members",
  "chat_messages",
];

// Column defaults, as in the migrations, so demo rows look like database rows.
function defaults(table: PortalTable, now: string): Record<string, unknown> {
  const stamps = { created_at: now, updated_at: now };
  switch (table) {
    case "exhibitions":
      return { ...stamps, name_en: null, edition: null, year_label: null, venue_fa: null, venue_en: null, city_fa: null, city_en: null, starts_on: null, ends_on: null, build_starts_on: null, strike_ends_on: null, status: "planning", color: "#c8a25a", currency: "IRR", vat_rate: 0.1, space_rate: null, booth_build_rate: null, notes: null, import_key: null, created_by: null };
    case "halls":
      return { ...stamps, name_en: null, width_m: 60, depth_m: 36, grid_m: 1, background_path: null, background_opacity: 0.35, sort_order: 0, import_key: null };
    case "hall_features":
      return { ...stamps, exhibition_id: "", label_fa: null, label_en: null, rotation: 0, polygon: null, style: {}, import_key: null };
    case "booths":
      return { ...stamps, exhibition_id: "", rotation: 0, polygon: null, area_m2: 0, area_is_manual: false, open_sides: 1, zone: null, status: "available", price_override: null, notes: null, import_key: null, deal_id: null, manager_ids: [], steps: {} };
    case "companies":
      return { ...stamps, kind: "exhibitor", name_en: null, legal_name: null, national_id: null, economic_code: null, sector: null, city: null, address: null, website: null, phone: null, email: null, owner_id: null, priority: "normal", tags: [], notes: null, import_key: null, archived_at: null };
    case "contacts":
      return { ...stamps, job_title: null, phone: null, phone_alt: null, email: null, is_primary: false, notes: null, import_key: null };
    case "deals":
      return { ...stamps, contact_id: null, owner_id: null, stage: "lead", source: null, expected_area_m2: null, probability: null, estimated_value: null, next_follow_up_at: null, last_contact_at: null, lost_reason: null, sponsorship_tier: null, furniture_notes: null, furniture_confirmed_at: null, furniture_confirmed_by: null, notes: null, stage_changed_at: now, won_at: null, import_key: null };
    case "activities":
      return { created_at: now, deal_id: null, contact_id: null, body: null, outcome: null, occurred_at: now, next_follow_up_at: null, author_id: null, import_key: null };
    case "invoices":
      return { ...stamps, deal_id: null, kind: "proforma", number: null, status: "draft", official: false, issued_on: null, due_on: null, currency: "IRR", vat_rate: 0.1, notes: null, import_key: null, created_by: null };
    case "invoice_lines":
      return { ...stamps, description: null, booth_id: null, quantity: 1, unit: "unit", unit_price: 0, discount: 0, sort_order: 0, import_key: null };
    case "payments":
      return { ...stamps, deal_id: null, invoice_id: null, currency: "IRR", paid_on: now.slice(0, 10), method: "bank_transfer", reference: null, notes: null, recorded_by: null, voided_at: null, void_reason: null, import_key: null };
    case "inventory_items":
      return { ...stamps, item_code: null, name_en: null, category: "furniture", unit_fa: "عدد", unit_en: "unit", returnable: true, on_hand: 0, low_stock_threshold: 0, rental_rate: null, notes: null, archived_at: null };
    case "equipment_orders":
      return { ...stamps, booth_id: null, deal_id: null, quantity: 1, unit_price: null, stage: "requested", delivered_qty: 0, collected_qty: 0, damaged_qty: 0, delivery_due_at: null, pickup_due_at: null, delivered_at: null, collected_at: null, handled_by: null, delivered_by: [], collected_by: [], notes: null, import_key: null };
    case "tasks":
      return { ...stamps, exhibition_id: null, description: null, status: "todo", priority: "normal", assignee_id: null, created_by: null, due_at: null, started_at: null, completed_at: null, booth_id: null, deal_id: null, company_id: null, checklist: [], sort_order: 0 };
    case "problems":
      return { ...stamps, booth_id: null, deal_id: null, order_id: null, step: "other", note: null, raised_by: DEMO_STAFF_ID, raised_at: now, assignee_id: null, resolved_at: null, resolved_by: null, resolution: null };
    case "staff_members":
      return { ...stamps, user_id: null, display_name: null, job_title: null, role: "member", departments: [], status: "invited", phone: null, avatar_url: null, locale: "fa", invited_by: null, last_seen_at: null, bio: null, start_date: null, skills: [] };
    case "teams":
      return { ...stamps, name_en: null, description: null, color: "#0e5d4c", lead_id: null, member_ids: [], exhibition_id: null, sort_order: 0, archived_at: null, created_by: null };
    case "notifications":
      return { created_at: now, actor_id: null, body: null, link: null, entity_type: null, entity_id: null, read_at: null };
    case "chat_channels":
      return { ...stamps, kind: "channel", slug: null, name: null, topic: null, is_private: false, is_default: false, exhibition_id: null, dm_key: null, created_by: null, last_message_at: null, last_message_preview: null, archived_at: null };
    case "chat_members":
      return { last_read_at: now, unread_count: 0, mention_count: 0, muted: false, joined_at: now };
    case "chat_messages":
      return { created_at: now, author_id: null, bot_name: null, kind: "text", body: "", mentions: [], attachments: [], reply_to: null, link: null, entity_type: null, entity_id: null, edited_at: null, deleted_at: null };
  }
}

function matches(row: AnyRow, filter: Collection["filter"]) {
  return !filter || String(row[filter.column] ?? "") === filter.value;
}

/**
 * A complete portal that lives in this browser: same tables, same rules,
 * seeded with sample data. Nothing leaves the device.
 */
export class DemoStore extends PortalStore {
  readonly mode = "demo" as const;
  private loaded: Tables | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private blobs = new Map<string, string>();
  private readonly seed: () => DemoSnapshot;
  private log: AuditEntry[] | null = null;

  constructor(seed: () => DemoSnapshot) {
    super();
    this.seed = seed;
  }

  // Loaded on first use, in the browser only.
  private get tables(): Tables {
    this.loaded ??= this.load() ?? this.fromSnapshot(this.seed());
    return this.loaded;
  }

  private fromSnapshot(snapshot: DemoSnapshot): Tables {
    const tables = {} as Tables;
    const now = new Date().toISOString();
    // Fill columns added since the snapshot was saved, so an older demo keeps working.
    for (const t of TABLES) tables[t] = new Map((snapshot[t] ?? []).map((row) => [row.id, { ...defaults(t, now), ...row }]));
    return tables;
  }

  private load(): Tables | null {
    try {
      const raw = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as DemoSnapshot;
      // A demo saved before team chat existed gets the sample conversations.
      if (!saved.chat_channels) {
        const seed = this.seed();
        for (const t of ["chat_channels", "chat_members", "chat_messages"] as const) saved[t] = seed[t] ?? [];
      }
      return this.fromSnapshot(saved);
    } catch {
      return null;
    }
  }

  private persist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        const snapshot: DemoSnapshot = {};
        for (const t of TABLES) snapshot[t] = [...this.tables[t].values()];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Storage full or blocked: the demo keeps working for this visit.
      }
    }, 250);
  }

  private get audit(): AuditEntry[] {
    if (!this.log) {
      try {
        const raw = typeof window === "undefined" ? null : window.localStorage.getItem(HISTORY_KEY);
        this.log = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
      } catch {
        this.log = [];
      }
    }
    return this.log;
  }

  // audit_row: what changed, by whom. The demo user is always the actor.
  private record(table: PortalTable, action: AuditEntry["action"], before: AnyRow | undefined, after: AnyRow | undefined) {
    if (!AUDITED.has(table)) return;
    let changes: Record<string, unknown> = {};
    if (action === "update" && before && after) {
      for (const [key, value] of Object.entries(after)) {
        if (key === "updated_at") continue;
        if (JSON.stringify(before[key] ?? null) !== JSON.stringify(value ?? null)) changes[key] = { from: before[key] ?? null, to: value ?? null };
      }
      if (!Object.keys(changes).length) return;
    } else {
      changes = { ...(after ?? before ?? {}) };
    }
    const row = after ?? before;
    this.audit.unshift({
      id: newId(),
      occurred_at: new Date().toISOString(),
      table_name: table,
      row_id: row ? String(row.id) : null,
      action,
      actor_id: DEMO_STAFF_ID,
      changes,
    });
    this.audit.length = Math.min(this.audit.length, HISTORY_MAX);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(this.audit));
    } catch {
      // ignore: storage blocked
    }
  }

  /** Start over with fresh sample data. */
  reset() {
    this.loaded = this.fromSnapshot(this.seed());
    this.log = [];
    try {
      window.localStorage.removeItem(HISTORY_KEY);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    for (const c of this.collections.values()) this.refresh(c);
  }

  private rowsFor(c: Collection) {
    return [...this.tables[c.table].values()].filter((row) => matches(row, c.filter));
  }

  private refresh(c: Collection) {
    this.setState(c, { rows: this.rowsFor(c), status: "live", error: null });
  }

  protected start(c: Collection) {
    // Rows are local, but stay "loading" for one tick so screens render the
    // same way they do against the network.
    const timer = setTimeout(() => this.refresh(c), 0);
    return () => clearTimeout(timer);
  }

  private touched(table: PortalTable) {
    for (const c of this.collectionsOf(table)) if (c.state.status !== "loading") this.refresh(c);
    this.persist();
  }

  private isStaff = (id: string) => this.tables.staff_members.has(id);

  // The same derived fields the database triggers fill in.
  private derive(table: PortalTable, row: AnyRow, before: AnyRow | undefined): AnyRow {
    const now = new Date().toISOString();
    let next = row;
    if (before && "updated_at" in before) next = { ...next, updated_at: now };
    if (table === "booths" || table === "hall_features") {
      const hallExhibition = (hallId: string) => this.tables.halls.get(hallId)?.exhibition_id as string | undefined;
      if (table === "booths") {
        next = deriveBooth(next as unknown as Row<"booths">, hallExhibition) as unknown as AnyRow;
        next = { ...next, manager_ids: cleanStaffIds(next.manager_ids as string[], this.isStaff) };
      }
      else next = { ...next, exhibition_id: hallExhibition(String(next.hall_id)) ?? next.exhibition_id };
    }
    if (table === "equipment_orders") {
      const booth = (id: string) => this.tables.booths.get(id) as unknown as Row<"booths"> | undefined;
      next = deriveOrder(next as unknown as Row<"equipment_orders">, booth, now) as unknown as AnyRow;
      next = deriveHandoverPeople(next as unknown as Row<"equipment_orders">, before as unknown as Row<"equipment_orders"> | undefined, DEMO_STAFF_ID, this.isStaff) as unknown as AnyRow;
    }
    if (table === "problems") {
      next = deriveProblem(next as unknown as Row<"problems">, before as unknown as Row<"problems"> | undefined, {
        order: (id) => this.tables.equipment_orders.get(id) as unknown as Row<"equipment_orders"> | undefined,
        booth: (id) => this.tables.booths.get(id) as unknown as Row<"booths"> | undefined,
        deal: (id) => this.tables.deals.get(id) as unknown as Row<"deals"> | undefined,
      }, DEMO_STAFF_ID) as unknown as AnyRow;
    }
    if (table === "teams") {
      next = deriveTeam(next as unknown as Row<"teams">, this.isStaff) as unknown as AnyRow;
      if (!before && !next.created_by) next = { ...next, created_by: DEMO_STAFF_ID };
    }
    if (table === "staff_members") {
      next = { ...next, email: String(next.email ?? "").trim().toLowerCase(), skills: [...new Set(((next.skills as string[]) ?? []).map((x) => x.trim()).filter(Boolean))] };
    }
    if (table === "payments" && next.invoice_id) {
      const invoice = this.tables.invoices.get(String(next.invoice_id));
      if (invoice) next = { ...next, company_id: invoice.company_id, deal_id: next.deal_id ?? invoice.deal_id, currency: invoice.currency };
    }
    if (table === "deals" && before && before.stage !== next.stage) {
      next = { ...next, stage_changed_at: now, won_at: next.stage === "won" ? (next.won_at ?? now) : next.won_at };
    }
    if (table === "chat_messages" && before) {
      // Same as chat_message_before_write: removed stays removed, edits are stamped.
      if (before.deleted_at) return before;
      if (next.deleted_at) next = { ...next, deleted_at: now, body: "", attachments: [] };
      else if (next.body !== before.body || JSON.stringify(next.attachments) !== JSON.stringify(before.attachments)) next = { ...next, edited_at: now };
      next = { ...next, channel_id: before.channel_id, author_id: before.author_id, created_at: before.created_at };
    }
    if (table === "chat_channels" && typeof next.name === "string") next = { ...next, name: next.name.replace(/^#+/, "").trim() };
    if (table === "tasks" && before && before.status !== next.status) {
      if (next.status === "in_progress" && !next.started_at) next = { ...next, started_at: now };
      if (next.status === "done") next = { ...next, completed_at: now };
      else next = { ...next, completed_at: null };
    }
    return next;
  }

  // notify_task_change: tell the assignee about a new task, and the creator about status changes.
  private notifyTask(row: AnyRow, before: AnyRow | undefined) {
    const actor = DEMO_STAFF_ID;
    const now = new Date().toISOString();
    const push = (recipient: unknown, kind: string, body: unknown) => {
      const id = newId();
      this.tables.notifications.set(id, {
        id,
        recipient_id: String(recipient),
        actor_id: actor,
        kind,
        title: String(row.title ?? ""),
        body: body == null ? null : String(body),
        link: `/staff/tasks/${row.id}`,
        entity_type: "task",
        entity_id: row.id,
        read_at: null,
        created_at: now,
      });
      this.touched("notifications");
    };
    if (row.assignee_id && row.assignee_id !== actor && (!before || row.assignee_id !== before.assignee_id)) push(row.assignee_id, "task.assigned", row.description);
    if (before && row.status !== before.status && row.created_by && row.created_by !== actor) push(row.created_by, "task.status", row.status);
  }

  private join(channelId: string, staffId: string) {
    for (const m of this.tables.chat_members.values()) if (m.channel_id === channelId && m.staff_id === staffId) return m;
    const now = new Date().toISOString();
    const row = { ...defaults("chat_members", now), id: newId(), channel_id: channelId, staff_id: staffId } as AnyRow;
    this.tables.chat_members.set(row.id, row);
    return row;
  }

  // chat_channel_after_insert and chat_message_after_insert.
  private afterChat(table: PortalTable, row: AnyRow) {
    if (table === "chat_channels" && row.kind === "channel") {
      if (row.is_default) for (const s of this.tables.staff_members.values()) this.join(row.id, s.id);
      else if (row.created_by) this.join(row.id, String(row.created_by));
      this.touched("chat_members");
    }
    if (table !== "chat_messages") return;
    const channel = this.tables.chat_channels.get(String(row.channel_id));
    if (!channel) return;
    const now = new Date().toISOString();
    if (row.author_id) {
      const mine = this.join(channel.id, String(row.author_id));
      this.tables.chat_members.set(mine.id, { ...mine, last_read_at: now, unread_count: 0, mention_count: 0 });
    }
    const members = [...this.tables.chat_members.values()].filter((m) => m.channel_id === channel.id);
    const author = row.author_id ? this.tables.staff_members.get(String(row.author_id)) : undefined;
    const sender = String(row.bot_name ?? author?.display_name ?? author?.email ?? "همکار");
    const { counters, notices, preview } = afterChatMessage(row as never, channel as never, members as never, sender);
    for (const c of counters) this.tables.chat_members.set(c.id, { ...this.tables.chat_members.get(c.id)!, ...c });
    this.tables.chat_channels.set(channel.id, { ...channel, last_message_at: row.created_at, last_message_preview: preview });
    for (const n of notices) {
      const id = newId();
      this.tables.notifications.set(id, { id, actor_id: row.author_id, entity_type: "chat", entity_id: channel.id, read_at: null, created_at: now, ...n });
    }
    this.touched("chat_members");
    this.touched("chat_channels");
    if (notices.length) this.touched("notifications");
  }

  private afterWrite(table: PortalTable, row: AnyRow) {
    if (table === "tasks") this.notifyTask(row, undefined);
    this.afterChat(table, row);
    // activity_after_insert: a logged conversation moves the deal forward.
    if (table === "activities" && row.deal_id && row.kind !== "system") {
      const deal = this.tables.deals.get(String(row.deal_id));
      if (deal) {
        const next = {
          ...deal,
          last_contact_at: row.occurred_at,
          next_follow_up_at: row.next_follow_up_at ?? deal.next_follow_up_at,
          stage: deal.stage === "lead" ? "contacted" : deal.stage,
        };
        this.tables.deals.set(deal.id, this.derive("deals", next, deal));
        this.touched("deals");
      }
    }
  }

  // booth_carry_furniture: a company's waiting furniture follows it onto its booth.
  private carry(booth: AnyRow, before: AnyRow) {
    const oldDeal = (before.deal_id as string | null) ?? null;
    if (oldDeal === booth.deal_id) return;
    const lines = [...this.tables.equipment_orders.values()] as unknown as Row<"equipment_orders">[];
    const changed = carryFurniture(booth as unknown as Row<"booths">, oldDeal, lines);
    if (!changed.length) return;
    for (const o of changed) this.tables.equipment_orders.set(o.id, o as unknown as AnyRow);
    this.touched("equipment_orders");
  }

  async insert<T extends PortalTable>(table: T, row: Insert<T> & { id: string }): Promise<MutationResult<Row<T>>> {
    const now = new Date().toISOString();
    const full = this.derive(table, { ...defaults(table, now), ...(row as object), id: row.id } as AnyRow, undefined);
    const refused = this.refuse(table, undefined, full);
    if (refused) return refused;
    this.tables[table].set(full.id, full);
    this.record(table, "insert", undefined, full);
    this.touched(table);
    this.afterWrite(table, full);
    return { ok: true, row: full as unknown as Row<T> };
  }

  async update<T extends PortalTable>(table: T, id: string, patch: Patch<T>): Promise<MutationResult<Row<T>>> {
    const before = this.tables[table].get(id);
    if (!before) return { ok: false, error: "missing" };
    const next = this.derive(table, { ...before, ...(patch as object), id }, before);
    const refused = this.refuse(table, before, next);
    if (refused) return refused;
    this.tables[table].set(id, next);
    this.record(table, "update", before, next);
    this.touched(table);
    if (table === "tasks") this.notifyTask(next, before);
    if (table === "booths") this.carry(next, before);
    return { ok: true, row: next as unknown as Row<T> };
  }

  async remove<T extends PortalTable>(table: T, id: string): Promise<MutationResult<Row<T>>> {
    const before = this.tables[table].get(id);
    if (!before) return { ok: false, error: "missing" };
    const refused = this.refuse(table, before, undefined);
    if (refused) return refused;
    this.tables[table].delete(id);
    this.record(table, "delete", before, undefined);
    if (table === "staff_members") {
      for (const t of this.tables.teams.values()) {
        if ((t.member_ids as string[]).includes(id)) this.tables.teams.set(t.id, { ...t, member_ids: (t.member_ids as string[]).filter((m) => m !== id), lead_id: t.lead_id === id ? null : t.lead_id });
      }
      this.touched("teams");
    }
    // The same cascades the foreign keys do.
    if (table === "chat_channels") {
      for (const t of ["chat_members", "chat_messages"] as const) {
        for (const r of [...this.tables[t].values()]) if (r.channel_id === id) this.tables[t].delete(r.id);
        this.touched(t);
      }
    }
    if (table === "booths") {
      for (const o of this.tables.equipment_orders.values()) if (o.booth_id === id) this.tables.equipment_orders.set(o.id, { ...o, booth_id: null });
      this.touched("equipment_orders");
      for (const p of [...this.tables.problems.values()]) if (p.booth_id === id) this.tables.problems.delete(p.id);
      this.touched("problems");
    }
    if (table === "halls") {
      for (const t of ["booths", "hall_features"] as const) {
        for (const r of [...this.tables[t].values()]) if (r.hall_id === id) this.tables[t].delete(r.id);
        this.touched(t);
      }
    }
    if (table === "deals") {
      for (const b of this.tables.booths.values()) if (b.deal_id === id) this.tables.booths.set(b.id, this.derive("booths", { ...b, deal_id: null }, b));
      this.touched("booths");
      for (const p of [...this.tables.problems.values()]) if (p.deal_id === id) this.tables.problems.delete(p.id);
      this.touched("problems");
    }
    this.touched(table);
    return { ok: true, row: before as unknown as Row<T> };
  }

  // The staff guards the database applies, so the demo refuses the same changes.
  private refuse(table: PortalTable, before: AnyRow | undefined, after: AnyRow | undefined): { ok: false; error: string } | null {
    if (table !== "staff_members") return null;
    type S = Row<"staff_members">;
    const all = [...this.tables.staff_members.values()] as unknown as S[];
    const actor = this.tables.staff_members.get(DEMO_STAFF_ID) as unknown as S | undefined;
    const error = staffChangeError(actor, (before as unknown as S) ?? null, (after as unknown as S) ?? null, all);
    if (!error) {
      if (!before && after && all.some((s) => s.email.toLowerCase() === String(after.email).toLowerCase())) return this.fail("duplicate");
      return null;
    }
    return this.fail(error);
  }

  private fail(error: string) {
    this.notify({ kind: "error", message: error });
    return { ok: false as const, error };
  }

  async updateMyProfile(staffId: string, patch: MyProfilePatch): Promise<MutationResult<Row<"staff_members">>> {
    const clean: MyProfilePatch = {};
    for (const [key, value] of Object.entries(patch) as Array<[keyof MyProfilePatch, unknown]>) {
      if (value === undefined) continue;
      if (key === "display_name") {
        const name = String(value ?? "").trim();
        if (name) clean.display_name = name;
      } else if (key === "skills") clean.skills = value as string[];
      else (clean as Record<string, unknown>)[key] = typeof value === "string" ? value.trim() || null : value;
    }
    return this.update("staff_members", staffId, clean);
  }

  // The demo has no sign-in, so there is nothing to store.
  async setStaffPassword(staffId: string, password: string) {
    if (!this.isStaff(staffId)) return this.fail("missing");
    if (passwordProblem(password)) return this.fail("password-length");
    return { ok: true as const };
  }

  async history(query: HistoryQuery) {
    const entries = this.audit.filter((e) => query.tables.includes(e.table_name) && (!query.rowId || e.row_id === query.rowId)).slice(0, query.limit ?? 100);
    return { ok: true as const, entries };
  }

  async markNotificationsRead(ids?: string[]) {
    const now = new Date().toISOString();
    for (const n of this.tables.notifications.values()) {
      if (!n.read_at && (!ids || ids.includes(n.id))) this.tables.notifications.set(n.id, { ...n, read_at: now });
    }
    this.touched("notifications");
  }

  async openDirect(staffId: string) {
    if (!this.isStaff(staffId)) return { ok: false as const, error: "missing" };
    const key = dmKey(DEMO_STAFF_ID, staffId);
    let channel = [...this.tables.chat_channels.values()].find((c) => c.dm_key === key);
    if (!channel) {
      const now = new Date().toISOString();
      channel = { ...defaults("chat_channels", now), id: newId(), kind: "direct", dm_key: key, created_by: DEMO_STAFF_ID } as AnyRow;
      this.tables.chat_channels.set(channel.id, channel);
    }
    this.join(channel.id, DEMO_STAFF_ID);
    this.join(channel.id, staffId);
    this.touched("chat_channels");
    this.touched("chat_members");
    return { ok: true as const, id: channel.id };
  }

  async setMyAvatar(staffId: string, avatar: string | null): Promise<MutationResult<Row<"staff_members">>> {
    if (avatar !== null && !/^preset:\d{1,2}$/.test(avatar)) return { ok: false, error: "Choose one of the avatars" };
    return this.update("staff_members", staffId, { avatar_url: avatar });
  }

  async uploadFile(_bucket: "hall-plans" | "documents", path: string, file: File) {
    const url = URL.createObjectURL(file);
    this.blobs.set(path, url);
    return { ok: true as const, path };
  }

  async fileUrl(_bucket: "hall-plans" | "documents", path: string) {
    return this.blobs.get(path) ?? null;
  }
}
