"use client";

import {
  Archive,
  ArchiveRestore,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ExternalLink,
  Map as MapIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  formatStaffCalendarDate,
  getStaffCalendarMonthName,
  getStaffCalendarYear,
  staffCalendarMonthOverlaps,
  staffCalendarYearOverlaps,
  type StaffCalendarSystem,
} from "@/lib/staff-calendar";
import type {
  Exhibition,
  ExhibitionStatus,
  Hall,
  PortalLocale,
  PortalState,
} from "@/lib/staff-portal";

export type NewExhibitionDraft = {
  name: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  hallCount: number;
};

export type ExhibitionWorkspaceProps = {
  locale: PortalLocale;
  state: PortalState;
  onSelectExhibition: (exhibitionId: string) => void;
  onOpenOperations: (exhibitionId: string, hallId?: string) => void;
  onAddExhibition: (draft: NewExhibitionDraft) => void;
  onUpdateExhibition: (
    exhibitionId: string,
    patch: Partial<Pick<Exhibition, "name" | "venue" | "city" | "startDate" | "endDate" | "status">>,
  ) => void;
  onRemoveExhibition: (exhibitionId: string) => void;
  onAddHall: (exhibitionId: string) => void;
  onUpdateHall: (
    exhibitionId: string,
    hallId: string,
    patch: Pick<Hall, "name" | "physicalWidth" | "physicalHeight">,
  ) => void;
  onRemoveHall: (exhibitionId: string, hallId: string) => void;
};

const statusLabels: Record<ExhibitionStatus, { fa: string; en: string }> = {
  planning: { fa: "برنامه‌ریزی", en: "Planning" },
  build: { fa: "ساخت و اجرا", en: "Build" },
  live: { fa: "در حال برگزاری", en: "Live" },
  strike: { fa: "جمع‌آوری", en: "Strike" },
  archived: { fa: "بایگانی", en: "Archived" },
};

const statusTone: Record<ExhibitionStatus, string> = {
  planning: "border-cyan-200 bg-cyan-50 text-cyan-800",
  build: "border-amber-200 bg-amber-50 text-amber-800",
  live: "border-emerald-200 bg-emerald-50 text-emerald-800",
  strike: "border-violet-200 bg-violet-50 text-violet-800",
  archived: "border-slate-200 bg-slate-100 text-slate-700",
};

const copy = {
  fa: {
    eyebrow: "تقویم عملیاتی سالانه",
    title: "نمایشگاه‌ها و سالن‌ها",
    description: "رویداد را انتخاب کنید، بازه زمانی و سالن‌های آن را مدیریت کنید و سپس وارد عملیات شوید.",
    demo: "برنامه داخلی نمونه — تاریخ عمومی رویداد نیست",
    calendar: "تقویم سال",
    calendarSystem: "نوع تقویم",
    persianCalendar: "شمسی",
    gregorianCalendar: "میلادی",
    eventList: "فهرست نمایشگاه‌ها",
    all: "همه",
    active: "فعال",
    selected: "انتخاب شده",
    noEvents: "نمایشگاهی در این سال ثبت نشده است.",
    halls: "سالن",
    days: "روز",
    add: "افزودن نمایشگاه",
    addHint: "نام، زمان و تعداد سالن‌ها را در یک مرحله ثبت کنید.",
    name: "نام نمایشگاه",
    venue: "محل برگزاری",
    city: "شهر",
    start: "شروع",
    end: "پایان",
    hallCount: "تعداد سالن",
    create: "ساخت نمایشگاه",
    open: "ورود به عملیات",
    edit: "ویرایش مشخصات",
    save: "ذخیره تغییرات",
    cancel: "انصراف",
    archive: "بایگانی",
    restore: "بازگردانی به برنامه‌ریزی",
    remove: "حذف نمایشگاه",
    hallManagement: "مدیریت سالن‌ها",
    addHall: "افزودن سالن",
    editHall: "ویرایش سالن",
    hallName: "نام سالن",
    hallWidth: "عرض سالن",
    hallDepth: "عمق سالن",
    hallDimensionsHint: "چیدمان نسبی حفظ می‌شود و اندازه‌های متری غرفه‌ها با ابعاد جدید دوباره محاسبه می‌شوند.",
    saveHall: "ذخیره سالن",
    invalidHall: "نام و ابعاد معتبر وارد کنید. عرض و عمق باید بین ۱ تا ۵۰۰ متر باشند.",
    openHall: "باز کردن نقشه سالن",
    removeHall: "حذف سالن",
    required: "نام، محل، شهر و تاریخ‌ها الزامی هستند.",
    dateError: "تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.",
  },
  en: {
    eyebrow: "Annual operations calendar",
    title: "Exhibitions & halls",
    description: "Choose an event, manage its dates and halls, then enter the operational workspace.",
    demo: "Internal demo schedule — not a public event date",
    calendar: "Year calendar",
    calendarSystem: "Calendar system",
    persianCalendar: "Persian",
    gregorianCalendar: "Gregorian",
    eventList: "Exhibition list",
    all: "All",
    active: "Active",
    selected: "Selected",
    noEvents: "No exhibitions are scheduled in this year.",
    halls: "halls",
    days: "days",
    add: "Add exhibition",
    addHint: "Create the event, dates, and initial hall group in one step.",
    name: "Exhibition name",
    venue: "Venue",
    city: "City",
    start: "Start",
    end: "End",
    hallCount: "Hall count",
    create: "Create exhibition",
    open: "Open operations",
    edit: "Edit details",
    save: "Save changes",
    cancel: "Cancel",
    archive: "Archive",
    restore: "Restore to planning",
    remove: "Remove exhibition",
    hallManagement: "Hall management",
    addHall: "Add hall",
    editHall: "Edit hall",
    hallName: "Hall name",
    hallWidth: "Hall width",
    hallDepth: "Hall depth",
    hallDimensionsHint: "The relative layout is preserved and booth metric sizes are recalculated against the new hall dimensions.",
    saveHall: "Save hall",
    invalidHall: "Enter a name and valid dimensions between 1 and 500 metres.",
    openHall: "Open hall plan",
    removeHall: "Remove hall",
    required: "Name, venue, city, and dates are required.",
    dateError: "The end date cannot be before the start date.",
  },
} as const;

const inputClass =
  "h-11 w-full rounded-xl border border-[#14392f]/14 bg-[#fbfcf9] px-3 text-sm font-semibold text-[#17342c] outline-none focus:border-[#b78936]/60 focus:ring-2 focus:ring-[#b78936]/15";

function localize(value: { fa: string; en: string }, locale: PortalLocale) {
  return value[locale] || value.en || value.fa;
}

function formatCount(value: number, locale: PortalLocale) {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-GB").format(value);
}

function hallMap(state: PortalState) {
  return new Map(state.halls.map((hall) => [hall.id, hall]));
}

export function ExhibitionWorkspace({
  locale,
  state,
  onSelectExhibition,
  onOpenOperations,
  onAddExhibition,
  onUpdateExhibition,
  onRemoveExhibition,
  onAddHall,
  onUpdateHall,
  onRemoveHall,
}: ExhibitionWorkspaceProps) {
  const strings = copy[locale];
  const active =
    state.exhibitions.find((item) => item.id === state.activeExhibitionId) ?? state.exhibitions[0];
  const [calendarSystem, setCalendarSystem] = useState<StaffCalendarSystem>(() =>
    locale === "fa" ? "persian" : "gregorian",
  );
  const [year, setYear] = useState(() =>
    active
      ? getStaffCalendarYear(active.startDate, locale === "fa" ? "persian" : "gregorian")
      : new Date().getUTCFullYear(),
  );
  const [statusFilter, setStatusFilter] = useState<"all" | ExhibitionStatus>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingHallId, setEditingHallId] = useState<string | null>(null);
  const [hallError, setHallError] = useState("");
  const [hallDraft, setHallDraft] = useState({ name: "", width: "", depth: "" });
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    venue: "",
    city: "",
    startDate: `${year}-01-01`,
    endDate: `${year}-01-03`,
    hallCount: "1",
  });
  const [editDraft, setEditDraft] = useState(() => ({
    name: active ? localize(active.name, locale) : "",
    venue: active ? localize(active.venue, locale) : "",
    city: active ? localize(active.city, locale) : "",
    startDate: active?.startDate ?? "",
    endDate: active?.endDate ?? "",
  }));

  const hallsById = useMemo(() => hallMap(state), [state]);
  const yearExhibitions = useMemo(
    () =>
      state.exhibitions.filter((exhibition) => {
        const overlaps = staffCalendarYearOverlaps(
          exhibition.startDate,
          exhibition.endDate,
          year,
          calendarSystem,
        );
        return overlaps && (statusFilter === "all" || exhibition.status === statusFilter);
      }),
    [calendarSystem, state.exhibitions, statusFilter, year],
  );
  const activeHalls = active?.hallIds.map((id) => hallsById.get(id)).filter(Boolean) as Hall[] | undefined;
  const activeDays = active
    ? Math.max(
        1,
        Math.round(
          (new Date(`${active.endDate}T12:00:00.000Z`).getTime() -
            new Date(`${active.startDate}T12:00:00.000Z`).getTime()) /
            86_400_000,
        ) + 1,
      )
    : 0;

  function choose(exhibition: Exhibition) {
    onSelectExhibition(exhibition.id);
    setYear(getStaffCalendarYear(exhibition.startDate, calendarSystem));
    setEditing(false);
    setEditingHallId(null);
    setEditDraft({
      name: localize(exhibition.name, locale),
      venue: localize(exhibition.venue, locale),
      city: localize(exhibition.city, locale),
      startDate: exhibition.startDate,
      endDate: exhibition.endDate,
    });
  }

  function submitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const hallCount = Number(draft.hallCount);
    if (!draft.name.trim() || !draft.venue.trim() || !draft.city.trim() || !draft.startDate || !draft.endDate) {
      setError(strings.required);
      return;
    }
    if (draft.endDate < draft.startDate) {
      setError(strings.dateError);
      return;
    }
    onAddExhibition({
      name: draft.name.trim(),
      venue: draft.venue.trim(),
      city: draft.city.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      hallCount: Number.isInteger(hallCount) ? Math.min(12, Math.max(1, hallCount)) : 1,
    });
    setShowAdd(false);
    setDraft((current) => ({ ...current, name: "", venue: "", city: "", hallCount: "1" }));
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    setError("");
    if (!editDraft.name.trim() || !editDraft.venue.trim() || !editDraft.city.trim()) {
      setError(strings.required);
      return;
    }
    if (editDraft.endDate < editDraft.startDate) {
      setError(strings.dateError);
      return;
    }
    const merge = (previous: { fa: string; en: string }, value: string) => ({
      ...previous,
      [locale]: value.trim(),
    });
    onUpdateExhibition(active.id, {
      name: merge(active.name, editDraft.name),
      venue: merge(active.venue, editDraft.venue),
      city: merge(active.city, editDraft.city),
      startDate: editDraft.startDate,
      endDate: editDraft.endDate,
    });
    setEditing(false);
  }

  function startHallEdit(hall: Hall) {
    setHallError("");
    setEditingHallId(hall.id);
    setHallDraft({
      name: localize(hall.name, locale),
      width: String(hall.physicalWidth),
      depth: String(hall.physicalHeight),
    });
  }

  function submitHallEdit(event: FormEvent<HTMLFormElement>, hall: Hall) {
    event.preventDefault();
    if (!active) return;
    const physicalWidth = Number(hallDraft.width);
    const physicalHeight = Number(hallDraft.depth);
    if (
      !hallDraft.name.trim() ||
      !Number.isFinite(physicalWidth) ||
      !Number.isFinite(physicalHeight) ||
      physicalWidth < 1 ||
      physicalHeight < 1 ||
      physicalWidth > 500 ||
      physicalHeight > 500
    ) {
      setHallError(strings.invalidHall);
      return;
    }
    onUpdateHall(active.id, hall.id, {
      name: { ...hall.name, [locale]: hallDraft.name.trim() },
      physicalWidth,
      physicalHeight,
    });
    setEditingHallId(null);
    setHallError("");
  }

  const PreviousIcon = locale === "fa" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "fa" ? ChevronLeft : ChevronRight;

  function selectCalendarSystem(nextSystem: StaffCalendarSystem) {
    setCalendarSystem(nextSystem);
    if (active) setYear(getStaffCalendarYear(active.startDate, nextSystem));
  }

  return (
    <section className="grid gap-4" aria-labelledby="exhibition-workspace-title">
      <header className="rounded-3xl border border-[#14392f]/10 bg-white/92 p-4 shadow-[0_16px_48px_rgba(19,49,41,0.07)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#9a742c]">{strings.eyebrow}</p>
            <h2 id="exhibition-workspace-title" className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#17342c] sm:text-3xl">{strings.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61716b]">{strings.description}</p>
            <span className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.65rem] font-black text-amber-800">{strings.demo}</span>
          </div>
          <button type="button" onClick={() => { setShowAdd((value) => !value); setError(""); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173f34] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0f3229] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b78936]">
            {showAdd ? <X size={17} aria-hidden /> : <CirclePlus size={17} aria-hidden />}
            {showAdd ? strings.cancel : strings.add}
          </button>
        </div>
      </header>

      {showAdd ? (
        <form onSubmit={submitNew} className="rounded-3xl border border-[#b78936]/25 bg-[#fffdf7] p-4 shadow-[0_12px_36px_rgba(19,49,41,0.06)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#f5ead4] text-[#8b6827]"><Plus size={19} /></span>
            <div><h3 className="text-sm font-black text-[#17342c]">{strings.add}</h3><p className="mt-0.5 text-xs text-[#71807b]">{strings.addHint}</p></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label={strings.name}><input required value={draft.name} className={inputClass} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label={strings.venue}><input required value={draft.venue} className={inputClass} onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))} /></Field>
            <Field label={strings.city}><input required value={draft.city} className={inputClass} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} /></Field>
            <Field label={strings.hallCount}><input type="number" inputMode="numeric" min={1} max={12} value={draft.hallCount} className={inputClass} onChange={(event) => setDraft((current) => ({ ...current, hallCount: event.target.value }))} /></Field>
            <Field label={strings.start}><input type="date" required value={draft.startDate} className={inputClass} dir="ltr" onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} /></Field>
            <Field label={strings.end}><input type="date" required min={draft.startDate} value={draft.endDate} className={inputClass} dir="ltr" onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} /></Field>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><p role="alert" className="text-xs font-bold text-red-700">{error}</p><button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173f34] px-5 text-sm font-black text-white"><Plus size={17} />{strings.create}</button></div>
        </form>
      ) : null}

      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.75fr)]">
        <section className="min-w-0 rounded-3xl border border-[#14392f]/10 bg-white/92 p-4 shadow-[0_12px_36px_rgba(19,49,41,0.055)] sm:p-5" aria-labelledby="year-calendar-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#eaf2ee] text-[#31584c]"><CalendarDays size={20} /></span><div><h3 id="year-calendar-title" className="text-sm font-black text-[#17342c]">{strings.calendar}</h3><p className="mt-0.5 text-xs text-[#71807b]">{formatCount(yearExhibitions.length, locale)} {strings.halls === "سالن" ? "نمایشگاه" : "exhibitions"}</p></div></div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex min-h-11 items-center rounded-xl border border-[#14392f]/12 bg-[#f8faf7] p-1" role="group" aria-label={strings.calendarSystem}>
                {(["persian", "gregorian"] as const).map((system) => (
                  <button
                    key={system}
                    type="button"
                    onClick={() => selectCalendarSystem(system)}
                    aria-pressed={calendarSystem === system}
                    className={`min-h-9 rounded-lg px-3 text-xs font-black transition ${calendarSystem === system ? "bg-[#173f34] text-white shadow-sm" : "text-[#526760] hover:bg-white"}`}
                  >
                    {system === "persian" ? strings.persianCalendar : strings.gregorianCalendar}
                  </button>
                ))}
              </div>
              <div className="inline-flex min-h-11 items-center overflow-hidden rounded-xl border border-[#14392f]/12 bg-[#f8faf7]">
                <button type="button" onClick={() => setYear((value) => value - 1)} className="grid min-h-11 min-w-11 place-items-center text-[#31584c] hover:bg-white" aria-label={locale === "fa" ? "سال قبل" : "Previous year"}><PreviousIcon size={18} /></button>
                <span className="min-w-20 px-3 text-center text-sm font-black tabular-nums text-[#17342c]">{formatCount(year, locale)}</span>
                <button type="button" onClick={() => setYear((value) => value + 1)} className="grid min-h-11 min-w-11 place-items-center text-[#31584c] hover:bg-white" aria-label={locale === "fa" ? "سال بعد" : "Next year"}><NextIcon size={18} /></button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {(["all", "planning", "build", "live", "strike", "archived"] as const).map((status) => (
              <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`min-h-10 shrink-0 rounded-xl border px-3 text-xs font-black transition ${statusFilter === status ? "border-[#31584c] bg-[#173f34] text-white" : "border-[#14392f]/10 bg-[#f8faf7] text-[#526760] hover:bg-white"}`}>{status === "all" ? strings.all : localize(statusLabels[status], locale)}</button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, month) => {
              const monthEvents = yearExhibitions.filter((item) =>
                staffCalendarMonthOverlaps(item.startDate, item.endDate, year, month, calendarSystem),
              );
              const monthLabel = getStaffCalendarMonthName(month, calendarSystem, locale);
              return <article key={`${calendarSystem}-${month}`} className={`min-h-36 rounded-2xl border p-3 ${monthEvents.length ? "border-[#14392f]/12 bg-[#fbfcf9]" : "border-[#14392f]/7 bg-[#f8f9f6]/70"}`}><div className="flex items-center justify-between"><h4 className="text-xs font-black text-[#405b53]">{monthLabel}</h4><span className="text-[0.62rem] font-black tabular-nums text-[#9a742c]">{formatCount(month + 1, locale)}</span></div><div className="mt-3 grid gap-2">{monthEvents.map((item) => <button key={item.id} type="button" onClick={() => choose(item)} className={`group min-h-11 rounded-xl border p-2 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b78936] ${item.id === active?.id ? "border-[#b78936]/50 bg-[#fff6e3]" : "border-[#14392f]/9 bg-white hover:border-[#198ba0]/35"}`}><span className="flex items-start gap-2"><span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="min-w-0"><span className="block truncate text-[0.68rem] font-black text-[#17342c]">{localize(item.name, locale)}</span><span className="mt-0.5 block text-[0.6rem] font-bold text-[#71807b]">{formatStaffCalendarDate(item.startDate, calendarSystem, locale)}</span></span></span></button>)}</div></article>;
            })}
          </div>
          {yearExhibitions.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-[#14392f]/14 bg-[#f8faf7] px-4 py-8 text-center text-sm font-bold text-[#71807b]">{strings.noEvents}</p> : null}
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-3xl border border-[#14392f]/10 bg-white/92 p-4 shadow-[0_12px_36px_rgba(19,49,41,0.055)] sm:p-5" aria-labelledby="exhibition-list-title">
            <h3 id="exhibition-list-title" className="text-sm font-black text-[#17342c]">{strings.eventList}</h3>
            <div className="mt-3 grid gap-2">
              {state.exhibitions.map((item) => <button key={item.id} type="button" onClick={() => choose(item)} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-start transition ${item.id === active?.id ? "border-[#b78936]/45 bg-[#fff8e9] shadow-sm" : "border-[#14392f]/9 bg-[#fbfcf9] hover:border-[#198ba0]/30"}`}><span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black text-[#17342c]">{localize(item.name, locale)}</span><span className="mt-1 block truncate text-[0.65rem] font-bold text-[#71807b]">{formatStaffCalendarDate(item.startDate, calendarSystem, locale)} · {formatCount(item.hallIds.length, locale)} {strings.halls}</span></span><span className={`shrink-0 rounded-full border px-2 py-1 text-[0.58rem] font-black ${statusTone[item.status]}`}>{localize(statusLabels[item.status], locale)}</span></button>)}
            </div>
          </section>

          {active ? (
            <section className="rounded-3xl border border-[#14392f]/10 bg-white/92 p-4 shadow-[0_12px_36px_rgba(19,49,41,0.055)] sm:p-5">
              {!editing ? <><div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl text-white" style={{ backgroundColor: active.color }}><Building2 size={21} /></span><div className="min-w-0 flex-1"><span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#9a742c]">{strings.selected}</span><h3 className="mt-1 text-base font-black leading-6 text-[#17342c]">{localize(active.name, locale)}</h3><p className="mt-1 text-xs font-bold text-[#61716b]">{localize(active.venue, locale)} · {localize(active.city, locale)}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2">{[[strings.halls, active.hallIds.length], [strings.days, activeDays], [strings.active, active.status === "archived" ? 0 : 1]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#14392f]/8 bg-[#f8faf7] p-2 text-center"><p className="text-[0.6rem] font-bold text-[#71807b]">{label}</p><p className="mt-1 text-lg font-black tabular-nums text-[#17342c]">{formatCount(Number(value), locale)}</p></div>)}</div><p className="mt-3 rounded-xl border border-[#14392f]/8 bg-[#fbfcf9] px-3 py-2 text-xs leading-5 text-[#61716b]">{formatStaffCalendarDate(active.startDate, calendarSystem, locale)} — {formatStaffCalendarDate(active.endDate, calendarSystem, locale)}<br />{localize(active.notes, locale)}</p><button type="button" onClick={() => onOpenOperations(active.id)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173f34] px-4 text-sm font-black text-white hover:bg-[#0f3229]"><ExternalLink size={17} />{strings.open}</button><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setError(""); setEditing(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#14392f]/12 bg-white text-xs font-black text-[#31584c]"><Pencil size={15} />{strings.edit}</button><button type="button" onClick={() => onUpdateExhibition(active.id, { status: active.status === "archived" ? "planning" : "archived" })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#14392f]/12 bg-white text-xs font-black text-[#526760]">{active.status === "archived" ? <ArchiveRestore size={15} /> : <Archive size={15} />}{active.status === "archived" ? strings.restore : strings.archive}</button></div><button type="button" onClick={() => onRemoveExhibition(active.id)} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-xs font-black text-red-700"><Trash2 size={15} />{strings.remove}</button></> : <form onSubmit={submitEdit} className="grid gap-3"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-[#17342c]">{strings.edit}</h3><button type="button" onClick={() => setEditing(false)} className="grid size-11 place-items-center rounded-xl border border-[#14392f]/10 text-[#61716b]" aria-label={strings.cancel}><X size={17} /></button></div><Field label={strings.name}><input value={editDraft.name} className={inputClass} onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))} /></Field><Field label={strings.venue}><input value={editDraft.venue} className={inputClass} onChange={(event) => setEditDraft((current) => ({ ...current, venue: event.target.value }))} /></Field><Field label={strings.city}><input value={editDraft.city} className={inputClass} onChange={(event) => setEditDraft((current) => ({ ...current, city: event.target.value }))} /></Field><div className="grid grid-cols-2 gap-2"><Field label={strings.start}><input type="date" value={editDraft.startDate} className={inputClass} dir="ltr" onChange={(event) => setEditDraft((current) => ({ ...current, startDate: event.target.value }))} /></Field><Field label={strings.end}><input type="date" min={editDraft.startDate} value={editDraft.endDate} className={inputClass} dir="ltr" onChange={(event) => setEditDraft((current) => ({ ...current, endDate: event.target.value }))} /></Field></div><p role="alert" className="text-xs font-bold text-red-700">{error}</p><button type="submit" className="min-h-11 rounded-xl bg-[#173f34] px-4 text-sm font-black text-white">{strings.save}</button></form>}
            </section>
          ) : null}
        </aside>
      </div>

      {active ? (
        <section className="rounded-3xl border border-[#14392f]/10 bg-white/92 p-4 shadow-[0_12px_36px_rgba(19,49,41,0.055)] sm:p-5" aria-labelledby="hall-management-title">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="hall-management-title" className="text-sm font-black text-[#17342c]">{strings.hallManagement}</h3><p className="mt-1 text-xs text-[#71807b]">{formatCount(activeHalls?.length ?? 0, locale)} {strings.halls} · {localize(active.name, locale)}</p></div><button type="button" onClick={() => onAddHall(active.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#14392f]/12 bg-[#f8faf7] px-4 text-xs font-black text-[#31584c]"><Plus size={16} />{strings.addHall}</button></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {activeHalls?.map((hall, index) => {
              const isEditingHall = editingHallId === hall.id;
              return (
                <article key={hall.id} className={`rounded-2xl border p-3 transition ${isEditingHall ? "border-[#b78936]/35 bg-[#fffdf7] shadow-sm" : "border-[#14392f]/10 bg-[#fbfcf9]"}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eaf2ee] text-[#31584c]"><MapIcon size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#17342c]">{localize(hall.name, locale)}</p>
                      <p className="mt-1 text-[0.65rem] font-bold text-[#71807b]">{hall.physicalWidth} × {hall.physicalHeight} {hall.unit} · {formatCount(hall.booths.length, locale)} {locale === "fa" ? "غرفه" : "booths"}</p>
                    </div>
                    <span className="text-xs font-black text-[#9a742c]">{formatCount(index + 1, locale)}</span>
                  </div>

                  {isEditingHall ? (
                    <form onSubmit={(event) => submitHallEdit(event, hall)} className="mt-3 grid gap-3 border-t border-[#b78936]/15 pt-3">
                      <Field label={strings.hallName}>
                        <input autoFocus value={hallDraft.name} className={inputClass} onChange={(event) => setHallDraft((current) => ({ ...current, name: event.target.value }))} />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={strings.hallWidth}>
                          <input type="number" inputMode="decimal" min={1} max={500} step="0.5" value={hallDraft.width} className={inputClass} dir="ltr" onChange={(event) => setHallDraft((current) => ({ ...current, width: event.target.value }))} />
                        </Field>
                        <Field label={strings.hallDepth}>
                          <input type="number" inputMode="decimal" min={1} max={500} step="0.5" value={hallDraft.depth} className={inputClass} dir="ltr" onChange={(event) => setHallDraft((current) => ({ ...current, depth: event.target.value }))} />
                        </Field>
                      </div>
                      <p className="text-[0.65rem] leading-5 text-[#71807b]">{strings.hallDimensionsHint}</p>
                      {hallError ? <p role="alert" className="text-[0.68rem] font-bold leading-5 text-red-700">{hallError}</p> : null}
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { setEditingHallId(null); setHallError(""); }} className="min-h-11 rounded-xl border border-[#14392f]/12 bg-white text-xs font-black text-[#526760]">{strings.cancel}</button>
                        <button type="submit" className="min-h-11 rounded-xl bg-[#173f34] px-3 text-xs font-black text-white">{strings.saveHall}</button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                      <button type="button" onClick={() => onOpenOperations(active.id, hall.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173f34] px-3 text-xs font-black text-white"><ExternalLink size={15} />{strings.openHall}</button>
                      <button type="button" onClick={() => startHallEdit(hall)} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[#14392f]/12 bg-white text-[#31584c]" aria-label={`${strings.editHall}: ${localize(hall.name, locale)}`} title={strings.editHall}><Pencil size={16} /></button>
                      <button type="button" onClick={() => onRemoveHall(active.id, hall.id)} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-700" aria-label={`${strings.removeHall}: ${localize(hall.name, locale)}`} title={strings.removeHall}><Trash2 size={16} /></button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-[0.68rem] font-black text-[#526760]"><span>{label}</span>{children}</label>;
}
