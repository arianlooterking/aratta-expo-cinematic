"use client";

import { Archive, ArchiveRestore, CalendarRange, Coins, Info, Save, Settings2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Constants } from "@/lib/platform/database.types";
import { date, num, pick } from "@/lib/portal/format";
import { exhibitionStatusLabel } from "@/lib/portal/i18n";
import { TEAM_COLORS } from "@/lib/portal/team";
import type { Exhibition, ExhibitionStatus } from "@/lib/portal/types";
import { PageHeader } from "../crm/shared";
import { useExhibition } from "../ExhibitionProvider";
import { DatePicker } from "../DatePicker";
import { MoneyInput } from "../fields";
import { usePortal } from "../PortalProvider";
import { History } from "../team/History";
import { Button, Card, Empty, Field, Input, Select, Skeleton, Textarea } from "../ui";

/** The current exhibition's name, dates, venue, prices and status. */
export function ExhibitionSettings() {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  const x = useExhibition();
  if (!x.ready) return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6"><Skeleton className="h-96" /></div>;
  if (!x.exhibition) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Card>
          <Empty icon={<Settings2 className="size-6" />} title={fa ? "نمایشگاهی انتخاب نشده" : "No exhibition selected"} hint={fa ? "از بالای صفحه یک نمایشگاه بسازید یا انتخاب کنید." : "Create or pick an exhibition from the top bar."} />
        </Card>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        eyebrow={fa ? "تنظیمات" : "Settings"}
        title={pick(lang, x.exhibition.name_fa, x.exhibition.name_en)}
        hint={fa ? "نام، تاریخ ها، محل برگزاری، نرخ ها و وضعیت نمایشگاه. هر تغییر در تاریخچه ثبت می شود." : "Name, dates, venue, prices and status. Every change is kept in the history."}
      />
      <SettingsForm key={`${x.exhibition.id}:${x.exhibition.updated_at}`} exhibition={x.exhibition} editable={can.manage} />
      {can.manage ? (
        <div>
          <h2 className="mb-2 text-[15px] font-semibold">{fa ? "تاریخچه تغییرات این نمایشگاه" : "Changes to this exhibition"}</h2>
          <History tables={["exhibitions"]} rowId={x.exhibition.id} compact version={x.exhibition.updated_at} />
        </div>
      ) : null}
    </div>
  );
}

function SettingsForm({ exhibition: e, editable }: { exhibition: Exhibition; editable: boolean }) {
  const { lang, store, toast } = usePortal();
  const fa = lang === "fa";
  const [status, setStatus] = useState<ExhibitionStatus>(e.status);
  const [color, setColor] = useState(e.color);
  const [spaceRate, setSpaceRate] = useState<number | null>(e.space_rate);
  const [buildRate, setBuildRate] = useState<number | null>(e.booth_build_rate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = TEAM_COLORS.includes(e.color) ? TEAM_COLORS : [e.color, ...TEAM_COLORS];

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!editable) return;
        const form = new FormData(event.currentTarget);
        const text = (k: string) => String(form.get(k) ?? "").trim();
        const day = (k: string) => text(k) || null;
        const nameFa = text("name_fa");
        if (!nameFa) return;
        const starts = day("starts_on");
        const ends = day("ends_on");
        const build = day("build_starts_on");
        const strike = day("strike_ends_on");
        if (starts && ends && ends < starts) return setError(fa ? "تاریخ پایان پیش از افتتاح است." : "The closing date is before the opening.");
        if (build && starts && build > starts) return setError(fa ? "غرفه سازی باید پیش از افتتاح شروع شود." : "Build-up must start before opening.");
        if (strike && ends && strike < ends) return setError(fa ? "پایان جمع آوری باید بعد از پایان نمایشگاه باشد." : "Strike must end after the exhibition closes.");
        const vat = Number(text("vat_rate").replace(/[^\d.]/g, ""));
        if (!Number.isFinite(vat) || vat < 0 || vat > 100) return setError(fa ? "نرخ مالیات بین ۰ تا ۱۰۰ باشد." : "VAT must be between 0 and 100.");
        const edition = text("edition") ? Number(text("edition").replace(/[^\d]/g, "")) || null : null;
        setError(null);
        setBusy(true);
        const res = await store.update("exhibitions", e.id, {
          name_fa: nameFa,
          name_en: text("name_en") || null,
          edition,
          year_label: text("year_label") || null,
          venue_fa: text("venue_fa") || null,
          venue_en: text("venue_en") || null,
          city_fa: text("city_fa") || null,
          city_en: text("city_en") || null,
          build_starts_on: build,
          starts_on: starts,
          ends_on: ends,
          strike_ends_on: strike,
          status,
          color,
          currency: text("currency") as Exhibition["currency"],
          vat_rate: Math.round(vat * 100) / 10000,
          space_rate: spaceRate,
          booth_build_rate: buildRate,
          notes: text("notes") || null,
        });
        setBusy(false);
        if (res.ok) toast(fa ? "تنظیمات ذخیره شد" : "Settings saved");
      }}
    >
      {!editable ? (
        <Card className="flex items-center gap-2 p-3 text-sm text-p-ink-3">
          <Info className="size-4 shrink-0" />
          {fa ? "فقط مدیر و بالاتر این تنظیمات را تغییر می دهد." : "Only managers and above can change these settings."}
        </Card>
      ) : null}
      <fieldset disabled={!editable} className="space-y-5">
        <Card className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Settings2 className="size-4 text-p-brand" />
            {fa ? "نام و محل" : "Name and place"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "نام فارسی" : "Name (Persian)"}>
              <Input name="name_fa" defaultValue={e.name_fa} required dir="rtl" />
            </Field>
            <Field label={fa ? "نام انگلیسی" : "Name (English)"}>
              <Input name="name_en" defaultValue={e.name_en ?? ""} dir="ltr" />
            </Field>
            <Field label={fa ? "دوره" : "Edition"} hint={fa ? "مثلا ۱۰ برای دهمین دوره" : "For example 10 for the 10th"}>
              <Input name="edition" defaultValue={e.edition ?? ""} inputMode="numeric" dir="ltr" />
            </Field>
            <Field label={fa ? "سال" : "Year"} hint={fa ? "مثلا ۱۴۰۵" : "For example 1405"}>
              <Input name="year_label" defaultValue={e.year_label ?? ""} />
            </Field>
            <Field label={fa ? "محل برگزاری" : "Venue (Persian)"}>
              <Input name="venue_fa" defaultValue={e.venue_fa ?? ""} dir="rtl" />
            </Field>
            <Field label={fa ? "محل برگزاری (انگلیسی)" : "Venue (English)"}>
              <Input name="venue_en" defaultValue={e.venue_en ?? ""} dir="ltr" />
            </Field>
            <Field label={fa ? "شهر" : "City (Persian)"}>
              <Input name="city_fa" defaultValue={e.city_fa ?? ""} dir="rtl" />
            </Field>
            <Field label={fa ? "شهر (انگلیسی)" : "City (English)"}>
              <Input name="city_en" defaultValue={e.city_en ?? ""} dir="ltr" />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarRange className="size-4 text-p-brand" />
            {fa ? "تاریخ ها و وضعیت" : "Dates and status"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={fa ? "شروع غرفه سازی" : "Build-up starts"}>
              <DatePicker name="build_starts_on" defaultValue={e.build_starts_on ?? null} />
            </Field>
            <Field label={fa ? "افتتاح" : "Opens"}>
              <DatePicker name="starts_on" defaultValue={e.starts_on ?? null} />
            </Field>
            <Field label={fa ? "پایان" : "Closes"}>
              <DatePicker name="ends_on" defaultValue={e.ends_on ?? null} />
            </Field>
            <Field label={fa ? "پایان جمع آوری" : "Strike ends"}>
              <DatePicker name="strike_ends_on" defaultValue={e.strike_ends_on ?? null} />
            </Field>
          </div>
          {e.starts_on ? <p className="text-xs text-p-ink-3">{fa ? `افتتاح: ${date(lang, e.starts_on, "long")}` : `Opens ${date(lang, e.starts_on, "long")}`}</p> : null}
          <Field label={fa ? "مرحله" : "Stage"}>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {Constants.public.Enums.exhibition_status.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50",
                    status === s ? "border-p-brand bg-p-brand-soft text-p-brand" : "border-p-line text-p-ink-2 hover:border-p-line-strong",
                  )}
                >
                  {exhibitionStatusLabel[s][lang]}
                </button>
              ))}
            </div>
          </Field>
          <Field label={fa ? "رنگ روی نقشه و فهرست ها" : "Colour on lists and the map"}>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn("size-8 rounded-full transition", color === c ? "ring-2 ring-p-ink ring-offset-2 ring-offset-p-surface" : "hover:scale-110")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Coins className="size-4 text-p-brand" />
            {fa ? "نرخ ها و مالیات" : "Prices and tax"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={fa ? "واحد پول" : "Currency"}>
              <Select name="currency" defaultValue={e.currency}>
                <option value="IRR">{fa ? "ریال" : "Rial (IRR)"}</option>
                <option value="IRT">{fa ? "تومان" : "Toman"}</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="AED">AED</option>
              </Select>
            </Field>
            <Field label={fa ? "نرخ مالیات بر ارزش افزوده (٪)" : "VAT (%)"}>
              <Input name="vat_rate" defaultValue={String(Math.round(e.vat_rate * 1000) / 10)} inputMode="decimal" dir="ltr" />
            </Field>
            <Field label={fa ? "نرخ هر متر فضا" : "Space rate per m²"}>
              <MoneyInput value={spaceRate} onChange={setSpaceRate} />
            </Field>
            <Field label={fa ? "نرخ هر متر غرفه سازی" : "Booth build per m²"}>
              <MoneyInput value={buildRate} onChange={setBuildRate} />
            </Field>
          </div>
          <p className="text-xs text-p-ink-3">
            {fa
              ? `نرخ ها پیش فرض پیش فاکتورهای تازه اند. پیش فاکتورهای ثبت شده عوض نمی شوند.${spaceRate ? ` مثلا غرفه ۱۲ متری: ${num(lang, spaceRate * 12)}` : ""}`
              : `Rates are the defaults for new proformas; saved ones don't change.${spaceRate ? ` A 12 m² booth: ${num(lang, spaceRate * 12)}` : ""}`}
          </p>
          <Field label={fa ? "یادداشت داخلی" : "Internal notes"}>
            <Textarea name="notes" defaultValue={e.notes ?? ""} rows={3} />
          </Field>
        </Card>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-p-danger">
          {error}
        </p>
      ) : null}

      {editable ? (
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-p-line bg-p-surface/95 p-3 shadow-[var(--p-shadow-lg)] backdrop-blur lg:bottom-4">
          <Button
            tone="ghost"
            icon={e.status === "archived" ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            onClick={async () => {
              const res = await store.update("exhibitions", e.id, { status: e.status === "archived" ? "closed" : "archived" });
              if (res.ok) toast(e.status === "archived" ? (fa ? "از بایگانی خارج شد" : "Back from the archive") : fa ? "نمایشگاه بایگانی شد" : "Exhibition archived");
            }}
          >
            {e.status === "archived" ? (fa ? "خروج از بایگانی" : "Unarchive") : fa ? "بایگانی نمایشگاه" : "Archive exhibition"}
          </Button>
          <Button tone="primary" type="submit" disabled={busy} icon={<Save className="size-4" />}>
            {fa ? "ذخیره تنظیمات" : "Save settings"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
