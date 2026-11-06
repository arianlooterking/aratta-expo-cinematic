"use client";

import { Building2, Check, History, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { area, num, pick, sep } from "@/lib/portal/format";
import { dealStageLabel } from "@/lib/portal/i18n";
import { newId } from "@/lib/portal/store";
import type { Booth, BoothStatus, Company, Deal, Patch } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { Button, Field, Input, Segmented, Sheet } from "../ui";

type Mode = "existing" | "new";

type Candidate = {
  company: Company;
  /** Deal for the current exhibition, if any. */
  deal: Deal | null;
  /** Booth codes this company already holds in the current exhibition. */
  booths: string[];
  /** How many other exhibitions they took part in. */
  pastShows: number;
  group: "current" | "past" | "other";
};

/**
 * Gives an empty booth to a company: one already in the CRM, or a new one typed in here.
 * Creates whatever is missing (company, contact, deal) and then links the booth.
 */
export function AssignSheet({
  booth,
  open,
  onClose,
  onUpdate,
}: {
  booth: Booth;
  open: boolean;
  onClose: () => void;
  onUpdate: (patch: Patch<"booths">) => void;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const [mode, setMode] = useState<Mode>("existing");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      closeLabel={fa ? "بستن" : "Close"}
      title={
        <span>
          {fa ? "واگذاری غرفه " : "Give booth "}
          <bdi dir="ltr">{booth.code}</bdi>
          {fa ? " به شرکت" : " to a company"}
        </span>
      }
    >
      <div className="grid gap-4">
        <Segmented
          className="w-full [&>button]:flex-1"
          value={mode}
          onChange={setMode}
          options={[
            { value: "existing", label: fa ? "شرکت های ثبت شده" : "Existing company", icon: <Building2 className="size-4" /> },
            { value: "new", label: fa ? "شرکت جدید" : "New company", icon: <UserPlus className="size-4" /> },
          ]}
        />
        {mode === "existing" ? (
          <ExistingPicker booth={booth} onUpdate={onUpdate} onDone={onClose} onNew={() => setMode("new")} />
        ) : (
          <NewCompanyForm booth={booth} onUpdate={onUpdate} onDone={onClose} onUseExisting={() => setMode("existing")} />
        )}
      </div>
    </Sheet>
  );
}

/** Links the booth to a company, creating this exhibition's deal when it has none. */
function useAssign(booth: Booth, onUpdate: (patch: Patch<"booths">) => void) {
  const { lang, store, toast, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  return async (company: Company, status: BoothStatus = "reserved", contactId: string | null = null) => {
    const exhibition = x.exhibition;
    if (!exhibition) return false;
    let deal = x.deals.find((d) => d.company_id === company.id && d.stage !== "lost") ?? null;
    if (!deal) {
      const res = await store.insert("deals", {
        id: newId(),
        exhibition_id: exhibition.id,
        company_id: company.id,
        contact_id: contactId,
        owner_id: user.id,
        stage: status === "contracted" ? "won" : "negotiation",
        expected_area_m2: booth.area_m2,
        source: "map",
      });
      if (!res.ok || !res.row) return false;
      deal = res.row;
    } else if (status === "contracted" && deal.stage !== "won") {
      await store.update("deals", deal.id, { stage: "won" });
    }
    onUpdate(status === "contracted" ? { deal_id: deal.id, status: "contracted" } : { deal_id: deal.id });
    toast(
      fa
        ? `غرفه ${booth.code} به ${company.name_fa} داده شد`
        : `Booth ${booth.code} given to ${pick(lang, company.name_fa, company.name_en)}`,
    );
    return true;
  };
}

function ExistingPicker({
  booth,
  onUpdate,
  onDone,
  onNew,
}: {
  booth: Booth;
  onUpdate: (patch: Patch<"booths">) => void;
  onDone: () => void;
  onNew: () => void;
}) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const allDeals = useCollection("deals");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<BoothStatus>("reserved");
  const assign = useAssign(booth, onUpdate);

  const candidates = useMemo<Candidate[]>(() => {
    const current = x.exhibition?.id;
    const shows = new Map<string, Set<string>>();
    for (const d of allDeals.rows) {
      if (d.exhibition_id === current || d.stage === "lost") continue;
      if (d.stage !== "won" && !x.boothsByDeal.has(d.id)) continue;
      const s = shows.get(d.company_id) ?? new Set<string>();
      s.add(d.exhibition_id);
      shows.set(d.company_id, s);
    }
    return x.companies
      .filter((c) => !c.archived_at && (c.kind === "exhibitor" || c.kind === "sponsor"))
      .map((company) => {
        const deal = x.deals.find((d) => d.company_id === company.id && d.stage !== "lost") ?? null;
        const booths = deal ? (x.boothsByDeal.get(deal.id) ?? []).map((b) => b.code) : [];
        const pastShows = shows.get(company.id)?.size ?? 0;
        return { company, deal, booths, pastShows, group: deal ? "current" : pastShows ? "past" : "other" } as Candidate;
      })
      .sort((a, b) => {
        const g = { current: 0, past: 1, other: 2 };
        return g[a.group] - g[b.group] || b.pastShows - a.pastShows || a.company.name_fa.localeCompare(b.company.name_fa, "fa");
      });
  }, [allDeals.rows, x.companies, x.deals, x.boothsByDeal, x.exhibition?.id]);

  const q = normalizeSearch(query);
  const shown = q
    ? candidates.filter((c) =>
        normalizeSearch([c.company.name_fa, c.company.name_en, c.company.legal_name, c.company.sector, c.company.city, c.company.phone].filter(Boolean).join(" ")).includes(q),
      )
    : candidates;
  const groups: Array<{ key: Candidate["group"]; title: string }> = [
    { key: "current", title: fa ? "در همین نمایشگاه (مذاکره یا قرارداد)" : "Already in this exhibition" },
    { key: "past", title: fa ? "مشارکت کنندگان دوره های قبل" : "Exhibited with us before" },
    { key: "other", title: fa ? "سایر شرکت ها" : "Other companies" },
  ];

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fa ? "نام، شهر، تلفن یا حوزه کاری" : "Name, city, phone or sector"}
          className="ps-9"
          aria-label={fa ? "جستجوی شرکت" : "Search companies"}
        />
      </div>
      <StatusChoice value={status} onChange={setStatus} />
      <div className="thin-scroll grid max-h-[46dvh] gap-4 overflow-y-auto pe-1">
        {groups.map((g) => {
          const list = shown.filter((c) => c.group === g.key).slice(0, q ? 40 : 25);
          if (!list.length) return null;
          return (
            <section key={g.key} className="grid gap-1.5">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-p-ink-3">
                {g.key === "past" ? <History className="size-3.5" /> : null}
                {g.title}
              </h3>
              <ul className="grid gap-1.5">
                {list.map((c) => (
                  <li key={c.company.id}>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={async () => {
                        setBusy(c.company.id);
                        const ok = await assign(c.company, status);
                        setBusy(null);
                        if (ok) onDone();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-p-line px-3 py-2.5 text-start transition-colors hover:border-p-brand hover:bg-p-brand-soft/40 disabled:opacity-60",
                        busy === c.company.id && "border-p-brand",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-p-sunken text-p-ink-2">
                        <Building2 className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{pick(lang, c.company.name_fa, c.company.name_en)}</span>
                        <span className="block truncate text-xs text-p-ink-3">
                          {[
                            c.deal ? dealStageLabel[c.deal.stage][lang] : null,
                            c.booths.length ? (fa ? `غرفه \u2066${c.booths.join("، ")}\u2069` : `booth ${c.booths.join(", ")}`) : null,
                            c.pastShows ? (fa ? `${num(lang, c.pastShows)} دوره قبل` : `${c.pastShows} past show${c.pastShows > 1 ? "s" : ""}`) : null,
                            c.company.sector,
                            c.company.city,
                          ]
                            .filter(Boolean)
                            .join(sep(lang))}
                        </span>
                      </span>
                      {busy === c.company.id ? <Check className="size-4 text-p-brand" /> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!shown.length ? (
          <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-p-line-strong px-4 py-6 text-center">
            <p className="text-sm text-p-ink-3">{fa ? "شرکتی با این نام نیست." : "No company matches."}</p>
            <Button size="sm" tone="primary" icon={<UserPlus className="size-4" />} onClick={onNew}>
              {fa ? "ثبت به عنوان شرکت جدید" : "Add it as a new company"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusChoice({ value, onChange }: { value: BoothStatus; onChange: (s: BoothStatus) => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-p-ink-2">
      <span>{fa ? "وضعیت غرفه پس از واگذاری:" : "Booth status after:"}</span>
      <Segmented
        size="sm"
        value={value}
        onChange={onChange}
        options={[
          { value: "reserved", label: fa ? "رزرو" : "Reserved" },
          { value: "contracted", label: fa ? "قرارداد بسته شد" : "Contract signed" },
        ]}
      />
    </div>
  );
}

function NewCompanyForm({
  booth,
  onUpdate,
  onDone,
  onUseExisting,
}: {
  booth: Booth;
  onUpdate: (patch: Patch<"booths">) => void;
  onDone: () => void;
  onUseExisting: () => void;
}) {
  const { lang, store, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const assign = useAssign(booth, onUpdate);
  const [nameFa, setNameFa] = useState("");
  const [status, setStatus] = useState<BoothStatus>("reserved");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const similar = useMemo(() => {
    const q = normalizeSearch(nameFa);
    if (q.length < 2) return [];
    return x.companies.filter((c) => normalizeSearch(`${c.name_fa} ${c.name_en ?? ""}`).includes(q)).slice(0, 3);
  }, [nameFa, x.companies]);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "").trim() || null;
        const name = get("name_fa");
        if (!name) {
          setError(fa ? "نام شرکت لازم است" : "The company name is required");
          return;
        }
        setBusy(true);
        setError(null);
        const companyId = newId();
        const res = await store.insert("companies", {
          id: companyId,
          kind: "exhibitor",
          name_fa: name,
          name_en: get("name_en"),
          sector: get("sector"),
          city: get("city"),
          phone: get("phone"),
          email: get("email"),
          owner_id: user.id,
        });
        if (!res.ok || !res.row) {
          setBusy(false);
          return;
        }
        let contactId: string | null = null;
        const contactName = get("contact_name");
        const contactPhone = get("contact_phone");
        if (contactName || contactPhone) {
          contactId = newId();
          await store.insert("contacts", {
            id: contactId,
            company_id: companyId,
            full_name: contactName ?? (fa ? "مسئول غرفه" : "Booth contact"),
            phone: contactPhone,
            job_title: get("contact_title"),
            is_primary: true,
          });
        }
        const ok = await assign(res.row, status, contactId);
        setBusy(false);
        if (ok) onDone();
      }}
    >
      <Field label={fa ? "نام شرکت (فارسی) *" : "Company name (Persian) *"}>
        <Input name="name_fa" dir="rtl" required value={nameFa} onChange={(e) => setNameFa(e.target.value)} autoComplete="organization" />
      </Field>
      {similar.length ? (
        <div className="rounded-xl bg-p-warn-soft px-3 py-2 text-xs text-p-warn">
          <p className="font-semibold">{fa ? "شاید این شرکت قبلاً ثبت شده:" : "This company may already exist:"}</p>
          <ul className="mt-1 grid gap-0.5">
            {similar.map((c) => (
              <li key={c.id}>{pick(lang, c.name_fa, c.name_en)}</li>
            ))}
          </ul>
          <button type="button" onClick={onUseExisting} className="mt-1 font-semibold underline">
            {fa ? "انتخاب از شرکت های ثبت شده" : "Pick from existing companies"}
          </button>
        </div>
      ) : null}
      <Field label={fa ? "نام انگلیسی" : "Name in English"}>
        <Input name="name_en" dir="ltr" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={fa ? "حوزه کاری" : "Sector"}>
          <Input name="sector" />
        </Field>
        <Field label={fa ? "شهر" : "City"}>
          <Input name="city" defaultValue={fa ? "کرمان" : "Kerman"} />
        </Field>
        <Field label={fa ? "تلفن شرکت" : "Company phone"}>
          <Input name="phone" dir="ltr" inputMode="tel" autoComplete="tel" />
        </Field>
        <Field label={fa ? "ایمیل" : "Email"}>
          <Input name="email" dir="ltr" type="email" inputMode="email" />
        </Field>
      </div>
      <fieldset className="grid gap-3 rounded-2xl border border-p-line p-3">
        <legend className="px-1 text-xs font-semibold text-p-ink-3">{fa ? "مسئول هماهنگی (اختیاری)" : "Contact person (optional)"}</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label={fa ? "نام و نام خانوادگی" : "Full name"}>
            <Input name="contact_name" autoComplete="name" />
          </Field>
          <Field label={fa ? "موبایل" : "Mobile"}>
            <Input name="contact_phone" dir="ltr" inputMode="tel" />
          </Field>
        </div>
        <Field label={fa ? "سمت" : "Job title"}>
          <Input name="contact_title" />
        </Field>
      </fieldset>
      <StatusChoice value={status} onChange={setStatus} />
      <p className="text-xs text-p-ink-3">
        {fa
          ? `غرفه ${booth.code} (${area(lang, booth.area_m2)}) به این شرکت داده می شود و پرونده فروش آن در CRM ساخته می شود.`
          : `Booth ${booth.code} (${area(lang, booth.area_m2)}) goes to this company and a sales record is opened in the CRM.`}
      </p>
      {error ? <p className="text-sm text-p-danger">{error}</p> : null}
      <Button tone="primary" size="lg" type="submit" disabled={busy}>
        {busy ? (fa ? "در حال ثبت…" : "Saving…") : fa ? "ثبت شرکت و واگذاری غرفه" : "Save company and give booth"}
      </Button>
    </form>
  );
}
