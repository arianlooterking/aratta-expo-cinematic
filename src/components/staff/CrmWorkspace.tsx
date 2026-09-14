"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  History,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { PortalLocale, PortalState } from "@/lib/staff-portal";
import {
  calculateCommercialAccount,
  companyLifecycles,
  companyPriorities,
  leadStages,
  type CompanyContact,
  type CompanyLifecycle,
  type CompanyPriority,
  type CrmCompany,
  type LeadInteraction,
  type LeadStage,
  type SalesLead,
} from "@/lib/staff-commercial";

export type NewCrmLeadDraft = {
  existingCompanyId?: string;
  company: string;
  legalName: string;
  industry: string;
  country: string;
  city: string;
  website: string;
  exhibitionIds: string[];
  contactName: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
  preferredChannel: CompanyContact["preferredChannel"];
  consentStatus: CompanyContact["consentStatus"];
  source: string;
  ownerId: string;
  collaboratorIds: string[];
  expectedArea: number;
  quotedAmount: number;
  currency: SalesLead["currency"];
  priority: CompanyPriority;
  probability: number;
  requestedServices: string[];
  nextActionAt: string;
  notes: string;
};

export type LeadPatch = Partial<Pick<SalesLead, "stage" | "ownerId" | "quotedAmount" | "currency" | "expectedArea" | "nextActionAt" | "notes" | "priority" | "probability">>;
export type CompanyPatch = Partial<Pick<CrmCompany, "lifecycle" | "priority" | "industry" | "country" | "city" | "website" | "notes">>;

const stageCopy: Record<LeadStage, { fa: string; en: string }> = {
  new: { fa: "جدید", en: "New" }, contacted: { fa: "تماس اولیه", en: "Contacted" }, qualified: { fa: "ارزیابی‌شده", en: "Qualified" },
  proposal: { fa: "پیشنهاد", en: "Proposal" }, negotiation: { fa: "مذاکره", en: "Negotiation" }, won: { fa: "نهایی‌شده", en: "Won" }, lost: { fa: "از دست‌رفته", en: "Lost" },
};
const lifecycleCopy: Record<CompanyLifecycle, { fa: string; en: string }> = {
  prospect: { fa: "سرنخ", en: "Prospect" }, active: { fa: "فعال", en: "Active" }, returning: { fa: "بازگشتی", en: "Returning" }, dormant: { fa: "راکد", en: "Dormant" }, archived: { fa: "بایگانی", en: "Archived" },
};
const priorityCopy: Record<CompanyPriority, { fa: string; en: string }> = {
  low: { fa: "کم", en: "Low" }, normal: { fa: "عادی", en: "Normal" }, high: { fa: "بالا", en: "High" }, strategic: { fa: "راهبردی", en: "Strategic" },
};
const numberFormat = (locale: PortalLocale) => new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US");
const dateFormat = (locale: PortalLocale, value: string) => new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const localize = (value: { fa: string; en: string }, locale: PortalLocale) => value[locale];

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[1.6rem] border border-[#dfe5e1] bg-white shadow-[0_18px_55px_rgba(20,48,39,.07)] ${className}`}>{children}</section>;
}

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "rose" | "blue" }) {
  const tones = { slate: "bg-slate-100 text-slate-600", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-800", rose: "bg-rose-50 text-rose-700", blue: "bg-sky-50 text-sky-700" };
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[.68rem] font-black ${tones[tone]}`}>{children}</span>;
}

function Metric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <Surface className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[.68rem] font-black text-slate-400">{label}</p><strong className="mt-1 block text-xl font-black text-[#173e32]">{value}</strong><p className="mt-1 text-[.65rem] font-bold text-slate-400">{note}</p></div><div className="grid size-11 place-items-center rounded-2xl bg-[#edf7f2] text-[#16745a]">{icon}</div></div></Surface>;
}

export function CrmWorkspace({ locale, state, onAddLead, onUpdateLead, onUpdateCompany, onAddInteraction }: {
  locale: PortalLocale;
  state: PortalState;
  onAddLead: (draft: NewCrmLeadDraft) => void;
  onUpdateLead: (id: string, patch: LeadPatch) => void;
  onUpdateCompany: (id: string, patch: CompanyPatch) => void;
  onAddInteraction: (leadId: string, interaction: Omit<LeadInteraction, "id" | "occurredAt">) => void;
}) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<LeadStage | "all">("all");
  const [ownerId, setOwnerId] = useState("all");
  const [exhibitionId, setExhibitionId] = useState(state.activeExhibitionId);
  const [expandedId, setExpandedId] = useState(state.companies.find((company) => company.participations.some((item) => item.exhibitionId === state.activeExhibitionId))?.id ?? "");
  const [showAdd, setShowAdd] = useState(false);

  const scopedLeads = useMemo(() => state.leads.filter((lead) => exhibitionId === "all" || lead.exhibitionId === exhibitionId), [exhibitionId, state.leads]);
  const visibleCompanies = useMemo(() => state.companies.filter((company) => {
    const leads = scopedLeads.filter((lead) => lead.companyId === company.id);
    const matchesScope = exhibitionId === "all" ? company.participations.length > 0 : company.participations.some((item) => item.exhibitionId === exhibitionId);
    const matchesStage = stage === "all" || leads.some((lead) => lead.stage === stage);
    const matchesOwner = ownerId === "all" || company.ownerIds.includes(ownerId) || leads.some((lead) => lead.ownerId === ownerId);
    const haystack = `${company.name} ${company.legalName} ${company.industry} ${company.tags.join(" ")} ${company.contacts.map((contact) => contact.name).join(" ")}`.toLocaleLowerCase(locale === "fa" ? "fa" : "en");
    return matchesScope && matchesStage && matchesOwner && haystack.includes(search.trim().toLocaleLowerCase(locale === "fa" ? "fa" : "en"));
  }), [exhibitionId, locale, ownerId, scopedLeads, search, stage, state.companies]);

  const activeOpportunities = scopedLeads.filter((lead) => !["won", "lost"].includes(lead.stage));
  const asOf = Date.parse(state.lastSavedAt);
  const overdue = activeOpportunities.filter((lead) => Date.parse(lead.nextActionAt) < asOf).length;
  const pipeline = activeOpportunities.reduce((total, lead) => total + lead.quotedAmount, 0);
  const returning = visibleCompanies.filter((company) => company.participations.length > 1).length;

  return <div className="space-y-5">
    <div className="overflow-hidden rounded-[2rem] border border-[#25463a] bg-[radial-gradient(circle_at_15%_0%,rgba(38,167,139,.22),transparent_36%),linear-gradient(135deg,#071d17,#10382d)] p-5 text-white shadow-[0_24px_70px_rgba(6,28,22,.22)] sm:p-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.15em] text-[#8edfc5]">{locale === "fa" ? "CRM یکپارچه شرکت‌ها و نمایشگاه‌ها" : "Company and exhibition CRM"}</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{locale === "fa" ? "هر شرکت، یک پرونده؛ هر نمایشگاه، یک مسیر روشن" : "One company record. A clear journey for every exhibition."}</h1><p className="mt-3 text-sm leading-7 text-white/65">{locale === "fa" ? "مالک پرونده، تماس بعدی، مشارکت‌های چندساله، وضعیت مذاکره و موانع تجاری در یک نمای عملیاتی." : "Ownership, next action, multi-year participation, negotiation state, and commercial blockers in one operational view."}</p></div>
        <button type="button" onClick={() => setShowAdd(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#e7c47f] px-5 text-sm font-black text-[#173328] shadow-lg"><Plus size={18} />{locale === "fa" ? "سرنخ / مشارکت جدید" : "New lead / participation"}</button>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[[visibleCompanies.length, locale === "fa" ? "شرکت در دامنه" : "companies in scope"], [activeOpportunities.length, locale === "fa" ? "فرصت باز" : "open opportunities"], [returning, locale === "fa" ? "شرکت بازگشتی" : "returning companies"], [overdue, locale === "fa" ? "پیگیری عقب‌افتاده" : "overdue follow-ups"]].map(([value, label]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3"><strong className="text-xl font-black">{numberFormat(locale).format(Number(value))}</strong><span className="ms-2 text-[.68rem] font-bold text-white/55">{label}</span></div>)}
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Building2 size={20} />} label={locale === "fa" ? "شرکت‌ها" : "Companies"} value={numberFormat(locale).format(visibleCompanies.length)} note={locale === "fa" ? "بدون تکرار بین نمایشگاه‌ها" : "deduplicated across events"} />
      <Metric icon={<BriefcaseBusiness size={20} />} label={locale === "fa" ? "فرصت‌های باز" : "Open pipeline"} value={numberFormat(locale).format(activeOpportunities.length)} note={locale === "fa" ? "از تماس تا مذاکره" : "contact through negotiation"} />
      <Metric icon={<CircleDollarSign size={20} />} label={locale === "fa" ? "ارزش پیشنهادها" : "Quoted value"} value={numberFormat(locale).format(pipeline)} note={locale === "fa" ? "تومان در نسخه نمونه" : "IRT in the demo workspace"} />
      <Metric icon={<Clock3 size={20} />} label={locale === "fa" ? "نیازمند اقدام" : "Needs action"} value={numberFormat(locale).format(overdue)} note={locale === "fa" ? "موعد پیگیری گذشته" : "follow-up is overdue"} />
    </div>

    <Surface className="p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(10rem,.35fr))]">
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 px-3 text-slate-400"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={locale === "fa" ? "شرکت، صنعت، مخاطب یا برچسب..." : "Company, industry, contact, or tag..."} className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none" /></label>
        <select aria-label={locale === "fa" ? "نمایشگاه" : "Exhibition"} value={exhibitionId} onChange={(event) => setExhibitionId(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none"><option value="all">{locale === "fa" ? "همه نمایشگاه‌ها" : "All exhibitions"}</option>{state.exhibitions.map((item) => <option key={item.id} value={item.id}>{localize(item.name, locale)}</option>)}</select>
        <select aria-label={locale === "fa" ? "مرحله" : "Stage"} value={stage} onChange={(event) => setStage(event.target.value as LeadStage | "all")} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none"><option value="all">{locale === "fa" ? "همه مراحل" : "All stages"}</option>{leadStages.map((item) => <option key={item} value={item}>{stageCopy[item][locale]}</option>)}</select>
        <select aria-label={locale === "fa" ? "مسئول" : "Owner"} value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none"><option value="all">{locale === "fa" ? "همه مسئولان" : "All owners"}</option>{state.staffUsers.map((staff) => <option key={staff.id} value={staff.id}>{staff.displayName}</option>)}</select>
      </div>
    </Surface>

    <div className="space-y-3">
      {visibleCompanies.map((company) => <CompanyRecord key={company.id} locale={locale} state={state} company={company} asOf={asOf} expanded={expandedId === company.id} onToggle={() => setExpandedId((current) => current === company.id ? "" : company.id)} onUpdateCompany={(patch) => onUpdateCompany(company.id, patch)} onUpdateLead={onUpdateLead} onAddInteraction={onAddInteraction} />)}
      {!visibleCompanies.length ? <Surface className="grid min-h-52 place-items-center p-8 text-center"><div><Search className="mx-auto text-slate-300" size={30} /><h2 className="mt-3 font-black text-[#173e32]">{locale === "fa" ? "شرکتی با این فیلتر پیدا نشد" : "No company matches these filters"}</h2><p className="mt-1 text-sm text-slate-400">{locale === "fa" ? "دامنه یا فیلترها را تغییر دهید." : "Change the scope or filters."}</p></div></Surface> : null}
    </div>
    <AnimatePresence>{showAdd ? <LeadDialog locale={locale} state={state} onClose={() => setShowAdd(false)} onCreate={(draft) => { onAddLead(draft); setShowAdd(false); }} /> : null}</AnimatePresence>
  </div>;
}

function CompanyRecord({ locale, state, company, asOf, expanded, onToggle, onUpdateCompany, onUpdateLead, onAddInteraction }: {
  locale: PortalLocale; state: PortalState; company: CrmCompany; asOf: number; expanded: boolean; onToggle: () => void; onUpdateCompany: (patch: CompanyPatch) => void; onUpdateLead: (id: string, patch: LeadPatch) => void; onAddInteraction: (leadId: string, interaction: Omit<LeadInteraction, "id" | "occurredAt">) => void;
}) {
  const leads = state.leads.filter((lead) => lead.companyId === company.id);
  const owners = company.ownerIds.map((id) => state.staffUsers.find((staff) => staff.id === id)).filter(Boolean);
  const primaryContact = company.contacts.find((contact) => contact.primary) ?? company.contacts[0];
  const nextLead = [...leads].filter((lead) => !["won", "lost"].includes(lead.stage)).sort((a, b) => Date.parse(a.nextActionAt) - Date.parse(b.nextActionAt))[0];
  const accounts = state.commercialAccounts.filter((account) => account.company === company.name);
  const outstanding = accounts.reduce((total, account) => total + calculateCommercialAccount(account).outstanding, 0);
  const [interaction, setInteraction] = useState("");
  const timeline = [...company.activities, ...leads.flatMap((lead) => lead.interactions.map((item) => ({ id: item.id, kind: item.kind, ownerId: lead.ownerId, summary: item.summary, occurredAt: item.occurredAt, leadId: lead.id, exhibitionId: lead.exhibitionId })))].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return <Surface className="overflow-hidden">
    <button type="button" onClick={onToggle} aria-expanded={expanded} className="grid min-h-[7.2rem] w-full gap-4 p-4 text-start sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(12rem,.55fr)_minmax(12rem,.55fr)_auto] lg:items-center">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="grid size-10 place-items-center rounded-2xl bg-[#eaf6f1] text-[#16745a]"><Building2 size={19} /></span><div className="min-w-0"><h2 className="truncate text-base font-black text-[#173e32]">{company.name}</h2><p className="mt-1 truncate text-xs font-bold text-slate-400">{company.industry || (locale === "fa" ? "صنعت ثبت نشده" : "Industry not recorded")} · {[company.city, company.country].filter(Boolean).join("، ") || "—"}</p></div><Pill tone={company.lifecycle === "returning" ? "green" : company.lifecycle === "archived" ? "slate" : "blue"}>{lifecycleCopy[company.lifecycle][locale]}</Pill>{company.priority === "strategic" || company.priority === "high" ? <Pill tone="amber">{priorityCopy[company.priority][locale]}</Pill> : null}</div></div>
      <div><p className="text-[.65rem] font-black text-slate-400">{locale === "fa" ? "مشارکت در نمایشگاه" : "Exhibition participation"}</p><div className="mt-2 flex flex-wrap gap-1.5">{company.participations.slice(0, 3).map((item) => <Pill key={item.id} tone="slate">{localize(state.exhibitions.find((exhibition) => exhibition.id === item.exhibitionId)?.name ?? { fa: "نامشخص", en: "Unknown" }, locale)}</Pill>)}</div></div>
      <div><p className="text-[.65rem] font-black text-slate-400">{locale === "fa" ? "اقدام بعدی" : "Next action"}</p><p className={`mt-2 text-xs font-black ${nextLead && Date.parse(nextLead.nextActionAt) < asOf ? "text-rose-600" : "text-[#173e32]"}`}>{nextLead ? dateFormat(locale, nextLead.nextActionAt) : (locale === "fa" ? "اقدامی باز نیست" : "No open action")}</p><p className="mt-1 text-[.65rem] font-bold text-slate-400">{owners.map((owner) => owner?.displayName).join("، ") || "—"}</p></div>
      <div className="flex items-center justify-between gap-3 lg:justify-end"><div className="text-end"><strong className={`block text-sm ${outstanding > 0 ? "text-rose-600" : "text-emerald-700"}`}>{numberFormat(locale).format(outstanding)}</strong><span className="text-[.62rem] font-bold text-slate-400">{locale === "fa" ? "مانده تومان" : "IRT outstanding"}</span></div><span className={`grid size-11 place-items-center rounded-2xl bg-slate-50 text-slate-500 transition ${expanded ? "rotate-180" : ""}`}><ChevronDown size={19} /></span></div>
    </button>
    <AnimatePresence initial={false}>{expanded ? <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .2 }} className="overflow-hidden"><div className="border-t border-slate-100 bg-[#fbfcfb] p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><UsersRound size={17} className="text-[#19896d]" /><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "مخاطب و تیم پرونده" : "Contact and account team"}</h3></div>{primaryContact ? <div className="mt-3"><strong className="text-sm text-slate-700">{primaryContact.name}</strong><p className="mt-1 text-xs font-bold text-slate-400">{primaryContact.title || "—"} · {primaryContact.preferredChannel}</p></div> : <p className="mt-3 text-xs font-bold text-slate-400">{locale === "fa" ? "مخاطبی ثبت نشده است." : "No contact is recorded."}</p>}<div className="mt-3 flex flex-wrap gap-2">{owners.map((owner) => <Pill key={owner!.id} tone="green">{owner!.displayName} · {owner!.title}</Pill>)}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><Sparkles size={17} className="text-[#b0802e]" /><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "سلامت پرونده" : "Account health"}</h3></div><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[.65rem] font-black text-slate-400">{locale === "fa" ? "چرخه" : "Lifecycle"}<select value={company.lifecycle} onChange={(event) => onUpdateCompany({ lifecycle: event.target.value as CompanyLifecycle })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700">{companyLifecycles.map((item) => <option key={item} value={item}>{lifecycleCopy[item][locale]}</option>)}</select></label><label className="text-[.65rem] font-black text-slate-400">{locale === "fa" ? "اولویت" : "Priority"}<select value={company.priority} onChange={(event) => onUpdateCompany({ priority: event.target.value as CompanyPriority })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700">{companyPriorities.map((item) => <option key={item} value={item}>{priorityCopy[item][locale]}</option>)}</select></label></div></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={17} className="text-[#19896d]" /><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "مسیر نمایشگاه‌ها" : "Exhibition journey"}</h3></div><Pill tone="blue">{numberFormat(locale).format(company.participations.length)} {locale === "fa" ? "مشارکت" : "participations"}</Pill></div><div className="mt-3 grid gap-2 lg:grid-cols-2">{company.participations.map((item) => { const exhibition = state.exhibitions.find((value) => value.id === item.exhibitionId); const lead = leads.find((value) => value.id === item.leadId); return <div key={item.id} className="rounded-2xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><div><strong className="text-xs text-[#173e32]">{exhibition ? localize(exhibition.name, locale) : "—"}</strong><p className="mt-1 text-[.65rem] font-bold text-slate-400">{numberFormat(locale).format(item.expectedArea)} m² · {item.requestedServices.join("، ") || (locale === "fa" ? "بدون خدمت ثبت‌شده" : "No services recorded")}</p></div>{lead ? <Pill tone={lead.stage === "lost" ? "rose" : lead.stage === "won" ? "green" : "amber"}>{stageCopy[lead.stage][locale]}</Pill> : <Pill>{item.status}</Pill>}</div>{lead ? <div className="mt-3 grid grid-cols-2 gap-2"><select aria-label={locale === "fa" ? "مرحله فرصت" : "Opportunity stage"} value={lead.stage} onChange={(event) => onUpdateLead(lead.id, { stage: event.target.value as LeadStage })} className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700">{leadStages.map((stageItem) => <option key={stageItem} value={stageItem}>{stageCopy[stageItem][locale]}</option>)}</select><select aria-label={locale === "fa" ? "مسئول فرصت" : "Opportunity owner"} value={lead.ownerId} onChange={(event) => onUpdateLead(lead.id, { ownerId: event.target.value })} className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700">{state.staffUsers.filter((staff) => staff.status !== "inactive").map((staff) => <option key={staff.id} value={staff.id}>{staff.displayName}</option>)}</select></div> : null}</div>; })}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><History size={17} className="text-[#19896d]" /><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "تاریخچه ارتباط و فرایند" : "Relationship and process timeline"}</h3></div><div className="mt-4 space-y-3">{timeline.slice(0, 8).map((item) => { const staff = state.staffUsers.find((user) => user.id === item.ownerId); return <div key={`${item.id}-${item.occurredAt}`} className="flex gap-3"><span className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">{item.kind === "call" ? <Phone size={14} /> : item.kind === "email" ? <Mail size={14} /> : <MessageSquareText size={14} />}</span><div><p className="text-xs font-bold leading-5 text-slate-700">{item.summary}</p><p className="mt-1 text-[.62rem] font-bold text-slate-400">{dateFormat(locale, item.occurredAt)} · {staff?.displayName ?? item.ownerId}</p></div></div>; })}{!timeline.length ? <p className="text-xs font-bold text-slate-400">{locale === "fa" ? "هنوز رویدادی ثبت نشده است." : "No relationship activity yet."}</p> : null}</div></div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "اقدام سریع" : "Quick action"}</h3>{nextLead ? <><p className="mt-2 text-xs font-bold text-slate-500">{locale === "fa" ? "ثبت تماس یا یادداشت روی نزدیک‌ترین فرصت باز" : "Log a call or note on the nearest open opportunity"}</p><textarea rows={3} value={interaction} onChange={(event) => setInteraction(event.target.value)} placeholder={locale === "fa" ? "خلاصه تماس، تصمیم یا مانع..." : "Call summary, decision, or blocker..."} className="mt-3 min-h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700 outline-none focus:border-[#67b49e]" /><button type="button" disabled={!interaction.trim()} onClick={() => { onAddInteraction(nextLead.id, { kind: "note", owner: state.staffUsers.find((staff) => staff.id === nextLead.ownerId)?.displayName ?? nextLead.owner, summary: interaction.trim() }); setInteraction(""); }} className="mt-2 min-h-11 w-full rounded-xl bg-[#153d31] text-xs font-black text-white disabled:opacity-40">{locale === "fa" ? "ثبت در تاریخچه" : "Add to timeline"}</button></> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-400">{locale === "fa" ? "فرصت بازی برای ثبت اقدام وجود ندارد." : "There is no open opportunity for a quick action."}</p>}</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><CircleDollarSign size={17} className="text-[#19896d]" /><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "وضعیت تجاری" : "Commercial status"}</h3></div><div className="mt-3 space-y-2">{accounts.map((account) => { const totals = calculateCommercialAccount(account); return <div key={account.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-3 text-xs font-black text-slate-700"><span>{localize(state.exhibitions.find((item) => item.id === account.exhibitionId)?.name ?? { fa: "نمایشگاه", en: "Exhibition" }, locale)}</span><span className={totals.outstanding > 0 ? "text-rose-600" : "text-emerald-700"}>{numberFormat(locale).format(totals.percentPaid)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${totals.percentPaid}%` }} /></div><p className="mt-2 text-[.65rem] font-bold text-slate-400">{numberFormat(locale).format(totals.outstanding)} {locale === "fa" ? "تومان مانده" : "IRT outstanding"}</p></div>; })}{!accounts.length ? <p className="text-xs font-bold text-slate-400">{locale === "fa" ? "پرونده مالی متصل نیست." : "No financial account is linked."}</p> : null}</div></div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-xs font-bold leading-6 text-sky-900"><div className="flex gap-2"><AlertCircle className="mt-1 shrink-0" size={16} /><p>{locale === "fa" ? "این نسخه داده‌ها را در همین مرورگر نگه می‌دارد. دعوت کاربر، مجوزهای سروری و همکاری هم‌زمان هنوز به بک‌اند متصل نیستند." : "This version stores data in this browser. User invitations, server authorization, and real-time collaboration are not connected yet."}</p></div></div>
        </div>
      </div>
    </div></motion.div> : null}</AnimatePresence>
  </Surface>;
}

function LeadDialog({ locale, state, onClose, onCreate }: { locale: PortalLocale; state: PortalState; onClose: () => void; onCreate: (draft: NewCrmLeadDraft) => void }) {
  const [existingCompanyId, setExistingCompanyId] = useState("");
  const [company, setCompany] = useState(""); const [legalName, setLegalName] = useState(""); const [industry, setIndustry] = useState(""); const [country, setCountry] = useState("ایران"); const [city, setCity] = useState(""); const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState(""); const [contactTitle, setContactTitle] = useState(""); const [contactPhone, setContactPhone] = useState(""); const [contactEmail, setContactEmail] = useState(""); const [preferredChannel, setPreferredChannel] = useState<CompanyContact["preferredChannel"]>("phone"); const [consentStatus, setConsentStatus] = useState<CompanyContact["consentStatus"]>("unknown");
  const defaultNextAction = new Date(Date.parse(state.lastSavedAt) + 86400000).toISOString();
  const [exhibitionIds, setExhibitionIds] = useState([state.activeExhibitionId]); const [source, setSource] = useState(""); const [ownerId, setOwnerId] = useState(state.staffUsers.find((staff) => staff.status === "active")?.id ?? ""); const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]); const [area, setArea] = useState("0"); const [quote, setQuote] = useState("0"); const [priority, setPriority] = useState<CompanyPriority>("normal"); const [probability, setProbability] = useState("10"); const [services, setServices] = useState(""); const [nextAction, setNextAction] = useState(defaultNextAction.slice(0, 16)); const [notes, setNotes] = useState(""); const [error, setError] = useState("");
  const existing = state.companies.find((item) => item.id === existingCompanyId);
  function submit(event: FormEvent) {
    event.preventDefault();
    const name = existing?.name ?? company.trim();
    if (!name || !ownerId || !exhibitionIds.length) { setError(locale === "fa" ? "شرکت، مسئول و حداقل یک نمایشگاه الزامی است." : "Company, owner, and at least one exhibition are required."); return; }
    if (!contactPhone.trim() && !contactEmail.trim() && !existing?.contacts.length) { setError(locale === "fa" ? "حداقل تلفن یا ایمیل مخاطب را وارد کنید." : "Add at least a contact phone or email."); return; }
    const next = new Date(nextAction);
    onCreate({ existingCompanyId: existing?.id, company: name, legalName: existing?.legalName ?? (legalName.trim() || name), industry: existing?.industry ?? industry.trim(), country: existing?.country ?? country.trim(), city: existing?.city ?? city.trim(), website: existing?.website ?? website.trim(), exhibitionIds, contactName: contactName.trim(), contactTitle: contactTitle.trim(), contactPhone: contactPhone.trim(), contactEmail: contactEmail.trim(), preferredChannel, consentStatus, source: source.trim() || (locale === "fa" ? "ثبت دستی" : "Manual entry"), ownerId, collaboratorIds, expectedArea: Math.max(0, Number(area) || 0), quotedAmount: Math.max(0, Number(quote) || 0), currency: "IRT", priority, probability: Math.min(100, Math.max(0, Number(probability) || 0)), requestedServices: services.split(/[،,]/).map((item) => item.trim()).filter(Boolean), nextActionAt: Number.isFinite(next.getTime()) ? next.toISOString() : defaultNextAction, notes: notes.trim() });
  }
  return <motion.div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#061b16]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.div role="dialog" aria-modal="true" aria-labelledby="crm-lead-title" className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
    <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><p className="text-[.68rem] font-black uppercase tracking-[.16em] text-[#19896d]">ARATTA EXPO · CRM 360</p><h2 id="crm-lead-title" className="mt-2 text-xl font-black text-[#173e32]">{locale === "fa" ? "ساخت سرنخ و مشارکت نمایشگاهی" : "Create a lead and exhibition participation"}</h2><p className="mt-1 text-xs font-bold text-slate-400">{locale === "fa" ? "شرکت تکراری ساخته نمی‌شود؛ می‌توانید همان شرکت را به چند نمایشگاه متصل کنید." : "Existing companies are reused and can be linked to several exhibitions."}</p></div><button type="button" onClick={onClose} aria-label={locale === "fa" ? "بستن" : "Close"} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600"><X size={20} /></button></div>
    <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"><div className="grid gap-5 lg:grid-cols-2">
      <FormSection icon={<Building2 size={18} />} title={locale === "fa" ? "۱. شرکت" : "1. Company"} description={locale === "fa" ? "شرکت موجود را انتخاب کنید یا یک حساب تازه بسازید." : "Choose an existing company or create a new account."}><Field label={locale === "fa" ? "شرکت موجود" : "Existing company"}><select value={existingCompanyId} onChange={(event) => setExistingCompanyId(event.target.value)} className="input"><option value="">{locale === "fa" ? "شرکت جدید" : "New company"}</option>{state.companies.filter((item) => item.lifecycle !== "archived").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>{!existing ? <><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "نام تجاری *" : "Trading name *"}><input value={company} onChange={(event) => setCompany(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "نام حقوقی" : "Legal name"}><input value={legalName} onChange={(event) => setLegalName(event.target.value)} className="input" /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "صنعت" : "Industry"}><input value={industry} onChange={(event) => setIndustry(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "شهر" : "City"}><input value={city} onChange={(event) => setCity(event.target.value)} className="input" /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "کشور" : "Country"}><input value={country} onChange={(event) => setCountry(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "وب‌سایت" : "Website"}><input value={website} onChange={(event) => setWebsite(event.target.value)} className="input" inputMode="url" /></Field></div></> : <div className="rounded-2xl bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-emerald-800"><CheckCircle2 size={17} />{existing.name}</div><p className="mt-1 text-xs font-bold text-emerald-700/70">{existing.participations.length} {locale === "fa" ? "مشارکت قبلی · پرونده موجود استفاده می‌شود" : "previous participations · existing account will be reused"}</p></div>}</FormSection>
      <FormSection icon={<UsersRound size={18} />} title={locale === "fa" ? "۲. مخاطب" : "2. Contact"} description={locale === "fa" ? "برای شرکت تازه، حداقل یک راه ارتباطی لازم است." : "A new company needs at least one contact route."}><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "نام مخاطب" : "Contact name"}><input value={contactName} onChange={(event) => setContactName(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "سمت" : "Title"}><input value={contactTitle} onChange={(event) => setContactTitle(event.target.value)} className="input" /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "تلفن" : "Phone"}><input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="input" inputMode="tel" /></Field><Field label={locale === "fa" ? "ایمیل" : "Email"}><input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="input" inputMode="email" /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "کانال ترجیحی" : "Preferred channel"}><select value={preferredChannel} onChange={(event) => setPreferredChannel(event.target.value as CompanyContact["preferredChannel"])} className="input"><option value="phone">{locale === "fa" ? "تلفن" : "Phone"}</option><option value="email">{locale === "fa" ? "ایمیل" : "Email"}</option><option value="messaging">{locale === "fa" ? "پیام‌رسان" : "Messaging"}</option><option value="meeting">{locale === "fa" ? "جلسه" : "Meeting"}</option></select></Field><Field label={locale === "fa" ? "رضایت ارتباط" : "Communication consent"}><select value={consentStatus} onChange={(event) => setConsentStatus(event.target.value as CompanyContact["consentStatus"])} className="input"><option value="unknown">{locale === "fa" ? "نامشخص" : "Unknown"}</option><option value="granted">{locale === "fa" ? "دریافت شده" : "Granted"}</option><option value="declined">{locale === "fa" ? "رد شده" : "Declined"}</option></select></Field></div></FormSection>
      <FormSection icon={<CalendarDays size={18} />} title={locale === "fa" ? "۳. فرصت و نمایشگاه" : "3. Opportunity and exhibitions"} description={locale === "fa" ? "یک شرکت می‌تواند هم‌زمان برای چند نمایشگاه فرصت جداگانه داشته باشد." : "A company can have a separate opportunity for several exhibitions."}><div className="grid gap-2 sm:grid-cols-2">{state.exhibitions.map((item) => { const checked = exhibitionIds.includes(item.id); const already = existing?.participations.some((participation) => participation.exhibitionId === item.id); return <label key={item.id} className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 text-xs font-black ${checked ? "border-[#67b49e] bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"}`}><input type="checkbox" checked={checked} disabled={already} onChange={() => setExhibitionIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className="size-5 accent-[#16745a]" /><span>{localize(item.name, locale)}{already ? <small className="mt-1 block text-[.6rem] text-slate-400">{locale === "fa" ? "از قبل متصل" : "already linked"}</small> : null}</span></label>; })}</div><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "مساحت مورد انتظار" : "Expected area m²"}><input type="number" min="0" value={area} onChange={(event) => setArea(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "مبلغ پیشنهاد (تومان)" : "Quote (IRT)"}><input type="number" min="0" value={quote} onChange={(event) => setQuote(event.target.value)} className="input" /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "اولویت" : "Priority"}><select value={priority} onChange={(event) => setPriority(event.target.value as CompanyPriority)} className="input">{companyPriorities.map((item) => <option key={item} value={item}>{priorityCopy[item][locale]}</option>)}</select></Field><Field label={locale === "fa" ? "احتمال موفقیت %" : "Probability %"}><input type="number" min="0" max="100" value={probability} onChange={(event) => setProbability(event.target.value)} className="input" /></Field></div><Field label={locale === "fa" ? "خدمات درخواستی" : "Requested services"}><input value={services} onChange={(event) => setServices(event.target.value)} placeholder={locale === "fa" ? "نور، اینترنت، مبلمان..." : "Lighting, internet, furniture..."} className="input" /></Field></FormSection>
      <FormSection icon={<BriefcaseBusiness size={18} />} title={locale === "fa" ? "۴. مسئولیت و اقدام بعدی" : "4. Ownership and next action"} description={locale === "fa" ? "مسئول را از کاربران واقعی فضای کاری انتخاب کنید." : "Choose accountable staff from the workspace directory."}><div className="grid gap-3 sm:grid-cols-2"><Field label={locale === "fa" ? "مسئول اصلی *" : "Primary owner *"}><select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="input">{state.staffUsers.filter((staff) => staff.status === "active" || staff.status === "away").map((staff) => <option key={staff.id} value={staff.id}>{staff.displayName} · {staff.title}</option>)}</select></Field><Field label={locale === "fa" ? "منبع سرنخ" : "Lead source"}><input value={source} onChange={(event) => setSource(event.target.value)} className="input" /></Field></div><Field label={locale === "fa" ? "همکاران پرونده" : "Collaborators"}><div className="grid gap-2 sm:grid-cols-2">{state.staffUsers.filter((staff) => staff.id !== ownerId && staff.status !== "inactive").map((staff) => <label key={staff.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600"><input type="checkbox" checked={collaboratorIds.includes(staff.id)} onChange={() => setCollaboratorIds((current) => current.includes(staff.id) ? current.filter((id) => id !== staff.id) : [...current, staff.id])} className="size-4 accent-[#16745a]" />{staff.displayName}</label>)}</div></Field><Field label={locale === "fa" ? "موعد اقدام بعدی" : "Next action due"}><input type="datetime-local" value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "یادداشت و محدودیت‌ها" : "Notes and constraints"}><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="input resize-none" /></Field></FormSection>
    </div>{error ? <div role="alert" className="mt-5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700"><AlertCircle size={18} />{error}</div> : null}<div className="sticky bottom-0 mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-600">{locale === "fa" ? "انصراف" : "Cancel"}</button><button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#153d31] px-6 text-sm font-black text-white"><Plus size={17} />{locale === "fa" ? "ساخت پرونده‌ها" : "Create records"}<ArrowUpLeft size={16} /></button></div></form>
  </motion.div></motion.div>;
}

function FormSection({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <section className="space-y-3 rounded-[1.4rem] border border-slate-200 bg-[#fbfcfb] p-4 sm:p-5"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#eaf6f1] text-[#16745a]">{icon}</span><div><h3 className="text-sm font-black text-[#173e32]">{title}</h3><p className="mt-1 text-[.68rem] font-bold leading-5 text-slate-400">{description}</p></div></div>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-[.68rem] font-black text-slate-500">{label}<div className="mt-1.5">{children}</div></label>;
}
