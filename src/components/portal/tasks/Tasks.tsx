"use client";

import { AlertTriangle, Building2, CalendarClock, Check, ListChecks, MapPin, Pencil, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import { date, num, pick, relativeTime, sep } from "@/lib/portal/format";
import { dueGroupLabel, taskPriorityLabel, taskStatusLabel } from "@/lib/portal/labels";
import { newId } from "@/lib/portal/store";
import type { Task } from "@/lib/portal/types";
import { checklistOf, checklistProgress, DUE_GROUPS, dueGroup, groupByDue, type ChecklistItem } from "@/lib/portal/work";
import { useExhibition } from "../ExhibitionProvider";
import { useNow, usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { usePageTour } from "../Tour";
import { Button, Card, Empty, Input, Segmented, Select, Sheet, Skeleton } from "../ui";
import { useBoardDrag } from "../useBoardDrag";
import { PageHeader } from "../crm/shared";
import { StaffAvatar } from "../people";
import { TaskForm } from "./TaskForm";

type View = "board" | "mine" | "all";
type Status = Task["status"];
const COLUMNS: Status[] = ["todo", "in_progress", "blocked", "done"];
const DONE_WINDOW = 14 * 86_400_000;

const statusDot: Record<Status, string> = {
  todo: "bg-p-ink-3",
  in_progress: "bg-p-info",
  blocked: "bg-p-danger",
  done: "bg-p-ok",
  cancelled: "bg-p-line-strong",
};

const priorityTone: Record<Task["priority"], string> = {
  urgent: "bg-p-danger-soft text-p-danger",
  high: "bg-p-warn-soft text-p-warn",
  normal: "",
  low: "bg-p-sunken text-p-ink-3",
};

/** Team tasks: a board by status, my tasks by due date, and the whole team's list. */
export function Tasks({ openId }: { openId?: string }) {
  usePageTour("tasks");
  const { lang, user, can, store, toast } = usePortal();
  const x = useExhibition();
  const router = useRouter();
  const params = useSearchParams();
  const now = useNow();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const view: View = (["board", "mine", "all"] as View[]).includes(params.get("view") as View) ? (params.get("view") as View) : "board";
  const [query, setQuery] = useState("");
  const [who, setWho] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [allDone, setAllDone] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  // undefined: follow the address (/tasks/<id>); null: closed here; a string: opened here.
  const [openLocal, setOpenLocal] = useState<string | null | undefined>(undefined);
  const board = useRef<HTMLDivElement>(null);
  const openTaskId = openLocal === undefined ? (openId ?? null) : openLocal;
  const open = openTaskId ? (x.tasks.find((t) => t.id === openTaskId) ?? null) : null;

  const move = (id: string, status: Status) => {
    const t = x.tasks.find((tt) => tt.id === id);
    if (!t || t.status === status) return;
    store.update("tasks", id, { status });
    toast(fa ? `«${t.title}» → ${taskStatusLabel[status].fa}` : `“${t.title}” → ${taskStatusLabel[status].en}`);
  };
  const { drag, cardDown, wasDrag } = useBoardDrag<Status>(move, board);

  const setView = (v: View) => router.replace(`${base}/tasks${v === "board" ? "" : `?view=${v}`}`, { scroll: false });
  const openTask = (id: string) => {
    setOpenLocal(id);
    window.history.replaceState(null, "", `${base}/tasks/${id}${view === "board" ? "" : `?view=${view}`}`);
  };
  const closeTask = () => {
    setOpenLocal(null);
    // Rewrite the address without a navigation, so the board (and any open form) stays as it is.
    window.history.replaceState(null, "", `${base}/tasks${view === "board" ? "" : `?view=${view}`}`);
  };

  const q = normalizeSearch(query);
  const filtered = useMemo(
    () =>
      x.tasks.filter((t) => {
        if (t.status === "cancelled") return false;
        if (view === "mine" && t.assignee_id !== user.id) return false;
        if (view !== "mine" && who) {
          if (who === "none" ? t.assignee_id : t.assignee_id !== who) return false;
        }
        if (priority && t.priority !== priority) return false;
        if (q) {
          const c = t.company_id ? x.companyById.get(t.company_id) : null;
          const b = t.booth_id ? x.booths.find((bb) => bb.id === t.booth_id) : null;
          const hay = normalizeSearch([t.title, t.description, c?.name_fa, c?.name_en, b?.code].filter(Boolean).join(" "));
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [x.tasks, x.companyById, x.booths, view, user.id, who, priority, q],
  );
  const openCount = x.tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;
  const mineOpen = x.tasks.filter((t) => t.assignee_id === user.id && t.status !== "done" && t.status !== "cancelled");
  const overdue = filtered.filter((t) => t.status !== "done" && dueGroup(t.due_at, new Date(now)) === "overdue").length;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        title={fa ? "کارها" : "Tasks"}
        hint={
          fa
            ? `${num(lang, openCount)} کار باز در تیم، ${num(lang, mineOpen.length)} با شما${overdue ? `${sep(lang)}${num(lang, overdue)} عقب افتاده` : ""}`
            : `${openCount} open across the team · ${mineOpen.length} yours${overdue ? `${sep(lang)}${overdue} overdue` : ""}`
        }
        actions={
          can.edit ? (
            <Button tone="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)} data-tour="tasks-new">
              {fa ? "کار جدید" : "New task"}
            </Button>
          ) : null
        }
      />

      <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div data-tour="tasks-views">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "board", label: fa ? "تابلو" : "Board" },
                { value: "mine", label: fa ? `کارهای من (${num(lang, mineOpen.length)})` : `My tasks (${mineOpen.length})` },
                { value: "all", label: fa ? "فهرست تیم" : "Team list" },
              ]}
            />
          </div>
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={fa ? "عنوان، شرکت یا کد غرفه" : "Title, company or booth code"}
              className="h-10 w-full rounded-xl border border-p-line bg-p-surface-2 ps-9 pe-3 text-sm outline-none focus:border-p-brand"
              aria-label={fa ? "جستجو" : "Search"}
            />
          </div>
          {view !== "mine" ? (
            <Select value={who} onChange={(e) => setWho(e.target.value)} compact aria-label={fa ? "مسئول" : "Assignee"}>
              <option value="">{fa ? "همه افراد" : "Everyone"}</option>
              <option value={user.id}>{fa ? "خودم" : "Me"}</option>
              <option value="none">{fa ? "بدون مسئول" : "Unassigned"}</option>
              {x.staff
                .filter((s) => s.id !== user.id && s.status !== "suspended")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name ?? s.email}
                  </option>
                ))}
            </Select>
          ) : null}
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} compact aria-label={fa ? "اولویت" : "Priority"}>
            <option value="">{fa ? "همه اولویت ها" : "Any priority"}</option>
            {(Object.keys(taskPriorityLabel) as Array<Task["priority"]>).map((p) => (
              <option key={p} value={p}>
                {taskPriorityLabel[p][lang]}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!x.ready ? (
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : view === "board" ? (
        <div ref={board} className="thin-scroll -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" data-tour="tasks-board">
          <div className="flex w-max min-w-full items-stretch gap-3 lg:grid lg:w-full lg:grid-cols-4">
            {COLUMNS.map((status) => {
              let list = filtered.filter((t) => t.status === status);
              let hidden = 0;
              if (status === "done" && !allDone) {
                const recent = list.filter((t) => now - new Date(t.completed_at ?? t.updated_at).getTime() < DONE_WINDOW);
                hidden = list.length - recent.length;
                list = recent;
              }
              list.sort((a, b) =>
                status === "done"
                  ? (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at)
                  : rank(a) - rank(b) || (a.due_at ?? "9").localeCompare(b.due_at ?? "9"),
              );
              const over = drag?.over === status;
              return (
                <section
                  key={status}
                  data-column={status}
                  className={cn(
                    "flex w-[80vw] max-w-80 shrink-0 flex-col self-start rounded-2xl border bg-p-surface-2 transition-colors sm:w-72 lg:w-auto lg:max-w-none",
                    over ? "border-p-brand bg-p-brand-soft/40" : "border-p-line",
                  )}
                >
                  <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                    <span className={cn("size-2 rounded-full", statusDot[status])} />
                    <h2 className="flex-1 text-[13px] font-semibold">{taskStatusLabel[status][lang]}</h2>
                    <span className="tabular text-xs text-p-ink-3">{num(lang, list.length)}</span>
                  </header>
                  <ul className="thin-scroll grid max-h-[calc(100dvh-19rem)] min-h-28 content-start gap-2 overflow-y-auto px-2 pb-2">
                    {list.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        now={now}
                        dragging={drag?.id === t.id}
                        onPointerDown={(e) => cardDown(e, t.id)}
                        onOpen={() => {
                          if (wasDrag()) return;
                          openTask(t.id);
                        }}
                      />
                    ))}
                    {list.length === 0 ? <li className="rounded-xl border border-dashed border-p-line px-3 py-6 text-center text-xs text-p-ink-3">{fa ? "کارت را اینجا رها کنید" : "Drop a card here"}</li> : null}
                  </ul>
                  {status === "done" && (hidden || allDone) ? (
                    <button type="button" onClick={() => setAllDone((v) => !v)} className="mx-2 mb-2 rounded-lg py-1.5 text-xs font-medium text-p-ink-3 hover:bg-p-sunken hover:text-p-ink">
                      {allDone ? (fa ? "فقط دو هفته اخیر" : "Only the last two weeks") : fa ? `${num(lang, hidden)} کار قدیمی تر` : `${hidden} older`}
                    </button>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <DueList tasks={filtered} now={now} showWho={view === "all"} onOpen={openTask} />
      )}

      {drag ? (
        <div
          className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-xl border border-p-brand bg-p-surface px-3 py-2 text-sm font-semibold shadow-[var(--p-shadow-lg)]"
          style={{ left: drag.x, top: drag.y, width: Math.min(drag.width, 260) }}
        >
          {x.tasks.find((t) => t.id === drag.id)?.title}
          {drag.over ? <span className="block text-xs font-medium text-p-brand">→ {taskStatusLabel[drag.over][lang]}</span> : null}
        </div>
      ) : null}

      <TaskSheet
        task={open}
        missing={Boolean(openTaskId) && !open && x.ready}
        onClose={closeTask}
        onEdit={(t) => {
          closeTask();
          setEditing(t);
        }}
      />
      <TaskForm open={creating} onClose={() => setCreating(false)} />
      <TaskForm open={Boolean(editing)} task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

const PRIORITY_RANK: Record<Task["priority"], number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const rank = (t: Task) => PRIORITY_RANK[t.priority];

/* --------------------------------------------------------------- Card */

function DueChip({ due, now, done }: { due: string | null; now: number; done?: boolean }) {
  const { lang } = usePortal();
  if (!due) return null;
  const g = dueGroup(due, new Date(now));
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[11px] font-medium",
        done ? "bg-p-sunken text-p-ink-3" : g === "overdue" ? "bg-p-danger-soft text-p-danger" : g === "today" ? "bg-p-warn-soft text-p-warn" : "bg-p-sunken text-p-ink-2",
      )}
    >
      <CalendarClock className="size-3" />
      {g === "today" && !done ? dueGroupLabel.today[lang] : date(lang, due, "short")}
    </span>
  );
}

function Links({ task }: { task: Task }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const c = task.company_id ? x.companyById.get(task.company_id) : null;
  const b = task.booth_id ? x.booths.find((bb) => bb.id === task.booth_id) : null;
  if (!c && !b) return null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-p-ink-3">
      {c ? (
        <span className="inline-flex min-w-0 items-center gap-1">
          <Building2 className="size-3 shrink-0" />
          <span className="truncate">{pick(lang, c.name_fa, c.name_en)}</span>
        </span>
      ) : null}
      {b ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" />
          <bdi dir="ltr">{b.code}</bdi>
        </span>
      ) : null}
    </span>
  );
}

function TaskCard({ task, now, dragging, onPointerDown, onOpen }: { task: Task; now: number; dragging: boolean; onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void; onOpen: () => void }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const who = task.assignee_id ? x.staffById.get(task.assignee_id) : null;
  const progress = checklistProgress(checklistOf(task.checklist));
  const done = task.status === "done";
  return (
    <li
      onPointerDown={onPointerDown}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "grid cursor-pointer select-none gap-1.5 rounded-xl border border-p-line bg-p-surface p-2.5 shadow-[var(--p-shadow)] transition hover:border-p-line-strong",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("min-w-0 flex-1 text-[13px] font-semibold leading-5", done && "text-p-ink-3 line-through")}>{task.title}</span>
        {who ? <StaffAvatar staff={who} size={24} /> : null}
      </div>
      <Links task={task} />
      <div className="flex flex-wrap items-center gap-1.5">
        {task.priority !== "normal" ? <span className={cn("inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-semibold", priorityTone[task.priority])}>{taskPriorityLabel[task.priority][lang]}</span> : null}
        <DueChip due={task.due_at} now={now} done={done} />
        {progress.total ? (
          <span className={cn("inline-flex h-5 items-center gap-1 rounded-full bg-p-sunken px-1.5 text-[11px] font-medium", progress.done === progress.total ? "text-p-ok" : "text-p-ink-2")}>
            <ListChecks className="size-3" />
            {num(lang, progress.done)}/{num(lang, progress.total)}
          </span>
        ) : null}
      </div>
    </li>
  );
}

/* ----------------------------------------------------------- Due list */

function DueList({ tasks, now, showWho, onOpen }: { tasks: Task[]; now: number; showWho: boolean; onOpen: (id: string) => void }) {
  const { lang, store, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done").sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at));
  const groups = groupByDue(open, (t) => t.due_at, new Date(now));
  const toggle = (t: Task) => store.update("tasks", t.id, { status: t.status === "done" ? "todo" : "done" });

  if (!tasks.length)
    return (
      <Card>
        <Empty icon={<Check className="size-6" />} title={fa ? "کاری نیست" : "Nothing to do"} hint={fa ? "کار تازه بسازید یا فیلترها را عوض کنید." : "Add a task or change the filters."} />
      </Card>
    );

  const row = (t: Task) => {
    const who = t.assignee_id ? x.staffById.get(t.assignee_id) : null;
    const progress = checklistProgress(checklistOf(t.checklist));
    const isDone = t.status === "done";
    return (
      <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          disabled={!can.edit}
          onClick={() => toggle(t)}
          aria-pressed={isDone}
          aria-label={isDone ? (fa ? "برگرداندن" : "Mark not done") : fa ? "انجام شد" : "Mark done"}
          className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 transition", isDone ? "border-p-ok bg-p-ok-soft text-p-ok" : "border-p-line-strong hover:border-p-ok")}
        >
          {isDone ? <Check className="size-3.5" /> : null}
        </button>
        <button type="button" onClick={() => onOpen(t.id)} className="grid min-w-0 flex-1 gap-1 text-start">
          <span className={cn("truncate text-sm font-medium", isDone && "text-p-ink-3 line-through")}>{t.title}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            {t.status === "in_progress" || t.status === "blocked" ? (
              <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[11px] font-medium", t.status === "blocked" ? "bg-p-danger-soft text-p-danger" : "bg-p-info-soft text-p-info")}>
                {taskStatusLabel[t.status][lang]}
              </span>
            ) : null}
            {t.priority !== "normal" ? <span className={cn("inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-semibold", priorityTone[t.priority])}>{taskPriorityLabel[t.priority][lang]}</span> : null}
            <DueChip due={t.due_at} now={now} done={isDone} />
            {progress.total ? (
              <span className="text-[11px] text-p-ink-3">
                {num(lang, progress.done)}/{num(lang, progress.total)}
              </span>
            ) : null}
            <Links task={t} />
          </span>
        </button>
        {showWho ? who ? <StaffAvatar staff={who} size={28} /> : <span className="text-[11px] text-p-ink-3">{fa ? "بدون مسئول" : "Unassigned"}</span> : null}
      </li>
    );
  };

  return (
    <div className="grid gap-3">
      {DUE_GROUPS.filter((g) => groups[g].length).map((g) => (
        <Card key={g} className="overflow-hidden p-0">
          <h2 className={cn("flex items-center gap-2 border-b border-p-line px-3 py-2 text-[13px] font-semibold", g === "overdue" && "text-p-danger")}>
            {g === "overdue" ? <AlertTriangle className="size-4" /> : null}
            {dueGroupLabel[g][lang]}
            <span className="font-normal text-p-ink-3">({num(lang, groups[g].length)})</span>
          </h2>
          <ul className="divide-y divide-p-line">{groups[g].map(row)}</ul>
        </Card>
      ))}
      {done.length ? (
        <Card className="overflow-hidden p-0">
          <button type="button" onClick={() => setShowDone((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] font-semibold text-p-ink-2 hover:bg-p-surface-2">
            <Check className="size-4 text-p-ok" />
            {fa ? `انجام شده (${num(lang, done.length)})` : `Done (${done.length})`}
            <span className="flex-1" />
            <span className="text-xs font-normal text-p-ink-3">{showDone ? (fa ? "بستن" : "Hide") : fa ? "نمایش" : "Show"}</span>
          </button>
          {showDone ? <ul className="divide-y divide-p-line border-t border-p-line">{done.slice(0, 50).map(row)}</ul> : null}
        </Card>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- Task sheet */

function TaskSheet({ task, missing, onClose, onEdit }: { task: Task | null; missing: boolean; onClose: () => void; onEdit: (t: Task) => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={Boolean(task) || missing} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={task ? task.title : fa ? "کار پیدا نشد" : "Task not found"}>
      {task ? (
        <TaskDetail task={task} onEdit={() => onEdit(task)} />
      ) : (
        <p className="text-sm text-p-ink-3">{fa ? "این کار حذف شده یا مال نمایشگاه دیگری است." : "This task was removed or belongs to another exhibition."}</p>
      )}
    </Sheet>
  );
}

function TaskDetail({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { lang, store, can, user } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const items = checklistOf(task.checklist);
  const progress = checklistProgress(items);
  const [step, setStep] = useState("");
  const company = task.company_id ? x.companyById.get(task.company_id) : null;
  const booth = task.booth_id ? x.booths.find((b) => b.id === task.booth_id) : null;
  const creator = task.created_by ? x.staffById.get(task.created_by) : null;
  const update = (p: Partial<Task>) => store.update("tasks", task.id, p);
  const setItems = (next: ChecklistItem[]) => update({ checklist: next });

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium text-p-ink-2">{fa ? "وضعیت" : "Status"}</span>
        <div className="thin-scroll -mx-1 overflow-x-auto px-1">
          <Segmented
            size="sm"
            value={task.status === "cancelled" ? "todo" : task.status}
            onChange={(s) => can.edit && update({ status: s })}
            options={COLUMNS.map((s) => ({ value: s, label: taskStatusLabel[s][lang] }))}
          />
        </div>
        {task.status === "cancelled" ? <p className="text-xs text-p-danger">{fa ? "این کار لغو شده" : "This task is cancelled"}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-p-ink-2">
            {fa ? "مسئول" : "Who"}
            {task.assignee_id ? <StaffAvatar staff={x.staffById.get(task.assignee_id)} size={18} /> : null}
          </span>
          <Select value={task.assignee_id ?? ""} disabled={!can.edit} onChange={(e) => update({ assignee_id: e.target.value || null })}>
            <option value="">{fa ? "بدون مسئول" : "Nobody yet"}</option>
            {x.staff
              .filter((s) => s.status !== "suspended" || s.id === task.assignee_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id === user.id ? (fa ? "خودم" : "Me") : (s.display_name ?? s.email)}
                </option>
              ))}
          </Select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-medium text-p-ink-2">{fa ? "اولویت" : "Priority"}</span>
          <Select value={task.priority} disabled={!can.edit} onChange={(e) => update({ priority: e.target.value as Task["priority"] })}>
            {(Object.keys(taskPriorityLabel) as Array<Task["priority"]>).map((p) => (
              <option key={p} value={p}>
                {taskPriorityLabel[p][lang]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-p-surface-2 p-3 text-[13px]">
        <div>
          <dt className="text-xs text-p-ink-3">{fa ? "سررسید" : "Due"}</dt>
          <dd className="mt-0.5 font-medium">{task.due_at ? <DueChip due={task.due_at} now={now} done={task.status === "done"} /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-p-ink-3">{fa ? "ثبت کننده" : "Created by"}</dt>
          <dd className="mt-0.5 truncate font-medium">
            <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
              {creator ? <StaffAvatar staff={creator} size={20} /> : null}
              <span className="truncate">{creator?.display_name ?? creator?.email ?? "—"}</span>
            </span>
            <span className="block text-xs font-normal text-p-ink-3">{relativeTime(lang, task.created_at)}</span>
          </dd>
        </div>
        {company ? (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-p-ink-3">{fa ? "شرکت" : "Company"}</dt>
            <dd className="mt-0.5 truncate">
              <Link href={`${base}/crm/${company.id}`} className="font-medium text-p-brand hover:underline">
                {pick(lang, company.name_fa, company.name_en)}
              </Link>
            </dd>
          </div>
        ) : null}
        {booth ? (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-p-ink-3">{fa ? "غرفه" : "Booth"}</dt>
            <dd className="mt-0.5">
              <Link href={`${base}/map?booth=${booth.id}`} className="font-medium text-p-brand hover:underline" dir="ltr">
                {booth.code}
              </Link>
            </dd>
          </div>
        ) : null}
        {task.started_at || task.completed_at ? (
          <div className="col-span-2 text-xs text-p-ink-3">
            {task.started_at ? (fa ? `شروع ${relativeTime(lang, task.started_at)}` : `Started ${relativeTime(lang, task.started_at)}`) : null}
            {task.started_at && task.completed_at ? sep(lang) : null}
            {task.completed_at ? (fa ? `انجام ${relativeTime(lang, task.completed_at)}` : `Finished ${relativeTime(lang, task.completed_at)}`) : null}
          </div>
        ) : null}
      </dl>

      {task.description ? <p className="whitespace-pre-line text-sm leading-6 text-p-ink-2">{task.description}</p> : null}

      <div className="grid gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-p-ink-2">
          <ListChecks className="size-4" />
          {fa ? "چک لیست" : "Checklist"}
          {progress.total ? <span className="text-xs font-normal text-p-ink-3">{`${num(lang, progress.done)}/${num(lang, progress.total)}`}</span> : null}
        </span>
        {items.length ? (
          <ul className="grid gap-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-xl bg-p-surface-2 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={!can.edit}
                  onChange={(e) => setItems(items.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)))}
                  className="size-4 accent-[var(--p-brand)]"
                  aria-label={item.text}
                />
                <span className={cn("flex-1 text-sm", item.done && "text-p-ink-3 line-through")}>{item.text}</span>
                {can.edit ? (
                  <button type="button" onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="grid size-7 place-items-center rounded-lg text-p-ink-3 hover:bg-p-danger-soft hover:text-p-danger" aria-label={fa ? "حذف" : "Remove"}>
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {can.edit ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = step.trim();
              if (!text) return;
              setItems([...items, { id: newId(), text, done: false }]);
              setStep("");
            }}
          >
            <Input value={step} onChange={(e) => setStep(e.target.value)} placeholder={fa ? "مرحله تازه و Enter" : "Add a step and press Enter"} />
            <Button type="submit" tone="quiet" disabled={!step.trim()}>
              {fa ? "افزودن" : "Add"}
            </Button>
          </form>
        ) : null}
      </div>

      {can.edit ? (
        <div className="flex flex-wrap justify-between gap-2 border-t border-p-line pt-3">
          {task.status !== "cancelled" ? (
            <Button tone="ghost" onClick={() => update({ status: "cancelled" })} className="text-p-danger">
              {fa ? "لغو این کار" : "Cancel this task"}
            </Button>
          ) : (
            <Button tone="ghost" onClick={() => update({ status: "todo" })}>
              {fa ? "برگرداندن کار" : "Restore task"}
            </Button>
          )}
          <Button icon={<Pencil className="size-4" />} onClick={onEdit}>
            {fa ? "ویرایش کامل" : "Edit everything"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
