"use client";

import { Check, ClipboardCopy, Mail, Minus, Plus, RotateCcw, Send } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { publicEquipment } from "@/data/public-equipment";
import {
  AREA_PRESETS,
  boothRequestDraft,
  boothTypeLabels,
  equipmentRequestDraft,
  extraLabels,
  positionLabels,
  validateContact,
  type BoothExtra,
  type BoothPosition,
  type BoothRequest,
  type BoothType,
  type Contact,
  type EquipmentRequest,
} from "@/lib/public-requests";

type Lang = "fa" | "en";

const inputClass =
  "h-12 w-full rounded-2xl border border-white/12 bg-black/28 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/60 focus:ring-4 focus:ring-cyan-200/10";

/** Keeps an unsent draft in this browser only; works without storage too. */
function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore once after mount, so server and first client render match
      if (raw) setValue({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* storage blocked: start empty */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  const reset = () => {
    setValue(initial);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };
  return [value, setValue, reset] as const;
}

const emptyContact: Contact = { name: "", company: "", email: "", phone: "" };

export function BoothRequestBuilder({ lang, exhibitions }: { lang: Lang; exhibitions: string[] }) {
  const fa = lang === "fa";
  const initial: BoothRequest = {
    ...emptyContact,
    exhibition: exhibitions[0] ?? "",
    sector: "",
    boothType: "unsure",
    area: 18,
    position: "any",
    extras: [],
    notes: "",
  };
  const [req, setReq, reset] = useDraft<BoothRequest>("aratta.booth-request", initial);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const draft = useMemo(() => boothRequestDraft(lang, req), [lang, req]);
  const bad = validateContact(req);
  const set = <K extends keyof BoothRequest>(k: K, v: BoothRequest[K]) => setReq((r) => ({ ...r, [k]: v }));
  const toggleExtra = (e: BoothExtra) =>
    setReq((r) => ({ ...r, extras: r.extras.includes(e) ? r.extras.filter((x) => x !== e) : [...r.extras, e] }));

  const steps = fa ? ["رویداد و غرفه", "خدمات", "اطلاعات تماس"] : ["Event and booth", "Services", "Your details"];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="glass rounded-[2rem] p-5 sm:p-7">
        <ol className="grid grid-cols-3 gap-2" aria-label={fa ? "مراحل" : "Steps"}>
          {steps.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={step === i ? "step" : undefined}
                className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-start text-sm font-bold transition ${
                  step === i ? "border-amber-200/45 bg-amber-200/12 text-white" : "border-white/10 bg-white/[0.03] text-white/58"
                }`}
              >
                <span className={`font-latin grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs ${step > i ? "border-emerald-200/40 text-[var(--success)]" : "border-white/18"}`}>
                  {step > i ? <Check size={14} /> : i + 1}
                </span>
                <span className={step === i ? "truncate" : "hidden truncate sm:inline"}>{label}</span>
              </button>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="mt-6 grid gap-5">
            <Label text={fa ? "کدام نمایشگاه؟" : "Which exhibition?"}>
              <select value={req.exhibition} onChange={(e) => set("exhibition", e.target.value)} className={inputClass}>
                {exhibitions.map((x) => (
                  <option key={x} value={x} className="bg-[#0b1016]">
                    {x}
                  </option>
                ))}
                <option value={fa ? "سایر / هنوز مشخص نیست" : "Other / not decided"} className="bg-[#0b1016]">
                  {fa ? "سایر / هنوز مشخص نیست" : "Other / not decided"}
                </option>
              </select>
            </Label>
            <fieldset>
              <legend className="text-sm font-semibold text-white/82">{fa ? "نوع غرفه" : "Booth type"}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(Object.keys(boothTypeLabels) as BoothType[]).map((t) => (
                  <ChoiceCard key={t} active={req.boothType === t} onClick={() => set("boothType", t)} title={boothTypeLabels[t][lang]} hint={boothTypeLabels[t].hint[lang]} />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold text-white/82">{fa ? "متراژ تقریبی (متر مربع)" : "Approximate area (m²)"}</legend>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {AREA_PRESETS.map((a) => (
                  <Pill key={a} active={req.area === a} onClick={() => set("area", a)}>
                    {fa ? a.toLocaleString("fa-IR") : a}
                  </Pill>
                ))}
                <input
                  type="number"
                  min={6}
                  max={2000}
                  inputMode="numeric"
                  aria-label={fa ? "متراژ دلخواه" : "Custom area"}
                  value={req.area}
                  onChange={(e) => set("area", Math.max(1, Math.min(2000, Number(e.target.value) || 0)))}
                  className="font-latin h-10 w-24 rounded-full border border-white/12 bg-black/28 px-3 text-center text-white outline-none focus:border-cyan-200/60"
                />
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold text-white/82">{fa ? "موقعیت دلخواه" : "Preferred position"}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(positionLabels) as BoothPosition[]).map((p) => (
                  <Pill key={p} active={req.position === p} onClick={() => set("position", p)}>
                    {positionLabels[p][lang]}
                  </Pill>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-6 grid gap-5">
            <fieldset>
              <legend className="text-sm font-semibold text-white/82">{fa ? "به چه خدماتی نیاز دارید؟" : "Which services do you need?"}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(Object.keys(extraLabels) as BoothExtra[]).map((e) => {
                  const on = req.extras.includes(e);
                  return (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleExtra(e)}
                      className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-bold transition ${
                        on ? "border-cyan-200/45 bg-cyan-200/10 text-white" : "border-white/10 bg-white/[0.03] text-white/66"
                      }`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? "border-cyan-200 bg-cyan-200 text-black" : "border-white/25"}`}>
                        {on ? <Check size={13} /> : null}
                      </span>
                      {extraLabels[e][lang]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Label text={fa ? "حوزه فعالیت شرکت" : "Your company's sector"}>
              <input value={req.sector} onChange={(e) => set("sector", e.target.value)} className={inputClass} placeholder={fa ? "مثلا ماشین‌آلات معدنی" : "e.g. mining machinery"} />
            </Label>
            <Label text={fa ? "توضیحات" : "Notes"}>
              <textarea
                rows={4}
                value={req.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="rounded-2xl border border-white/12 bg-black/28 px-4 py-3 text-white outline-none focus:border-cyan-200/60 focus:ring-4 focus:ring-cyan-200/10"
                placeholder={fa ? "محصولاتی که نمایش می‌دهید، غرفه همسایه، زمان تماس..." : "What you will show, neighbours, best time to call..."}
              />
            </Label>
          </div>
        ) : null}

        {step === 2 ? (
          <ContactFields lang={lang} value={req} onChange={(c) => setReq((r) => ({ ...r, ...c }))} bad={tried ? bad : []} />
        ) : null}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => { reset(); setStep(0); setTried(false); }} className="inline-flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white">
            <RotateCcw size={15} />
            {fa ? "شروع دوباره" : "Start over"}
          </button>
          <div className="flex gap-2">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="rounded-2xl border border-white/14 bg-white/[0.05] px-5 py-3 font-bold text-white">
                {fa ? "قبلی" : "Back"}
              </button>
            ) : null}
            {step < 2 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="liquid-button rounded-2xl px-6 py-3 font-black text-white">
                {fa ? "بعدی" : "Next"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <DraftPanel
        lang={lang}
        title={fa ? "خلاصه درخواست" : "Request summary"}
        rows={[
          [fa ? "نمایشگاه" : "Exhibition", req.exhibition],
          [fa ? "غرفه" : "Booth", `${boothTypeLabels[req.boothType][lang]} · ${fa ? req.area.toLocaleString("fa-IR") : req.area} ${fa ? "متر" : "m²"}`],
          [fa ? "موقعیت" : "Position", positionLabels[req.position][lang]],
          [fa ? "خدمات" : "Services", req.extras.length ? req.extras.map((e) => extraLabels[e][lang]).join(fa ? "، " : ", ") : "-"],
        ]}
        body={draft.body}
        mailto={draft.mailto}
        ready={bad.length === 0}
        onBlocked={() => { setTried(true); setStep(2); }}
      />
    </div>
  );
}

export function EquipmentRequestBuilder({ lang, exhibitions }: { lang: Lang; exhibitions: string[] }) {
  const fa = lang === "fa";
  type Draft = Contact & { exhibition: string; booth: string; deliveryDay: string; notes: string; qty: Record<string, number> };
  const initial: Draft = { ...emptyContact, exhibition: exhibitions[0] ?? "", booth: "", deliveryDay: "", notes: "", qty: {} };
  const [d, setD, reset] = useDraft<Draft>("aratta.equipment-request", initial);
  const [tried, setTried] = useState(false);
  const labels = useMemo(() => new Map(publicEquipment.flatMap((g) => g.items.map((i) => [i.id, i[lang]] as const))), [lang]);
  const req: EquipmentRequest = {
    ...d,
    lines: Object.entries(d.qty).map(([id, qty]) => ({ id, qty, label: labels.get(id) ?? id })),
  };
  const draft = equipmentRequestDraft(lang, req);
  const bad = validateContact(d);
  const setQty = (id: string, q: number) => setD((x) => ({ ...x, qty: { ...x.qty, [id]: Math.max(0, Math.min(999, q)) } }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="glass rounded-[2rem] p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text={fa ? "نمایشگاه" : "Exhibition"}>
            <select value={d.exhibition} onChange={(e) => setD((x) => ({ ...x, exhibition: e.target.value }))} className={inputClass}>
              {exhibitions.map((x) => (
                <option key={x} value={x} className="bg-[#0b1016]">
                  {x}
                </option>
              ))}
            </select>
          </Label>
          <Label text={fa ? "کد غرفه (اگر دارید)" : "Booth code (if known)"}>
            <input value={d.booth} onChange={(e) => setD((x) => ({ ...x, booth: e.target.value }))} className={inputClass} placeholder={fa ? "مثلا A12" : "e.g. A12"} />
          </Label>
        </div>

        <div className="mt-6 grid gap-5">
          {publicEquipment.map((group) => (
            <fieldset key={group.id}>
              <legend className="text-sm font-black text-[var(--gold)]">{group[lang]}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {group.items.map((item) => {
                  const q = d.qty[item.id] ?? 0;
                  return (
                    <div key={item.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${q ? "border-cyan-200/35 bg-cyan-200/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
                      <span className="text-sm font-bold text-white/82">{item[lang]}</span>
                      <span className="flex items-center gap-1">
                        <StepButton label={fa ? "کم کردن" : "Remove one"} onClick={() => setQty(item.id, q - 1)} disabled={!q}>
                          <Minus size={15} />
                        </StepButton>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          aria-label={item[lang]}
                          value={q}
                          onChange={(e) => setQty(item.id, Number(e.target.value) || 0)}
                          className="font-latin h-9 w-12 rounded-lg border border-white/12 bg-black/30 text-center text-white outline-none focus:border-cyan-200/60"
                        />
                        <StepButton label={fa ? "اضافه کردن" : "Add one"} onClick={() => setQty(item.id, q + 1)}>
                          <Plus size={15} />
                        </StepButton>
                      </span>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Label text={fa ? "روز تحویل دلخواه" : "Preferred delivery day"}>
            <input value={d.deliveryDay} onChange={(e) => setD((x) => ({ ...x, deliveryDay: e.target.value }))} className={inputClass} placeholder={fa ? "مثلا روز دوم غرفه‌سازی" : "e.g. second build-up day"} />
          </Label>
          <Label text={fa ? "توضیحات" : "Notes"}>
            <input value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} className={inputClass} />
          </Label>
        </div>
        <div className="mt-6">
          <ContactFields lang={lang} value={d} onChange={(c) => setD((x) => ({ ...x, ...c }))} bad={tried ? bad : []} />
        </div>
        <button type="button" onClick={() => { reset(); setTried(false); }} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white">
          <RotateCcw size={15} />
          {fa ? "پاک کردن فهرست" : "Clear the list"}
        </button>
      </div>

      <DraftPanel
        lang={lang}
        title={fa ? "فهرست درخواست" : "Your list"}
        rows={[
          [fa ? "تعداد اقلام" : "Pieces", fa ? draft.pieces.toLocaleString("fa-IR") : String(draft.pieces)],
          ...req.lines.filter((l) => l.qty > 0).map((l) => [l.label, fa ? l.qty.toLocaleString("fa-IR") : String(l.qty)] as [string, string]),
        ]}
        body={draft.body}
        mailto={draft.mailto}
        ready={bad.length === 0 && draft.pieces > 0}
        onBlocked={() => setTried(true)}
        blockedHint={draft.pieces ? undefined : fa ? "حداقل یک قلم اضافه کنید." : "Add at least one item."}
      />
    </div>
  );
}

function ContactFields({ lang, value, onChange, bad }: { lang: Lang; value: Contact; onChange: (c: Partial<Contact>) => void; bad: Array<keyof Contact> }) {
  const fa = lang === "fa";
  const fields: Array<[keyof Contact, string, string, string]> = [
    ["name", fa ? "نام و نام خانوادگی" : "Full name", "name", "text"],
    ["company", fa ? "نام شرکت" : "Company", "organization", "text"],
    ["email", fa ? "ایمیل کاری" : "Work email", "email", "email"],
    ["phone", fa ? "شماره تماس" : "Phone", "tel", "tel"],
  ];
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {fields.map(([k, label, ac, type]) => (
        <Label key={k} text={label} error={bad.includes(k) ? (fa ? "این مورد را کامل کنید" : "Please complete this") : undefined}>
          <input type={type} autoComplete={ac} value={value[k]} onChange={(e) => onChange({ [k]: e.target.value })} className={`${inputClass} ${bad.includes(k) ? "border-[var(--danger)]" : ""}`} dir={type === "email" || type === "tel" ? "ltr" : undefined} />
        </Label>
      ))}
    </div>
  );
}

function DraftPanel({
  lang,
  title,
  rows,
  body,
  mailto,
  ready,
  onBlocked,
  blockedHint,
}: {
  lang: Lang;
  title: string;
  rows: Array<[string, string]>;
  body: string;
  mailto: string;
  ready: boolean;
  onBlocked: () => void;
  blockedHint?: string;
}) {
  const fa = lang === "fa";
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const [hint, setHint] = useState(false);
  return (
    <aside className="industrial-card h-fit rounded-[2rem] p-6 lg:sticky lg:top-28">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <dl className="mt-4 grid gap-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <dt className="shrink-0 text-white/48">{k}</dt>
            <dd className="text-end font-bold text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid gap-2">
        <a
          href={ready ? mailto : undefined}
          role="button"
          aria-disabled={!ready}
          onClick={(e) => {
            if (!ready) {
              e.preventDefault();
              setHint(true);
              onBlocked();
            }
          }}
          className="liquid-button inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black text-white"
        >
          <Send size={18} />
          {fa ? "ساخت پیش‌نویس ایمیل" : "Create email draft"}
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body);
              setCopied("ok");
            } catch {
              setCopied("fail");
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white/80"
        >
          <ClipboardCopy size={16} />
          {fa ? "کپی متن" : "Copy text"}
        </button>
      </div>
      <div aria-live="polite" className="mt-3 min-h-5 text-sm">
        {hint && !ready ? <p className="text-[var(--danger)]">{blockedHint ?? (fa ? "نام، ایمیل معتبر و شماره تماس را وارد کنید." : "Enter your name, a valid email and a phone number.")}</p> : null}
        {copied === "ok" ? <p className="text-[var(--success)]">{fa ? "متن کپی شد." : "Copied."}</p> : null}
        {copied === "fail" ? <p className="text-white/60">{fa ? "کپی خودکار مجاز نیست؛ متن را دستی کپی کنید." : "Clipboard is blocked; copy the text by hand."}</p> : null}
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-white/48">
        <Mail size={14} className="mt-1 shrink-0" />
        {fa
          ? "ایمیل در برنامه ایمیل خودتان باز می‌شود و تا شما ارسال نکنید چیزی فرستاده نمی‌شود. پیش‌نویس فقط در همین مرورگر نگه داشته می‌شود."
          : "The email opens in your own mail app and nothing is sent until you send it. The draft is kept only in this browser."}
      </p>
    </aside>
  );
}

function Label({ text, error, children }: { text: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-white/82">{text}</span>
      {children}
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}

function ChoiceCard({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-start transition ${active ? "border-amber-200/45 bg-amber-200/10" : "border-white/10 bg-white/[0.03] hover:border-white/22"}`}
    >
      <span className="block font-black text-white">{title}</span>
      <span className="mt-1 block text-xs leading-6 text-white/55">{hint}</span>
    </button>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm font-bold transition ${active ? "border-amber-200/45 bg-amber-200/14 text-[var(--gold)]" : "border-white/14 bg-white/[0.04] text-white/70 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="grid h-9 w-9 place-items-center rounded-lg border border-white/14 bg-white/[0.05] text-white disabled:opacity-35">
      {children}
    </button>
  );
}
