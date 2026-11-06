"use client";

import {
  Ban,
  Building2,
  Check,
  CheckCircle2,
  Hand,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  RotateCw,
  Trash2,
  TriangleAlert,
  Undo2,
  UserRoundPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { area, compact, date, money, num, percent, pick, relativeTime, sep } from "@/lib/portal/format";
import { boothStatusLabel, dealStageLabel, equipmentStageLabel } from "@/lib/portal/i18n";
import { boothListPrice, paidShare, ZERO_BALANCE } from "@/lib/portal/money";
import { equipmentPatch, nextEquipmentStep } from "@/lib/portal/furniture";
import { newId } from "@/lib/portal/store";
import type { Booth, BoothStatus, Company, Deal, DealStage, EquipmentOrder, Patch } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, useNow, usePortal } from "../PortalProvider";
import { HandoverStamp } from "../crew";
import { DatePicker } from "../DatePicker";
import { todayIso } from "../fields";
import { PeoplePicker, PeopleLine } from "../people";
import { AssignSheet } from "./AssignSheet";
import { FurnitureTab } from "./FurnitureTab";
import { WorkTab } from "./WorkTab";
import { ProblemButton } from "../ProblemFlag";
import { lineProblemStep, problemStepLabel } from "@/lib/portal/workflow";
import { Button, Field, IconButton, Input, Pill, Progress, Segmented, Select, Sheet, Textarea, TonePill } from "../ui";

export type PanelTab = "sales" | "equipment" | "work" | "details";

const STAGES: DealStage[] = ["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export function BoothPanel({
  booth,
  tab,
  onTab,
  onClose,
  onUpdate,
  onDelete,
  assignDeal,
  onAssigned,
  assignOpen,
  onAssignOpen,
}: {
  booth: Booth;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  /** Undoable booth edit. */
  onUpdate: (patch: Patch<"booths">) => void;
  onDelete: () => void;
  assignDeal: Deal | null;
  onAssigned: () => void;
  /** Whether the "give to a company" sheet is open. */
  assignOpen: boolean;
  onAssignOpen: (open: boolean) => void;
}) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const hall = x.halls.find((h) => h.id === booth.hall_id);
  const deal = booth.deal_id ? (x.dealById.get(booth.deal_id) ?? null) : null;
  const company = deal ? (x.companyById.get(deal.company_id) ?? null) : null;
  const openProblems = x.openProblemsByBooth.get(booth.id) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-p-line px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight" dir="ltr">
              {booth.code}
            </h2>
            <TonePill tone={booth.status}>{boothStatusLabel[booth.status][lang]}</TonePill>
          </div>
          <p className="mt-1 truncate text-[13px] text-p-ink-3">
            {hall ? pick(lang, hall.name_fa, hall.name_en) : ""}{sep(lang)}{area(lang, booth.area_m2)}{sep(lang)}{num(lang, booth.width, 1)}×{num(lang, booth.depth, 1)}
            {booth.open_sides ? `${sep(lang)}${fa ? `${num(lang, booth.open_sides)} بر باز` : `${booth.open_sides} open sides`}` : ""}
          </p>
          {company ? <p className="mt-1 truncate text-sm font-semibold text-p-ink">{pick(lang, company.name_fa, company.name_en)}</p> : null}
          {openProblems.length ? (
            <button
              type="button"
              onClick={() => onTab("work")}
              className="mt-2 flex w-full items-center gap-2 rounded-xl bg-p-danger px-3 py-1.5 text-start text-[13px] font-semibold text-white"
            >
              <TriangleAlert className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {openProblems.map((p) => problemStepLabel[p.step][lang] + (p.note ? `: ${p.note}` : "")).join(fa ? "، " : " · ")}
              </span>
            </button>
          ) : null}
          <BoothManagers booth={booth} onUpdate={onUpdate} />
        </div>
        <IconButton label={fa ? "بستن" : "Close"} size="sm" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="px-4 pt-3">
        <Segmented
          className="w-full [&>button]:flex-1"
          value={tab}
          onChange={onTab}
          options={[
            { value: "sales", label: fa ? "فروش" : "Sales" },
            { value: "equipment", label: fa ? "تجهیزات" : "Furniture" },
            { value: "work", label: fa ? "روند کار" : "Work" },
            { value: "details", label: fa ? "مشخصات" : "Details" },
          ]}
        />
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {tab === "sales" ? (
          <SalesTab booth={booth} deal={deal} company={company} onUpdate={onUpdate} assignDeal={assignDeal} onAssigned={onAssigned} onAssignOpen={onAssignOpen} />
        ) : tab === "equipment" ? (
          <FurnitureTab booth={booth} />
        ) : tab === "work" ? (
          <WorkTab booth={booth} onUpdate={onUpdate} onFurniture={() => onTab("equipment")} />
        ) : (
          <DetailsTab booth={booth} onUpdate={onUpdate} onDelete={onDelete} />
        )}
      </div>
      {!deal ? <AssignSheet booth={booth} open={assignOpen} onClose={() => onAssignOpen(false)} onUpdate={onUpdate} /> : null}
    </div>
  );
}

/** Who looks after this booth, as round faces. The first person is the lead. */
function BoothManagers({ booth, onUpdate }: { booth: Booth; onUpdate: (patch: Patch<"booths">) => void }) {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  const [open, setOpen] = useState(false);
  const ids = booth.manager_ids;
  return (
    <div className="mt-2 flex min-w-0 items-center gap-2" data-tour="booth-managers">
      <span className="shrink-0 text-xs text-p-ink-3">{fa ? "مسئول غرفه" : "Managed by"}</span>
      {can.edit ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pe-2 ps-0.5 hover:bg-p-sunken"
          aria-label={fa ? "تعیین مسئولان غرفه" : "Choose who looks after this booth"}
        >
          {ids.length ? (
            <>
              <PeopleLine ids={ids} size={24} />
              <Pencil className="size-3.5 shrink-0 text-p-ink-3 opacity-60 group-hover:opacity-100" />
            </>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 text-xs font-semibold text-p-brand">
              <UserRoundPlus className="size-3.5" />
              {fa ? "تعیین مسئول" : "Assign someone"}
            </span>
          )}
        </button>
      ) : (
        <PeopleLine ids={ids} size={24} empty={fa ? "تعیین نشده" : "Nobody yet"} />
      )}
      <PeoplePicker
        open={open}
        onClose={() => setOpen(false)}
        value={ids}
        onSave={(next) => onUpdate({ manager_ids: next })}
        title={fa ? `مسئولان غرفه ⁦${booth.code}⁩` : `Who looks after ${booth.code}`}
        hint={fa ? "یک یا چند همکار را انتخاب کنید. نفر اول مسئول اصلی است." : "Pick one or more colleagues. The first one is the lead."}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Sales */

function SalesTab({
  booth,
  deal,
  company,
  onUpdate,
  assignDeal,
  onAssigned,
  onAssignOpen,
}: {
  booth: Booth;
  deal: Deal | null;
  company: Company | null;
  onUpdate: (patch: Patch<"booths">) => void;
  assignDeal: Deal | null;
  onAssigned: () => void;
  onAssignOpen: (open: boolean) => void;
}) {
  const { lang, can, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const exhibition = x.exhibition!;
  const listPrice = boothListPrice(booth, exhibition.space_rate);
  const balance = deal ? (x.balanceByDeal.get(deal.id) ?? ZERO_BALANCE) : ZERO_BALANCE;
  const share = paidShare(balance);

  if (!deal) {
    const assignCompanyRow = assignDeal ? x.companyById.get(assignDeal.company_id) : null;
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-dashed border-p-line-strong bg-p-surface-2 p-4 text-center">
          <p className="text-sm font-semibold">{booth.status === "blocked" ? (fa ? "این غرفه برای فروش بسته است" : "This booth is not for sale") : fa ? "این غرفه آزاد است" : "This booth is free"}</p>
          {listPrice != null ? (
            <p className="mt-1 text-[13px] text-p-ink-3">
              {fa ? "قیمت فهرست:" : "List price:"} <span className="tabular font-semibold text-p-ink">{money(lang, listPrice, exhibition.currency)}</span>
              {fa ? " (بدون ارزش افزوده)" : " (before VAT)"}
            </p>
          ) : null}
        </div>
        {can.edit ? (
          <>
            {assignDeal && assignCompanyRow ? (
              <Button tone="primary" size="lg" className="w-full" onClick={() => { onUpdate({ deal_id: assignDeal.id }); onAssigned(); }}>
                {fa ? `رزرو برای ${assignCompanyRow.name_fa}` : `Reserve for ${pick(lang, assignCompanyRow.name_fa, assignCompanyRow.name_en)}`}
              </Button>
            ) : null}
            <Button
              tone={assignDeal ? "secondary" : "primary"}
              size="lg"
              className="w-full"
              data-tour="assign"
              icon={<Building2 className="size-4" />}
              onClick={() => onAssignOpen(true)}
              disabled={booth.status === "blocked"}
            >
              {fa ? "واگذاری به شرکت (جدید یا ثبت شده)" : "Give to a company (new or existing)"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {booth.status === "held" ? (
                <Button icon={<Undo2 className="size-4" />} onClick={() => onUpdate({ status: "available" })}>
                  {fa ? "آزاد کردن" : "Release hold"}
                </Button>
              ) : (
                <Button icon={<Hand className="size-4" />} onClick={() => onUpdate({ status: "held" })} disabled={booth.status === "blocked"}>
                  {fa ? "نگه داشتن" : "Put on hold"}
                </Button>
              )}
              {booth.status === "blocked" ? (
                <Button icon={<Undo2 className="size-4" />} onClick={() => onUpdate({ status: "available" })}>
                  {fa ? "قابل فروش" : "Make sellable"}
                </Button>
              ) : (
                <Button icon={<Ban className="size-4" />} onClick={() => onUpdate({ status: "blocked" })}>
                  {fa ? "غیرقابل فروش" : "Block"}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <CompanyCard deal={deal} company={company} />

      {/* Status ladder */}
      <section className="grid gap-2">
        <h3 className="text-[13px] font-semibold text-p-ink-2">{fa ? "وضعیت غرفه" : "Booth status"}</h3>
        <div className="grid grid-cols-3 gap-2">
          {(["reserved", "contracted", "paid"] as BoothStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={!can.edit}
              onClick={() => onUpdate({ status: s })}
              data-tone={s}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-semibold transition-colors disabled:opacity-60",
                booth.status === s ? "tone-pill border-transparent" : "border-p-line bg-p-surface text-p-ink-2 hover:border-p-line-strong",
              )}
            >
              {booth.status === s ? <Check className="size-4" /> : null}
              {boothStatusLabel[s][lang]}
            </button>
          ))}
        </div>
        {balance.invoiced > 0 && balance.balance <= 0 && booth.status !== "paid" && can.edit ? (
          <button type="button" onClick={() => onUpdate({ status: "paid" })} className="rounded-xl bg-p-ok-soft px-3 py-2 text-start text-[13px] text-p-ok">
            {fa ? "همه فاکتورها پرداخت شده. وضعیت «تسویه» شود؟" : "Every invoice is paid. Mark the booth as paid?"}
          </button>
        ) : null}
      </section>

      {/* Money */}
      <section className="grid gap-3 rounded-2xl border border-p-line bg-p-surface-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-p-ink-2">{fa ? "مالی" : "Money"}</h3>
          {share != null ? <span className="tabular text-[13px] font-semibold text-p-ok">{percent(lang, share)} {fa ? "پرداخت شده" : "paid"}</span> : null}
        </div>
        {share != null ? <Progress value={share} tone="ok" label={fa ? "پرداخت" : "Paid"} /> : null}
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            [fa ? "فاکتور" : "Invoiced", balance.invoiced],
            [fa ? "پرداختی" : "Paid", balance.paid],
            [fa ? "مانده" : "Balance", balance.balance],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl bg-p-surface px-2 py-2">
              <dt className="text-[11px] text-p-ink-3">{label}</dt>
              <dd
                title={money(lang, value as number, exhibition.currency)}
                className={cn("tabular mt-0.5 truncate text-[13px] font-bold", label === (fa ? "مانده" : "Balance") && (value as number) > 0 ? "text-p-warn" : "")}
              >
                {compact(lang, value as number)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] text-p-ink-3">
          {fa ? "مبالغ به" : "Amounts in"} {exhibition.currency === "IRR" ? (fa ? "ریال" : "rial") : exhibition.currency}
          {listPrice != null ? `${sep(lang)}${fa ? "قیمت فهرست" : "list price"} ${num(lang, listPrice)}` : ""}
        </p>
        <InvoiceList dealId={deal.id} />
        {can.finance ? <RecordPayment deal={deal} /> : null}
      </section>

      {can.edit ? (
        <Button
          tone="ghost"
          className="justify-self-start text-p-danger"
          icon={<Undo2 className="size-4" />}
          onClick={() => {
            onUpdate({ deal_id: null });
            toast(fa ? `غرفه ${booth.code} آزاد شد` : `Booth ${booth.code} released`);
          }}
        >
          {fa ? "آزاد کردن غرفه از این شرکت" : "Release booth from this company"}
        </Button>
      ) : null}
    </div>
  );
}

function CompanyCard({ deal, company }: { deal: Deal; company: Company | null }) {
  const { lang, store, can, toast } = usePortal();
  const now = useNow();
  const x = useExhibition();
  const fa = lang === "fa";
  const contacts = useCollection("contacts", company ? { column: "company_id", value: company.id } : null);
  const contact = contacts.rows.find((c) => c.is_primary) ?? contacts.rows[0];
  const owner = deal.owner_id ? x.staffById.get(deal.owner_id) : null;
  const phone = contact?.phone ?? company?.phone ?? null;

  async function logCall() {
    if (!company) return;
    await store.insert("activities", {
      id: newId(),
      company_id: company.id,
      deal_id: deal.id,
      contact_id: contact?.id ?? null,
      kind: "call",
      summary: fa ? "تماس تلفنی" : "Phone call",
    });
    toast(fa ? "تماس ثبت شد" : "Call logged");
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-p-line p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-p-brand-soft text-p-brand">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{company ? pick(lang, company.name_fa, company.name_en) : "—"}</p>
          <p className="truncate text-xs text-p-ink-3">{[company?.sector, company?.city].filter(Boolean).join(sep(lang))}</p>
        </div>
      </div>
      {contact || phone ? (
        <div className="flex items-center gap-3 rounded-xl bg-p-surface-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{contact?.full_name ?? (fa ? "تلفن شرکت" : "Company phone")}</p>
            <p className="truncate text-xs text-p-ink-3">
              {contact?.job_title ? `${contact.job_title}${sep(lang)}` : ""}
              <bdi dir="ltr">{phone}</bdi>
            </p>
          </div>
          {phone ? (
            <a href={`tel:${phone}`} className="grid size-9 place-items-center rounded-xl bg-p-brand text-p-brand-ink" aria-label={fa ? "تماس" : "Call"}>
              <Phone className="size-4" />
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label={fa ? "مرحله فروش" : "Stage"}>
          <Select
            value={deal.stage}
            disabled={!can.edit}
            onChange={(e) => store.update("deals", deal.id, { stage: e.target.value as DealStage })}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {dealStageLabel[s][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "پیگیری بعدی" : "Next follow-up"}>
          <div className="flex h-10 items-center rounded-xl border border-p-line bg-p-surface px-3 text-sm">
            {deal.next_follow_up_at ? (
              <span className={cn(new Date(deal.next_follow_up_at).getTime() < now ? "font-medium text-p-danger" : "")}>{date(lang, deal.next_follow_up_at, "short")}</span>
            ) : (
              <span className="text-p-ink-3">{fa ? "تعیین نشده" : "Not set"}</span>
            )}
          </div>
        </Field>
      </div>
      {can.edit ? (
        <div className="flex flex-wrap gap-1.5">
          {[
            [0, fa ? "امروز" : "Today"],
            [1, fa ? "فردا" : "Tomorrow"],
            [3, fa ? "۳ روز دیگر" : "In 3 days"],
            [7, fa ? "هفته بعد" : "Next week"],
          ].map(([days, label]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => {
                const d = new Date(now);
                d.setDate(d.getDate() + (days as number));
                d.setHours(10, 0, 0, 0);
                store.update("deals", deal.id, { next_follow_up_at: d.toISOString() });
              }}
              className="h-7 rounded-lg bg-p-sunken px-2.5 text-xs font-medium text-p-ink-2 hover:bg-p-line"
            >
              {label}
            </button>
          ))}
          {deal.next_follow_up_at ? (
            <button type="button" onClick={() => store.update("deals", deal.id, { next_follow_up_at: null })} className="h-7 rounded-lg px-2 text-xs text-p-ink-3 hover:text-p-danger">
              {fa ? "حذف" : "Clear"}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-p-ink-3">
        <span>
          {owner ? `${fa ? "کارشناس:" : "Owner:"} ${owner.display_name ?? owner.email}` : null}
          {deal.last_contact_at ? `${sep(lang)}${fa ? "آخرین تماس" : "last contact"} ${relativeTime(lang, deal.last_contact_at)}` : ""}
        </span>
        {can.edit ? (
          <Button size="sm" tone="quiet" icon={<PhoneCall className="size-3.5" />} onClick={logCall}>
            {fa ? "ثبت تماس" : "Log a call"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function InvoiceList({ dealId }: { dealId: string }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const invoices = x.invoices.filter((i) => i.deal_id === dealId && i.status !== "cancelled");
  if (!invoices.length) return <p className="text-[13px] text-p-ink-3">{fa ? "هنوز فاکتوری صادر نشده" : "No invoices yet"}</p>;
  return (
    <ul className="grid gap-1.5">
      {invoices.map((inv) => {
        const t = x.invoiceTotalsById.get(inv.id);
        return (
          <li key={inv.id} className="flex items-center justify-between gap-2 rounded-xl bg-p-surface px-3 py-2 text-[13px]">
            <span className="min-w-0 truncate">
              <span className="font-semibold" dir="ltr">
                #{inv.number ?? "—"}
              </span>{" "}
              <span className="text-p-ink-3">
                {inv.kind === "proforma" ? (fa ? "پیش فاکتور" : "Proforma") : fa ? "فاکتور" : "Invoice"}
                {inv.status === "registered" ? (fa ? "، ثبت در سامانه" : " · filed") : ""}
              </span>
            </span>
            <span className="tabular shrink-0 font-medium">
              {num(lang, t?.paid ?? 0)} / {num(lang, t?.total ?? 0)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RecordPayment({ deal }: { deal: Deal }) {
  const { lang, store, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [open, setOpen] = useState(false);
  const invoices = x.invoices.filter((i) => i.deal_id === deal.id && i.status !== "cancelled");
  return (
    <>
      <Button tone="secondary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
        {fa ? "ثبت پرداخت" : "Record a payment"}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={fa ? "ثبت پرداخت" : "Record a payment"} closeLabel={fa ? "بستن" : "Close"}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const amount = Number(String(f.get("amount") ?? "").replace(/[^\d]/g, ""));
            if (!amount) return;
            const invoiceId = String(f.get("invoice") || "") || null;
            const res = await store.insert("payments", {
              id: newId(),
              company_id: deal.company_id,
              deal_id: deal.id,
              invoice_id: invoiceId,
              amount,
              currency: x.exhibition?.currency ?? "IRR",
              paid_on: String(f.get("paid_on") || new Date().toISOString().slice(0, 10)),
              method: String(f.get("method") ?? "bank_transfer") as "bank_transfer",
              reference: String(f.get("reference") || "") || null,
            });
            if (res.ok) {
              toast(fa ? "پرداخت ثبت شد" : "Payment recorded");
              setOpen(false);
            }
          }}
        >
          <Field label={fa ? "مبلغ" : "Amount"} hint={x.exhibition?.currency === "IRR" ? (fa ? "به ریال" : "In rial") : undefined}>
            <Input name="amount" inputMode="numeric" dir="ltr" required autoFocus />
          </Field>
          {invoices.length ? (
            <Field label={fa ? "بابت فاکتور" : "Against invoice"}>
              <Select name="invoice" defaultValue={invoices[0]?.id}>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    #{i.number ?? "—"}{sep(lang)}{num(lang, x.invoiceTotalsById.get(i.id)?.balance ?? 0)} {fa ? "مانده" : "due"}
                  </option>
                ))}
                <option value="">{fa ? "بدون فاکتور (علی الحساب)" : "No invoice (on account)"}</option>
              </Select>
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label={fa ? "تاریخ" : "Date"}>
              <DatePicker name="paid_on" defaultValue={todayIso()} clearable={false} />
            </Field>
            <Field label={fa ? "روش" : "Method"}>
              <Select name="method" defaultValue="bank_transfer">
                <option value="bank_transfer">{fa ? "واریز بانکی" : "Bank transfer"}</option>
                <option value="pos">{fa ? "کارت خوان" : "Card (POS)"}</option>
                <option value="cash">{fa ? "نقد" : "Cash"}</option>
                <option value="cheque">{fa ? "چک" : "Cheque"}</option>
                <option value="other">{fa ? "سایر" : "Other"}</option>
              </Select>
            </Field>
          </div>
          <Field label={fa ? "شماره پیگیری" : "Reference"}>
            <Input name="reference" dir="ltr" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button tone="ghost" onClick={() => setOpen(false)}>
              {fa ? "انصراف" : "Cancel"}
            </Button>
            <Button tone="primary" type="submit">
              {fa ? "ثبت" : "Save"}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------ Equipment */

const stageTone: Record<string, "neutral" | "warn" | "info" | "ok" | "danger" | "violet"> = {
  requested: "warn",
  reserved: "warn",
  prepared: "info",
  delivered: "info",
  collected: "ok",
  issue: "danger",
  cancelled: "neutral",
};

export function EquipmentLine({ order: o, compact, crew }: { order: EquipmentOrder; compact?: boolean; crew: readonly string[] }) {
  const { lang, store, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const item = x.itemById.get(o.item_id);
  const returnable = item?.returnable ?? true;
  const step = nextEquipmentStep(o, returnable);
  return (
    <li className={cn("flex items-center gap-3 rounded-xl border border-p-line bg-p-surface", compact ? "px-2.5 py-2" : "px-3 py-2.5")}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          <span className="tabular rounded-md bg-p-sunken px-1.5 text-xs font-bold">{num(lang, o.quantity)}×</span>
          <span className="truncate">{item ? pick(lang, item.name_fa, item.name_en) : "—"}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-p-ink-3">
          <Pill tone={stageTone[o.stage]} className="h-5 px-1.5 text-[11px]">
            {equipmentStageLabel[o.stage][lang]}
          </Pill>
          {!returnable ? <span>{fa ? "برگشت ندارد" : "not returned"}</span> : null}
          {o.notes ? <span className="text-p-danger">{sep(lang)}{o.notes}</span> : null}
        </p>
        <HandoverStamp order={o} className="-mx-1 mt-1" />
      </div>
      {can.edit ? (
        <div className="flex shrink-0 items-center gap-1">
          {o.stage !== "issue" && o.stage !== "collected" ? (
            <ProblemButton orderId={o.id} boothId={o.booth_id} step={lineProblemStep(o)} variant="icon" label={fa ? "گزارش مشکل" : "Report a problem"} />
          ) : o.stage === "issue" ? (
            <IconButton
              size="sm"
              label={fa ? "رفع مشکل" : "Resolve"}
              onClick={() => store.update("equipment_orders", o.id, { stage: o.delivered_qty > 0 ? "delivered" : "requested", notes: null })}
            >
              <CheckCircle2 className="size-4" />
            </IconButton>
          ) : null}
          {step ? (
            <Button size="sm" tone={step === "deliver" ? "primary" : "secondary"} onClick={() => store.update("equipment_orders", o.id, equipmentPatch(o, step, crew))}>
              {step === "deliver" ? (fa ? "تحویل" : "Deliver") : fa ? "جمع آوری" : "Collect"}
            </Button>
          ) : (
            <Check className="size-5 text-p-ok" aria-label={fa ? "انجام شد" : "Done"} />
          )}
        </div>
      ) : null}
    </li>
  );
}

/* -------------------------------------------------------------- Details */

function DetailsTab({ booth, onUpdate, onDelete }: { booth: Booth; onUpdate: (patch: Patch<"booths">) => void; onDelete: () => void }) {
  const { lang, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const disabled = !can.edit;
  const commitNumber = (field: "width" | "depth" | "area_m2" | "price_override") => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (field === "price_override") {
      const v = raw ? Number(raw.replace(/[^\d]/g, "")) : null;
      if (v !== booth.price_override) onUpdate({ price_override: v });
      return;
    }
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0 || v === booth[field]) return;
    if (field === "area_m2") onUpdate({ area_m2: v, area_is_manual: true });
    else onUpdate({ [field]: v });
  };
  return (
    <div className="grid gap-4" key={booth.id + booth.updated_at}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={fa ? "کد غرفه" : "Booth code"}>
          <Input
            defaultValue={booth.code}
            disabled={disabled}
            dir="ltr"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== booth.code) onUpdate({ code: v });
            }}
          />
        </Field>
        <Field label={fa ? "تعداد بر باز" : "Open sides"}>
          <Select value={booth.open_sides} disabled={disabled} onChange={(e) => onUpdate({ open_sides: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {num(lang, n)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "عرض (متر)" : "Width (m)"}>
          <Input type="number" step="0.1" min="0.5" defaultValue={booth.width} disabled={disabled} dir="ltr" onBlur={commitNumber("width")} />
        </Field>
        <Field label={fa ? "عمق (متر)" : "Depth (m)"}>
          <Input type="number" step="0.1" min="0.5" defaultValue={booth.depth} disabled={disabled} dir="ltr" onBlur={commitNumber("depth")} />
        </Field>
      </div>
      <Field
        label={fa ? "متراژ قرارداد" : "Contract area (m²)"}
        hint={
          booth.area_is_manual
            ? fa
              ? "دستی وارد شده؛ با تغییر ابعاد عوض نمی شود."
              : "Typed in; it won't follow the drawing."
            : fa
              ? "از روی ابعاد نقشه محاسبه می شود."
              : "Calculated from the drawing."
        }
      >
        <div className="flex gap-2">
          <Input type="number" step="0.5" min="0.5" defaultValue={booth.area_m2} disabled={disabled} dir="ltr" onBlur={commitNumber("area_m2")} />
          {booth.area_is_manual ? (
            <Button tone="quiet" disabled={disabled} onClick={() => onUpdate({ area_is_manual: false })}>
              {fa ? "از نقشه" : "Use drawing"}
            </Button>
          ) : null}
        </div>
      </Field>
      <Field label={fa ? "قیمت ویژه (اختیاری)" : "Special price (optional)"} hint={fa ? "جایگزین متراژ × نرخ نمایشگاه" : "Replaces area × the exhibition rate"}>
        <Input inputMode="numeric" defaultValue={booth.price_override ?? ""} disabled={disabled} dir="ltr" onBlur={commitNumber("price_override")} />
      </Field>
      <Field label={fa ? "یادداشت" : "Notes"}>
        <Textarea
          defaultValue={booth.notes ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== booth.notes) onUpdate({ notes: v });
          }}
        />
      </Field>
      {can.edit ? (
        <div className="flex flex-wrap gap-2">
          <Button icon={<RotateCw className="size-4" />} onClick={() => onUpdate({ width: booth.depth, depth: booth.width })}>
            {fa ? "چرخش ۹۰ درجه" : "Rotate 90°"}
          </Button>
          {can.manage ? (
            <Button tone="danger" icon={<Trash2 className="size-4" />} onClick={onDelete}>
              {fa ? "حذف غرفه" : "Delete booth"}
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-p-ink-3">
        {fa ? "آخرین تغییر" : "Last changed"} {date(lang, booth.updated_at)}{sep(lang)}{x.exhibition ? pick(lang, x.exhibition.name_fa, x.exhibition.name_en) : ""}
      </p>
      {disabled ? null : <span className="sr-only">{fa ? "تغییرات خودکار ذخیره می شوند" : "Changes save automatically"}</span>}
    </div>
  );
}

