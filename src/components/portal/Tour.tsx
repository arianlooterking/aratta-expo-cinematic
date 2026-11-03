"use client";

import { ArrowLeft, ArrowRight, GraduationCap, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { num } from "@/lib/portal/format";
import type { Lang } from "@/lib/lang";
import { usePortal } from "./PortalProvider";
import { Button } from "./ui";

type L = { fa: string; en: string };
type Step = { target?: string; title: L; body: L };

export type TourKey = "welcome" | "map" | "crm" | "company" | "pipeline" | "accounting" | "invoice" | "tasks";

/** What each tour teaches. Targets are data-tour attributes; a missing target shows the step in the middle. */
const TOURS: Record<TourKey, { title: L; steps: Step[] }> = {
  welcome: {
    title: { fa: "آشنایی با مرکز عملیات", en: "Getting around" },
    steps: [
      {
        title: { fa: "به مرکز عملیات آرت اکسپو خوش آمدید", en: "Welcome to Aratta operations" },
        body: {
          fa: "نقشه سالن ها، فروش و پیگیری، حسابداری، تحویل تجهیزات و کارهای تیم، همه این جاست و برای همه همکاران همزمان به روز می شود.",
          en: "Hall maps, sales follow-up, accounting, furniture handover and team tasks all live here, and update for everyone at the same time.",
        },
      },
      {
        target: "exhibition",
        title: { fa: "اول نمایشگاه را انتخاب کنید", en: "Pick the exhibition first" },
        body: {
          fa: "هر چه می بینید مربوط به همین نمایشگاه است: غرفه ها، قراردادها، فاکتورها و کارها. از این جا بین نمایشگاه ها جابجا شوید.",
          en: "Everything you see belongs to this exhibition: booths, deals, invoices and tasks. Switch exhibitions here.",
        },
      },
      {
        target: "nav",
        title: { fa: "بخش ها", en: "The sections" },
        body: {
          fa: "فروش: شرکت ها و مراحل فروش. مالی: فاکتور، پرداخت و مانده ها. عملیات: نقشه و تحویل. تیم: کارها و یادآوری ها. هر کس فقط بخش هایی را می بیند که اجازه دارد.",
          en: "Sales: companies and the pipeline. Finance: invoices, payments, balances. Operations: map and handover. Team: tasks and reminders. People only see what their role allows.",
        },
      },
      {
        target: "quick-add",
        title: { fa: "ثبت سریع از هر جا", en: "Quick add from anywhere" },
        body: {
          fa: "شرکت جدید، ثبت تماس، ثبت پرداخت یا کار جدید را بدون ترک صفحه ثبت کنید.",
          en: "Add a company, log a call, record a payment or create a task without leaving the page.",
        },
      },
      {
        target: "today",
        title: { fa: "امروز چه باید کرد", en: "What needs doing today" },
        body: {
          fa: "پیگیری های امروز، کارهای شما و فاکتورهای سررسید گذشته. روی هر کدام بزنید تا فهرستش باز شود.",
          en: "Today's follow-ups, your tasks and overdue invoices. Tap one to open its list.",
        },
      },
      {
        target: "search",
        title: { fa: "جستجو", en: "Search" },
        body: {
          fa: "هر غرفه یا شرکتی را پیدا کنید. روی کامپیوتر کلید Ctrl+K یا ⌘K را بزنید.",
          en: "Find any booth or company. On a computer press Ctrl+K or ⌘K.",
        },
      },
      {
        target: "inbox",
        title: { fa: "اعلان ها", en: "Notifications" },
        body: {
          fa: "وقتی کاری به شما سپرده می شود یا وضعیت کاری که ساخته اید تغییر می کند، این جا خبردار می شوید.",
          en: "You hear here when a task is given to you or a task you made changes status.",
        },
      },
      {
        target: "help",
        title: { fa: "راهنما همیشه در دسترس است", en: "Help is always here" },
        body: {
          fa: "هر وقت خواستید، از این دکمه آموزش همین صفحه یا همین آشنایی را دوباره ببینید.",
          en: "Use this button any time to replay this tour or the tour for the page you're on.",
        },
      },
    ],
  },
  map: {
    title: { fa: "آموزش نقشه سالن", en: "Hall map tour" },
    steps: [
      {
        target: "map-halls",
        title: { fa: "سالن ها", en: "Halls" },
        body: { fa: "سالن را انتخاب کنید. عدد کنار نام، تعداد غرفه های آن است.", en: "Pick a hall. The number is how many booths it has." },
      },
      {
        target: "map-layers",
        title: { fa: "دو لایه: فروش و تجهیزات", en: "Two layers: sales and furniture" },
        body: {
          fa: "فروش: کدام غرفه آزاد، رزرو، قرارداد یا تسویه است و چقدر پرداخت شده. تجهیزات: چه چیزی باید تحویل یا جمع آوری شود.",
          en: "Sales shows which booths are free, reserved, contracted or paid, and how much is paid. Equipment shows what still has to be delivered or collected.",
        },
      },
      {
        target: "map-legend",
        title: { fa: "راهنمای رنگ ها", en: "Colour key" },
        body: { fa: "روی هر وضعیت بزنید تا آن غرفه ها کم رنگ یا پررنگ شوند.", en: "Tap a status to fade those booths in or out." },
      },
      {
        target: "map-canvas",
        title: { fa: "کار با نقشه", en: "Working the map" },
        body: {
          fa: "روی غرفه بزنید تا پرونده اش باز شود. کلیک راست یا نگه داشتن انگشت: منوی سریع. با دو انگشت یا چرخ ماوس بزرگنمایی کنید و با کشیدن جابجا شوید. نشانگر ماوس روی غرفه، خلاصه آن را نشان می دهد.",
          en: "Tap a booth to open its file. Right-click or press and hold for quick actions. Pinch or scroll to zoom, drag to move around. Hover a booth with the mouse for a summary.",
        },
      },
      {
        target: "map-edit",
        title: { fa: "ویرایش نقشه", en: "Editing the plan" },
        body: {
          fa: "غرفه، راهرو، ستون و ورودی بکشید؛ اندازه دقیق وارد کنید؛ ساختار ثابت را قفل کنید تا تصادفی جابجا نشود. همه چیز با واگرد برمی گردد.",
          en: "Draw booths, corridors, columns and entrances, type exact sizes, and lock fixed structure so it never moves by accident. Everything can be undone.",
        },
      },
      {
        target: "map-help",
        title: { fa: "میانبرهای کیبورد", en: "Keyboard shortcuts" },
        body: { fa: "فهرست کامل ماوس، کیبورد و لمس این جاست. کلید ? هم آن را باز می کند.", en: "The full list for mouse, keyboard and touch. The ? key opens it too." },
      },
    ],
  },
  crm: {
    title: { fa: "آموزش شرکت ها", en: "Companies tour" },
    steps: [
      {
        target: "crm-filters",
        title: { fa: "پیدا کردن شرکت", en: "Finding a company" },
        body: {
          fa: "با نام، تلفن، شهر یا حوزه کاری جستجو کنید و فهرست را بر اساس حضور در این نمایشگاه، دوره های قبل یا بدهی محدود کنید.",
          en: "Search by name, phone, city or sector, and narrow the list to this exhibition, past exhibitors or companies that owe money.",
        },
      },
      {
        target: "crm-list",
        title: { fa: "پرونده هر شرکت", en: "Each company's file" },
        body: {
          fa: "روی شرکت بزنید: افراد رابط، تاریخچه تماس ها، غرفه ها، فاکتورها و کارهای مربوط به آن یک جا.",
          en: "Open a company to see its contacts, call history, booths, invoices and tasks in one place.",
        },
      },
      {
        target: "crm-new",
        title: { fa: "شرکت جدید", en: "New company" },
        body: { fa: "اگر شرکتی با نام مشابه وجود داشته باشد، قبل از ثبت هشدار می دهد.", en: "You're warned if a company with a similar name already exists." },
      },
    ],
  },
  company: {
    title: { fa: "آموزش پرونده شرکت", en: "Company file tour" },
    steps: [
      {
        target: "company-actions",
        title: { fa: "ثبت تماس و پیگیری", en: "Log calls and follow-ups" },
        body: {
          fa: "هر تماس، جلسه یا پیام را ثبت کنید و تاریخ پیگیری بعدی بگذارید. پیگیری های امروز در منوی کناری شمرده می شوند.",
          en: "Log every call, meeting or message and set the next follow-up. Today's follow-ups are counted in the side menu.",
        },
      },
      {
        target: "company-deals",
        title: { fa: "فروش در هر نمایشگاه", en: "Sales per exhibition" },
        body: { fa: "مرحله فروش، غرفه ها و مانده حساب این شرکت در هر نمایشگاه.", en: "The stage, booths and balance for this company in each exhibition." },
      },
      {
        target: "company-timeline",
        title: { fa: "تاریخچه", en: "History" },
        body: { fa: "همه گفتگوها به ترتیب زمان، تا هر همکاری بداند قبلاً چه گذشته.", en: "Every conversation in order, so anyone on the team knows what was said before." },
      },
    ],
  },
  pipeline: {
    title: { fa: "آموزش مراحل فروش", en: "Pipeline tour" },
    steps: [
      {
        target: "pipeline-board",
        title: { fa: "ستون ها، مراحل فروش اند", en: "Columns are sales stages" },
        body: {
          fa: "کارت هر شرکت را بکشید و در مرحله بعد رها کنید. روی گوشی، انگشت را کمی نگه دارید و بعد بکشید. با منوی کارت هم می توانید مرحله را عوض کنید.",
          en: "Drag a company's card to the next stage. On a phone, press and hold a moment, then drag. The card menu changes the stage too.",
        },
      },
      {
        target: "pipeline-view",
        title: { fa: "پیگیری ها", en: "Follow-ups" },
        body: { fa: "فهرست تماس هایی که امروز یا قبلاً باید انجام می شد.", en: "The calls that are due today or overdue." },
      },
    ],
  },
  accounting: {
    title: { fa: "آموزش حسابداری", en: "Accounting tour" },
    steps: [
      {
        target: "acc-kpis",
        title: { fa: "خلاصه مالی نمایشگاه", en: "The exhibition's money" },
        body: { fa: "جمع فاکتورها، دریافتی ها، مانده و سررسید گذشته، به ارز نمایشگاه.", en: "Invoiced, collected, outstanding and overdue, in the exhibition's currency." },
      },
      {
        target: "acc-ageing",
        title: { fa: "سن مطالبات", en: "Receivables by age" },
        body: { fa: "مانده ها بر اساس روزهای گذشته از سررسید. بدهکاران بزرگ و قدیمی را اول پیگیری کنید.", en: "Balances by days past due. Chase the biggest and oldest first." },
      },
      {
        target: "acc-tabs",
        title: { fa: "فاکتورها و پرداخت ها", en: "Invoices and payments" },
        body: {
          fa: "فاکتور و پیش فاکتور بسازید، شماره خودکار بگیرید، صادر و ثبت کنید، پرداخت ها را ثبت یا با ذکر دلیل باطل کنید و خروجی اکسل بگیرید.",
          en: "Create invoices and proformas, get automatic numbers, issue and file them, record or void payments with a reason, and export to Excel.",
        },
      },
    ],
  },
  invoice: {
    title: { fa: "آموزش فاکتور", en: "Invoice tour" },
    steps: [
      {
        target: "invoice-lines",
        title: { fa: "ردیف های فاکتور", en: "Invoice lines" },
        body: { fa: "خدمت، شرح، تعداد، واحد، قیمت و تخفیف هر ردیف. جمع و ارزش افزوده خودکار حساب می شود.", en: "Service, description, quantity, unit, price and discount per line. Totals and VAT are worked out for you." },
      },
      {
        target: "invoice-status",
        title: { fa: "مراحل فاکتور", en: "Invoice stages" },
        body: { fa: "پیش نویس، صادر شده، ثبت در سامانه. فاکتور صادر شده فقط با ابطال یا بازگشت به پیش نویس عوض می شود.", en: "Draft, issued, filed. An issued invoice only changes by cancelling it or moving it back to draft." },
      },
    ],
  },
  tasks: {
    title: { fa: "آموزش کارها", en: "Tasks tour" },
    steps: [
      {
        target: "tasks-views",
        title: { fa: "تابلو یا کارهای من", en: "Board or my tasks" },
        body: { fa: "تابلو: همه کارهای تیم بر اساس وضعیت. کارهای من: بر اساس سررسید.", en: "The board shows the whole team by status. My tasks lists yours by due date." },
      },
      {
        target: "tasks-new",
        title: { fa: "کار جدید", en: "New task" },
        body: {
          fa: "مسئول، سررسید، اولویت و چک لیست بگذارید و آن را به غرفه یا شرکت وصل کنید. مسئول کار خبردار می شود.",
          en: "Set who, when, priority and a checklist, and link it to a booth or company. The person gets a notification.",
        },
      },
      {
        target: "tasks-board",
        title: { fa: "جابجایی کارها", en: "Moving tasks along" },
        body: { fa: "کارت را بین ستون ها بکشید یا داخل کارت وضعیتش را عوض کنید.", en: "Drag a card between columns, or change its status inside the card." },
      },
    ],
  },
};

const SEEN_KEY = "aratta.portal.tours.v1";

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markSeen(key: TourKey) {
  try {
    const seen = readSeen();
    seen.add(key);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Private windows: the tour simply shows again next time.
  }
}

/** Where each page tour lives, so it can be started from anywhere. Tours of a single record have no page. */
export const TOUR_ROUTES: Partial<Record<TourKey, string>> = {
  map: "/map",
  crm: "/crm",
  pipeline: "/crm/pipeline",
  accounting: "/accounting",
  tasks: "/tasks",
};

type TourState = {
  start: (key: TourKey) => void;
  /** Starts the tour once its page has opened. */
  startWhenReady: (key: TourKey) => void;
  /** The tour that fits the page you're on. */
  pageTour: TourKey | null;
  setPageTour: (key: TourKey | null) => void;
  seen: (key: TourKey) => boolean;
  title: (key: TourKey) => string;
};

const TourContext = createContext<TourState | null>(null);

export function useTour() {
  const value = useContext(TourContext);
  if (!value) throw new Error("useTour must be used inside TourProvider");
  return value;
}

/** Registers the tour for the current page, so the help button offers it. */
export function usePageTour(key: TourKey) {
  const { setPageTour } = useTour();
  useEffect(() => {
    setPageTour(key);
    return () => setPageTour(null);
  }, [key, setPageTour]);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { lang } = usePortal();
  const [active, setActive] = useState<{ key: TourKey; index: number } | null>(null);
  const [pageTour, setPageTour] = useState<TourKey | null>(null);
  const [seenVersion, setSeenVersion] = useState(0);
  const [pending, setPending] = useState<TourKey | null>(null);

  // A tour asked for on another page starts when that page registers it.
  useEffect(() => {
    if (!pending || pending !== pageTour) return;
    const timer = setTimeout(() => {
      setActive({ key: pending, index: 0 });
      setPending(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [pending, pageTour]);

  // The welcome tour runs once, the first time someone opens the portal on this device.
  useEffect(() => {
    if (readSeen().has("welcome")) return;
    const timer = setTimeout(() => setActive({ key: "welcome", index: 0 }), 900);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setActive((a) => {
      if (a) markSeen(a.key);
      return null;
    });
    setSeenVersion((v) => v + 1);
  }, []);

  const value = useMemo<TourState>(
    () => ({
      start: (key) => setActive({ key, index: 0 }),
      startWhenReady: (key) => setPending(key),
      pageTour,
      setPageTour,
      // seenVersion keeps this fresh after a tour closes.
      seen: (key) => seenVersion >= 0 && typeof window !== "undefined" && readSeen().has(key),
      title: (key) => TOURS[key].title[lang],
    }),
    [pageTour, lang, seenVersion],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {active ? (
        <TourOverlay
          lang={lang}
          tour={TOURS[active.key]}
          index={active.index}
          onIndex={(index) => setActive({ key: active.key, index })}
          onClose={close}
        />
      ) : null}
    </TourContext.Provider>
  );
}

function findTarget(name: string | undefined) {
  if (!name) return null;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && el.getClientRects().length) return el;
  }
  return null;
}

type Box = { x: number; y: number; w: number; h: number };

function TourOverlay({
  lang,
  tour,
  index,
  onIndex,
  onClose,
}: {
  lang: Lang;
  tour: { title: L; steps: Step[] };
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const fa = lang === "fa";
  const step = tour.steps[index];
  const last = index === tour.steps.length - 1;
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ w: 1024, h: 768 });

  useLayoutEffect(() => {
    const el = findTarget(step.target);
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      const target = findTarget(step.target);
      if (!target) return setBox(null);
      const r = target.getBoundingClientRect();
      const pad = 6;
      setBox({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const timer = setInterval(measure, 400);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearInterval(timer);
    };
  }, [step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const forward = fa ? "ArrowLeft" : "ArrowRight";
      const back = fa ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward || e.key === "Enter") {
        e.preventDefault();
        if (last) onClose();
        else onIndex(index + 1);
      }
      if (e.key === back && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fa, index, last, onClose, onIndex]);

  // Card next to the target on wide screens (below, above, then beside it), docked to the bottom on phones.
  const phone = viewport.w < 640;
  const cardW = Math.min(360, viewport.w - 24);
  const cardH = 250;
  let cardStyle: React.CSSProperties | undefined;
  if (!phone && box) {
    const clampX = (x: number) => Math.max(12, Math.min(viewport.w - cardW - 12, x));
    const clampY = (y: number) => Math.max(12, Math.min(viewport.h - cardH - 12, y));
    const centreX = clampX(box.x + box.w / 2 - cardW / 2);
    if (box.y + box.h + 12 + cardH < viewport.h) cardStyle = { top: box.y + box.h + 12, left: centreX };
    else if (box.y - 12 - cardH > 0) cardStyle = { top: box.y - 12 - cardH, left: centreX };
    else if (box.x - 16 - cardW > 0) cardStyle = { top: clampY(box.y + 24), left: box.x - 16 - cardW };
    else if (box.x + box.w + 16 + cardW < viewport.w) cardStyle = { top: clampY(box.y + 24), left: box.x + box.w + 16 };
    if (cardStyle) cardStyle = { ...cardStyle, position: "fixed", width: cardW };
  }

  return (
    <div className="portal-tour fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={tour.title[lang]}>
      {box ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-[#e3bd77] transition-all duration-300 ease-out"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: "0 0 0 9999px rgba(6, 18, 15, 0.62)" }}
        />
      ) : (
        <div className="animate-fade fixed inset-0 bg-[rgba(6,18,15,0.62)]" />
      )}
      {/* Clicks outside the card do nothing, so the tour isn't lost by accident. */}
      <div className="fixed inset-0" aria-hidden />
      <div
        className={cn(
          "animate-sheet z-[71] grid gap-3 border border-p-line bg-p-surface p-5 text-p-ink shadow-[var(--p-shadow-lg)]",
          cardStyle ? "rounded-3xl" : phone ? "fixed inset-x-3 bottom-3 rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]" : "fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-3xl",
        )}
        style={cardStyle}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-p-gold">
          <GraduationCap className="size-4" />
          <span className="flex-1">{tour.title[lang]}</span>
          <span className="tabular text-p-ink-3">
            {num(lang, index + 1)} / {num(lang, tour.steps.length)}
          </span>
          <button type="button" onClick={onClose} aria-label={fa ? "بستن آموزش" : "Close the tour"} className="grid size-7 place-items-center rounded-lg text-p-ink-3 hover:bg-p-sunken">
            <X className="size-4" />
          </button>
        </div>
        <h2 className="text-lg font-bold leading-snug">{step.title[lang]}</h2>
        <p className="text-sm leading-relaxed text-p-ink-2">{step.body[lang]}</p>
        <div className="flex items-center gap-1" aria-hidden>
          {tour.steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-p-brand" : "w-1.5 bg-p-line-strong")} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button tone="ghost" size="sm" onClick={onClose}>
            {fa ? "رد کردن" : "Skip"}
          </Button>
          <span className="flex-1" />
          {index > 0 ? (
            <Button size="sm" icon={fa ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />} onClick={() => onIndex(index - 1)}>
              {fa ? "قبلی" : "Back"}
            </Button>
          ) : null}
          <Button tone="primary" size="sm" autoFocus onClick={() => (last ? onClose() : onIndex(index + 1))}>
            {last ? (fa ? "متوجه شدم" : "Got it") : fa ? "بعدی" : "Next"}
            {last ? null : fa ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Lists every tour, for the help menu. */
export const TOUR_KEYS = Object.keys(TOURS) as TourKey[];
