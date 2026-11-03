"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Monitor,
  Moon,
  PackageCheck,
  RefreshCw,
  Search,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { roleLabels } from "@/lib/platform/labels";
import { num, relativeTime } from "@/lib/portal/format";
import { t } from "@/lib/portal/i18n";
import type { DemoStore } from "@/lib/portal/demo-store";
import { useExhibition } from "./ExhibitionProvider";
import { ExhibitionSwitcher } from "./ExhibitionSwitcher";
import { usePersistentState, usePortal, useCollection } from "./PortalProvider";
import { SearchPalette } from "./SearchPalette";
import { IconButton, MenuItem, Popover } from "./ui";

type NavItem = { href: string; label: string; icon: ReactNode; match: (path: string) => boolean };

function useSystemDark() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const { lang, mode, user, can, toasts, dismissToast } = usePortal();
  const { status } = useExhibition();
  const pathname = usePathname() ?? "";
  const [themePref, setThemePref] = usePersistentState<"system" | "light" | "dark">("aratta.portal.theme", "system");
  const systemDark = useSystemDark();
  const theme = themePref === "system" ? (systemDark ? "dark" : "light") : themePref;
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const base = `/${lang}/staff`;
  const isMap = pathname.startsWith(`${base}/map`);

  const nav: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { href: base, label: t(lang, "overview"), icon: <LayoutDashboard className="size-[18px]" />, match: (p) => p === base },
      { href: `${base}/map`, label: t(lang, "map"), icon: <MapIcon className="size-[18px]" />, match: (p) => p.startsWith(`${base}/map`) },
      { href: `${base}/handover`, label: t(lang, "handover"), icon: <PackageCheck className="size-[18px]" />, match: (p) => p.startsWith(`${base}/handover`) },
    ];
    if (mode === "live") items.push({ href: `${base}/team`, label: t(lang, "team"), icon: <Users className="size-[18px]" />, match: (p) => p.startsWith(`${base}/team`) });
    return items;
  }, [base, lang, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeDrawer = useCallback(() => setDrawer(false), []);
  const otherLangPath = pathname.replace(/^\/(fa|en)(?=\/|$)/, lang === "fa" ? "/en" : "/fa");

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label={t(lang, "menu")}>
      <Link href={base} className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2" onClick={closeDrawer}>
        <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(140deg,#d9b26a,#8f6a24)] text-[15px] font-black text-[#0b1d18]">
          A
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-p-side-ink">{lang === "fa" ? "اَرَت اکسپو" : "Aratta Expo"}</span>
          <span className="block text-xs text-p-side-muted">{lang === "fa" ? "مرکز عملیات نمایشگاه" : "Exhibition operations"}</span>
        </span>
      </Link>
      <ExhibitionSwitcher variant="sidebar" />
      <div className="mt-3 grid gap-0.5">
        {nav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDrawer}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-p-side-muted hover:bg-p-side-hover hover:text-p-side-ink",
              )}
            >
              <span className={active ? "text-[#e3bd77]" : ""}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto grid gap-0.5 pt-4">
        <Link
          href={`${base}/classic`}
          className="flex h-9 items-center gap-3 rounded-xl px-3 text-[13px] text-p-side-muted hover:bg-p-side-hover hover:text-p-side-ink"
        >
          <History className="size-4" />
          {t(lang, "classic")}
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-bold text-p-side-ink">
            {user.name.trim().charAt(0)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-medium text-p-side-ink">{user.name}</span>
            <span className="block text-xs text-p-side-muted">{roleLabels[user.role][lang]}</span>
          </span>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="portal min-h-dvh" data-theme={theme}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 bg-p-side lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-black/50" onClick={closeDrawer} aria-hidden />
          <aside className="animate-sheet absolute inset-y-0 start-0 w-[84%] max-w-80 bg-p-side shadow-2xl">
            <IconButton label={t(lang, "close")} className="absolute end-2 top-3 text-p-side-muted" onClick={closeDrawer}>
              <X className="size-5" />
            </IconButton>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className={cn("flex flex-col lg:ps-64", isMap ? "h-dvh" : "min-h-dvh")}>
        <header className="sticky top-0 z-20 border-b border-p-line bg-p-bg/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <IconButton label={t(lang, "menu")} className="lg:hidden" onClick={() => setDrawer(true)}>
              <Menu className="size-5" />
            </IconButton>
            <div className="min-w-0 flex-1 lg:hidden">
              <ExhibitionSwitcher variant="compact" />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-p-line bg-p-surface px-3 text-sm text-p-ink-3 shadow-[var(--p-shadow)] transition-colors hover:border-p-line-strong lg:flex"
            >
              <Search className="size-4" />
              <span className="flex-1 text-start">{t(lang, "search")}</span>
              <span className="text-xs">⌘K</span>
            </button>
            <div className="hidden flex-1 lg:block" />
            <IconButton label={t(lang, "search")} className="lg:hidden" onClick={() => setSearchOpen(true)}>
              <Search className="size-5" />
            </IconButton>
            <ConnectionBadge mode={mode} status={status} />
            <Inbox />
            <UserMenu
              themePref={themePref}
              setThemePref={setThemePref}
              otherLangPath={otherLangPath}
            />
          </div>
          {mode === "demo" ? <DemoBanner /> : null}
        </header>

        <main className={cn("flex-1", isMap ? "flex min-h-0 flex-col pb-16 lg:pb-0" : "pb-24 lg:pb-10")}>{children}</main>

        {/* Mobile tab bar */}
        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 grid border-t border-p-line bg-p-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden",
            nav.length === 4 ? "grid-cols-4" : "grid-cols-3",
          )}
          aria-label={t(lang, "menu")}
        >
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-p-brand" : "text-p-ink-3")}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className={cn(
              "animate-sheet pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-[var(--p-shadow-lg)]",
              toast.tone === "error" ? "bg-p-danger text-white" : "bg-p-ink text-p-bg",
            )}
          >
            {toast.text}
          </button>
        ))}
      </div>
      {!can.edit ? <span className="sr-only">{lang === "fa" ? "دسترسی فقط مشاهده" : "Read-only access"}</span> : null}
    </div>
  );
}

function ConnectionBadge({ mode, status }: { mode: "live" | "demo"; status: string }) {
  const { lang } = usePortal();
  const label = mode === "demo" ? (lang === "fa" ? "نمونه" : "Demo") : status === "live" ? t(lang, "live") : status === "loading" ? t(lang, "loading") : t(lang, "offline");
  const dot = mode === "demo" ? "bg-p-gold" : status === "live" ? "bg-p-ok" : status === "loading" ? "bg-p-ink-3 animate-pulse" : "bg-p-danger";
  return (
    <span className="hidden h-8 items-center gap-2 rounded-full border border-p-line bg-p-surface px-3 text-xs font-medium text-p-ink-2 sm:inline-flex" title={label}>
      <span className={cn("size-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

function DemoBanner() {
  const { lang, store } = usePortal();
  return (
    <div className="flex items-center justify-center gap-3 border-t border-p-line bg-p-gold-soft px-4 py-1.5 text-center text-xs text-p-ink-2">
      <span>{t(lang, "demoBanner")}</span>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold text-p-gold hover:underline"
        onClick={() => (store as DemoStore).reset()}
      >
        <RefreshCw className="size-3" />
        {t(lang, "resetDemo")}
      </button>
    </div>
  );
}

function Inbox() {
  const { lang, store, user } = usePortal();
  const [open, setOpen] = useState(false);
  const { rows } = useCollection("notifications", { column: "recipient_id", value: user.id });
  const sorted = useMemo(() => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30), [rows]);
  const unread = sorted.filter((n) => !n.read_at).length;
  return (
    <div className="relative">
      <IconButton label={t(lang, "notifications")} onClick={() => setOpen((o) => !o)} active={open}>
        <Bell className="size-5" />
        {unread ? (
          <span className="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-p-danger px-1 text-[10px] font-bold leading-4 text-white">
            {num(lang, unread)}
          </span>
        ) : null}
      </IconButton>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[min(22rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-sm font-semibold">{t(lang, "notifications")}</span>
          {unread ? (
            <button type="button" className="text-xs font-medium text-p-brand hover:underline" onClick={() => store.markNotificationsRead()}>
              {t(lang, "markAllRead")}
            </button>
          ) : null}
        </div>
        <div className="thin-scroll max-h-96 overflow-y-auto">
          {sorted.length === 0 ? <p className="px-3 py-8 text-center text-sm text-p-ink-3">{t(lang, "noNotifications")}</p> : null}
          {sorted.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => store.markNotificationsRead([n.id])}
              className="flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-start hover:bg-p-sunken"
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-p-brand")} />
              <span className="min-w-0">
                <span className={cn("block text-sm", n.read_at ? "text-p-ink-2" : "font-medium text-p-ink")}>{n.title}</span>
                <span className="block text-xs text-p-ink-3">{relativeTime(lang, n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function UserMenu({
  themePref,
  setThemePref,
  otherLangPath,
}: {
  themePref: "system" | "light" | "dark";
  setThemePref: (v: "system" | "light" | "dark") => void;
  otherLangPath: string;
}) {
  const { lang, mode, user, store } = usePortal();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1.5 rounded-xl px-1.5 hover:bg-p-sunken"
        aria-expanded={open}
        aria-label={user.name}
      >
        <span className="grid size-8 place-items-center rounded-full bg-p-brand text-xs font-bold text-p-brand-ink">{user.name.trim().charAt(0)}</span>
        <ChevronDown className="hidden size-4 text-p-ink-3 sm:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-p-ink-3">{user.email ?? roleLabels[user.role][lang]}</p>
        </div>
        <div className="my-1 h-px bg-p-line" />
        <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-p-ink-3">{t(lang, "theme")}</p>
        <div className="grid grid-cols-3 gap-1 px-1.5 pb-1.5">
          {(
            [
              ["system", <Monitor key="s" className="size-4" />, lang === "fa" ? "خودکار" : "Auto"],
              ["light", <Sun key="l" className="size-4" />, lang === "fa" ? "روشن" : "Light"],
              ["dark", <Moon key="d" className="size-4" />, lang === "fa" ? "تیره" : "Dark"],
            ] as const
          ).map(([value, icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setThemePref(value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-xs",
                themePref === value ? "bg-p-brand-soft text-p-brand" : "text-p-ink-2 hover:bg-p-sunken",
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div className="my-1 h-px bg-p-line" />
        <Link href={otherLangPath} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm hover:bg-p-sunken">
          <span className="grid size-5 place-items-center text-xs font-bold">{lang === "fa" ? "En" : "فا"}</span>
          {t(lang, "language")}
        </Link>
        {mode === "demo" ? (
          <MenuItem icon={<RefreshCw className="size-4" />} onClick={() => (store as DemoStore).reset()}>
            {t(lang, "resetDemo")}
          </MenuItem>
        ) : (
          <form action="/auth/sign-out" method="post">
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-p-danger hover:bg-p-danger-soft">
              <LogOut className="size-4" />
              {t(lang, "signOut")}
            </button>
          </form>
        )}
      </Popover>
    </div>
  );
}

