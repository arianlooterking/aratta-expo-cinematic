"use client";

import { ChevronDown, FileText, ImageUp, Loader2, Minus, Plus, RotateCcw, ScanSearch, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { num } from "@/lib/portal/format";
import { newId } from "@/lib/portal/store";
import type { Currency } from "@/lib/portal/types";
import {
  blankHall,
  isVenueMimeType,
  MAX_HALLS,
  MAX_VENUE_FILE_BYTES,
  resolvedSize,
  type HallBox,
  type HallDraft,
  type VenueReading,
} from "@/lib/portal/venue-reading";
import { DatePicker } from "./DatePicker";
import { useExhibition } from "./ExhibitionProvider";
import { MoneyInput, parseDigits } from "./fields";
import { usePortal } from "./PortalProvider";
import { Button, Field, IconButton, Input, Select, Sheet, Textarea } from "./ui";

const COLORS = ["#c8a25a", "#2f9e8f", "#3b82c4", "#8b5cf6", "#d9654b", "#4d7c3a"];

function slugify(text: string) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "exhibition"}-${Math.random().toString(36).slice(2, 6)}`;
}

export function NewExhibitionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} wide title={fa ? "نمایشگاه جدید" : "New exhibition"} closeLabel={fa ? "بستن" : "Close"}>
      {open ? <NewExhibitionForm onClose={onClose} /> : null}
    </Sheet>
  );
}

type Reader =
  | { state: "checking" }
  | { state: "off"; code: string }
  | { state: "ready" }
  | { state: "reading" }
  | { state: "done"; reading: VenueReading }
  | { state: "failed"; code: string };

type Plan = { file: File; preview: string | null; aspect: number | null };

function NewExhibitionForm({ onClose }: { onClose: () => void }) {
  const { lang, store, toast } = usePortal();
  const { selectExhibition } = useExhibition();
  const fa = lang === "fa";
  const [busy, setBusy] = useState(false);
  const [dates, setDates] = useState<Record<"build" | "opens" | "closes" | "strike", string | null>>({
    build: null,
    opens: null,
    closes: null,
    strike: null,
  });
  const [rate, setRate] = useState<number | null>(null);
  const [buildRate, setBuildRate] = useState<number | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [halls, setHalls] = useState<HallDraft[]>([]);
  const [reader, setReader] = useState<Reader>({ state: "checking" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/staff/venue-halls", { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { available?: boolean; code?: string }) => {
        if (alive) setReader(body.available ? { state: "ready" } : { state: "off", code: body.code ?? "NOT_CONFIGURED" });
      })
      .catch(() => alive && setReader({ state: "off", code: "OFFLINE" }));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => void (plan?.preview && URL.revokeObjectURL(plan.preview)), [plan]);

  async function readPlan(file: File) {
    setReader({ state: "reading" });
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/staff/venue-halls", { method: "POST", body });
      const json = (await res.json()) as VenueReading & { code?: string };
      if (!res.ok) {
        setReader({ state: "failed", code: json.code ?? "FAILED" });
        return;
      }
      setReader({ state: "done", reading: json });
      // Keep halls staff already typed; replace only earlier readings.
      setHalls((current) => [...current.filter((h) => h.source === "manual"), ...json.halls].slice(0, MAX_HALLS));
    } catch {
      setReader({ state: "failed", code: "OFFLINE" });
    }
  }

  async function pickPlan(file: File | null) {
    if (!file) return;
    if (!isVenueMimeType(file.type)) {
      toast(fa ? "فقط عکس (PNG، JPG، WebP) یا PDF" : "Use an image (PNG, JPG, WebP) or a PDF", "error");
      return;
    }
    if (file.size > MAX_VENUE_FILE_BYTES) {
      toast(fa ? "حجم فایل باید کمتر از ۱۰ مگابایت باشد" : "Use a file up to 10 MB", "error");
      return;
    }
    let preview: string | null = null;
    let aspect: number | null = null;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
      aspect = await imageAspect(preview);
    }
    setPlan({ file, preview, aspect });
    if (reader.state === "ready" || reader.state === "done" || reader.state === "failed") await readPlan(file);
  }

  function removePlan() {
    setPlan(null);
    setHalls((current) => current.filter((h) => h.source === "manual"));
    if (reader.state === "done" || reader.state === "failed") setReader({ state: "ready" });
  }

  function setCount(count: number) {
    setHalls((current) => {
      const next = [...current];
      while (next.length < count) next.push(blankHall(next.length, lang));
      // Shrinking only drops untouched blank rows from the end.
      while (next.length > count) {
        const last = next[next.length - 1];
        if (last.source === "read" || last.width_m || last.depth_m) break;
        next.pop();
      }
      return next;
    });
  }

  const patchHall = (key: string, patch: Partial<HallDraft>) =>
    setHalls((current) => current.map((h) => (h.key === key ? { ...h, ...patch } : h)));

  async function submit(form: HTMLFormElement) {
    setError(null);
    const f = new FormData(form);
    const nameFa = String(f.get("name_fa") ?? "").trim();
    if (!nameFa) return;
    if (dates.opens && dates.closes && dates.closes < dates.opens) {
      setError(fa ? "تاریخ پایان باید بعد از افتتاح باشد." : "The closing day must be after the opening day.");
      return;
    }
    const unnamed = halls.find((h) => !h.name_fa.trim());
    if (unnamed) {
      setError(fa ? "هر سالن یک نام لازم دارد." : "Every hall needs a name.");
      return;
    }
    setBusy(true);
    const id = newId();
    const nameEn = String(f.get("name_en") ?? "").trim() || null;
    const text = (key: string) => String(f.get(key) ?? "").trim() || null;
    const edition = Number(parseDigits(String(f.get("edition") ?? ""))) || null;

    let venuePlanPath: string | null = null;
    if (plan) {
      const upload = await store.uploadFile("hall-plans", `${id}/venue/${Date.now()}-${safeName(plan.file.name)}`, plan.file);
      if (upload.ok) venuePlanPath = upload.path;
      else toast(fa ? "فایل نقشه بارگذاری نشد؛ نمایشگاه بدون آن ساخته می‌شود." : "The map didn't upload; creating the exhibition without it.", "error");
    }

    const created = await store.insert("exhibitions", {
      id,
      slug: slugify(nameEn ?? ""),
      name_fa: nameFa,
      name_en: nameEn,
      edition,
      year_label: text("year_label"),
      venue_fa: text("venue_fa"),
      venue_en: text("venue_en"),
      city_fa: text("city_fa"),
      city_en: text("city_en"),
      build_starts_on: dates.build,
      starts_on: dates.opens,
      ends_on: dates.closes,
      strike_ends_on: dates.strike,
      currency: String(f.get("currency") ?? "IRR") as Currency,
      space_rate: rate,
      booth_build_rate: buildRate,
      color,
      notes: text("notes"),
      venue_plan_path: venuePlanPath,
      status: "selling",
    });
    if (!created.ok) {
      setBusy(false);
      setError(fa ? "نمایشگاه ساخته نشد. دوباره امتحان کنید." : "The exhibition wasn't created. Try again.");
      return;
    }

    let made = 0;
    for (const [index, hall] of halls.entries()) {
      const hallId = newId();
      let background: string | null = null;
      const box = hall.box ?? (halls.length === 1 ? { x: 0, y: 0, w: 1, h: 1 } : null);
      if (plan?.preview && box) {
        const crop = await cropImage(plan.preview, box);
        if (crop) {
          const up = await store.uploadFile("hall-plans", `${id}/${hallId}/${Date.now()}-hall.jpg`, crop);
          if (up.ok) background = up.path;
        }
      }
      const size = resolvedSize(hall, plan?.aspect ?? null);
      const res = await store.insert("halls", {
        id: hallId,
        exhibition_id: id,
        name_fa: hall.name_fa.trim(),
        name_en: hall.name_en.trim() || null,
        ...size,
        grid_m: 1,
        background_path: background,
        sort_order: index,
      });
      if (res.ok) made += 1;
    }

    setBusy(false);
    selectExhibition(id);
    toast(
      made
        ? fa
          ? `نمایشگاه با ${num(lang, made)} سالن ساخته شد. غرفه‌ها را روی نقشه بکشید.`
          : `Exhibition created with ${made} ${made === 1 ? "hall" : "halls"}. Draw the booths on the map.`
        : fa
          ? "نمایشگاه ساخته شد. حالا سالن‌ها را روی نقشه بسازید."
          : "Exhibition created. Now add its halls on the map.",
    );
    onClose();
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "نام فارسی" : "Name (Persian)"}>
          <Input name="name_fa" required dir="rtl" placeholder={fa ? "مثلاً دهمین نمایشگاه معدن کرمان" : undefined} />
        </Field>
        <Field label={fa ? "نام انگلیسی" : "Name (English)"}>
          <Input name="name_en" dir="ltr" placeholder="Kerman Mining Expo" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4">
        <Field label={fa ? "شروع غرفه‌سازی" : "Build-up starts"}>
          <DatePicker value={dates.build} onChange={(v) => setDates((d) => ({ ...d, build: v }))} placeholder={fa ? "انتخاب روز" : "Pick a day"} />
        </Field>
        <Field label={fa ? "افتتاح" : "Opens"}>
          <DatePicker value={dates.opens} onChange={(v) => setDates((d) => ({ ...d, opens: v }))} placeholder={fa ? "انتخاب روز" : "Pick a day"} />
        </Field>
        <Field label={fa ? "پایان" : "Closes"}>
          <DatePicker value={dates.closes} onChange={(v) => setDates((d) => ({ ...d, closes: v }))} placeholder={fa ? "انتخاب روز" : "Pick a day"} />
        </Field>
        <Field label={fa ? "پایان تخلیه" : "Strike ends"}>
          <DatePicker value={dates.strike} onChange={(v) => setDates((d) => ({ ...d, strike: v }))} placeholder={fa ? "اختیاری" : "Optional"} />
        </Field>
      </div>

      <section className="grid gap-3 rounded-2xl border border-p-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">{fa ? "سالن‌ها و نقشهٔ محل" : "Halls and venue map"}</h3>
            <p className="text-[13px] text-p-ink-3">
              {fa ? "اختیاری. یک سالن تا هر تعداد که نمایشگاه دارد." : "Optional. One hall or as many as the show has."}
            </p>
          </div>
          <HallCounter count={halls.length} onChange={setCount} />
        </div>

        <PlanDrop plan={plan} reader={reader} onPick={pickPlan} onRemove={removePlan} onRetry={() => plan && readPlan(plan.file)} />

        {halls.length ? (
          <ol className="grid gap-2">
            {halls.map((hall, i) => (
              <HallRow
                key={hall.key}
                index={i}
                hall={hall}
                onChange={(patch) => patchHall(hall.key, patch)}
                onRemove={() => setHalls((current) => current.filter((h) => h.key !== hall.key))}
              />
            ))}
          </ol>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            tone="quiet"
            icon={<Plus className="size-4" />}
            disabled={halls.length >= MAX_HALLS}
            onClick={() => setHalls((current) => [...current, blankHall(current.length, lang)])}
          >
            {fa ? "افزودن سالن" : "Add a hall"}
          </Button>
          {!halls.length ? (
            <span className="text-xs text-p-ink-3">
              {fa ? "می‌توانید خالی بگذارید و بعداً سالن‌ها را روی نقشه بسازید." : "You can leave this empty and add halls on the map later."}
            </span>
          ) : (
            <span className="text-xs text-p-ink-3">
              {fa ? "اندازهٔ خالی، بعداً در تنظیمات سالن قابل تغییر است (پیش‌فرض ۶۰ × ۳۶ متر)." : "Blank sizes can be set later in hall settings (60 × 36 m by default)."}
            </span>
          )}
        </div>
      </section>

      <details className="group rounded-2xl border border-p-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span>
            {fa ? "اطلاعات بیشتر" : "More details"}
            <span className="ms-2 text-xs font-normal text-p-ink-3">{fa ? "اختیاری: محل، دوره، نرخ‌ها، یادداشت" : "Optional: venue, edition, rates, notes"}</span>
          </span>
          <ChevronDown className="size-4 text-p-ink-3 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 border-t border-p-line px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "محل برگزاری" : "Venue (Persian)"}>
              <Input name="venue_fa" dir="rtl" placeholder={fa ? "محل دائمی نمایشگاه‌های بین‌المللی کرمان" : undefined} />
            </Field>
            <Field label={fa ? "محل برگزاری (انگلیسی)" : "Venue (English)"}>
              <Input name="venue_en" dir="ltr" placeholder="Kerman International Fairground" />
            </Field>
            <Field label={fa ? "شهر" : "City (Persian)"}>
              <Input name="city_fa" dir="rtl" defaultValue="کرمان" />
            </Field>
            <Field label={fa ? "شهر (انگلیسی)" : "City (English)"}>
              <Input name="city_en" dir="ltr" defaultValue="Kerman" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label={fa ? "دوره" : "Edition"} hint={fa ? "مثلاً ۱۰ برای دهمین" : "e.g. 10 for the 10th"}>
              <Input name="edition" inputMode="numeric" dir="ltr" />
            </Field>
            <Field label={fa ? "سال" : "Year label"}>
              <Input name="year_label" dir="ltr" placeholder="۱۴۰۵" />
            </Field>
            <Field label={fa ? "واحد پول" : "Currency"} className="col-span-2 sm:col-span-1">
              <Select name="currency" defaultValue="IRR">
                <option value="IRR">{fa ? "ریال" : "Rial (IRR)"}</option>
                <option value="IRT">{fa ? "تومان" : "Toman"}</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="AED">AED</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "نرخ هر متر فضا" : "Rate per m²"}>
              <MoneyInput value={rate} onChange={setRate} />
            </Field>
            <Field label={fa ? "نرخ غرفه‌سازی هر متر" : "Booth build rate per m²"}>
              <MoneyInput value={buildRate} onChange={setBuildRate} />
            </Field>
          </div>
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium text-p-ink-2">{fa ? "رنگ نمایشگاه" : "Colour"}</span>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={cn("size-8 rounded-full ring-offset-2 ring-offset-p-surface transition", color === c ? "ring-2 ring-p-ink" : "hover:scale-105")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Field label={fa ? "یادداشت" : "Notes"}>
            <Textarea name="notes" dir="auto" rows={3} />
          </Field>
        </div>
      </details>

      {error ? <p className="rounded-xl bg-p-danger-soft px-3 py-2 text-sm text-p-danger">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={busy || reader.state === "reading"} icon={busy ? <Loader2 className="size-4 animate-spin" /> : null}>
          {fa ? (halls.length ? `ساخت نمایشگاه و ${num(lang, halls.length)} سالن` : "ساخت نمایشگاه") : halls.length ? `Create with ${halls.length} ${halls.length === 1 ? "hall" : "halls"}` : "Create exhibition"}
        </Button>
      </div>
    </form>
  );
}

function HallCounter({ count, onChange }: { count: number; onChange: (n: number) => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-p-sunken p-1" aria-label={fa ? "تعداد سالن‌ها" : "Number of halls"}>
      <IconButton size="sm" label={fa ? "یک سالن کمتر" : "One hall fewer"} disabled={count === 0} onClick={() => onChange(count - 1)}>
        <Minus className="size-4" />
      </IconButton>
      <span className="tabular min-w-16 text-center text-[13px] font-semibold">
        {fa ? `${num(lang, count)} سالن` : `${count} ${count === 1 ? "hall" : "halls"}`}
      </span>
      <IconButton size="sm" label={fa ? "یک سالن بیشتر" : "One more hall"} disabled={count >= MAX_HALLS} onClick={() => onChange(count + 1)}>
        <Plus className="size-4" />
      </IconButton>
    </div>
  );
}

const readerMessages: Record<string, { fa: string; en: string }> = {
  NOT_CONFIGURED: {
    fa: "خواندن خودکار نقشه هنوز روی این سایت روشن نشده. فایل همراه نمایشگاه ذخیره می‌شود؛ سالن‌ها را خودتان اضافه کنید.",
    en: "Automatic map reading isn't switched on for this site yet. The file is still saved with the exhibition; add the halls yourself.",
  },
  DEMO: {
    fa: "در نسخهٔ نمایشی، خواندن خودکار نقشه خاموش است. فایل نگه داشته می‌شود؛ سالن‌ها را خودتان اضافه کنید.",
    en: "Map reading is off in the demo. The file is kept; add the halls yourself.",
  },
  SIGN_IN: { fa: "برای خواندن خودکار نقشه وارد حساب کارمندی شوید.", en: "Sign in as staff to read the map automatically." },
  ROLE: { fa: "نقش شما اجازهٔ ساخت نمایشگاه ندارد.", en: "Your role can't create exhibitions." },
  OFFLINE: { fa: "به سرور وصل نشد. سالن‌ها را خودتان اضافه کنید یا دوباره امتحان کنید.", en: "Couldn't reach the server. Add halls yourself or try again." },
  RATE_LIMITED: { fa: "چند نقشه پشت سر هم خوانده شد. یک دقیقه دیگر دوباره امتحان کنید.", en: "Too many maps in a minute. Try again shortly." },
  TIMEOUT: { fa: "خواندن نقشه طول کشید. فایل کوچک‌تر یا واضح‌تری بگذارید.", en: "Reading took too long. Try a smaller or clearer file." },
};

function readerMessage(code: string, fa: boolean) {
  const m = readerMessages[code];
  if (m) return fa ? m.fa : m.en;
  return fa ? "نقشه خوانده نشد. سالن‌ها را خودتان اضافه کنید یا دوباره امتحان کنید." : "The map couldn't be read. Add the halls yourself or try again.";
}

function PlanDrop({
  plan,
  reader,
  onPick,
  onRemove,
  onRetry,
}: {
  plan: Plan | null;
  reader: Reader;
  onPick: (file: File | null) => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  if (!plan) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onPick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed p-4 transition-colors",
          over ? "border-p-brand bg-p-brand-soft" : "border-p-line-strong hover:bg-p-sunken",
        )}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-p-sunken text-p-ink-2">
          <Upload className="size-5" />
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-semibold">{fa ? "نقشه یا کروکی سالن‌ها را بگذارید" : "Add a map or sketch of the halls"}</span>
          <span className="block text-[13px] text-p-ink-3">
            {reader.state === "off"
              ? fa
                ? "عکس، اسکن یا PDF تا ۱۰ مگابایت. همراه نمایشگاه ذخیره می‌شود."
                : "Photo, scan or PDF up to 10 MB. It's saved with the exhibition."
              : fa
                ? "عکس، اسکن یا PDF تا ۱۰ مگابایت. سالن‌ها از روی آن خوانده و ساخته می‌شوند و همه قابل ویرایش‌اند."
                : "Photo, scan or PDF up to 10 MB. The halls are read from it and created for you, and you can edit every one."}
          </span>
        </span>
        <input
          ref={input}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => {
            onPick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  const isPdf = plan.file.type === "application/pdf";
  return (
    <div className="grid gap-3 rounded-2xl bg-p-sunken p-3 sm:grid-cols-[9rem_1fr]">
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-p-line bg-p-surface">
        {plan.preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of a file that hasn't been uploaded
          <img src={plan.preview} alt="" className="size-full object-contain" />
        ) : (
          <FileText className="size-8 text-p-ink-3" />
        )}
      </div>
      <div className="grid min-w-0 content-start gap-2">
        <div className="flex items-start gap-2">
          {isPdf ? <FileText className="mt-0.5 size-4 shrink-0 text-p-ink-3" /> : <ImageUp className="mt-0.5 size-4 shrink-0 text-p-ink-3" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium" dir="ltr">
              {plan.file.name}
            </span>
            <span className="block text-xs text-p-ink-3">
              {num(lang, Math.max(0.1, Math.round((plan.file.size / 1024 / 1024) * 10) / 10), 1)} {fa ? "مگابایت" : "MB"}
            </span>
          </span>
          <IconButton size="sm" label={fa ? "برداشتن فایل" : "Remove file"} onClick={onRemove}>
            <X className="size-4" />
          </IconButton>
        </div>
        <ReaderStatus reader={reader} onRetry={onRetry} />
      </div>
    </div>
  );
}

function ReaderStatus({ reader, onRetry }: { reader: Reader; onRetry: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  switch (reader.state) {
    case "checking":
    case "ready":
      return null;
    case "reading":
      return (
        <p className="flex items-center gap-2 text-[13px] text-p-ink-2" aria-live="polite">
          <ScanSearch className="size-4 animate-pulse text-p-brand" />
          {fa ? "در حال خواندن نقشه و پیدا کردن سالن‌ها… (تا یک دقیقه)" : "Reading the map and finding the halls… (up to a minute)"}
        </p>
      );
    case "done": {
      const n = reader.reading.halls.length;
      return (
        <div className="grid gap-1 text-[13px]" aria-live="polite">
          <p className="flex items-center gap-2 font-medium text-p-ok">
            <Sparkles className="size-4" />
            {n
              ? fa
                ? `${num(lang, n)} سالن پیدا شد. نام و اندازه‌ها را پایین بررسی کنید.`
                : `Found ${n} ${n === 1 ? "hall" : "halls"}. Check the names and sizes below.`
              : fa
                ? "سالنی در این فایل پیدا نشد. سالن‌ها را خودتان اضافه کنید."
                : "No halls found in this file. Add them yourself."}
          </p>
          {reader.reading.summary ? <p className="text-p-ink-3">{reader.reading.summary}</p> : null}
          {n && reader.reading.confidence < 0.5 ? (
            <p className="text-p-warn">{fa ? "نقشه واضح نبود؛ با دقت بیشتری بررسی کنید." : "The map wasn't clear; check carefully."}</p>
          ) : null}
        </div>
      );
    }
    case "off":
      return <p className="text-[13px] text-p-ink-3">{readerMessage(reader.code, fa)}</p>;
    case "failed":
      return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-p-warn">{readerMessage(reader.code, fa)}</span>
          <Button size="sm" tone="ghost" icon={<RotateCcw className="size-3.5" />} onClick={onRetry}>
            {fa ? "دوباره" : "Retry"}
          </Button>
        </div>
      );
  }
}

function HallRow({ index, hall, onChange, onRemove }: { index: number; hall: HallDraft; onChange: (patch: Partial<HallDraft>) => void; onRemove: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const metres = (v: string) => {
    const n = Number(parseDigits(v));
    return v.trim() && Number.isFinite(n) && n > 0 ? n : null;
  };
  return (
    <li className="grid gap-2 rounded-xl border border-p-line bg-p-surface p-2.5">
      <div className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-2 sm:grid-cols-[1.75rem_1fr_1fr_5rem_5rem_auto]">
        <span className="tabular grid size-7 place-items-center rounded-lg bg-p-sunken text-xs font-semibold text-p-ink-2">{num(lang, index + 1)}</span>
        <Input
          aria-label={fa ? "نام سالن" : "Hall name (Persian)"}
          value={hall.name_fa}
          onChange={(e) => onChange({ name_fa: e.target.value })}
          dir="rtl"
          required
          className="h-9"
        />
        <IconButton size="sm" label={fa ? "حذف سالن" : "Remove hall"} onClick={onRemove} className="sm:order-last">
          <Trash2 className="size-4" />
        </IconButton>
        <Input
          aria-label={fa ? "نام انگلیسی سالن" : "Hall name (English)"}
          placeholder={fa ? "نام انگلیسی" : "English name"}
          value={hall.name_en}
          onChange={(e) => onChange({ name_en: e.target.value })}
          dir="ltr"
          className="col-span-2 col-start-2 h-9 sm:col-span-1 sm:col-start-auto"
        />
        <div className="col-span-3 col-start-1 grid grid-cols-2 gap-2 ps-9 sm:col-span-2 sm:col-start-auto sm:ps-0">
          <Input
            aria-label={fa ? "طول (متر)" : "Width (m)"}
            placeholder={fa ? "طول م" : "W m"}
            inputMode="decimal"
            dir="ltr"
            value={hall.width_m ?? ""}
            onChange={(e) => onChange({ width_m: metres(e.target.value) })}
            className="tabular h-9 text-center"
          />
          <Input
            aria-label={fa ? "عرض (متر)" : "Depth (m)"}
            placeholder={fa ? "عرض م" : "D m"}
            inputMode="decimal"
            dir="ltr"
            value={hall.depth_m ?? ""}
            onChange={(e) => onChange({ depth_m: metres(e.target.value) })}
            className="tabular h-9 text-center"
          />
        </div>
      </div>
      {hall.source === "read" || hall.note ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 ps-9 text-xs text-p-ink-3">
          {hall.source === "read" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-p-brand-soft px-1.5 py-0.5 font-medium text-p-brand">
              <Sparkles className="size-3" />
              {fa ? "از روی نقشه" : "From the map"}
            </span>
          ) : null}
          {hall.booths ? <span>{fa ? `حدود ${num(lang, hall.booths)} غرفه` : `About ${hall.booths} booths`}</span> : null}
          {hall.box ? <span>{fa ? "تصویر همین بخش زیر نقشهٔ سالن قرار می‌گیرد" : "This part of the image goes under the hall plan"}</span> : null}
          {hall.note ? <span>{hall.note}</span> : null}
        </p>
      ) : null}
    </li>
  );
}

function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, "-").slice(-60) || "plan";
}

function imageAspect(url: string) {
  return new Promise<number | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth ? img.naturalHeight / img.naturalWidth : null);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Cuts one hall out of the venue image so it can sit under that hall's plan for tracing. */
async function cropImage(url: string, box: HallBox): Promise<File | null> {
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const sx = Math.round(box.x * img.naturalWidth);
  const sy = Math.round(box.y * img.naturalHeight);
  const sw = Math.max(1, Math.round(box.w * img.naturalWidth));
  const sh = Math.max(1, Math.round(box.h * img.naturalHeight));
  const scale = Math.min(1, 2400 / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  return blob ? new File([blob], "hall.jpg", { type: "image/jpeg" }) : null;
}
