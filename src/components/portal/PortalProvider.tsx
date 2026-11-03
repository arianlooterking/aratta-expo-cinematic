"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Lang } from "@/lib/lang";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { DemoStore } from "@/lib/portal/demo-store";
import { demoSeed } from "@/lib/portal/demo-seed";
import { LiveStore } from "@/lib/portal/live-store";
import { collectionKey, EMPTY_STATE, type PortalStore, type StoreNotice } from "@/lib/portal/store";
import type { CollectionState, Filter, PortalTable, Row, StaffRole } from "@/lib/portal/types";

import type { PortalUser } from "@/lib/portal/user";
export type { PortalUser };

const rank: Record<StaffRole, number> = { owner: 5, admin: 4, manager: 3, member: 2, viewer: 1 };

export type Permissions = {
  /** Day-to-day edits: booths, equipment, deals, tasks. */
  edit: boolean;
  /** Delete records, create exhibitions. */
  manage: boolean;
  /** Invoices and payments. */
  finance: boolean;
  /** Invite and change staff. */
  admin: boolean;
};

function permissionsFor(user: PortalUser): Permissions {
  const r = rank[user.role];
  return {
    edit: r >= rank.member,
    manage: r >= rank.manager,
    finance: r >= rank.manager || (r >= rank.member && user.departments.some((d) => d === "sales" || d === "finance")),
    admin: r >= rank.admin,
  };
}

const staffNotices: Record<string, Record<Lang, string>> = {
  "self-role": { fa: "نقش یا وضعیت خودتان را نمی توانید تغییر دهید", en: "You can't change your own role or status" },
  "self-remove": { fa: "دسترسی خودتان را نمی توانید حذف کنید", en: "You can't remove your own access" },
  "owner-only": { fa: "فقط مالک می تواند دسترسی مالک را بدهد یا تغییر دهد", en: "Only an owner can grant or change owner access" },
  "last-owner": { fa: "دست کم یک مالک فعال لازم است", en: "At least one active owner is required" },
  "email-locked": { fa: "ایمیل همکاری که وارد شده قابل تغییر نیست", en: "A signed-in colleague's email can't be changed" },
};

type Toast = { id: number; tone: "error" | "info"; text: string };

type PortalContextValue = {
  lang: Lang;
  mode: "live" | "demo";
  store: PortalStore;
  user: PortalUser;
  can: Permissions;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({
  lang,
  mode,
  user,
  children,
}: {
  lang: Lang;
  mode: "live" | "demo";
  user: PortalUser;
  children: ReactNode;
}) {
  const [store] = useState<PortalStore>(() =>
    mode === "live" ? new LiveStore(getBrowserSupabase) : new DemoStore(demoSeed),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (text: string, tone: Toast["tone"] = "info") => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list.slice(-2), { id, tone, text }]);
      setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 3500);
    },
    [dismissToast],
  );

  useEffect(
    () =>
      store.onNotice((notice: StoreNotice) => {
        if (notice.kind !== "error") return;
        const text =
          notice.message === "not-permitted"
            ? lang === "fa"
              ? "اجازه این تغییر را ندارید"
              : "You don't have permission for that"
            : notice.message === "offline"
              ? lang === "fa"
                ? "اتصال برقرار نیست. تغییر ذخیره نشد."
                : "No connection. The change wasn't saved."
              : notice.message === "duplicate"
                ? lang === "fa"
                  ? "این مورد قبلا ثبت شده است"
                  : "That already exists"
                : staffNotices[notice.message]
                  ? staffNotices[notice.message][lang]
                  : `${lang === "fa" ? "ذخیره نشد" : "Not saved"}: ${notice.message}`;
        toast(text, "error");
      }),
    [store, lang, toast],
  );

  const value = useMemo<PortalContextValue>(
    () => ({ lang, mode, store, user, can: permissionsFor(user), toasts, toast, dismissToast }),
    [lang, mode, store, user, toasts, toast, dismissToast],
  );
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const value = useContext(PortalContext);
  if (!value) throw new Error("usePortal must be used inside PortalProvider");
  return value;
}

const noop = () => () => {};
const emptySnapshot = () => EMPTY_STATE;

/** Rows of a table (optionally filtered), kept live. Pass null to skip. */
export function useCollection<T extends PortalTable>(
  table: T,
  filter?: Filter<T> | null,
  enabled = true,
): CollectionState<Row<T>> {
  const { store } = usePortal();
  const column = filter?.column ?? null;
  const value = filter?.value ?? null;
  // A filter without a value (nothing selected yet) loads nothing.
  const active = enabled && (filter === undefined || filter === null || Boolean(value));
  const key = active ? collectionKey(table, column && value ? { column, value } : null) : null;

  const subscribe = useCallback(
    (listener: () => void) => (key ? store.subscribe(table, column && value ? { column, value } : null, listener) : () => {}),
    [store, key, table, column, value],
  );
  const getSnapshot = useCallback(() => (key ? store.getSnapshot(key) : EMPTY_STATE), [store, key]);
  return useSyncExternalStore(key ? subscribe : noop, getSnapshot, emptySnapshot) as CollectionState<Row<T>>;
}

// A small localStorage-backed value that is safe to render on the server.
const storageListeners = new Set<() => void>();
function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function usePersistentState<T extends string>(key: string, fallback: T): [T, (value: T) => void] {
  const subscribe = useCallback((listener: () => void) => {
    storageListeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      storageListeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);
  const stored = useSyncExternalStore(
    subscribe,
    () => readStorage(key),
    () => null,
  );
  const set = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // ignore: storage blocked
      }
      for (const l of storageListeners) l();
    },
    [key],
  );
  return [(stored as T | null) ?? fallback, set];
}

// A clock that ticks once a minute, so "overdue" and "in 2 hours" stay right
// without calling Date.now() during render.
let nowValue = 0;
let nowTimer: ReturnType<typeof setInterval> | null = null;
const nowListeners = new Set<() => void>();
function subscribeNow(listener: () => void) {
  nowListeners.add(listener);
  nowTimer ??= setInterval(() => {
    nowValue = Date.now();
    for (const l of nowListeners) l();
  }, 60_000);
  return () => {
    nowListeners.delete(listener);
    if (!nowListeners.size && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = null;
    }
  };
}
function getNow() {
  if (!nowValue || Date.now() - nowValue > 60_000) nowValue = Date.now();
  return nowValue;
}

export function useNow() {
  return useSyncExternalStore(subscribeNow, getNow, () => 0);
}
