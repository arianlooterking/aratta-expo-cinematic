"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Settings2,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  GraduationCap,
  History,
  Landmark,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessagesSquare,
  Map as MapIcon,
  Menu,
  Moon,
  MoreHorizontal,
  PackageCheck,
  RefreshCw,
  Search,
  Smartphone,
  SquareKanban,
  TriangleAlert,
  Sun,
  Users,
  X,
  SmilePlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { roleLabels } from "@/lib/platform/labels";
import { num, relativeTime } from "@/lib/portal/format";
import { t } from "@/lib/portal/i18n";
import type { DemoStore } from "@/lib/portal/demo-store";
import { useExhibition } from "./ExhibitionProvider";
import { ExhibitionSwitcher } from "./ExhibitionSwitcher";
import { usePersistentState, usePortal, useCollection } from "./PortalProvider";
import { QuickAdd } from "./QuickAdd";
import { SearchPalette } from "./SearchPalette";
import { TOUR_KEYS, TOUR_ROUTES, TourProvider, useTour } from "./Tour";
import { AvatarChooser, StaffAvatar } from "./people";
import { useChatBadge } from "./chat/useChat";
import { IconButton, MenuItem, Popover } from "./ui";
import { useToday } from "./useToday";

type NavItem = { href: string; label: string; icon: ReactNode; match: (path: string) => boolean; badge?: number; tone?: "danger" | "brand" };
type NavGroup = { label: string; items: NavItem[] };

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
  const [themePref, setThemePref] = usePersistentState<"system" | "light" | "dark">("aratta.portal.theme", "system");
  const systemDark = useSystemDark();
  const theme = themePref === "system" ? (systemDark ? "dark" : "light") : themePref;
  // The tour overlay sits inside .portal so it gets the portal's colours and theme.
  return (
    <div className="portal min-h-dvh" data-theme={theme}>
      <TourProvider>
        <Shell theme={theme} setThemePref={setThemePref}>
          {children}
        </Shell>
      </TourProvider>
    </div>
  );
}

function Shell({
  children,
  theme,
  setThemePref,
}: {
  children: ReactNode;
  theme: "light" | "dark";
  setThemePref: (v: "system" | "light" | "dark") => void;
}) {
  const { lang, mode, user, can, toasts, dismissToast } = usePortal();
  const today = useToday();
  const { status, staffById, openProblems: openProblemRows } = useExhibition();
  const openProblems = openProblemRows.length;
  const me = staffById.get(user.id);
  const pathname = usePathname() ?? "";
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const base = `/${lang}/staff`;
  const isMap = pathname.startsWith(`${base}/map`);
  const isChat = pathname.startsWith(`${base}/chat`);
  // Full-height screens manage their own scrolling.
  const isFull = isMap || isChat;
  const chat = useChatBadge();
  const search = useSearchParams();
  const inConversation = isChat && Boolean(search?.get("c"));

  const fa = lang === "fa";
  const groups: NavGroup[] = useMemo(() => {
    const icon = "size-[18px]";
    const out: NavGroup[] = [
      {
        label: fa ? "عملیات" : "Operations",
        items: [
          { href: base, label: t(lang, "overview"), icon: <LayoutDashboard className={icon} />, match: (p) => p === base },
          { href: `${base}/upcoming`, label: fa ? "کارهای پیش رو" : "Upcoming", icon: <CalendarDays className={icon} />, match: (p) => p.startsWith(`${base}/upcoming`) },
          { href: `${base}/map`, label: t(lang, "map"), icon: <MapIcon className={icon} />, match: (p) => p.startsWith(`${base}/map`) },
          { href: `${base}/handover`, label: t(lang, "handover"), icon: <PackageCheck className={icon} />, match: (p) => p.startsWith(`${base}/handover`) },
          {
            href: `${base}/problems`,
            label: fa ? "مشکلات" : "Problems",
            icon: <TriangleAlert className={icon} />,
            match: (p) => p.startsWith(`${base}/problems`),
            badge: openProblems,
            tone: "danger",
          },
        ],
      },
      {
        label: fa ? "فروش و مشتریان" : "Sales and clients",
        items: [
          { href: `${base}/crm`, label: fa ? "شرکت ها" : "Companies", icon: <Building2 className={icon} />, match: (p) => p === `${base}/crm` || (p.startsWith(`${base}/crm/`) && !p.startsWith(`${base}/crm/pipeline`)) },
          {
            href: `${base}/crm/pipeline`,
            label: t(lang, "pipeline"),
            icon: <SquareKanban className={icon} />,
            match: (p) => p.startsWith(`${base}/crm/pipeline`),
            badge: today.followUps,
            tone: "brand",
          },
        ],
      },
    ];
    if (can.finance)
      out.push({
        label: fa ? "مالی" : "Finance",
        items: [
          {
            href: `${base}/accounting`,
            label: fa ? "حسابداری" : "Accounting",
            icon: <Landmark className={icon} />,
            match: (p) => p.startsWith(`${base}/accounting`),
            badge: today.overdueInvoices,
            tone: "danger",
          },
        ],
      });
    const team: NavItem[] = [
      {
        href: `${base}/chat`,
        label: fa ? "گفتگو" : "Chat",
        icon: <MessagesSquare className={icon} />,
        match: (p) => p.startsWith(`${base}/chat`),
        badge: chat.badge,
        tone: chat.mentions ? "danger" : "brand",
      },
      { href: `${base}/tasks`, label: t(lang, "tasks"), icon: <ListTodo className={icon} />, match: (p) => p.startsWith(`${base}/tasks`), badge: today.myTasksDue, tone: "danger" },
    ];
    team.push({ href: `${base}/team`, label: t(lang, "team"), icon: <Users className={icon} />, match: (p) => p.startsWith(`${base}/team`) });
    if (can.manage) team.push({ href: `${base}/settings`, label: t(lang, "settings"), icon: <Settings2 className={icon} />, match: (p) => p.startsWith(`${base}/settings`) });
    out.push({ label: fa ? "تیم و سازمان" : "Team and setup", items: team });
    return out;
  }, [base, lang, fa, can.finance, can.manage, today.followUps, today.overdueInvoices, today.myTasksDue, openProblems, chat.badge, chat.mentions]);
  const nav = groups.flatMap((g) => g.items);
  const tabs: NavItem[] = [
    nav[0],
    nav.find((n) => n.href === `${base}/map`)!,
    nav.find((n) => n.href === `${base}/chat`)!,
    nav.find((n) => n.href === `${base}/crm/pipeline`)!,
    nav.find((n) => n.href === `${base}/tasks`)!,
  ];

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
    <nav className="thin-scroll flex h-full flex-col gap-1 overflow-y-auto p-3" aria-label={t(lang, "menu")}>
      <Link href={base} className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2" onClick={closeDrawer}>
        <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(140deg,#d9b26a,#8f6a24)] text-[15px] font-black text-[#0b1d18]">
          A
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-p-side-ink">{fa ? "اَرَتَ اکسپو" : "Aratta Expo"}</span>
          <span className="block text-xs text-p-side-muted">{fa ? "مرکز عملیات نمایشگاه" : "Exhibition operations"}</span>
        </span>
      </Link>
      <div data-tour="exhibition">
        <ExhibitionSwitcher variant="sidebar" />
      </div>
      <div className="mt-3">
        <QuickAdd variant="sidebar" />
      </div>
      <div className="mt-2 grid gap-3" data-tour="nav">
        {groups.map((g) => (
          <div key={g.label} className="grid gap-0.5">
            <p className="px-3 pb-0.5 pt-1 text-[11px] font-semibold text-p-side-muted/80">{g.label}</p>
            {g.items.map((item) => {
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
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className={cn("tabular grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", item.tone === "danger" ? "bg-p-danger text-white" : "bg-[#e3bd77] text-[#0b1d18]")}>
                      {num(lang, item.badge)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <TodayCard today={today} base={base} onNavigate={closeDrawer} />
      <div className="mt-auto grid gap-0.5 pt-4">
        <HelpMenu variant="sidebar" />
        <Link
          href={`${base}/app`}
          onClick={closeDrawer}
          aria-current={pathname.startsWith(`${base}/app`) ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-3 rounded-xl px-3 text-[13px] hover:bg-p-side-hover hover:text-p-side-ink",
            pathname.startsWith(`${base}/app`) ? "bg-white/10 text-white" : "text-p-side-muted",
          )}
        >
          <Smartphone className="size-4" />
          {fa ? "اپ موبایل" : "Phone app"}
        </Link>
        <Link
          href={`${base}/classic`}
          className="flex h-9 items-center gap-3 rounded-xl px-3 text-[13px] text-p-side-muted hover:bg-p-side-hover hover:text-p-side-ink"
        >
          <History className="size-4" />
          {t(lang, "classic")}
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2">
          {me ? (
            <StaffAvatar staff={me} size={32} />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-bold text-p-side-ink">{user.name.trim().charAt(0)}</span>
          )}
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-medium text-p-side-ink">{user.name}</span>
            <span className="block text-xs text-p-side-muted">{roleLabels[user.role][lang]}</span>
          </span>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 bg-p-side pt-[env(safe-area-inset-top)] lg:block print:hidden">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-black/50" onClick={closeDrawer} aria-hidden />
          <aside className="animate-sheet absolute inset-y-0 start-0 w-[84%] max-w-80 bg-p-side pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <IconButton label={t(lang, "close")} className="absolute end-2 top-[calc(env(safe-area-inset-top)+0.75rem)] text-p-side-muted" onClick={closeDrawer}>
              <X className="size-5" />
            </IconButton>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className={cn("flex flex-col lg:ps-64 print:ps-0", isFull ? "h-dvh" : "min-h-dvh")}>
        <header className={cn("sticky top-0 z-20 border-b border-p-line bg-p-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md print:hidden", inConversation && "hidden lg:block")}>
          {/* Phones: slightly smaller icon buttons leave room for the exhibition name. */}
          <div className="flex h-14 items-center gap-1 px-2 max-sm:[&_.size-10]:size-9 sm:gap-2 sm:px-5">
            <IconButton label={t(lang, "menu")} className="lg:hidden" onClick={() => setDrawer(true)}>
              <Menu className="size-5" />
            </IconButton>
            <div className="min-w-0 flex-1 lg:hidden" data-tour="exhibition">
              <ExhibitionSwitcher variant="compact" />
            </div>
            <button
              type="button"
              data-tour="search"
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-p-line bg-p-surface px-3 text-sm text-p-ink-3 shadow-[var(--p-shadow)] transition-colors hover:border-p-line-strong lg:flex"
            >
              <Search className="size-4" />
              <span className="flex-1 text-start">{t(lang, "search")}</span>
              <span className="text-xs">⌘K</span>
            </button>
            <div className="hidden flex-1 lg:block" />
            <div className="lg:hidden">
              <QuickAdd variant="icon" />
            </div>
            <IconButton label={t(lang, "search")} className="lg:hidden" data-tour="search" onClick={() => setSearchOpen(true)}>
              <Search className="size-5" />
            </IconButton>
            <ConnectionBadge mode={mode} status={status} />
            <div className="hidden sm:block">
              <HelpMenu variant="icon" />
            </div>
            <ThemeToggle theme={theme} onToggle={() => setThemePref(theme === "dark" ? "light" : "dark")} />
            <Inbox />
            <UserMenu otherLangPath={otherLangPath} />
          </div>
          {mode === "demo" ? <DemoBanner /> : null}
        </header>

        <main className={cn("flex-1", isFull ? cn("flex min-h-0 flex-col lg:pb-0", inConversation ? "pb-0" : "pb-[calc(4rem+env(safe-area-inset-bottom))]") : "pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10 print:pb-0")}>{children}</main>

        {/* Mobile tab bar */}
        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-p-line bg-p-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden print:hidden",
            inConversation && "hidden",
          )}
          aria-label={t(lang, "menu")}
          data-tour="nav"
        >
          {tabs.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-p-brand" : "text-p-ink-3")}
              >
                {item.icon}
                <span className="max-w-full truncate px-1">{item.label}</span>
                {item.badge ? (
                  <span className={cn("tabular absolute top-2 grid h-4 min-w-4 translate-x-3 place-items-center rounded-full px-1 text-[10px] font-bold text-white rtl:-translate-x-3", item.tone === "danger" ? "bg-p-danger" : "bg-p-brand")}>
                    {num(lang, item.badge)}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button type="button" onClick={() => setDrawer(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-p-ink-3">
            <MoreHorizontal className="size-[18px]" />
            {fa ? "بیشتر" : "More"}
          </button>
        </nav>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 print:hidden">
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
    </>
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { rows } = useCollection("notifications", { column: "recipient_id", value: user.id });
  const sorted = useMemo(() => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30), [rows]);
  const unread = sorted.filter((n) => !n.read_at).length;
  return (
    <div className="relative" data-tour="inbox">
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
              onClick={() => {
                store.markNotificationsRead([n.id]);
                if (n.link?.startsWith("/staff/")) {
                  setOpen(false);
                  router.push(`/${lang}${n.link}`);
                }
              }}
              className="flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-start hover:bg-p-sunken"
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-p-brand")} />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-p-gold">{notificationKind(lang, n.kind)}</span>
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

/** One button: in light mode it switches to dark, in dark mode back to light. */
function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const dark = theme === "dark";
  const label = dark ? (fa ? "حالت روشن" : "Light mode") : fa ? "حالت تیره" : "Dark mode";
  return (
    <IconButton label={label} onClick={onToggle}>
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </IconButton>
  );
}

function UserMenu({ otherLangPath }: { otherLangPath: string }) {
  const { lang, mode, user, store } = usePortal();
  const x = useExhibition();
  const me = x.staffById.get(user.id) ?? null;
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  return (
    <div className="relative">
      <AvatarChooser open={choosing} onClose={() => setChoosing(false)} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1.5 rounded-xl px-1.5 hover:bg-p-sunken"
        aria-expanded={open}
        aria-label={user.name}
      >
        {me ? (
          <StaffAvatar staff={me} size={32} />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-p-brand text-xs font-bold text-p-brand-ink">{user.name.trim().charAt(0)}</span>
        )}
        <ChevronDown className="hidden size-4 text-p-ink-3 sm:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-1.5">
          {me ? <StaffAvatar staff={me} size={40} /> : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-p-ink-3">{me?.job_title ?? user.email ?? roleLabels[user.role][lang]}</p>
          </div>
        </div>
        {me ? (
          <MenuItem
            icon={<SmilePlus className="size-4" />}
            onClick={() => {
              setOpen(false);
              setChoosing(true);
            }}
          >
            {lang === "fa" ? "تصویر شما" : "Your picture"}
          </MenuItem>
        ) : null}
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


function notificationKind(lang: "fa" | "en", kind: string) {
  const fa = lang === "fa";
  if (kind === "task.assigned" || kind === "task_assigned") return fa ? "کار تازه برای شما" : "New task for you";
  if (kind === "task.status") return fa ? "تغییر وضعیت کار" : "Task status changed";
  if (kind === "task.comment") return fa ? "نظر تازه" : "New comment";
  if (kind.includes("payment")) return fa ? "پرداخت" : "Payment";
  if (kind === "chat.direct") return fa ? "پیام تازه" : "New message";
  if (kind === "chat.mention") return fa ? "از شما نام بردند" : "You were mentioned";
  return fa ? "اعلان" : "Notice";
}

function TodayCard({ today, base, onNavigate }: { today: ReturnType<typeof useToday>; base: string; onNavigate: () => void }) {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  const rows: Array<{ href: string; label: string; value: number; tone: string }> = [
    { href: `${base}/crm/pipeline?view=followups`, label: fa ? "پیگیری امروز" : "Follow-ups due", value: today.followUps, tone: "text-[#e3bd77]" },
    { href: `${base}/tasks?view=mine`, label: fa ? "کارهای امروز من" : "My tasks due", value: today.myTasksDue, tone: today.myTasksDue ? "text-[#ff9b8f]" : "text-p-side-ink" },
  ];
  if (can.finance) rows.push({ href: `${base}/accounting?tab=receivables`, label: fa ? "فاکتور سررسید گذشته" : "Overdue invoices", value: today.overdueInvoices, tone: today.overdueInvoices ? "text-[#ff9b8f]" : "text-p-side-ink" });
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2" data-tour="today">
      <p className="px-1.5 pb-1 text-[11px] font-semibold text-p-side-muted/80">{fa ? "امروز" : "Today"}</p>
      <div className="grid gap-0.5">
        {rows.map((r) => (
          <Link key={r.href} href={r.href} onClick={onNavigate} className="flex h-8 items-center gap-2 rounded-lg px-1.5 text-[13px] text-p-side-muted hover:bg-p-side-hover hover:text-p-side-ink">
            <span className="flex-1">{r.label}</span>
            <span className={cn("tabular font-bold", r.value ? r.tone : "text-p-side-muted/60")}>{num(lang, r.value)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Replays the welcome tour or the tour for the current page. */
function HelpMenu({ variant }: { variant: "sidebar" | "icon" }) {
  const { lang } = usePortal();
  const { start, startWhenReady, pageTour, seen, title } = useTour();
  const router = useRouter();
  const fa = lang === "fa";
  const [open, setOpen] = useState(false);
  const fresh = pageTour ? !seen(pageTour) : false;
  const go = (key: (typeof TOUR_KEYS)[number]) => {
    setOpen(false);
    const route = TOUR_ROUTES[key];
    if (key === "welcome" || key === pageTour || !route) return start(key);
    startWhenReady(key);
    router.push(`/${lang}/staff${route}`);
  };
  return (
    <div className="relative">
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[13px] text-p-side-muted hover:bg-p-side-hover hover:text-p-side-ink"
        >
          <GraduationCap className="size-4" />
          <span className="flex-1 text-start">{fa ? "آموزش و راهنما" : "Help and tours"}</span>
          {fresh ? <span className="size-2 animate-pulse rounded-full bg-[#e3bd77]" /> : null}
        </button>
      ) : (
        <IconButton label={fa ? "آموزش و راهنما" : "Help and tours"} data-tour="help" onClick={() => setOpen((o) => !o)} active={open} className="relative">
          <CircleHelp className="size-5" />
          {fresh ? <span className="absolute end-2 top-2 size-2 animate-pulse rounded-full bg-p-gold" /> : null}
        </IconButton>
      )}
      <Popover open={open} onClose={() => setOpen(false)} align={variant === "sidebar" ? "start" : "end"} className={cn("w-72", variant === "sidebar" && "bottom-full top-auto mb-2")}>
        {pageTour ? (
          <MenuItem icon={<GraduationCap className="size-4" />} onClick={() => go(pageTour)} active>
            {fa ? `آموزش همین صفحه: ${title(pageTour)}` : `This page: ${title(pageTour)}`}
          </MenuItem>
        ) : null}
        <MenuItem icon={<CircleHelp className="size-4" />} onClick={() => go("welcome")} hint={seen("welcome") ? <Check className="size-3.5" /> : null}>
          {title("welcome")}
        </MenuItem>
        <div className="my-1 h-px bg-p-line" />
        <p className="px-2.5 pb-1 pt-1 text-xs font-medium text-p-ink-3">{fa ? "همه آموزش ها" : "All tours"}</p>
        {TOUR_KEYS.filter((k) => k !== "welcome" && k !== pageTour && TOUR_ROUTES[k]).map((k) => (
          <MenuItem key={k} onClick={() => go(k)} hint={seen(k) ? <Check className="size-3.5" /> : null}>
            {title(k)}
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
}
