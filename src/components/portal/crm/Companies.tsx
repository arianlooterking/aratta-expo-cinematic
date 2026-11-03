"use client";

import { Building2, Download, Phone, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { toCsv } from "@/lib/portal/finance";
import { compact, date, num, pick, relativeTime } from "@/lib/portal/format";
import { dealStageLabel } from "@/lib/portal/i18n";
import { companyKindLabel } from "@/lib/portal/labels";
import { ZERO_BALANCE } from "@/lib/portal/money";
import type { Company, Deal } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, useNow, usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { usePageTour } from "../Tour";
import { Button, Card, Empty, Pill, Segmented, Select, Skeleton } from "../ui";
import { CompanyForm } from "./CompanyForm";
import { downloadText, PageHeader, StagePill } from "./shared";

type Scope = "all" | "current" | "past" | "never";
type Sort = "name" | "balance" | "followup" | "contact";

type Row = {
  company: Company;
  deal: Deal | null;
  booths: string[];
  pastShows: number;
  balance: number;
  search: string;
};

export function Companies() {
  usePageTour("crm");
  const { lang, can } = usePortal();
  const x = useExhibition();
  const router = useRouter();
  const now = useNow();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const allDeals = useCollection("deals");
  const contacts = useCollection("contacts");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [kind, setKind] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [owes, setOwes] = useState(false);
  const [sort, setSort] = useState<Sort>("name");
  const [limit, setLimit] = useState(60);
  const [creating, setCreating] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const current = x.exhibition?.id;
    const shows = new Map<string, Set<string>>();
    for (const d of allDeals.rows) {
      if (d.exhibition_id === current || d.stage !== "won") continue;
      const set = shows.get(d.company_id) ?? new Set<string>();
      set.add(d.exhibition_id);
      shows.set(d.company_id, set);
    }
    const people = new Map<string, string>();
    for (const c of contacts.rows) people.set(c.company_id, `${people.get(c.company_id) ?? ""} ${c.full_name} ${c.phone ?? ""}`);
    return x.companies
      .filter((c) => !c.archived_at)
      .map((company) => {
        const deal = x.deals.find((d) => d.company_id === company.id && d.stage !== "lost") ?? x.deals.find((d) => d.company_id === company.id) ?? null;
        const booths = deal ? (x.boothsByDeal.get(deal.id) ?? []).map((b) => b.code) : [];
        const balance = deal ? (x.balanceByDeal.get(deal.id) ?? ZERO_BALANCE).balance : 0;
        return {
          company,
          deal,
          booths,
          pastShows: shows.get(company.id)?.size ?? 0,
          balance,
          search: normalizeSearch(
            [company.name_fa, company.name_en, company.legal_name, company.sector, company.city, company.phone, company.email, company.tags.join(" "), people.get(company.id), booths.join(" ")]
              .filter(Boolean)
              .join(" "),
          ),
        };
      });
  }, [x.companies, x.deals, x.boothsByDeal, x.balanceByDeal, x.exhibition?.id, allDeals.rows, contacts.rows]);

  const q = normalizeSearch(query);
  const shown = rows
    .filter((r) => {
      if (q && !r.search.includes(q)) return false;
      if (scope === "current" && !r.deal) return false;
      if (scope === "past" && !r.pastShows) return false;
      if (scope === "never" && (r.deal || r.pastShows)) return false;
      if (kind && r.company.kind !== kind) return false;
      if (owner && (r.deal?.owner_id ?? r.company.owner_id) !== owner) return false;
      if (owes && r.balance <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "balance") return b.balance - a.balance;
      if (sort === "followup") return (a.deal?.next_follow_up_at ?? "9").localeCompare(b.deal?.next_follow_up_at ?? "9");
      if (sort === "contact") return (b.deal?.last_contact_at ?? "").localeCompare(a.deal?.last_contact_at ?? "");
      return a.company.name_fa.localeCompare(b.company.name_fa, "fa");
    });

  const exportCsv = () => {
    const header = fa
      ? ["نام", "نام انگلیسی", "نوع", "حوزه", "شهر", "تلفن", "ایمیل", "مرحله", "غرفه ها", "مانده", "پیگیری بعدی"]
      : ["Name", "English name", "Type", "Sector", "City", "Phone", "Email", "Stage", "Booths", "Balance", "Next follow-up"];
    downloadText(
      `companies-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([
        header,
        ...shown.map((r) => [
          r.company.name_fa,
          r.company.name_en,
          companyKindLabel[r.company.kind][lang],
          r.company.sector,
          r.company.city,
          r.company.phone,
          r.company.email,
          r.deal ? dealStageLabel[r.deal.stage][lang] : "",
          r.booths.join(" "),
          r.balance,
          r.deal?.next_follow_up_at ? r.deal.next_follow_up_at.slice(0, 10) : "",
        ]),
      ]),
      "text/csv",
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        title={fa ? "شرکت ها" : "Companies"}
        hint={fa ? `${num(lang, rows.length)} شرکت · ${num(lang, rows.filter((r) => r.deal).length)} در این نمایشگاه` : `${rows.length} companies · ${rows.filter((r) => r.deal).length} in this exhibition`}
        actions={
          <>
            <Button icon={<Download className="size-4" />} onClick={exportCsv} className="hidden sm:inline-flex">
              {fa ? "خروجی اکسل" : "Export CSV"}
            </Button>
            {can.edit ? (
              <Button tone="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)} data-tour="crm-new">
                {fa ? "شرکت جدید" : "New company"}
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3" data-tour="crm-filters">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fa ? "نام، تلفن، شهر، حوزه، فرد رابط یا کد غرفه" : "Name, phone, city, sector, contact or booth code"}
            className="h-11 w-full rounded-xl border border-p-line bg-p-surface-2 ps-9 pe-3 text-sm outline-none focus:border-p-brand"
            aria-label={fa ? "جستجو" : "Search"}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="scroll-fade thin-scroll -mx-1 w-full min-w-0 overflow-x-auto px-1 sm:w-auto">
            <Segmented
              size="sm"
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: fa ? "همه" : "All" },
                { value: "current", label: fa ? "این نمایشگاه" : "This exhibition" },
                { value: "past", label: fa ? "دوره های قبل" : "Past exhibitors" },
                { value: "never", label: fa ? "تا حالا نیامده" : "Never exhibited" },
              ]}
            />
          </div>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} compact aria-label={fa ? "نوع" : "Type"}>
            <option value="">{fa ? "همه انواع" : "All types"}</option>
            {(Object.keys(companyKindLabel) as Array<keyof typeof companyKindLabel>).map((k) => (
              <option key={k} value={k}>
                {companyKindLabel[k][lang]}
              </option>
            ))}
          </Select>
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} compact aria-label={fa ? "کارشناس" : "Owner"}>
            <option value="">{fa ? "همه کارشناس ها" : "Every owner"}</option>
            {x.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name ?? s.email}
              </option>
            ))}
          </Select>
          <button
            type="button"
            aria-pressed={owes}
            onClick={() => setOwes((v) => !v)}
            className={cn("h-8 rounded-lg px-2.5 text-[13px] font-medium", owes ? "bg-p-warn-soft text-p-warn" : "bg-p-sunken text-p-ink-2 hover:bg-p-line")}
          >
            {fa ? "بدهکارها" : "Owes money"}
          </button>
          <span className="flex-1" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} compact aria-label={fa ? "مرتب سازی" : "Sort"}>
            <option value="name">{fa ? "به ترتیب نام" : "By name"}</option>
            <option value="followup">{fa ? "پیگیری نزدیک تر" : "Next follow-up"}</option>
            <option value="contact">{fa ? "آخرین تماس" : "Last contact"}</option>
            <option value="balance">{fa ? "بیشترین مانده" : "Largest balance"}</option>
          </Select>
        </div>
      </Card>

      {!x.ready ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <Empty
            icon={<Building2 className="size-6" />}
            title={fa ? "شرکتی با این مشخصات نیست" : "No company matches"}
            hint={fa ? "فیلترها را عوض کنید یا شرکت تازه ثبت کنید." : "Change the filters or add a new company."}
            action={
              can.edit ? (
                <Button tone="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                  {fa ? "شرکت جدید" : "New company"}
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0" data-tour="crm-list">
          {/* Desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b border-p-line bg-p-surface-2 text-xs text-p-ink-3">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
                <th>{fa ? "شرکت" : "Company"}</th>
                <th>{fa ? "مرحله" : "Stage"}</th>
                <th>{fa ? "غرفه" : "Booths"}</th>
                <th className="text-end">{fa ? "مانده" : "Balance"}</th>
                <th>{fa ? "آخرین تماس" : "Last contact"}</th>
                <th>{fa ? "پیگیری بعدی" : "Next follow-up"}</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((r) => {
                const overdue = r.deal?.next_follow_up_at && now && new Date(r.deal.next_follow_up_at).getTime() < now;
                return (
                  <tr
                    key={r.company.id}
                    onClick={() => router.push(`${base}/crm/${r.company.id}`)}
                    className="cursor-pointer border-b border-p-line last:border-0 hover:bg-p-surface-2 [&>td]:px-3 [&>td]:py-2.5"
                  >
                    <td className="max-w-80">
                      <Link href={`${base}/crm/${r.company.id}`} className="block truncate font-semibold hover:text-p-brand" onClick={(e) => e.stopPropagation()}>
                        {pick(lang, r.company.name_fa, r.company.name_en)}
                      </Link>
                      <span className="block truncate text-xs text-p-ink-3">
                        {[r.company.sector, r.company.city, r.pastShows ? (fa ? `${num(lang, r.pastShows)} دوره قبل` : `${r.pastShows} past`) : null].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td>{r.deal ? <StagePill stage={r.deal.stage} /> : <span className="text-xs text-p-ink-3">—</span>}</td>
                    <td className="text-xs" dir="ltr">
                      {r.booths.join(", ") || "—"}
                    </td>
                    <td className={cn("tabular text-end font-medium", r.balance > 0 ? "text-p-warn" : "text-p-ink-3")} title={String(r.balance)}>
                      {r.balance ? compact(lang, r.balance) : "—"}
                    </td>
                    <td className="text-xs text-p-ink-3">{r.deal?.last_contact_at ? relativeTime(lang, r.deal.last_contact_at) : "—"}</td>
                    <td className={cn("text-xs", overdue ? "font-semibold text-p-danger" : "text-p-ink-2")}>{r.deal?.next_follow_up_at ? date(lang, r.deal.next_follow_up_at, "short") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Phone cards */}
          <ul className="divide-y divide-p-line md:hidden">
            {shown.slice(0, limit).map((r) => {
              const overdue = r.deal?.next_follow_up_at && now && new Date(r.deal.next_follow_up_at).getTime() < now;
              return (
                <li key={r.company.id} className="flex items-center gap-3 px-3 py-3">
                  <Link href={`${base}/crm/${r.company.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{pick(lang, r.company.name_fa, r.company.name_en)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-p-ink-3">
                      {r.deal ? <StagePill stage={r.deal.stage} small /> : null}
                      {r.booths.length ? <bdi dir="ltr">{r.booths.join(", ")}</bdi> : null}
                      {r.balance > 0 ? <span className="tabular font-medium text-p-warn">{compact(lang, r.balance)}</span> : null}
                      {r.deal?.next_follow_up_at ? <span className={overdue ? "font-semibold text-p-danger" : ""}>{date(lang, r.deal.next_follow_up_at, "short")}</span> : null}
                      {!r.deal && r.company.city ? <span>{r.company.city}</span> : null}
                    </span>
                  </Link>
                  {r.company.phone ? (
                    <a href={`tel:${r.company.phone}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-p-brand-soft text-p-brand" aria-label={fa ? "تماس" : "Call"}>
                      <Phone className="size-4" />
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {shown.length > limit ? (
            <div className="border-t border-p-line p-3 text-center">
              <Button tone="ghost" onClick={() => setLimit((l) => l + 100)}>
                {fa ? `نمایش بیشتر (${num(lang, shown.length - limit)} مانده)` : `Show more (${shown.length - limit} left)`}
              </Button>
            </div>
          ) : null}
        </Card>
      )}
      {scope !== "all" || q ? (
        <p className="text-center text-xs text-p-ink-3">
          <Pill>{fa ? `${num(lang, shown.length)} نتیجه` : `${shown.length} results`}</Pill>
        </p>
      ) : null}
      <CompanyForm open={creating} onClose={() => setCreating(false)} onSaved={(c) => router.push(`${base}/crm/${c.id}`)} />
    </div>
  );
}
