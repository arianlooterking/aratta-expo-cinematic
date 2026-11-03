"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { pick } from "@/lib/portal/format";
import { taskPriorityLabel, taskStatusLabel } from "@/lib/portal/labels";
import { newId } from "@/lib/portal/store";
import type { Booth, Company, Task } from "@/lib/portal/types";
import { checklistOf, type ChecklistItem } from "@/lib/portal/work";
import { useExhibition } from "../ExhibitionProvider";
import { DateQuick, PickerField, dayToIso, isoToDay } from "../fields";
import { usePortal } from "../PortalProvider";
import { Button, Field, IconButton, Input, Segmented, Select, Sheet, Textarea } from "../ui";

const PRIORITIES = Object.keys(taskPriorityLabel) as Array<keyof typeof taskPriorityLabel>;
const STATUSES = Object.keys(taskStatusLabel) as Array<keyof typeof taskStatusLabel>;

/** Create or edit a team task, with assignee, due date, priority, links and a checklist. */
export function TaskForm({
  open,
  onClose,
  task,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  preset?: { company?: Company | null; booth?: Booth | null; title?: string };
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={task ? (fa ? "ویرایش کار" : "Edit task") : fa ? "کار جدید" : "New task"}>
      {open ? <Body task={task ?? null} preset={preset} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Body({ task, preset, onClose }: { task: Task | null; preset?: { company?: Company | null; booth?: Booth | null; title?: string }; onClose: () => void }) {
  const { lang, store, toast, user, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "normal");
  const [due, setDue] = useState<string | null>(isoToDay(task?.due_at) ?? null);
  const [company, setCompany] = useState<Company | null>(task?.company_id ? (x.companyById.get(task.company_id) ?? null) : (preset?.company ?? null));
  const [booth, setBooth] = useState<Booth | null>(task?.booth_id ? (x.booths.find((b) => b.id === task.booth_id) ?? null) : (preset?.booth ?? null));
  const [items, setItems] = useState<ChecklistItem[]>(checklistOf(task?.checklist));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const staff = x.staff.filter((s) => s.status !== "suspended");

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((list) => [...list, { id: newId(), text, done: false }]);
    setDraft("");
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const title = String(f.get("title") ?? "").trim();
        if (!title) return;
        setBusy(true);
        const fields = {
          title,
          description: String(f.get("description") ?? "").trim() || null,
          assignee_id: String(f.get("assignee_id") || "") || null,
          status: String(f.get("status") ?? task?.status ?? "todo") as Task["status"],
          priority,
          due_at: dayToIso(due, 17),
          company_id: company?.id ?? null,
          booth_id: booth?.id ?? null,
          deal_id: booth?.deal_id ?? (company ? (x.deals.find((d) => d.company_id === company.id)?.id ?? null) : null),
          checklist: items,
        };
        const res = task
          ? await store.update("tasks", task.id, fields)
          : await store.insert("tasks", { id: newId(), exhibition_id: x.exhibition?.id ?? null, created_by: user.id, ...fields });
        setBusy(false);
        if (res.ok) {
          const person = fields.assignee_id ? x.staffById.get(fields.assignee_id) : null;
          toast(
            task
              ? fa
                ? "ذخیره شد"
                : "Saved"
              : person && person.id !== user.id
                ? fa
                  ? `به ${person.display_name ?? person.email} سپرده شد و خبردار شد`
                  : `Given to ${person.display_name ?? person.email}, who has been notified`
                : fa
                  ? "کار ثبت شد"
                  : "Task added",
          );
          onClose();
        }
      }}
    >
      <Field label={fa ? "چه کاری؟ *" : "What needs doing? *"}>
        <Input name="title" required autoFocus defaultValue={task?.title ?? preset?.title ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={fa ? "مسئول" : "Who"}>
          <Select name="assignee_id" defaultValue={task?.assignee_id ?? user.id}>
            <option value="">{fa ? "بدون مسئول" : "Nobody yet"}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === user.id ? (fa ? "خودم" : "Me") : (s.display_name ?? s.email)}
                {s.job_title ? ` · ${s.job_title}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "وضعیت" : "Status"}>
          <Select name="status" defaultValue={task?.status ?? "todo"} disabled={!can.edit}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {taskStatusLabel[s][lang]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium text-p-ink-2">{fa ? "اولویت" : "Priority"}</span>
        <Segmented size="sm" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: taskPriorityLabel[p][lang] }))} />
      </div>
      <DateQuick label={fa ? "سررسید" : "Due"} value={due} onChange={setDue} />
      <Field label={fa ? "توضیح" : "Details"}>
        <Textarea name="description" defaultValue={task?.description ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={fa ? "مربوط به شرکت" : "About a company"}>
          <PickerField
            value={company}
            items={x.companies}
            getKey={(c) => c.id}
            getLabel={(c) => pick(lang, c.name_fa, c.name_en)}
            onChange={setCompany}
            clearable
            placeholder={fa ? "اختیاری" : "Optional"}
            emptyText={fa ? "شرکتی پیدا نشد" : "No company found"}
          />
        </Field>
        <Field label={fa ? "مربوط به غرفه" : "About a booth"}>
          <PickerField
            value={booth}
            items={x.booths}
            getKey={(b) => b.id}
            getLabel={(b) => b.code}
            getHint={(b) => {
              const d = b.deal_id ? x.dealById.get(b.deal_id) : null;
              const c = d ? x.companyById.get(d.company_id) : null;
              return c ? pick(lang, c.name_fa, c.name_en) : null;
            }}
            onChange={setBooth}
            clearable
            placeholder={fa ? "اختیاری" : "Optional"}
            emptyText={fa ? "غرفه ای پیدا نشد" : "No booth found"}
          />
        </Field>
      </div>
      <div className="grid gap-2">
        <span className="text-[13px] font-medium text-p-ink-2">{fa ? "چک لیست" : "Checklist"}</span>
        {items.length ? (
          <ul className="grid gap-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-xl bg-p-surface-2 px-2 py-1">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => setItems((list) => list.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)))}
                  className="size-4 accent-[var(--p-brand)]"
                  aria-label={item.text}
                />
                <span className={item.done ? "flex-1 text-sm text-p-ink-3 line-through" : "flex-1 text-sm"}>{item.text}</span>
                <IconButton size="sm" label={fa ? "حذف" : "Remove"} onClick={() => setItems((list) => list.filter((i) => i.id !== item.id))}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder={fa ? "مرحله تازه و Enter" : "Add a step and press Enter"}
          />
          <IconButton label={fa ? "افزودن مرحله" : "Add step"} tone="quiet" onClick={addItem}>
            <Plus className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={busy}>
          {task ? (fa ? "ذخیره" : "Save") : fa ? "ثبت کار" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
