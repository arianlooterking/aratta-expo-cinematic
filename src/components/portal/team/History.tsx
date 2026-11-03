"use client";

import { History as HistoryIcon, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { departmentLabels, roleLabels, staffStatusLabels } from "@/lib/platform/labels";
import { date, dayTime, pick } from "@/lib/portal/format";
import { exhibitionStatusLabel } from "@/lib/portal/i18n";
import { changedFields, entryTitle, fieldLabel, listDiff } from "@/lib/portal/team";
import type { AuditEntry, Department, StaffRole, Team } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, usePortal } from "../PortalProvider";
import { personName, StaffAvatar } from "../people";
import { Button, Card, Empty, Segmented, Skeleton } from "../ui";

type Scope = "all" | "staff_members" | "teams" | "exhibitions";

/** Recent changes to people, teams and exhibitions, newest first. */
export function History({ tables, rowId, compact, version }: { tables: string[]; rowId?: string; compact?: boolean; version?: string }) {
  const { lang, store, can } = usePortal();
  const fa = lang === "fa";
  const [scope, setScope] = useState<Scope>("all");
  const [tick, setTick] = useState(0);
  const wanted = (scope === "all" ? tables : [scope]).join(",");
  const key = `${wanted}|${rowId ?? ""}|${tick}|${version ?? ""}`;
  const [state, setState] = useState<{ key: string; ok: boolean; entries: AuditEntry[]; error?: string } | null>(null);

  useEffect(() => {
    if (!can.manage) return;
    let cancelled = false;
    store.history({ tables: wanted.split(","), rowId, limit: compact ? 15 : 150 }).then((res) => {
      if (cancelled) return;
      setState(res.ok ? { key, ok: true, entries: res.entries } : { key, ok: false, entries: [], error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [key, wanted, rowId, compact, store, can.manage]);
  const status = !state || state.key !== key ? "loading" : state.ok ? "ready" : "error";
  const entries = state?.entries ?? [];

  if (!can.manage) {
    return (
      <Card>
        <Empty icon={<HistoryIcon className="size-6" />} title={fa ? "تاریخچه فقط برای مدیران" : "History is for managers"} hint={fa ? "مدیر، مدیر سامانه و مالک تاریخچه تغییرات را می بینند." : "Managers, admins and owners can read the change history."} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented<Scope>
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: fa ? "همه" : "All" },
              { value: "staff_members", label: fa ? "کارکنان" : "People" },
              { value: "teams", label: fa ? "تیم ها" : "Teams" },
              { value: "exhibitions", label: fa ? "نمایشگاه ها" : "Exhibitions" },
            ]}
          />
          <Button
            size="sm"
            tone="ghost"
            icon={<RefreshCw className="size-4" />}
            onClick={() => setTick((t) => t + 1)}
          >
            {fa ? "تازه سازی" : "Refresh"}
          </Button>
        </div>
      ) : null}
      {status === "loading" ? (
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : status === "error" ? (
        <Card className="p-4 text-sm text-p-danger">{fa ? `تاریخچه باز نشد: ${state?.error}` : `Couldn't load history: ${state?.error}`}</Card>
      ) : !entries.length ? (
        <Card>
          <Empty icon={<HistoryIcon className="size-6" />} title={fa ? "هنوز تغییری ثبت نشده" : "No changes yet"} hint={fa ? "هر دعوت، تغییر نقش و ویرایش تیم اینجا ثبت می شود." : "Every invite, role change and team edit shows up here."} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ol className="divide-y divide-p-line">
            {entries.map((e) => (
              <Entry key={e.id} entry={e} />
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function Entry({ entry }: { entry: AuditEntry }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const x = useExhibition();
  const teams = useCollection("teams").rows as Team[];
  const actor = entry.actor_id ? x.staffById.get(entry.actor_id) : null;
  const subject =
    entry.table_name === "staff_members"
      ? (() => {
          const person = entry.row_id ? x.staffById.get(entry.row_id) : undefined;
          return person ? personName(person, lang) : entryTitle(entry.changes) ?? (fa ? "همکار سابق" : "Former colleague");
        })()
      : entry.table_name === "teams"
        ? (() => {
            const t = teams.find((tt) => tt.id === entry.row_id);
            return t ? pick(lang, t.name_fa, t.name_en) : entryTitle(entry.changes) ?? (fa ? "تیم حذف شده" : "Removed team");
          })()
        : entry.table_name === "exhibitions"
          ? (() => {
              const ex = x.exhibitions.find((e) => e.id === entry.row_id);
              return ex ? pick(lang, ex.name_fa, ex.name_en) : entryTitle(entry.changes) ?? "";
            })()
          : entryTitle(entry.changes) ?? entry.table_name;
  const kind = { staff_members: fa ? "همکار" : "colleague", teams: fa ? "تیم" : "team", exhibitions: fa ? "نمایشگاه" : "exhibition" }[entry.table_name] ?? entry.table_name;
  const verb =
    entry.action === "insert"
      ? entry.table_name === "staff_members"
        ? fa ? "دعوت کرد" : "invited"
        : fa ? "ساخت" : "created"
      : entry.action === "delete"
        ? entry.table_name === "staff_members"
          ? fa ? "دسترسی را حذف کرد" : "removed access for"
          : fa ? "حذف کرد" : "deleted"
        : fa ? "تغییر داد" : "changed";
  const lines = entry.action === "update" ? changedFields(entry.changes) : [];

  const show = (field: string, value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (field === "role") return roleLabels[value as StaffRole]?.[lang] ?? String(value);
    if (field === "status") return (staffStatusLabels as Record<string, Record<string, string>>)[String(value)]?.[lang] ?? exhibitionStatusLabel[value as keyof typeof exhibitionStatusLabel]?.[lang] ?? String(value);
    if (field === "departments" && Array.isArray(value)) return value.map((d) => departmentLabels[d as Department]?.[lang] ?? d).join("، ") || "—";
    if (field === "lead_id") return personName(x.staffById.get(String(value)), lang);
    if (field === "exhibition_id") {
      const ex = x.exhibitions.find((e) => e.id === value);
      return ex ? pick(lang, ex.name_fa, ex.name_en) : "—";
    }
    if (field === "archived_at") return fa ? "بایگانی شد" : "archived";
    if (field === "vat_rate" && typeof value === "number") return `${Math.round(value * 1000) / 10}%`;
    if (/(_on|_date)$/.test(field) && typeof value === "string") return date(lang, value);
    if (field === "avatar_url") return fa ? "تصویر تازه" : "new picture";
    if (Array.isArray(value)) return value.join("، ") || "—";
    return String(value);
  };

  return (
    <li className="flex gap-3 px-4 py-3">
      <StaffAvatar staff={actor} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <b className="font-semibold">{actor ? personName(actor, lang) : fa ? "سامانه" : "System"}</b> {fa ? `${kind} «${subject}» را ${verb}` : `${verb} ${kind} “${subject}”`}
        </p>
        {lines.length ? (
          <ul className="mt-1 space-y-0.5 text-xs text-p-ink-2">
            {lines.map((l) => {
              if (l.field === "member_ids") {
                const d = listDiff(l.from, l.to);
                return (
                  <li key={l.field}>
                    {d.added.length ? `${fa ? "اضافه شد" : "Added"}: ${d.added.map((id) => personName(x.staffById.get(id), lang)).join("، ")}` : null}
                    {d.added.length && d.removed.length ? " · " : null}
                    {d.removed.length ? `${fa ? "خارج شد" : "Removed"}: ${d.removed.map((id) => personName(x.staffById.get(id), lang)).join("، ")}` : null}
                    {!d.added.length && !d.removed.length ? (fa ? "ترتیب اعضا" : "Member order") : null}
                  </li>
                );
              }
              return (
                <li key={l.field}>
                  <span className="text-p-ink-3">{fieldLabel(l.field, lang)}:</span> <bdi>{show(l.field, l.from)}</bdi> <span aria-hidden>{fa ? "←" : "→"}</span> <bdi className="font-medium text-p-ink">{show(l.field, l.to)}</bdi>
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className="mt-1 text-[11px] text-p-ink-3">{dayTime(lang, entry.occurred_at)}</p>
      </div>
    </li>
  );
}
