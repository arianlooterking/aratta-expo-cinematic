"use client";

import { Building2, Search, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { area, pick, sep } from "@/lib/portal/format";
import { boothStatusLabel, dealStageLabel, t } from "@/lib/portal/i18n";
import { useExhibition } from "./ExhibitionProvider";
import { usePortal } from "./PortalProvider";
import { Kbd } from "./ui";

export function normalizeSearch(s: string) {
  return s
    .replace(/[‌‏‎]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type Result =
  | { kind: "booth"; id: string; title: string; hint: string; tone: string }
  | { kind: "deal"; id: string; boothId: string | null; title: string; hint: string };

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <Palette onClose={onClose} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const { lang } = usePortal();
  const { booths, deals, dealById, companyById, boothsByDeal, halls } = useExhibition();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hallName = useMemo(() => new Map(halls.map((h) => [h.id, pick(lang, h.name_fa, h.name_en)])), [halls, lang]);

  const results = useMemo<Result[]>(() => {
    const q = normalizeSearch(query);
    if (!q) return [];
    const out: Result[] = [];
    for (const b of booths) {
      const company = b.deal_id ? companyById.get(dealById.get(b.deal_id)?.company_id ?? "") : undefined;
      const text = normalizeSearch(`${b.code} ${company?.name_fa ?? ""} ${company?.name_en ?? ""}`);
      if (text.includes(q)) {
        out.push({
          kind: "booth",
          id: b.id,
          title: `${b.code}${company ? `${sep(lang)}${pick(lang, company.name_fa, company.name_en)}` : ""}`,
          hint: `${hallName.get(b.hall_id) ?? ""}${sep(lang)}${area(lang, b.area_m2)}${sep(lang)}${boothStatusLabel[b.status][lang]}`,
          tone: b.status,
        });
      }
    }
    for (const d of deals) {
      if (boothsByDeal.has(d.id)) continue;
      const company = companyById.get(d.company_id);
      if (!company) continue;
      if (normalizeSearch(`${company.name_fa} ${company.name_en ?? ""}`).includes(q)) {
        out.push({ kind: "deal", id: d.id, boothId: null, title: pick(lang, company.name_fa, company.name_en), hint: dealStageLabel[d.stage][lang] });
      }
    }
    return out.slice(0, 30);
  }, [query, booths, deals, dealById, companyById, boothsByDeal, hallName, lang]);

  const go = (r: Result) => {
    onClose();
    if (r.kind === "booth") router.push(`/${lang}/staff/map?booth=${r.id}`);
    else router.push(`/${lang}/staff/map?assign=${r.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[10dvh]" role="dialog" aria-modal="true" aria-label={t(lang, "search")}>
      <div className="animate-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="animate-sheet relative w-full max-w-xl overflow-hidden rounded-2xl border border-p-line bg-p-surface shadow-[var(--p-shadow-lg)]">
        <div className="flex items-center gap-3 border-b border-p-line px-4">
          <Search className="size-5 text-p-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              }
              if (e.key === "Enter" && results[active]) go(results[active]);
            }}
            placeholder={t(lang, "search")}
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-p-ink-3"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="thin-scroll max-h-[55dvh] overflow-y-auto p-1.5">
          {query && results.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-p-ink-3">{lang === "fa" ? "چیزی پیدا نشد" : "Nothing found"}</p>
          ) : null}
          {!query ? (
            <p className="px-3 py-8 text-center text-sm text-p-ink-3">
              {lang === "fa" ? "کد غرفه (مثل B04) یا نام شرکت را بنویسید" : "Type a booth code (like B04) or a company name"}
            </p>
          ) : null}
          {results.map((r, index) => (
            <button
              key={`${r.kind}:${r.id}`}
              type="button"
              onMouseEnter={() => setActive(index)}
              onClick={() => go(r)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start", index === active ? "bg-p-brand-soft" : "hover:bg-p-sunken")}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-p-sunken text-p-ink-2">
                {r.kind === "booth" ? <Square className="size-4" /> : <Building2 className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.title}</span>
                <span className="block truncate text-xs text-p-ink-3">{r.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
