// One data store for the portal with two backends: the live Supabase database
// and an in-browser demo. Screens subscribe to "collections" (a table with an
// optional equality filter). Edits show up instantly (optimistic) and roll
// back if the server refuses them.
import type { AuditEntry, CollectionState, Filter, Insert, MutationResult, Patch, PortalTable, Row } from "./types";

export type AnyRow = { id: string } & Record<string, unknown>;

type Collection = {
  key: string;
  table: PortalTable;
  filter: { column: string; value: string } | null;
  state: CollectionState<AnyRow>;
  listeners: Set<() => void>;
  refs: number;
  stop: (() => void) | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

export type StoreNotice = { kind: "error"; message: string } | { kind: "saved" };

export const EMPTY_STATE: CollectionState<never> = Object.freeze({ rows: Object.freeze([]) as readonly never[], status: "loading", error: null });

const IDLE_MS = 30_000;

export function collectionKey(table: PortalTable, filter?: { column: string; value: string } | null) {
  return filter ? `${table}?${filter.column}=${filter.value}` : table;
}

function matches(row: AnyRow, filter: Collection["filter"]) {
  return !filter || String(row[filter.column] ?? "") === filter.value;
}

export abstract class PortalStore {
  abstract readonly mode: "live" | "demo";
  protected collections = new Map<string, Collection>();
  private noticeListeners = new Set<(notice: StoreNotice) => void>();

  getSnapshot(key: string): CollectionState<AnyRow> {
    return this.collections.get(key)?.state ?? EMPTY_STATE;
  }

  subscribe(table: PortalTable, filter: { column: string; value: string } | null, listener: () => void) {
    const key = collectionKey(table, filter);
    let c = this.collections.get(key);
    if (!c) {
      c = { key, table, filter, state: EMPTY_STATE, listeners: new Set(), refs: 0, stop: null, idleTimer: null };
      this.collections.set(key, c);
    }
    const col = c;
    col.listeners.add(listener);
    col.refs += 1;
    if (col.idleTimer) {
      clearTimeout(col.idleTimer);
      col.idleTimer = null;
    }
    if (!col.stop) col.stop = this.start(col);
    return () => {
      col.listeners.delete(listener);
      col.refs -= 1;
      if (col.refs > 0) return;
      // Keep the collection warm for a moment so switching screens is instant.
      col.idleTimer = setTimeout(() => {
        col.stop?.();
        this.collections.delete(col.key);
      }, IDLE_MS);
    };
  }

  onNotice(listener: (notice: StoreNotice) => void) {
    this.noticeListeners.add(listener);
    return () => {
      this.noticeListeners.delete(listener);
    };
  }

  protected notify(notice: StoreNotice) {
    for (const l of this.noticeListeners) l(notice);
  }

  protected abstract start(collection: Collection): () => void;

  protected setState(c: Collection, patch: Partial<CollectionState<AnyRow>>) {
    c.state = { ...c.state, ...patch };
    for (const l of c.listeners) l();
  }

  protected collectionsOf(table: PortalTable) {
    return [...this.collections.values()].filter((c) => c.table === table);
  }

  /** The newest copy of a row in any open collection. */
  findRow(table: PortalTable, id: string): AnyRow | undefined {
    for (const c of this.collectionsOf(table)) {
      const row = c.state.rows.find((r) => r.id === id);
      if (row) return row;
    }
    return undefined;
  }

  /**
   * Apply a change to every open collection of the table. `full` says the row
   * is complete (from the server or an insert) and may be added where missing.
   */
  protected applyLocal(table: PortalTable, change: { type: "upsert"; row: AnyRow; full: boolean } | { type: "delete"; id: string }) {
    for (const c of this.collectionsOf(table)) {
      const rows = c.state.rows;
      if (change.type === "delete") {
        if (rows.some((r) => r.id === change.id)) this.setState(c, { rows: rows.filter((r) => r.id !== change.id) });
        continue;
      }
      const index = rows.findIndex((r) => r.id === change.row.id);
      if (index >= 0) {
        const merged = { ...rows[index], ...change.row };
        if (matches(merged, c.filter)) {
          const copy = [...rows];
          copy[index] = merged;
          this.setState(c, { rows: copy });
        } else {
          this.setState(c, { rows: rows.filter((r) => r.id !== change.row.id) });
        }
      } else if (change.full && matches(change.row, c.filter)) {
        this.setState(c, { rows: [...rows, change.row] });
      }
    }
  }

  abstract insert<T extends PortalTable>(table: T, row: Insert<T> & { id: string }): Promise<MutationResult<Row<T>>>;
  abstract update<T extends PortalTable>(table: T, id: string, patch: Patch<T>): Promise<MutationResult<Row<T>>>;
  abstract remove<T extends PortalTable>(table: T, id: string): Promise<MutationResult<Row<T>>>;
  abstract markNotificationsRead(ids?: string[]): Promise<void>;
  /** Find or start the one direct conversation with a colleague; returns its channel id. */
  abstract openDirect(staffId: string): Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  /** The signed-in person's own picture: "preset:<n>" for a built-in one, or an uploaded file path. */
  abstract setMyAvatar(staffId: string, avatar: string | null): Promise<MutationResult<Row<"staff_members">>>;
  /** The signed-in person's own profile details (anyone can edit their own). */
  abstract updateMyProfile(staffId: string, patch: MyProfilePatch): Promise<MutationResult<Row<"staff_members">>>;
  /** Give a colleague a starting password (or reset it). Admins and owners; never for yourself. */
  abstract setStaffPassword(staffId: string, password: string): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Recent changes from the history, newest first. Managers and above. */
  abstract history(query: HistoryQuery): Promise<{ ok: true; entries: AuditEntry[] } | { ok: false; error: string }>;
  /** Upload a file and return a path the store can turn into a URL. */
  abstract uploadFile(bucket: "hall-plans" | "documents", path: string, file: File): Promise<{ ok: true; path: string } | { ok: false; error: string }>;
  abstract fileUrl(bucket: "hall-plans" | "documents", path: string): Promise<string | null>;
}

export type { Collection, Filter };

export type MyProfilePatch = Partial<Pick<Row<"staff_members">, "display_name" | "job_title" | "phone" | "locale" | "bio" | "skills">>;
export type HistoryQuery = { tables: string[]; rowId?: string; limit?: number };

export function newId() {
  return crypto.randomUUID();
}
