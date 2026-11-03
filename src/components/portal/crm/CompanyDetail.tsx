"use client";

import {
  ArrowRight,
  Building2,
  CalendarClock,
  Globe,
  HandCoins,
  ListTodo,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { compact, date, money, num, pick, relativeTime } from "@/lib/portal/format";
import { activityKindLabel, companyKindLabel, companyPriorityLabel, invoiceKindLabel, invoiceStatusLabel, paymentMethodLabel, taskStatusLabel } from "@/lib/portal/labels";
import { ZERO_BALANCE } from "@/lib/portal/money";
import { newId } from "@/lib/portal/store";
import type { Contact, Deal } from "@/lib/portal/types";
import { stagePatch } from "@/lib/portal/work";
import { PaymentForm } from "../accounting/PaymentForm";
import { useExhibition } from "../ExhibitionProvider";
import { DateQuick, MoneyInput, dayToIso, isoToDay } from "../fields";
import { useCollection, useNow, usePortal } from "../PortalProvider";
import { usePageTour } from "../Tour";
import { TaskForm } from "../tasks/TaskForm";
import { Button, Card, Empty, Field, IconButton, Input, Pill, Select, Sheet, Skeleton } from "../ui";
import { ActivityForm } from "./ActivityForm";
import { CompanyForm } from "./CompanyForm";
import { Avatar, STAGES, StagePill } from "./shared";
import { dealStageLabel } from "@/lib/portal/i18n";

export function CompanyDetail({ id }: { id: string }) {
  usePageTour("company");
  const { lang, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const company = x.companyById.get(id) ?? null;
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [tasking, setTasking] = useState(false);
  const [paying, setPaying] = useState(false);

  if (!x.ready) return <DetailSkeleton />;
  if (!company)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <Empty
            icon={<Building2 className="size-6" />}
            title={fa ? "این شرکت پیدا نشد" : "Company not found"}
            action={
              <Link href={`${base}/crm`}>
                <Button>{fa ? "بازگشت به شرکت ها" : "Back to companies"}</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );

  const owner = company.owner_id ? x.staffById.get(company.owner_id) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:py-7">
      <Link href={`${base}/crm`} className="inline-flex items-center gap-1.5 text-[13px] text-p-ink-3 hover:text-p-ink">
        <ArrowRight className="size-4 ltr:rotate-180" />
        {fa ? "شرکت ها" : "Companies"}
      </Link>

      <Card className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-p-brand-soft text-p-brand">
            <Building2 className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">{pick(lang, company.name_fa, company.name_en)}</h1>
              <Pill>{companyKindLabel[company.kind][lang]}</Pill>
              {company.priority !== "normal" ? (
                <Pill tone={company.priority === "low" ? "neutral" : "gold"}>
                  <Star className="size-3" />
                  {companyPriorityLabel[company.priority as keyof typeof companyPriorityLabel]?.[lang] ?? company.priority}
                </Pill>
              ) : null}
            </div>
            {fa && company.name_en ? <p className="mt-0.5 text-sm text-p-ink-3" dir="ltr">{company.name_en}</p> : null}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-p-ink-2">
              {company.sector ? <span>{company.sector}</span> : null}
              {company.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {company.city}
                </span>
              ) : null}
              {company.phone ? (
                <a href={`tel:${company.phone}`} className="inline-flex items-center gap-1 hover:text-p-brand">
                  <Phone className="size-3.5" />
                  <bdi dir="ltr">{company.phone}</bdi>
                </a>
              ) : null}
              {company.email ? (
                <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1 hover:text-p-brand">
                  <Mail className="size-3.5" />
                  <bdi dir="ltr">{company.email}</bdi>
                </a>
              ) : null}
              {company.website ? (
                <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-p-brand">
                  <Globe className="size-3.5" />
                  <bdi dir="ltr">{company.website.replace(/^https?:\/\//, "")}</bdi>
                </a>
              ) : null}
              {owner ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar name={owner.display_name ?? owner.email} className="size-5" />
                  {owner.display_name ?? owner.email}
                </span>
              ) : null}
            </div>
            {company.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {company.tags.map((t) => (
                  <Pill key={t} className="h-5 text-[11px]">
                    {t}
                  </Pill>
                ))}
              </div>
            ) : null}
          </div>
          {can.edit ? (
            <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              {fa ? "ویرایش" : "Edit"}
            </Button>
          ) : null}
        </div>
        {can.edit ? (
          <div className="flex flex-wrap gap-2" data-tour="company-actions">
            <Button tone="primary" icon={<PhoneCall className="size-4" />} onClick={() => setLogging(true)}>
              {fa ? "ثبت تماس یا گفتگو" : "Log a conversation"}
            </Button>
            <Button icon={<ListTodo className="size-4" />} onClick={() => setTasking(true)}>
              {fa ? "کار جدید" : "New task"}
            </Button>
            {can.finance ? (
              <Button icon={<HandCoins className="size-4" />} onClick={() => setPaying(true)}>
                {fa ? "ثبت دریافتی" : "Record payment"}
              </Button>
            ) : null}
          </div>
        ) : null}
        {company.notes ? <p className="rounded-xl bg-p-surface-2 px-3 py-2 text-sm leading-relaxed text-p-ink-2">{company.notes}</p> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-4">
          <DealCard companyId={company.id} />
          <Timeline companyId={company.id} onLog={() => setLogging(true)} />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Contacts companyId={company.id} />
          <MoneyCard companyId={company.id} />
          <TasksCard companyId={company.id} onNew={() => setTasking(true)} />
          <History companyId={company.id} />
        </div>
      </div>

      <CompanyForm open={editing} onClose={() => setEditing(false)} company={company} />
      <ActivityForm open={logging} onClose={() => setLogging(false)} company={company} />
      <TaskForm open={tasking} onClose={() => setTasking(false)} preset={{ company }} />
      {can.finance ? <PaymentForm open={paying} onClose={() => setPaying(false)} company={company} /> : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-7 sm:px-6">
      <Skeleton className="h-40" />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Deal */

function DealCard({ companyId }: { companyId: string }) {
  const { lang, store, can, toast, user } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const fa = lang === "fa";
  const deal = x.deals.find((d) => d.company_id === companyId && d.stage !== "lost") ?? x.deals.find((d) => d.company_id === companyId) ?? null;
  const [lostFor, setLostFor] = useState<Deal | null>(null);
  const exhibition = x.exhibition;
  if (!exhibition) return null;
  const booths = deal ? (x.boothsByDeal.get(deal.id) ?? []) : [];
  const balance = deal ? (x.balanceByDeal.get(deal.id) ?? ZERO_BALANCE) : ZERO_BALANCE;
  const base = `/${lang}/staff`;

  return (
    <Card className="grid gap-4 p-4" data-tour="company-deals">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">
          {fa ? "فروش در " : "Sales for "}
          {pick(lang, exhibition.name_fa, exhibition.name_en)}
        </h2>
        {deal ? <StagePill stage={deal.stage} /> : null}
      </div>
      {!deal ? (
        <div className="grid justify-items-start gap-2 rounded-2xl border border-dashed border-p-line-strong p-4">
          <p className="text-sm text-p-ink-3">{fa ? "برای این نمایشگاه هنوز پرونده فروش ندارد." : "No sales record for this exhibition yet."}</p>
          {can.edit ? (
            <Button
              tone="primary"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={async () => {
                const res = await store.insert("deals", { id: newId(), exhibition_id: exhibition.id, company_id: companyId, stage: "lead", owner_id: user.id, source: "crm" });
                if (res.ok) toast(fa ? "پرونده فروش باز شد" : "Sales record opened");
              }}
            >
              {fa ? "شروع پرونده فروش" : "Start a sales record"}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="scroll-fade thin-scroll -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={!can.edit}
                onClick={() => {
                  if (s === "lost") return setLostFor(deal);
                  const patch = stagePatch(deal, s);
                  if (patch) store.update("deals", deal.id, patch);
                }}
                className={cn(
                  "h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-60",
                  deal.stage === s ? "bg-p-ink text-p-bg" : "bg-p-sunken text-p-ink-2 hover:bg-p-line",
                )}
              >
                {dealStageLabel[s][lang]}
              </button>
            ))}
          </div>
          {deal.stage === "lost" && deal.lost_reason ? (
            <p className="rounded-xl bg-p-danger-soft px-3 py-2 text-[13px] text-p-danger">
              {fa ? "دلیل از دست رفتن: " : "Lost because: "}
              {deal.lost_reason}
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [fa ? "غرفه ها" : "Booths", booths.length ? booths.map((b) => b.code).join(", ") : "—"],
              [fa ? "متراژ" : "Area", booths.length ? `${num(lang, booths.reduce((s, b) => s + b.area_m2, 0))} m²` : deal.expected_area_m2 ? `~${num(lang, deal.expected_area_m2)} m²` : "—"],
              [fa ? "فاکتور شده" : "Invoiced", compact(lang, balance.invoiced)],
              [fa ? "مانده" : "Balance", compact(lang, balance.balance)],
            ].map(([k, v], i) => (
              <div key={i} className="rounded-xl bg-p-surface-2 px-3 py-2">
                <dt className="text-[11px] text-p-ink-3">{k}</dt>
                <dd className={cn("tabular truncate text-sm font-semibold", i === 3 && balance.balance > 0 && "text-p-warn")} dir={i === 0 ? "ltr" : undefined}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <DealFields deal={deal} key={deal.id + deal.updated_at} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-p-ink-3">
            {deal.last_contact_at ? <span>{fa ? `آخرین تماس ${relativeTime(lang, deal.last_contact_at)}` : `Last contact ${relativeTime(lang, deal.last_contact_at)}`}</span> : null}
            {deal.next_follow_up_at ? (
              <span className={cn(now > 0 && new Date(deal.next_follow_up_at).getTime() < now && "font-semibold text-p-danger")}>
                · {fa ? "پیگیری" : "Follow up"} {date(lang, deal.next_follow_up_at)}
              </span>
            ) : null}
            <span className="flex-1" />
            {booths[0] ? (
              <Link href={`${base}/map?booth=${booths[0].id}`} className="font-medium text-p-brand hover:underline">
                {fa ? "دیدن روی نقشه" : "See on the map"}
              </Link>
            ) : (
              <Link href={`${base}/map?assign=${deal.id}`} className="font-medium text-p-brand hover:underline">
                {fa ? "انتخاب غرفه روی نقشه" : "Pick a booth on the map"}
              </Link>
            )}
          </div>
        </>
      )}
      <LostSheet deal={lostFor} onClose={() => setLostFor(null)} />
    </Card>
  );
}

function DealFields({ deal }: { deal: Deal }) {
  const { lang, store, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [value, setValue] = useState<number | null>(deal.estimated_value);
  const [follow, setFollow] = useState<string | null>(isoToDay(deal.next_follow_up_at));
  const disabled = !can.edit;
  return (
    <details className="rounded-2xl border border-p-line p-3">
      <summary className="cursor-pointer text-[13px] font-semibold text-p-ink-2">{fa ? "جزئیات پرونده فروش" : "Deal details"}</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={fa ? "ارزش تخمینی" : "Estimated value"}>
          <div onBlur={() => value !== deal.estimated_value && store.update("deals", deal.id, { estimated_value: value })}>
            <MoneyInput value={value} onChange={setValue} />
          </div>
        </Field>
        <Field label={fa ? "احتمال بستن قرارداد (٪)" : "Chance of closing (%)"}>
          <Input
            type="number"
            min={0}
            max={100}
            dir="ltr"
            disabled={disabled}
            defaultValue={deal.probability ?? ""}
            onBlur={(e) => {
              const v = e.target.value === "" ? null : Math.max(0, Math.min(100, Math.round(Number(e.target.value))));
              if (v !== deal.probability) store.update("deals", deal.id, { probability: v });
            }}
          />
        </Field>
        <Field label={fa ? "متراژ درخواستی" : "Area wanted (m²)"}>
          <Input
            type="number"
            min={0}
            step={0.5}
            dir="ltr"
            disabled={disabled}
            defaultValue={deal.expected_area_m2 ?? ""}
            onBlur={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              if (v !== deal.expected_area_m2) store.update("deals", deal.id, { expected_area_m2: v });
            }}
          />
        </Field>
        <Field label={fa ? "کارشناس فروش" : "Sales owner"}>
          <Select disabled={disabled} value={deal.owner_id ?? ""} onChange={(e) => store.update("deals", deal.id, { owner_id: e.target.value || null })}>
            <option value="">{fa ? "بدون مسئول" : "Nobody"}</option>
            {x.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name ?? s.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "منبع آشنایی" : "Source"}>
          <Input disabled={disabled} defaultValue={deal.source ?? ""} onBlur={(e) => e.target.value.trim() !== (deal.source ?? "") && store.update("deals", deal.id, { source: e.target.value.trim() || null })} />
        </Field>
        <Field label={fa ? "سطح حمایت" : "Sponsorship tier"}>
          <Input disabled={disabled} defaultValue={deal.sponsorship_tier ?? ""} onBlur={(e) => e.target.value.trim() !== (deal.sponsorship_tier ?? "") && store.update("deals", deal.id, { sponsorship_tier: e.target.value.trim() || null })} />
        </Field>
        <div className="sm:col-span-2">
          <DateQuick
            label={fa ? "پیگیری بعدی" : "Next follow-up"}
            value={follow}
            onChange={(v) => {
              setFollow(v);
              store.update("deals", deal.id, { next_follow_up_at: dayToIso(v) });
            }}
          />
        </div>
      </div>
    </details>
  );
}

export function LostSheet({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const { lang, store, toast } = usePortal();
  const fa = lang === "fa";
  const reasons = fa ? ["قیمت بالا", "بودجه ندارد", "در نمایشگاه دیگری شرکت می کند", "زمان مناسب نیست", "پاسخ نمی دهد"] : ["Price too high", "No budget", "Going to another show", "Bad timing", "Not responding"];
  const [reason, setReason] = useState("");
  return (
    <Sheet open={Boolean(deal)} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? "چرا از دست رفت؟" : "Why was it lost?"}>
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!deal) return;
          const patch = stagePatch(deal, "lost", reason);
          if (!patch) return;
          const res = await store.update("deals", deal.id, patch);
          if (res.ok) {
            toast(fa ? "ثبت شد. غرفه ها آزاد نمی شوند تا خودتان آزاد کنید." : "Saved. Booths stay linked until you release them.");
            setReason("");
            onClose();
          }
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={cn("h-8 rounded-lg px-2.5 text-xs font-medium", reason === r ? "bg-p-ink text-p-bg" : "bg-p-sunken text-p-ink-2 hover:bg-p-line")}>
              {r}
            </button>
          ))}
        </div>
        <Field label={fa ? "دلیل" : "Reason"}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            {fa ? "انصراف" : "Cancel"}
          </Button>
          <Button tone="danger" type="submit" disabled={!reason.trim()}>
            {fa ? "ثبت به عنوان از دست رفته" : "Mark as lost"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/* ----------------------------------------------------------- Timeline */

const kindIcon: Record<string, React.ReactNode> = {
  call: <PhoneCall className="size-4" />,
  meeting: <Users className="size-4" />,
  visit: <MapPin className="size-4" />,
  email: <Mail className="size-4" />,
  message: <MessageSquare className="size-4" />,
  sms: <MessageSquare className="size-4" />,
  note: <Pencil className="size-4" />,
  system: <CalendarClock className="size-4" />,
};

function Timeline({ companyId, onLog }: { companyId: string; onLog: () => void }) {
  const { lang, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const activities = useCollection("activities", { column: "company_id", value: companyId });
  const sorted = useMemo(() => [...activities.rows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)), [activities.rows]);
  return (
    <Card className="grid gap-3 p-4" data-tour="company-timeline">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">{fa ? "تاریخچه گفتگوها" : "Conversation history"}</h2>
        {can.edit ? (
          <Button size="sm" tone="quiet" icon={<Plus className="size-4" />} onClick={onLog}>
            {fa ? "ثبت" : "Log"}
          </Button>
        ) : null}
      </div>
      {activities.status === "loading" ? (
        <Skeleton className="h-24" />
      ) : sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-p-line-strong px-4 py-6 text-center text-sm text-p-ink-3">{fa ? "هنوز گفتگویی ثبت نشده" : "Nothing logged yet"}</p>
      ) : (
        <ol className="relative grid gap-4 before:absolute before:inset-y-2 before:start-4 before:w-px before:bg-p-line">
          {sorted.map((a) => {
            const author = a.author_id ? x.staffById.get(a.author_id) : null;
            return (
              <li key={a.id} className="relative flex gap-3">
                <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-p-line bg-p-surface text-p-ink-2">{kindIcon[a.kind]}</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm">
                    <span className="font-semibold">{a.summary}</span>
                    <span className="ms-2 text-xs text-p-ink-3">{activityKindLabel[a.kind][lang]}</span>
                  </p>
                  {a.body ? <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-p-ink-2">{a.body}</p> : null}
                  {a.outcome ? <p className="mt-1 text-[13px] text-p-ink-2">{fa ? "نتیجه: " : "Outcome: "}{a.outcome}</p> : null}
                  <p className="mt-1 text-xs text-p-ink-3">
                    {date(lang, a.occurred_at)} · {relativeTime(lang, a.occurred_at)}
                    {author ? ` · ${author.display_name ?? author.email}` : ""}
                    {a.next_follow_up_at ? ` · ${fa ? "پیگیری" : "follow up"} ${date(lang, a.next_follow_up_at, "short")}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------- Contacts */

function Contacts({ companyId }: { companyId: string }) {
  const { lang, store, can, toast } = usePortal();
  const fa = lang === "fa";
  const contacts = useCollection("contacts", { column: "company_id", value: companyId });
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const sorted = [...contacts.rows].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.full_name.localeCompare(b.full_name, "fa"));
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">{fa ? "افراد رابط" : "Contacts"}</h2>
        {can.edit ? (
          <IconButton size="sm" label={fa ? "فرد جدید" : "Add contact"} onClick={() => setEditing("new")}>
            <Plus className="size-4" />
          </IconButton>
        ) : null}
      </div>
      {sorted.length === 0 ? <p className="text-sm text-p-ink-3">{fa ? "هنوز کسی ثبت نشده" : "No one yet"}</p> : null}
      <ul className="grid gap-2">
        {sorted.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl bg-p-surface-2 px-3 py-2">
            <Avatar name={c.full_name} className="size-8 text-xs" />
            <button type="button" className="min-w-0 flex-1 text-start" onClick={() => can.edit && setEditing(c)}>
              <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                {c.full_name}
                {c.is_primary ? <Star className="size-3 fill-current text-p-gold" aria-label={fa ? "رابط اصلی" : "Main contact"} /> : null}
              </span>
              <span className="block truncate text-xs text-p-ink-3">
                {[c.job_title, c.phone ? `⁦${c.phone}⁩` : null, c.email].filter(Boolean).join(" · ")}
              </span>
            </button>
            {c.phone ? (
              <a href={`tel:${c.phone}`} className="grid size-9 shrink-0 place-items-center rounded-xl bg-p-brand text-p-brand-ink" aria-label={fa ? `تماس با ${c.full_name}` : `Call ${c.full_name}`}>
                <Phone className="size-4" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} closeLabel={fa ? "بستن" : "Close"} title={editing === "new" ? (fa ? "فرد رابط جدید" : "New contact") : fa ? "ویرایش فرد رابط" : "Edit contact"}>
        {editing ? (
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const get = (k: string) => String(f.get(k) ?? "").trim() || null;
              const fields = {
                full_name: get("full_name") ?? "—",
                job_title: get("job_title"),
                phone: get("phone"),
                phone_alt: get("phone_alt"),
                email: get("email"),
                is_primary: f.get("is_primary") === "on",
                notes: get("notes"),
              };
              // Only one main contact per company.
              if (fields.is_primary) for (const other of contacts.rows) if (other.is_primary && (editing === "new" || other.id !== editing.id)) await store.update("contacts", other.id, { is_primary: false });
              const res = editing === "new" ? await store.insert("contacts", { id: newId(), company_id: companyId, ...fields }) : await store.update("contacts", editing.id, fields);
              if (res.ok) {
                toast(fa ? "ذخیره شد" : "Saved");
                setEditing(null);
              }
            }}
          >
            <Field label={fa ? "نام و نام خانوادگی *" : "Full name *"}>
              <Input name="full_name" required autoFocus defaultValue={editing === "new" ? "" : editing.full_name} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={fa ? "سمت" : "Job title"}>
                <Input name="job_title" defaultValue={editing === "new" ? "" : (editing.job_title ?? "")} />
              </Field>
              <Field label={fa ? "ایمیل" : "Email"}>
                <Input name="email" type="email" dir="ltr" defaultValue={editing === "new" ? "" : (editing.email ?? "")} />
              </Field>
              <Field label={fa ? "موبایل" : "Mobile"}>
                <Input name="phone" dir="ltr" inputMode="tel" defaultValue={editing === "new" ? "" : (editing.phone ?? "")} />
              </Field>
              <Field label={fa ? "تلفن دوم" : "Other phone"}>
                <Input name="phone_alt" dir="ltr" inputMode="tel" defaultValue={editing === "new" ? "" : (editing.phone_alt ?? "")} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_primary" defaultChecked={editing === "new" ? contacts.rows.length === 0 : editing.is_primary} className="size-4 accent-[var(--p-brand)]" />
              {fa ? "رابط اصلی شرکت" : "Main contact for the company"}
            </label>
            <Field label={fa ? "یادداشت" : "Notes"}>
              <Input name="notes" defaultValue={editing === "new" ? "" : (editing.notes ?? "")} />
            </Field>
            <div className="flex items-center gap-2">
              {editing !== "new" && can.manage ? (
                <Button
                  tone="ghost"
                  className="text-p-danger"
                  icon={<Trash2 className="size-4" />}
                  onClick={async () => {
                    const res = await store.remove("contacts", editing.id);
                    if (res.ok) setEditing(null);
                  }}
                >
                  {fa ? "حذف" : "Delete"}
                </Button>
              ) : null}
              <span className="flex-1" />
              <Button tone="ghost" onClick={() => setEditing(null)}>
                {fa ? "انصراف" : "Cancel"}
              </Button>
              <Button tone="primary" type="submit">
                {fa ? "ذخیره" : "Save"}
              </Button>
            </div>
          </form>
        ) : null}
      </Sheet>
    </Card>
  );
}

/* -------------------------------------------------------------- Money */

function MoneyCard({ companyId }: { companyId: string }) {
  const { lang, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const invoices = x.invoices.filter((i) => i.company_id === companyId).sort((a, b) => (b.issued_on ?? b.created_at).localeCompare(a.issued_on ?? a.created_at));
  const payments = x.payments.filter((p) => p.company_id === companyId).sort((a, b) => b.paid_on.localeCompare(a.paid_on));
  const currency = x.exhibition?.currency ?? "IRR";
  const total = invoices.reduce((s, i) => s + (x.invoiceTotalsById.get(i.id)?.total ?? 0), 0);
  const paid = payments.filter((p) => !p.voided_at).reduce((s, p) => s + p.amount, 0);
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">{fa ? "فاکتورها و پرداخت ها" : "Invoices and payments"}</h2>
        {can.finance ? (
          <Link href={`${base}/accounting/invoices/new?company=${companyId}`} className="text-xs font-semibold text-p-brand hover:underline">
            {fa ? "فاکتور جدید" : "New invoice"}
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [fa ? "فاکتور" : "Invoiced", total],
          [fa ? "دریافتی" : "Received", paid],
          [fa ? "مانده" : "Balance", total - paid],
        ].map(([k, v], i) => (
          <div key={i} className="rounded-xl bg-p-surface-2 px-2 py-2">
            <p className="text-[11px] text-p-ink-3">{k}</p>
            <p className={cn("tabular truncate text-sm font-bold", i === 2 && (v as number) > 0 && "text-p-warn")} title={money(lang, v as number, currency)}>
              {compact(lang, v as number)}
            </p>
          </div>
        ))}
      </div>
      {invoices.length ? (
        <ul className="grid gap-1.5">
          {invoices.map((i) => {
            const t = x.invoiceTotalsById.get(i.id);
            return (
              <li key={i.id}>
                <Link href={`${base}/accounting/invoices/${i.id}`} className="flex items-center gap-2 rounded-xl border border-p-line px-3 py-2 text-[13px] hover:border-p-line-strong">
                  <span className="min-w-0 flex-1 truncate">
                    <b dir="ltr">#{i.number ?? "—"}</b> <span className="text-p-ink-3">{invoiceKindLabel[i.kind][lang]} · {invoiceStatusLabel[i.status][lang]}</span>
                  </span>
                  <span className="tabular shrink-0 font-medium">{compact(lang, t?.total ?? 0)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-p-ink-3">{fa ? "فاکتوری در این نمایشگاه ندارد" : "No invoices in this exhibition"}</p>
      )}
      {payments.length ? (
        <ul className="grid gap-1 text-[13px]">
          {payments.slice(0, 6).map((p) => (
            <li key={p.id} className={cn("flex items-center gap-2 px-1", p.voided_at && "text-p-ink-3 line-through")}>
              <span className="flex-1">
                {date(lang, p.paid_on, "short")} · {paymentMethodLabel[p.method][lang]}
              </span>
              <span className="tabular font-medium text-p-ok">{num(lang, p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

/* -------------------------------------------------------------- Tasks */

function TasksCard({ companyId, onNew }: { companyId: string; onNew: () => void }) {
  const { lang, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const tasks = x.tasks.filter((t) => t.company_id === companyId && t.status !== "cancelled");
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">{fa ? "کارهای مربوط" : "Related tasks"}</h2>
        {can.edit ? (
          <IconButton size="sm" label={fa ? "کار جدید" : "New task"} onClick={onNew}>
            <Plus className="size-4" />
          </IconButton>
        ) : null}
      </div>
      {tasks.length === 0 ? <p className="text-[13px] text-p-ink-3">{fa ? "کاری ثبت نشده" : "No tasks"}</p> : null}
      <ul className="grid gap-1.5">
        {tasks.map((t) => {
          const who = t.assignee_id ? x.staffById.get(t.assignee_id) : null;
          return (
            <li key={t.id}>
              <Link href={`/${lang}/staff/tasks/${t.id}`} className="flex items-center gap-2 rounded-xl border border-p-line px-3 py-2 text-[13px] hover:border-p-line-strong">
                <span className={cn("min-w-0 flex-1 truncate", t.status === "done" && "text-p-ink-3 line-through")}>{t.title}</span>
                <span className="shrink-0 text-xs text-p-ink-3">{taskStatusLabel[t.status][lang]}</span>
                {who ? <Avatar name={who.display_name ?? who.email} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------ History */

function History({ companyId }: { companyId: string }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const deals = useCollection("deals", { column: "company_id", value: companyId });
  const past = deals.rows.filter((d) => d.exhibition_id !== x.exhibition?.id);
  if (!past.length) return null;
  const nameOf = (id: string) => {
    const e = x.exhibitions.find((ee) => ee.id === id);
    return e ? pick(lang, e.name_fa, e.name_en) : "—";
  };
  return (
    <Card className="grid gap-2 p-4">
      <h2 className="text-[15px] font-semibold">{fa ? "نمایشگاه های دیگر" : "Other exhibitions"}</h2>
      <ul className="grid gap-1.5">
        {past.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-[13px]">
            <span className="min-w-0 flex-1 truncate">{nameOf(d.exhibition_id)}</span>
            <StagePill stage={d.stage} small />
          </li>
        ))}
      </ul>
    </Card>
  );
}
