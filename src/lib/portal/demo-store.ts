"use client";

import { deriveBooth, deriveOrder } from "./rules.ts";
import { DEMO_STAFF_ID } from "./demo-seed.ts";
import { PortalStore, newId, type AnyRow, type Collection } from "./store.ts";
import type { Insert, MutationResult, Patch, PortalTable, Row } from "./types";

const STORAGE_KEY = "aratta.portal.demo.v1";

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
  "staff_members",
  "notifications",
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
      return { ...stamps, exhibition_id: "", rotation: 0, polygon: null, area_m2: 0, area_is_manual: false, open_sides: 1, zone: null, status: "available", price_override: null, notes: null, import_key: null, deal_id: null };
    case "companies":
      return { ...stamps, kind: "exhibitor", name_en: null, legal_name: null, national_id: null, economic_code: null, sector: null, city: null, address: null, website: null, phone: null, email: null, owner_id: null, priority: "normal", tags: [], notes: null, import_key: null, archived_at: null };
    case "contacts":
      return { ...stamps, job_title: null, phone: null, phone_alt: null, email: null, is_primary: false, notes: null, import_key: null };
    case "deals":
      return { ...stamps, contact_id: null, owner_id: null, stage: "lead", source: null, expected_area_m2: null, probability: null, estimated_value: null, next_follow_up_at: null, last_contact_at: null, lost_reason: null, sponsorship_tier: null, notes: null, stage_changed_at: now, won_at: null, import_key: null };
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
      return { ...stamps, booth_id: null, deal_id: null, quantity: 1, unit_price: null, stage: "requested", delivered_qty: 0, collected_qty: 0, damaged_qty: 0, delivery_due_at: null, pickup_due_at: null, delivered_at: null, collected_at: null, handled_by: null, notes: null, import_key: null };
    case "tasks":
      return { ...stamps, exhibition_id: null, description: null, status: "todo", priority: "normal", assignee_id: null, created_by: null, due_at: null, started_at: null, completed_at: null, booth_id: null, deal_id: null, company_id: null, checklist: [], sort_order: 0 };
    case "staff_members":
      return { ...stamps, user_id: null, display_name: null, job_title: null, role: "member", departments: [], status: "invited", phone: null, avatar_url: null, locale: "fa", invited_by: null, last_seen_at: null };
    case "notifications":
      return { created_at: now, actor_id: null, body: null, link: null, entity_type: null, entity_id: null, read_at: null };
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
    for (const t of TABLES) tables[t] = new Map((snapshot[t] ?? []).map((row) => [row.id, row]));
    return tables;
  }

  private load(): Tables | null {
    try {
      const raw = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
      return raw ? this.fromSnapshot(JSON.parse(raw) as DemoSnapshot) : null;
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

  /** Start over with fresh sample data. */
  reset() {
    this.loaded = this.fromSnapshot(this.seed());
    try {
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

  // The same derived fields the database triggers fill in.
  private derive(table: PortalTable, row: AnyRow, before: AnyRow | undefined): AnyRow {
    const now = new Date().toISOString();
    let next = row;
    if (before && "updated_at" in before) next = { ...next, updated_at: now };
    if (table === "booths" || table === "hall_features") {
      const hallExhibition = (hallId: string) => this.tables.halls.get(hallId)?.exhibition_id as string | undefined;
      if (table === "booths") next = deriveBooth(next as unknown as Row<"booths">, hallExhibition) as unknown as AnyRow;
      else next = { ...next, exhibition_id: hallExhibition(String(next.hall_id)) ?? next.exhibition_id };
    }
    if (table === "equipment_orders") {
      const booth = (id: string) => this.tables.booths.get(id) as unknown as Row<"booths"> | undefined;
      next = deriveOrder(next as unknown as Row<"equipment_orders">, booth, now) as unknown as AnyRow;
    }
    if (table === "payments" && next.invoice_id) {
      const invoice = this.tables.invoices.get(String(next.invoice_id));
      if (invoice) next = { ...next, company_id: invoice.company_id, deal_id: next.deal_id ?? invoice.deal_id, currency: invoice.currency };
    }
    if (table === "deals" && before && before.stage !== next.stage) {
      next = { ...next, stage_changed_at: now, won_at: next.stage === "won" ? (next.won_at ?? now) : next.won_at };
    }
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

  private afterWrite(table: PortalTable, row: AnyRow) {
    if (table === "tasks") this.notifyTask(row, undefined);
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

  async insert<T extends PortalTable>(table: T, row: Insert<T> & { id: string }): Promise<MutationResult<Row<T>>> {
    const now = new Date().toISOString();
    const full = this.derive(table, { ...defaults(table, now), ...(row as object), id: row.id } as AnyRow, undefined);
    this.tables[table].set(full.id, full);
    this.touched(table);
    this.afterWrite(table, full);
    return { ok: true, row: full as unknown as Row<T> };
  }

  async update<T extends PortalTable>(table: T, id: string, patch: Patch<T>): Promise<MutationResult<Row<T>>> {
    const before = this.tables[table].get(id);
    if (!before) return { ok: false, error: "missing" };
    const next = this.derive(table, { ...before, ...(patch as object), id }, before);
    this.tables[table].set(id, next);
    this.touched(table);
    if (table === "tasks") this.notifyTask(next, before);
    return { ok: true, row: next as unknown as Row<T> };
  }

  async remove<T extends PortalTable>(table: T, id: string): Promise<MutationResult<Row<T>>> {
    const before = this.tables[table].get(id);
    if (!before) return { ok: false, error: "missing" };
    this.tables[table].delete(id);
    // The same cascades the foreign keys do.
    if (table === "booths") {
      for (const o of this.tables.equipment_orders.values()) if (o.booth_id === id) this.tables.equipment_orders.set(o.id, { ...o, booth_id: null });
      this.touched("equipment_orders");
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
    }
    this.touched(table);
    return { ok: true, row: before as unknown as Row<T> };
  }

  async markNotificationsRead(ids?: string[]) {
    const now = new Date().toISOString();
    for (const n of this.tables.notifications.values()) {
      if (!n.read_at && (!ids || ids.includes(n.id))) this.tables.notifications.set(n.id, { ...n, read_at: now });
    }
    this.touched("notifications");
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
