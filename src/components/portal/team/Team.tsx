"use client";

import { ChevronLeft, ChevronRight, Download, History as HistoryIcon, KeyRound, Search, UserPlus, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Constants } from "@/lib/platform/database.types";
import { departmentLabels, roleLabels, staffStatusLabels } from "@/lib/platform/labels";
import { toCsv } from "@/lib/portal/finance";
import { date, num, pick, relativeTime } from "@/lib/portal/format";
import { ROLE_ORDER, workloadFor } from "@/lib/portal/team";
import type { StaffMember, Team as TeamRow } from "@/lib/portal/types";
import { downloadText, PageHeader } from "../crm/shared";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, useNow, usePortal } from "../PortalProvider";
import { personName, StaffAvatar } from "../people";
import { normalizeSearch } from "../SearchPalette";
import { Button, Card, Empty, Input, Segmented, Select, Skeleton } from "../ui";
import { History } from "./History";
import { InviteSheet } from "./InviteSheet";
import { RolesMatrix } from "./RolesMatrix";
import { DepartmentChips, RolePill, Stat, StatusPill, TeamChip } from "./shared";
import { TeamsBoard } from "./TeamsBoard";

type Tab = "people" | "teams" | "roles" | "history";

export function Team() {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabs: Tab[] = ["people", "teams", "roles", ...(can.manage ? (["history"] as const) : [])];
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && tabs.includes(requested) ? requested : "people";
  const setTab = (next: Tab) => {
    const q = new URLSearchParams(params.toString());
    if (next === "people") q.delete("tab");
    else q.set("tab", next);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  const [inviting, setInviting] = useState(false);
  const x = useExhibition();
  const teams = useCollection("teams");

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        eyebrow={fa ? "سازمان" : "Organisation"}
        title={fa ? "تیم و کارکنان" : "Team and staff"}
        hint={
          fa
            ? `${num(lang, x.staff.filter((s) => s.status === "active").length)} همکار فعال در ${num(lang, teams.rows.filter((t) => !t.archived_at).length)} تیم`
            : `${x.staff.filter((s) => s.status === "active").length} active colleagues in ${teams.rows.filter((t) => !t.archived_at).length} teams`
        }
        actions={
          can.admin ? (
            <Button tone="primary" icon={<UserPlus className="size-4" />} onClick={() => setInviting(true)}>
              {fa ? "دعوت همکار" : "Invite colleague"}
            </Button>
          ) : null
        }
      />
      <div className="thin-scroll -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "people", label: fa ? "کارکنان" : "People", icon: <Users className="size-4" /> },
            { value: "teams", label: fa ? "تیم ها" : "Teams", icon: <UsersRound className="size-4" /> },
            { value: "roles", label: fa ? "نقش ها و دسترسی" : "Roles and access", icon: <KeyRound className="size-4" /> },
            ...(can.manage ? [{ value: "history" as const, label: fa ? "تاریخچه" : "History", icon: <HistoryIcon className="size-4" /> }] : []),
          ]}
        />
      </div>
      {tab === "people" ? <People teams={teams.rows as TeamRow[]} onInvite={() => setInviting(true)} /> : null}
      {tab === "teams" ? <TeamsBoard /> : null}
      {tab === "roles" ? <RolesMatrix /> : null}
      {tab === "history" ? <History tables={["staff_members", "teams", "exhibitions"]} /> : null}
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

/* --------------------------------------------------------------- People */

function People({ teams, onInvite }: { teams: TeamRow[]; onInvite: () => void }) {
  const { lang, can, user } = usePortal();
  const fa = lang === "fa";
  const x = useExhibition();
  const now = useNow();
  const base = `/${lang}/staff`;
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [dept, setDept] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("");

  const teamsByMember = useMemo(() => {
    const map = new Map<string, TeamRow[]>();
    for (const t of teams) {
      if (t.archived_at) continue;
      for (const id of t.member_ids) map.set(id, [...(map.get(id) ?? []), t]);
    }
    return map;
  }, [teams]);

  const rows = useMemo(
    () =>
      x.staff.map((s) => ({
        staff: s,
        teams: teamsByMember.get(s.id) ?? [],
        work: workloadFor(s.id, x, now),
        search: normalizeSearch([s.display_name, s.email, s.job_title, s.phone, ...(s.skills ?? []), ...s.departments.map((d) => departmentLabels[d][lang])].filter(Boolean).join(" ")),
      })),
    [x, teamsByMember, now, lang],
  );

  const q = normalizeSearch(query);
  const shown = rows
    .filter((r) => {
      if (q && !r.search.includes(q)) return false;
      if (role && r.staff.role !== role) return false;
      if (dept && !r.staff.departments.includes(dept as StaffMember["departments"][number])) return false;
      if (team === "none" ? r.teams.length > 0 : team && !r.teams.some((t) => t.id === team)) return false;
      if (status && r.staff.status !== status) return false;
      return true;
    })
    .sort((a, b) => {
      const order = { active: 0, invited: 1, suspended: 2 } as const;
      return (
        order[a.staff.status] - order[b.staff.status] ||
        ROLE_ORDER.indexOf(a.staff.role) - ROLE_ORDER.indexOf(b.staff.role) ||
        personName(a.staff, lang).localeCompare(personName(b.staff, lang), "fa")
      );
    });

  const counts = {
    active: x.staff.filter((s) => s.status === "active").length,
    invited: x.staff.filter((s) => s.status === "invited").length,
    suspended: x.staff.filter((s) => s.status === "suspended").length,
    noTeam: x.staff.filter((s) => s.status !== "suspended" && !teamsByMember.has(s.id)).length,
  };

  const exportCsv = () => {
    const header = fa
      ? ["نام", "ایمیل", "تلفن", "سمت", "نقش", "وضعیت", "واحدها", "تیم ها", "شروع همکاری", "مهارت ها"]
      : ["Name", "Email", "Phone", "Job title", "Role", "Status", "Departments", "Teams", "Start date", "Skills"];
    downloadText(
      `team-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([
        header,
        ...shown.map((r) => [
          personName(r.staff, lang),
          r.staff.email,
          r.staff.phone,
          r.staff.job_title,
          roleLabels[r.staff.role][lang],
          staffStatusLabels[r.staff.status][lang],
          r.staff.departments.map((d) => departmentLabels[d][lang]).join("، "),
          r.teams.map((t) => pick(lang, t.name_fa, t.name_en)).join("، "),
          r.staff.start_date,
          (r.staff.skills ?? []).join("، "),
        ]),
      ]),
      "text/csv",
    );
  };

  const ready = x.ready;
  const Chevron = fa ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={fa ? "همکاران فعال" : "Active"} value={num(lang, counts.active)} tone="ok" />
        <Stat label={fa ? "منتظر اولین ورود" : "Waiting to sign in"} value={num(lang, counts.invited)} tone={counts.invited ? "warn" : undefined} />
        <Stat label={fa ? "دسترسی متوقف" : "Suspended"} value={num(lang, counts.suspended)} tone={counts.suspended ? "danger" : undefined} />
        <Stat label={fa ? "بدون تیم" : "Not on a team"} value={num(lang, counts.noTeam)} hint={counts.noTeam ? (fa ? "از زبانه تیم ها اضافه کنید" : "Add them from the Teams tab") : undefined} />
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fa ? "جستجوی نام، ایمیل، تلفن یا مهارت" : "Search name, email, phone or skill"} className="ps-9" aria-label={fa ? "جستجو" : "Search"} />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <Select compact value={role} onChange={(e) => setRole(e.target.value)} aria-label={fa ? "نقش" : "Role"}>
              <option value="">{fa ? "همه نقش ها" : "All roles"}</option>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r][lang]}
                </option>
              ))}
            </Select>
            <Select compact value={dept} onChange={(e) => setDept(e.target.value)} aria-label={fa ? "واحد" : "Department"}>
              <option value="">{fa ? "همه واحدها" : "All departments"}</option>
              {Constants.public.Enums.department.map((d) => (
                <option key={d} value={d}>
                  {departmentLabels[d][lang]}
                </option>
              ))}
            </Select>
            <Select compact value={team} onChange={(e) => setTeam(e.target.value)} aria-label={fa ? "تیم" : "Team"}>
              <option value="">{fa ? "همه تیم ها" : "All teams"}</option>
              {teams
                .filter((t) => !t.archived_at)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {pick(lang, t.name_fa, t.name_en)}
                  </option>
                ))}
              <option value="none">{fa ? "بدون تیم" : "Not on a team"}</option>
            </Select>
            <Select compact value={status} onChange={(e) => setStatus(e.target.value)} aria-label={fa ? "وضعیت" : "Status"}>
              <option value="">{fa ? "همه وضعیت ها" : "Any status"}</option>
              {Constants.public.Enums.staff_status.map((s) => (
                <option key={s} value={s}>
                  {staffStatusLabels[s][lang]}
                </option>
              ))}
            </Select>
          </div>
          <Button icon={<Download className="size-4" />} onClick={exportCsv}>
            {fa ? "خروجی اکسل" : "Export CSV"}
          </Button>
        </div>
      </Card>

      {!ready ? (
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !shown.length ? (
        <Card>
          <Empty
            icon={<Users className="size-6" />}
            title={fa ? "کسی با این مشخصات نیست" : "Nobody matches"}
            hint={fa ? "جستجو یا فیلترها را تغییر دهید." : "Try a different search or filter."}
            action={
              can.admin ? (
                <Button tone="primary" icon={<UserPlus className="size-4" />} onClick={onInvite}>
                  {fa ? "دعوت همکار" : "Invite colleague"}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_1.5rem] gap-4 border-b border-p-line bg-p-surface-2 px-4 py-2 text-xs font-medium text-p-ink-3 lg:grid">
            <span>{fa ? "همکار" : "Colleague"}</span>
            <span>{fa ? "نقش" : "Role"}</span>
            <span>{fa ? "تیم ها و واحدها" : "Teams and departments"}</span>
            <span>{fa ? `کار در ${x.exhibition ? pick(lang, x.exhibition.name_fa, x.exhibition.name_en) : "نمایشگاه"}` : `Work in ${x.exhibition ? pick(lang, x.exhibition.name_fa, x.exhibition.name_en) : "this exhibition"}`}</span>
            <span>{fa ? "وضعیت" : "Status"}</span>
            <span />
          </div>
          <ul className="divide-y divide-p-line">
            {shown.map((r) => (
              <li key={r.staff.id}>
                <Link
                  href={`${base}/team/${r.staff.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-p-surface-2 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_1.5rem] lg:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <StaffAvatar staff={r.staff} size={40} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        <span className="truncate">{r.staff.display_name ?? (fa ? "هنوز وارد نشده" : "Not signed in yet")}</span>
                        {r.staff.id === user.id ? <span className="shrink-0 text-xs font-normal text-p-ink-3">{fa ? "(شما)" : "(you)"}</span> : null}
                      </span>
                      <span className="block truncate text-xs text-p-ink-3">{r.staff.job_title ? `${r.staff.job_title} · ` : ""}<bdi dir="ltr">{r.staff.email}</bdi></span>
                    </span>
                  </span>
                  <span className="lg:hidden">
                    <StatusPill status={r.staff.status} />
                  </span>
                  <span className="col-span-2 flex flex-wrap items-center gap-1.5 lg:col-span-1">
                    <RolePill role={r.staff.role} />
                  </span>
                  <span className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 lg:col-span-1">
                    {r.teams.map((t) => (
                      <TeamChip key={t.id} team={t} lead={t.lead_id === r.staff.id} />
                    ))}
                    {!r.teams.length ? <DepartmentChips departments={r.staff.departments} /> : null}
                  </span>
                  <span className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-p-ink-2 lg:col-span-1">
                    <WorkBit value={r.work.booths} label={fa ? "غرفه" : "booths"} />
                    <WorkBit value={r.work.openTasks} label={fa ? "کار باز" : "open tasks"} danger={r.work.overdueTasks > 0} />
                    <WorkBit value={r.work.openDeals} label={fa ? "پیگیری فروش" : "deals"} />
                  </span>
                  <span className="hidden flex-col items-start gap-1 lg:flex">
                    <StatusPill status={r.staff.status} />
                    <span className="text-[11px] text-p-ink-3">
                      {r.staff.last_seen_at && now
                        ? `${fa ? "آخرین حضور" : "Seen"} ${relativeTime(lang, r.staff.last_seen_at, new Date(now))}`
                        : r.staff.status === "invited"
                          ? `${fa ? "دعوت" : "Invited"} ${date(lang, r.staff.created_at, "short")}`
                          : ""}
                    </span>
                  </span>
                  <Chevron className="hidden size-4 text-p-ink-3 lg:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function WorkBit({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  const { lang } = usePortal();
  return (
    <span className={cn("whitespace-nowrap", !value && "text-p-ink-3", danger && "font-semibold text-p-danger")}>
      <b className="tabular-nums">{num(lang, value)}</b> {label}
    </span>
  );
}
