"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Handshake,
  LockKeyhole,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  WalletCards,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import type { PortalLocale, PortalState } from "@/lib/staff-portal";
import {
  calculateCommercialAccount,
  getHandoverDecision,
  interactionKinds,
  leadStages,
  type CommercialAccount,
  type CommercialCommunication,
  type CommercialCurrency,
  type InteractionKind,
  type LeadInteraction,
  type LeadStage,
  type PaymentEntry,
  type SalesLead,
} from "@/lib/staff-commercial";

const numberFormat = (locale: PortalLocale) => new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US");
const dateFormat = (locale: PortalLocale, value: string) =>
  new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-gregory" : "en-US", {
    month: "short",
    day: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  }).format(new Date(value));

const currencyLabel = (currency: CommercialCurrency, locale: PortalLocale) =>
  currency === "IRT" ? (locale === "fa" ? "تومان" : "IRT") : currency;

const stageCopy: Record<LeadStage, { fa: string; en: string }> = {
  new: { fa: "جدید", en: "New" },
  contacted: { fa: "تماس گرفته شد", en: "Contacted" },
  qualified: { fa: "واجد شرایط", en: "Qualified" },
  proposal: { fa: "پیشنهاد", en: "Proposal" },
  negotiation: { fa: "مذاکره", en: "Negotiation" },
  won: { fa: "نهایی شده", en: "Won" },
  lost: { fa: "از دست رفته", en: "Lost" },
};

const kindCopy: Record<InteractionKind, { fa: string; en: string }> = {
  call: { fa: "تماس", en: "Call" },
  email: { fa: "پیام / ایمیل", en: "Email / message" },
  meeting: { fa: "جلسه", en: "Meeting" },
  note: { fa: "یادداشت", en: "Note" },
};

const stageTone: Record<LeadStage, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-cyan-50 text-cyan-800",
  qualified: "bg-sky-50 text-sky-800",
  proposal: "bg-violet-50 text-violet-800",
  negotiation: "bg-amber-50 text-amber-800",
  won: "bg-emerald-50 text-emerald-800",
  lost: "bg-rose-50 text-rose-800",
};

function localize(value: { fa: string; en: string }, locale: PortalLocale) {
  return value[locale];
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[1.7rem] border border-[#dfe4df] bg-white shadow-[0_18px_55px_rgba(20,48,39,0.07)] ${className}`}>{children}</section>;
}

function EmptyState({ locale, title }: { locale: PortalLocale; title: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
      <div>
        <Search className="mx-auto mb-3 text-slate-300" size={28} />
        <p className="font-black text-slate-700">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{locale === "fa" ? "فیلتر را تغییر دهید یا یک رکورد تازه بسازید." : "Change the filter or create a new record."}</p>
      </div>
    </div>
  );
}

type AssistantAnswer = {
  id: string;
  question: string;
  title: string;
  summary: string;
  lines: string[];
  source: string;
  target?: "crm" | "payments" | "logistics" | "exhibitors";
};

export function AssistantWorkspace({
  locale,
  state,
  onNavigate,
}: {
  locale: PortalLocale;
  state: PortalState;
  onNavigate: (target: "crm" | "payments" | "logistics" | "exhibitors") => void;
}) {
  const [query, setQuery] = useState("");
  const [answers, setAnswers] = useState<AssistantAnswer[]>([]);
  const [scopeId, setScopeId] = useState(state.activeExhibitionId);
  const exhibition = state.exhibitions.find((item) => item.id === scopeId) ?? state.exhibitions[0];
  const hallIds = new Set(exhibition?.hallIds ?? []);
  const booths = state.halls.filter((hall) => hallIds.has(hall.id)).flatMap((hall) => hall.booths);
  const accounts = state.commercialAccounts.filter((account) => account.exhibitionId === exhibition?.id);
  const leads = state.leads.filter((lead) => lead.exhibitionId === exhibition?.id);

  const quickPrompts = locale === "fa"
    ? ["شرکت‌های شرکت‌کننده را نشان بده", "چه چیزهایی باید تحویل شود؟", "چه غرفه‌هایی تسویه نشده‌اند؟", "اقدام بعدی سرنخ‌ها چیست؟"]
    : ["Show participating companies", "What still needs delivery?", "Which booths are unpaid?", "What are the next lead actions?"];

  function answerQuestion(raw: string) {
    const question = raw.trim();
    if (!question || !exhibition) return;
    const normalized = question.toLocaleLowerCase(locale === "fa" ? "fa" : "en");
    const mentionedExhibition = state.exhibitions.find((item) =>
      [item.name.fa, item.name.en].some((name) => normalized.includes(name.toLocaleLowerCase(locale === "fa" ? "fa" : "en"))),
    );
    const answerExhibition = mentionedExhibition ?? exhibition;
    const answerHallIds = new Set(answerExhibition.hallIds);
    const answerBooths = state.halls.filter((hall) => answerHallIds.has(hall.id)).flatMap((hall) => hall.booths);
    const answerAccounts = state.commercialAccounts.filter((account) => account.exhibitionId === answerExhibition.id);
    const answerLeads = state.leads.filter((lead) => lead.exhibitionId === answerExhibition.id);
    let answer: AssistantAnswer;
    if (/پرداخت|تسویه|مانده|payment|paid|balance|handover|تحویل غرفه/.test(normalized)) {
      const blocked = answerAccounts.filter((account) => getHandoverDecision(account).status === "blocked");
      const exceptions = answerAccounts.filter((account) => getHandoverDecision(account).status === "exception");
      answer = {
        id: uid("assistant"), question,
        title: locale === "fa" ? "کنترل تسویه و تحویل غرفه" : "Payment and handover control",
        summary: locale === "fa" ? `${numberFormat(locale).format(blocked.length)} پرونده مسدود و ${numberFormat(locale).format(exceptions.length)} استثنای تاییدشده وجود دارد.` : `${blocked.length} blocked accounts and ${exceptions.length} approved exceptions were found.`,
        lines: answerAccounts.map((account) => {
          const decision = getHandoverDecision(account);
          const booth = answerBooths.find((item) => item.id === account.boothId)?.code ?? "—";
          return `${booth} · ${account.company} · ${decision.status === "eligible" ? (locale === "fa" ? "مجاز" : "eligible") : decision.status === "exception" ? (locale === "fa" ? "استثنا" : "exception") : (locale === "fa" ? "مسدود" : "blocked")} · ${numberFormat(locale).format(decision.totals.outstanding)} ${currencyLabel(account.currency, locale)}`;
        }),
        source: locale === "fa" ? `${answerAccounts.length} پرونده مالی · ${answerExhibition.name.fa}` : `${answerAccounts.length} financial records · ${answerExhibition.name.en}`,
        target: "payments",
      };
    } else if (/تحویل|تجهیز|کالا|وسیله|delivery|equipment|item|material/.test(normalized)) {
      const lines = answerBooths.flatMap((booth) => booth.equipment
        .filter((line) => !["delivered", "collected"].includes(line.stage))
        .map((line) => `${booth.code} · ${localize(line.name, locale)} × ${numberFormat(locale).format(line.quantity)} · ${line.stage === "issue" ? (locale === "fa" ? "مشکل" : "issue") : (locale === "fa" ? "در صف اجرا" : "in progress")}`));
      answer = {
        id: uid("assistant"), question,
        title: locale === "fa" ? "اقلام باقی‌مانده برای اجرا" : "Outstanding delivery requirements",
        summary: locale === "fa" ? `${numberFormat(locale).format(lines.length)} ردیف تجهیز هنوز به وضعیت تحویل کامل نرسیده است.` : `${lines.length} equipment lines have not reached delivered status.`,
        lines: lines.length ? lines : [locale === "fa" ? "همه اقلام ثبت‌شده تحویل شده‌اند." : "All recorded items are delivered."],
        source: locale === "fa" ? `${answerBooths.length} غرفه · ${answerExhibition.name.fa}` : `${answerBooths.length} booths · ${answerExhibition.name.en}`,
        target: "logistics",
      };
    } else if (/سرنخ|مذاکره|تماس|lead|negotiat|call|follow/.test(normalized)) {
      const ordered = [...answerLeads].sort((a, b) => Date.parse(a.nextActionAt) - Date.parse(b.nextActionAt));
      answer = {
        id: uid("assistant"), question,
        title: locale === "fa" ? "صف اقدام تجاری" : "Commercial action queue",
        summary: locale === "fa" ? `${numberFormat(locale).format(answerLeads.length)} سرنخ فعال برای این نمایشگاه ثبت شده است.` : `${answerLeads.length} leads are recorded for this exhibition.`,
        lines: ordered.slice(0, 8).map((lead) => `${lead.company} · ${stageCopy[lead.stage][locale]} · ${dateFormat(locale, lead.nextActionAt)} · ${lead.owner}`),
        source: locale === "fa" ? `پرونده‌های CRM · ${answerExhibition.name.fa}` : `CRM records · ${answerExhibition.name.en}`,
        target: "crm",
      };
    } else {
      const companies = answerBooths.filter((booth) => booth.company).map((booth) => `${booth.code} · ${booth.company}`);
      answer = {
        id: uid("assistant"), question,
        title: locale === "fa" ? "شرکت‌های حاضر در نمایشگاه" : "Participating companies",
        summary: locale === "fa" ? `${numberFormat(locale).format(companies.length)} شرکت به غرفه تخصیص یافته‌اند.` : `${companies.length} companies have assigned booths.`,
        lines: companies.length ? companies : [locale === "fa" ? "هنوز شرکتی به غرفه‌های این نمایشگاه تخصیص نیافته است." : "No companies are assigned yet."],
        source: locale === "fa" ? `غرفه‌ها · ${answerExhibition.name.fa}` : `Booths · ${answerExhibition.name.en}`,
        target: "exhibitors",
      };
    }
    setAnswers((current) => [answer, ...current].slice(0, 6));
    setQuery("");
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[2rem] border border-[#25463a] bg-[radial-gradient(circle_at_20%_0%,rgba(38,167,139,.2),transparent_38%),linear-gradient(135deg,#071d17,#10382d)] p-5 text-white shadow-[0_24px_70px_rgba(6,28,22,.25)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex size-13 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#89e6c9]"><Sparkles size={25} /></div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8edfc5]">{locale === "fa" ? "دستیار عملیات · پاسخ از داده‌های زنده فضای کاری" : "Operations assistant · answers from live workspace data"}</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{locale === "fa" ? "سؤال را ساده بپرسید؛ پاسخ عملیاتی بگیرید." : "Ask plainly. Get an operational answer."}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">{locale === "fa" ? "این نسخه بدون ارسال اطلاعات به سرویس بیرونی، داده‌های غرفه، لجستیک، CRM و پرداخت همین نمایشگاه را تحلیل می‌کند." : "This version analyzes booth, logistics, CRM, and payment records locally without sending data to an external service."}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-xs font-bold text-white/65">
            <span className="flex items-center gap-2 text-white"><LockKeyhole size={15} className="text-[#8edfc5]" />{locale === "fa" ? "پردازش محلی و قابل ردیابی" : "Local and traceable"}</span>
            <select value={exhibition.id} onChange={(event) => setScopeId(event.target.value)} className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-[#0f3329] px-3 text-xs font-black text-white outline-none" aria-label={locale === "fa" ? "دامنه نمایشگاه دستیار" : "Assistant exhibition scope"}>{state.exhibitions.map((item) => <option key={item.id} value={item.id}>{localize(item.name, locale)}</option>)}</select>
          </div>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); answerQuestion(query); }} className="mt-7 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-2 sm:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "fa" ? "مثلاً: کدام غرفه‌ها هنوز تسویه نکرده‌اند؟" : "For example: Which booths are not fully paid?"} className="min-h-12 flex-1 bg-transparent px-4 text-sm font-bold text-white outline-none placeholder:text-white/35" />
          <button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d4aa55] px-5 text-sm font-black text-[#10251d] transition hover:bg-[#e0bd74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Send size={17} />{locale === "fa" ? "پرسیدن" : "Ask"}</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => answerQuestion(prompt)} className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white">{prompt}</button>)}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {answers.map((answer) => (
              <motion.article key={answer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[1.6rem] border border-[#dfe5e0] bg-white p-5 shadow-[0_14px_40px_rgba(20,48,39,.06)]">
                <p className="text-xs font-bold text-slate-400">{answer.question}</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><h2 className="text-lg font-black text-[#153d31]">{answer.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{answer.summary}</p></div>
                  {answer.target ? <button type="button" onClick={() => onNavigate(answer.target!)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cee0d8] bg-[#f1f8f5] px-4 text-xs font-black text-[#175b48]">{locale === "fa" ? "باز کردن بخش" : "Open workspace"}{locale === "fa" ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}</button> : null}
                </div>
                <ul className="mt-4 grid gap-2 md:grid-cols-2">{answer.lines.slice(0, 10).map((line) => <li key={line} className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold leading-5 text-slate-650">{line}</li>)}</ul>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[0.68rem] font-bold text-slate-400"><FileText size={13} />{locale === "fa" ? "منبع پاسخ:" : "Answer source:"} {answer.source}</div>
              </motion.article>
            ))}
          </AnimatePresence>
          {!answers.length ? <Surface className="p-7"><EmptyState locale={locale} title={locale === "fa" ? "یکی از پرسش‌های آماده را انتخاب کنید" : "Choose one of the prepared questions"} /></Surface> : null}
        </div>
        <Surface className="h-fit p-5">
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#eaf6f1] text-[#16745a]"><Bot size={21} /></div><div><p className="font-black text-[#173e32]">{locale === "fa" ? "دامنه پاسخ" : "Answer scope"}</p><p className="text-xs text-slate-400">{locale === "fa" ? "نمایشگاه انتخاب‌شده" : "Selected exhibition"}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[[booths.length, locale === "fa" ? "غرفه" : "booths"], [accounts.length, locale === "fa" ? "پرونده مالی" : "accounts"], [leads.length, locale === "fa" ? "سرنخ" : "leads"], [booths.flatMap((b) => b.equipment).length, locale === "fa" ? "ردیف تجهیز" : "equipment lines"]].map(([value, label]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-3"><strong className="block text-lg text-[#173e32]">{numberFormat(locale).format(Number(value))}</strong><span className="text-[0.68rem] font-bold text-slate-400">{label}</span></div>)}
          </div>
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[0.68rem] font-bold leading-5 text-amber-800">{locale === "fa" ? "دستیار پیشنهاد می‌دهد و مسیر را باز می‌کند؛ هیچ پرداخت، استثنا یا تغییر حساسی را انجام نمی‌دهد." : "The assistant explains and routes; it never records payments, grants exceptions, or performs sensitive changes."}</p>
        </Surface>
      </div>
    </div>
  );
}

export type NewLeadDraft = Omit<SalesLead, "id" | "interactions" | "createdAt" | "updatedAt">;

export function CrmWorkspace({
  locale,
  state,
  onAddLead,
  onUpdateLead,
  onAddInteraction,
}: {
  locale: PortalLocale;
  state: PortalState;
  onAddLead: (draft: NewLeadDraft) => void;
  onUpdateLead: (id: string, patch: Partial<Pick<SalesLead, "stage" | "owner" | "quotedAmount" | "currency" | "expectedArea" | "nextActionAt" | "notes">>) => void;
  onAddInteraction: (leadId: string, interaction: Omit<LeadInteraction, "id" | "occurredAt">) => void;
}) {
  const exhibition = state.exhibitions.find((item) => item.id === state.activeExhibitionId) ?? state.exhibitions[0];
  const leads = state.leads.filter((lead) => lead.exhibitionId === exhibition?.id);
  const [stage, setStage] = useState<LeadStage | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(leads[0]?.id ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [interactionKind, setInteractionKind] = useState<InteractionKind>("call");
  const [interactionSummary, setInteractionSummary] = useState("");
  const filtered = leads.filter((lead) => (stage === "all" || lead.stage === stage) && `${lead.company} ${lead.owner} ${lead.notes}`.toLowerCase().includes(search.toLowerCase()));
  const selected = leads.find((lead) => lead.id === selectedId) ?? filtered[0];
  const pipelineValue = leads.filter((lead) => !["lost"].includes(lead.stage)).reduce((total, lead) => total + lead.quotedAmount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div data-portal-intro><p className="text-xs font-black uppercase tracking-[0.14em] text-[#19896d]">{locale === "fa" ? "رشد تجاری پیش از نمایشگاه" : "Pre-event commercial growth"}</p><h1 className="mt-2 text-2xl font-black text-[#153d31] sm:text-3xl">{locale === "fa" ? "CRM سرنخ‌ها و مذاکرات" : "Lead and negotiation CRM"}</h1><p className="mt-2 text-sm text-slate-500">{localize(exhibition.name, locale)} · {numberFormat(locale).format(leads.length)} {locale === "fa" ? "پرونده" : "records"}</p></div>
        <button type="button" onClick={() => setShowAdd(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#133e31] px-5 text-sm font-black text-white shadow-lg shadow-[#133e31]/15"><Plus size={18} />{locale === "fa" ? "افزودن سرنخ" : "Add lead"}</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={<UserRoundSearch size={20} />} label={locale === "fa" ? "کل سرنخ" : "Total leads"} value={numberFormat(locale).format(leads.length)} />
        <Metric icon={<Handshake size={20} />} label={locale === "fa" ? "در مذاکره" : "In negotiation"} value={numberFormat(locale).format(leads.filter((lead) => ["proposal", "negotiation"].includes(lead.stage)).length)} />
        <Metric icon={<CircleDollarSign size={20} />} label={locale === "fa" ? "ارزش پیشنهادها" : "Quoted pipeline"} value={`${numberFormat(locale).format(pipelineValue)} ${locale === "fa" ? "تومان" : "IRT"}`} compact />
      </div>
      <Surface className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">{(["all", ...leadStages] as const).map((item) => <button key={item} type="button" onClick={() => setStage(item)} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-black ${stage === item ? "bg-[#153d31] text-white" : "bg-slate-50 text-slate-500"}`}>{item === "all" ? (locale === "fa" ? "همه" : "All") : stageCopy[item][locale]}{item !== "all" ? ` · ${leads.filter((lead) => lead.stage === item).length}` : ""}</button>)}</div>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={locale === "fa" ? "جستجوی شرکت یا مسئول" : "Search company or owner"} className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none lg:w-64" /></label>
        </div>
      </Surface>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]">
        <Surface className="overflow-hidden p-2">
          {filtered.length ? <div className="divide-y divide-slate-100">{filtered.map((lead) => <button key={lead.id} type="button" onClick={() => setSelectedId(lead.id)} className={`grid min-h-[5.8rem] w-full grid-cols-[1fr_auto] gap-3 rounded-2xl p-4 text-start transition hover:bg-slate-50 ${selected?.id === lead.id ? "bg-[#f0f8f4] ring-1 ring-[#cce4da]" : ""}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm font-black text-[#183e32]">{lead.company}</strong><span className={`rounded-full px-2 py-1 text-[0.62rem] font-black ${stageTone[lead.stage]}`}>{stageCopy[lead.stage][locale]}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-400"><span>{lead.owner}</span><span>{dateFormat(locale, lead.nextActionAt)}</span><span>{numberFormat(locale).format(lead.expectedArea)} m²</span></div></div><div className="text-end"><strong className="block text-sm text-[#183e32]">{numberFormat(locale).format(lead.quotedAmount)}</strong><span className="text-[0.65rem] font-bold text-slate-400">{currencyLabel(lead.currency, locale)}</span></div></button>)}</div> : <EmptyState locale={locale} title={locale === "fa" ? "سرنخی در این فیلتر نیست" : "No leads match this filter"} />}
        </Surface>
        {selected ? <LeadDetail key={selected.id} locale={locale} lead={selected} interactionKind={interactionKind} interactionSummary={interactionSummary} onInteractionKind={setInteractionKind} onInteractionSummary={setInteractionSummary} onUpdate={(patch) => onUpdateLead(selected.id, patch)} onAddInteraction={() => { if (!interactionSummary.trim()) return; onAddInteraction(selected.id, { kind: interactionKind, owner: selected.owner, summary: interactionSummary.trim() }); setInteractionSummary(""); }} /> : <Surface className="p-5"><EmptyState locale={locale} title={locale === "fa" ? "یک سرنخ را انتخاب کنید" : "Select a lead"} /></Surface>}
      </div>
      <AnimatePresence>{showAdd ? <LeadDialog locale={locale} exhibitionId={exhibition.id} onClose={() => setShowAdd(false)} onCreate={(draft) => { onAddLead(draft); setShowAdd(false); }} /> : null}</AnimatePresence>
    </div>
  );
}

function LeadDetail({ locale, lead, interactionKind, interactionSummary, onInteractionKind, onInteractionSummary, onUpdate, onAddInteraction }: {
  locale: PortalLocale; lead: SalesLead; interactionKind: InteractionKind; interactionSummary: string;
  onInteractionKind: (kind: InteractionKind) => void; onInteractionSummary: (value: string) => void;
  onUpdate: (patch: Partial<Pick<SalesLead, "stage" | "owner" | "quotedAmount" | "currency" | "expectedArea" | "nextActionAt" | "notes">>) => void;
  onAddInteraction: () => void;
}) {
  const [owner, setOwner] = useState(lead.owner);
  const [amount, setAmount] = useState(String(lead.quotedAmount));
  const [area, setArea] = useState(String(lead.expectedArea));
  const [next, setNext] = useState(lead.nextActionAt.slice(0, 16));
  const [notes, setNotes] = useState(lead.notes);
  return <Surface className="h-fit p-5"><div className="flex items-start justify-between gap-3"><div><span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${stageTone[lead.stage]}`}>{stageCopy[lead.stage][locale]}</span><h2 className="mt-3 text-lg font-black text-[#173e32]">{lead.company}</h2><p className="mt-1 text-xs font-bold text-slate-400">{lead.contactName || (locale === "fa" ? "مخاطب ثبت نشده" : "No contact recorded")} · {lead.contactChannel}</p></div><BriefcaseBusiness className="text-[#8ab5a5]" size={24} /></div>
    <div className="mt-5 grid grid-cols-2 gap-3"><Field label={locale === "fa" ? "مرحله" : "Stage"}><select value={lead.stage} onChange={(event) => onUpdate({ stage: event.target.value as LeadStage })} className="input"><option disabled value="">—</option>{leadStages.map((item) => <option key={item} value={item}>{stageCopy[item][locale]}</option>)}</select></Field><Field label={locale === "fa" ? "مسئول" : "Owner"}><input value={owner} onChange={(event) => setOwner(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "مبلغ پیشنهاد" : "Quote"}><input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "مساحت" : "Area m²"}><input type="number" min="0" value={area} onChange={(event) => setArea(event.target.value)} className="input" /></Field></div>
    <Field label={locale === "fa" ? "اقدام بعدی" : "Next action"} className="mt-3"><input type="datetime-local" value={next} onChange={(event) => setNext(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "یادداشت مذاکره" : "Negotiation notes"} className="mt-3"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="input resize-none" /></Field>
    <button type="button" onClick={() => { const nextDate = new Date(next); onUpdate({ owner: owner.trim() || lead.owner, quotedAmount: Math.max(0, Number(amount) || 0), expectedArea: Math.max(0, Number(area) || 0), nextActionAt: Number.isFinite(nextDate.getTime()) ? nextDate.toISOString() : lead.nextActionAt, notes }); }} className="mt-3 min-h-11 w-full rounded-xl bg-[#153d31] text-sm font-black text-white">{locale === "fa" ? "ذخیره پرونده" : "Save record"}</button>
    <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "ثبت ارتباط جدید" : "Log an interaction"}</h3><div className="mt-3 flex gap-2 overflow-x-auto">{interactionKinds.map((kind) => <button key={kind} type="button" onClick={() => onInteractionKind(kind)} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-black ${interactionKind === kind ? "bg-[#e5f4ed] text-[#17624e]" : "bg-slate-50 text-slate-500"}`}>{kindCopy[kind][locale]}</button>)}</div><textarea value={interactionSummary} onChange={(event) => onInteractionSummary(event.target.value)} rows={2} placeholder={locale === "fa" ? "خلاصه تماس، جلسه یا پیام..." : "Call, meeting, or message summary..."} className="input mt-3 resize-none" /><button type="button" onClick={onAddInteraction} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#cce0d7] bg-[#f2f8f5] text-xs font-black text-[#17624e]"><MessageSquareText size={15} />{locale === "fa" ? "ثبت در تاریخچه" : "Add to history"}</button></div>
    <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">{lead.interactions.slice().reverse().map((item) => <div key={item.id} className="flex gap-3"><div className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">{item.kind === "call" ? <Phone size={14} /> : <MessageSquareText size={14} />}</div><div><p className="text-xs font-bold leading-5 text-slate-700">{item.summary}</p><p className="mt-1 text-[0.65rem] font-bold text-slate-400">{kindCopy[item.kind][locale]} · {dateFormat(locale, item.occurredAt)} · {item.owner}</p></div></div>)}</div>
  </Surface>;
}

function LeadDialog({ locale, exhibitionId, onClose, onCreate }: { locale: PortalLocale; exhibitionId: string; onClose: () => void; onCreate: (draft: NewLeadDraft) => void }) {
  const [company, setCompany] = useState(""); const [contact, setContact] = useState(""); const [owner, setOwner] = useState(""); const [source, setSource] = useState(""); const [area, setArea] = useState("0");
  function submit(event: FormEvent) { event.preventDefault(); if (!company.trim() || !owner.trim()) return; onCreate({ companyId: `company-${uid("legacy")}`, exhibitionId, company: company.trim(), contactName: contact.trim(), contactChannel: locale === "fa" ? "ثبت نشده" : "Not recorded", source: source.trim() || (locale === "fa" ? "ثبت دستی" : "Manual entry"), stage: "new", owner: owner.trim(), ownerId: "staff-mina", collaborators: [], priority: "normal", probability: 10, requestedServices: [], preferredChannel: "phone", consentStatus: "unknown", quotedAmount: 0, currency: "IRT", expectedArea: Math.max(0, Number(area) || 0), nextActionAt: new Date(Date.now() + 86400000).toISOString(), notes: "" }); }
  return <Modal locale={locale} title={locale === "fa" ? "سرنخ تجاری جدید" : "New commercial lead"} onClose={onClose}><form onSubmit={submit} className="space-y-3"><Field label={locale === "fa" ? "نام شرکت" : "Company"}><input required value={company} onChange={(event) => setCompany(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "نام مخاطب" : "Contact name"}><input value={contact} onChange={(event) => setContact(event.target.value)} className="input" /></Field><div className="grid grid-cols-2 gap-3"><Field label={locale === "fa" ? "مسئول پیگیری" : "Owner"}><input required value={owner} onChange={(event) => setOwner(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "مساحت مورد انتظار" : "Expected area"}><input type="number" min="0" value={area} onChange={(event) => setArea(event.target.value)} className="input" /></Field></div><Field label={locale === "fa" ? "منبع سرنخ" : "Lead source"}><input value={source} onChange={(event) => setSource(event.target.value)} className="input" /></Field><button type="submit" className="min-h-12 w-full rounded-xl bg-[#153d31] text-sm font-black text-white">{locale === "fa" ? "ساخت پرونده" : "Create record"}</button></form></Modal>;
}

export type NewAccountDraft = Pick<CommercialAccount, "exhibitionId" | "boothId" | "company" | "contractValue" | "currency" | "dueDate">;
export type NewPaymentDraft = Omit<PaymentEntry, "id" | "recordedBy" | "status">;
export type NewCommunicationDraft = Omit<CommercialCommunication, "id" | "occurredAt">;

export function FinanceWorkspace({ locale, state, onOpenBooth, onAddAccount, onAddPayment, onAddCommunication, onSetException }: {
  locale: PortalLocale; state: PortalState; onOpenBooth: (boothId: string) => void;
  onAddAccount: (draft: NewAccountDraft) => void; onAddPayment: (accountId: string, draft: NewPaymentDraft) => void;
  onAddCommunication: (accountId: string, draft: NewCommunicationDraft) => void;
  onSetException: (accountId: string, approved: boolean, reason: string) => void;
}) {
  const exhibition = state.exhibitions.find((item) => item.id === state.activeExhibitionId) ?? state.exhibitions[0];
  const halls = state.halls.filter((hall) => exhibition.hallIds.includes(hall.id)); const booths = halls.flatMap((hall) => hall.booths);
  const accounts = state.commercialAccounts.filter((account) => account.exhibitionId === exhibition.id);
  const [selectedId, setSelectedId] = useState(accounts[0]?.id ?? ""); const [showAdd, setShowAdd] = useState(false);
  const selected = accounts.find((account) => account.id === selectedId) ?? accounts[0];
  const totals = accounts.reduce((sum, account) => { const item = calculateCommercialAccount(account); return { contract: sum.contract + account.contractValue, paid: sum.paid + item.paid, outstanding: sum.outstanding + item.outstanding }; }, { contract: 0, paid: 0, outstanding: 0 });
  const blocked = accounts.filter((account) => getHandoverDecision(account).status === "blocked").length;
  return <div className="space-y-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div data-portal-intro><p className="text-xs font-black uppercase tracking-[0.14em] text-[#19896d]">{locale === "fa" ? "کنترل تجاری و تحویل غرفه" : "Commercial and booth handover control"}</p><h1 className="mt-2 text-2xl font-black text-[#153d31] sm:text-3xl">{locale === "fa" ? "پرداخت‌ها و مجوز تحویل" : "Payments and handover clearance"}</h1><p className="mt-2 text-sm text-slate-500">{localize(exhibition.name, locale)} · {locale === "fa" ? "موعد پیش‌فرض: یک روز پیش از شروع" : "Default due date: one day before opening"}</p></div><button type="button" onClick={() => setShowAdd(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#133e31] px-5 text-sm font-black text-white"><Plus size={18} />{locale === "fa" ? "پرونده مالی جدید" : "New account"}</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<FileText size={20} />} label={locale === "fa" ? "ارزش قرارداد" : "Contract value"} value={`${numberFormat(locale).format(totals.contract)} ${locale === "fa" ? "تومان" : "IRT"}`} compact /><Metric icon={<CheckCircle2 size={20} />} label={locale === "fa" ? "پرداخت‌شده" : "Paid"} value={`${numberFormat(locale).format(totals.paid)} ${locale === "fa" ? "تومان" : "IRT"}`} compact /><Metric icon={<WalletCards size={20} />} label={locale === "fa" ? "مانده" : "Outstanding"} value={`${numberFormat(locale).format(totals.outstanding)} ${locale === "fa" ? "تومان" : "IRT"}`} compact /><Metric icon={<LockKeyhole size={20} />} label={locale === "fa" ? "تحویل مسدود" : "Handover blocked"} value={numberFormat(locale).format(blocked)} danger={blocked > 0} /></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,.8fr)]"><Surface className="overflow-hidden p-2">{accounts.length ? <div className="divide-y divide-slate-100">{accounts.map((account) => { const decision = getHandoverDecision(account); const booth = booths.find((item) => item.id === account.boothId); return <button key={account.id} type="button" onClick={() => setSelectedId(account.id)} className={`grid min-h-[6.2rem] w-full grid-cols-[1fr_auto] gap-3 rounded-2xl p-4 text-start transition hover:bg-slate-50 ${selected?.id === account.id ? "bg-[#f0f8f4] ring-1 ring-[#cce4da]" : ""}`}><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-black text-[#183e32]">{booth?.code ?? "—"} · {account.company}</strong><DecisionBadge locale={locale} status={decision.status} /></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${decision.status === "blocked" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${decision.totals.percentPaid}%` }} /></div><p className="mt-2 text-[0.68rem] font-bold text-slate-400">{numberFormat(locale).format(decision.totals.percentPaid)}% {locale === "fa" ? "پرداخت · سررسید" : "paid · due"} {dateFormat(locale, account.dueDate)}</p></div><div className="text-end"><strong className={`block text-sm ${decision.totals.outstanding ? "text-rose-600" : "text-emerald-700"}`}>{numberFormat(locale).format(decision.totals.outstanding)}</strong><span className="text-[0.65rem] font-bold text-slate-400">{currencyLabel(account.currency, locale)}</span></div></button>; })}</div> : <EmptyState locale={locale} title={locale === "fa" ? "پرونده مالی ثبت نشده" : "No financial accounts"} />}</Surface>
      {selected ? <AccountDetail key={selected.id} locale={locale} account={selected} boothCode={booths.find((item) => item.id === selected.boothId)?.code} onOpenBooth={() => selected.boothId && onOpenBooth(selected.boothId)} onAddPayment={(draft) => onAddPayment(selected.id, draft)} onAddCommunication={(draft) => onAddCommunication(selected.id, draft)} onSetException={(approved, reason) => onSetException(selected.id, approved, reason)} /> : <Surface className="p-5"><EmptyState locale={locale} title={locale === "fa" ? "یک پرونده را انتخاب کنید" : "Select an account"} /></Surface>}</div>
    <AnimatePresence>{showAdd ? <AccountDialog locale={locale} exhibition={exhibition} booths={booths} onClose={() => setShowAdd(false)} onCreate={(draft) => { onAddAccount(draft); setShowAdd(false); }} /> : null}</AnimatePresence>
  </div>;
}

function AccountDetail({ locale, account, boothCode, onOpenBooth, onAddPayment, onAddCommunication, onSetException }: { locale: PortalLocale; account: CommercialAccount; boothCode?: string; onOpenBooth: () => void; onAddPayment: (draft: NewPaymentDraft) => void; onAddCommunication: (draft: NewCommunicationDraft) => void; onSetException: (approved: boolean, reason: string) => void }) {
  const decision = getHandoverDecision(account); const [amount, setAmount] = useState(String(decision.totals.outstanding)); const [reference, setReference] = useState(""); const [method, setMethod] = useState<PaymentEntry["method"]>("bank"); const [summary, setSummary] = useState(""); const [reason, setReason] = useState(account.exceptionReason);
  return <Surface className="h-fit overflow-hidden"><div className={`p-5 ${decision.status === "blocked" ? "bg-rose-50" : decision.status === "exception" ? "bg-amber-50" : "bg-emerald-50"}`}><div className="flex items-start justify-between gap-3"><div><DecisionBadge locale={locale} status={decision.status} /><h2 className="mt-3 text-lg font-black text-[#173e32]">{boothCode ?? "—"} · {account.company}</h2><p className="mt-1 text-xs font-bold text-slate-500">{locale === "fa" ? "سررسید" : "Due"}: {dateFormat(locale, account.dueDate)}</p></div>{decision.status === "blocked" ? <LockKeyhole className="text-rose-500" /> : <ShieldCheck className="text-emerald-600" />}</div><div className="mt-4 grid grid-cols-3 gap-2">{[[decision.totals.paid, locale === "fa" ? "پرداخت" : "Paid"], [decision.totals.outstanding, locale === "fa" ? "مانده" : "Balance"], [account.contractValue, locale === "fa" ? "قرارداد" : "Contract"]].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-white/70 p-3"><strong className="block text-sm text-[#173e32]">{numberFormat(locale).format(Number(value))}</strong><span className="text-[0.62rem] font-bold text-slate-500">{label}</span></div>)}</div>{account.boothId ? <button type="button" onClick={onOpenBooth} className="mt-3 min-h-10 rounded-xl border border-black/10 bg-white/60 px-3 text-xs font-black text-[#173e32]">{locale === "fa" ? "باز کردن غرفه روی نقشه" : "Open booth on plan"}</button> : null}</div>
    <div className="p-5"><details open className="group"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-black text-[#173e32]"><span className="flex items-center gap-2"><CircleDollarSign size={18} />{locale === "fa" ? "ثبت پرداخت" : "Record payment"}</span><ChevronDown className="transition group-open:rotate-180" size={17} /></summary><div className="grid grid-cols-2 gap-3 pt-3"><Field label={locale === "fa" ? "مبلغ" : "Amount"}><input type="number" min="1" max={Math.max(1, decision.totals.outstanding)} value={amount} onChange={(event) => setAmount(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "روش" : "Method"}><select value={method} onChange={(event) => setMethod(event.target.value as PaymentEntry["method"])} className="input"><option value="bank">{locale === "fa" ? "بانکی" : "Bank"}</option><option value="cash">{locale === "fa" ? "نقدی" : "Cash"}</option><option value="card">{locale === "fa" ? "کارت" : "Card"}</option><option value="other">{locale === "fa" ? "سایر" : "Other"}</option></select></Field></div><Field label={locale === "fa" ? "شماره پیگیری" : "Reference"} className="mt-3"><input value={reference} onChange={(event) => setReference(event.target.value)} className="input" /></Field><button type="button" disabled={!Number(amount) || Number(amount) > decision.totals.outstanding} onClick={() => { onAddPayment({ amount: Number(amount), paidAt: new Date().toISOString(), method, reference: reference.trim(), note: "" }); setReference(""); }} className="mt-3 min-h-11 w-full rounded-xl bg-[#153d31] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{locale === "fa" ? "بازبینی و ثبت پرداخت" : "Review and record payment"}</button></details>
      <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="flex items-center gap-2 text-sm font-black text-[#173e32]"><AlertTriangle size={17} />{locale === "fa" ? "استثنای تحویل غرفه" : "Handover exception"}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{locale === "fa" ? "استثنا فقط با دلیل مکتوب و تایید مدیر تجاری ثبت می‌شود." : "Exceptions require a written reason and commercial-manager approval."}</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="input mt-3 resize-none" placeholder={locale === "fa" ? "دلیل استثنا..." : "Exception reason..."} /><button type="button" disabled={!account.exceptionApproved && !reason.trim()} onClick={() => onSetException(!account.exceptionApproved, reason.trim())} className={`mt-2 min-h-11 w-full rounded-xl text-xs font-black ${account.exceptionApproved ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-amber-200 bg-amber-50 text-amber-800"}`}>{account.exceptionApproved ? (locale === "fa" ? "لغو استثنا" : "Revoke exception") : (locale === "fa" ? "بازبینی و تایید استثنا" : "Review and approve exception")}</button></div>
      <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="text-sm font-black text-[#173e32]">{locale === "fa" ? "ارتباطات مالی" : "Finance communications"}</h3><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} className="input mt-3 resize-none" placeholder={locale === "fa" ? "خلاصه تماس یا پیگیری پرداخت..." : "Payment follow-up summary..."} /><button type="button" disabled={!summary.trim()} onClick={() => { onAddCommunication({ kind: "call", owner: "finance-demo", summary: summary.trim() }); setSummary(""); }} className="mt-2 min-h-10 w-full rounded-xl border border-[#cce0d7] bg-[#f2f8f5] text-xs font-black text-[#17624e]">{locale === "fa" ? "ثبت پیگیری" : "Log follow-up"}</button></div>
      <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">{[...account.payments.map((item) => ({ id: item.id, at: item.paidAt, title: `${locale === "fa" ? "پرداخت" : "Payment"}: ${numberFormat(locale).format(item.amount)} ${currencyLabel(account.currency, locale)}`, meta: item.reference || item.method, tone: "green" })), ...account.communications.map((item) => ({ id: item.id, at: item.occurredAt, title: item.summary, meta: item.owner, tone: "slate" }))].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).map((item) => <div key={item.id} className="flex gap-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.tone === "green" ? "bg-emerald-500" : "bg-slate-300"}`} /><div><p className="text-xs font-bold leading-5 text-slate-700">{item.title}</p><p className="mt-1 text-[0.65rem] font-bold text-slate-400">{dateFormat(locale, item.at)} · {item.meta}</p></div></div>)}</div>
    </div></Surface>;
}

function AccountDialog({ locale, exhibition, booths, onClose, onCreate }: { locale: PortalLocale; exhibition: PortalState["exhibitions"][number]; booths: PortalState["halls"][number]["booths"]; onClose: () => void; onCreate: (draft: NewAccountDraft) => void }) {
  const [boothId, setBoothId] = useState(""); const [company, setCompany] = useState(""); const [value, setValue] = useState("");
  const due = new Date(`${exhibition.startDate}T00:00:00Z`); due.setUTCDate(due.getUTCDate() - 1); const [dueDate, setDueDate] = useState(due.toISOString().slice(0, 10));
  function submit(event: FormEvent) { event.preventDefault(); if (!company.trim() || Number(value) <= 0) return; onCreate({ exhibitionId: exhibition.id, ...(boothId ? { boothId } : {}), company: company.trim(), contractValue: Number(value), currency: "IRT", dueDate }); }
  return <Modal locale={locale} title={locale === "fa" ? "پرونده مالی جدید" : "New financial account"} onClose={onClose}><form onSubmit={submit} className="space-y-3"><Field label={locale === "fa" ? "شرکت" : "Company"}><input required value={company} onChange={(event) => setCompany(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "غرفه (اختیاری)" : "Booth (optional)"}><select value={boothId} onChange={(event) => { setBoothId(event.target.value); const booth = booths.find((item) => item.id === event.target.value); if (booth?.company) setCompany(booth.company); }} className="input"><option value="">—</option>{booths.map((booth) => <option key={booth.id} value={booth.id}>{booth.code} · {booth.company ?? (locale === "fa" ? "بدون شرکت" : "Unassigned")}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label={locale === "fa" ? "ارزش قرارداد" : "Contract value"}><input required type="number" min="1" value={value} onChange={(event) => setValue(event.target.value)} className="input" /></Field><Field label={locale === "fa" ? "سررسید" : "Due date"}><input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="input" /></Field></div><button type="submit" className="min-h-12 w-full rounded-xl bg-[#153d31] text-sm font-black text-white">{locale === "fa" ? "ساخت پرونده" : "Create account"}</button></form></Modal>;
}

function DecisionBadge({ locale, status }: { locale: PortalLocale; status: "eligible" | "exception" | "blocked" }) { const label = status === "eligible" ? (locale === "fa" ? "مجاز به تحویل" : "Handover eligible") : status === "exception" ? (locale === "fa" ? "استثنای تاییدشده" : "Approved exception") : (locale === "fa" ? "تحویل مسدود" : "Handover blocked"); const tone = status === "eligible" ? "bg-emerald-100 text-emerald-800" : status === "exception" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"; return <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-black ${tone}`}>{label}</span>; }
function Metric({ icon, label, value, compact = false, danger = false }: { icon: ReactNode; label: string; value: string; compact?: boolean; danger?: boolean }) { return <Surface className="flex min-h-28 items-center gap-4 p-4"><div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${danger ? "bg-rose-50 text-rose-600" : "bg-[#eaf6f1] text-[#16745a]"}`}>{icon}</div><div className="min-w-0"><p className="text-xs font-bold text-slate-400">{label}</p><strong className={`mt-1 block truncate font-black text-[#173e32] ${compact ? "text-sm" : "text-2xl"}`}>{value}</strong></div></Surface>; }
function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <label className={`block ${className}`}><span className="mb-1.5 block text-[0.68rem] font-black text-slate-500">{label}</span>{children}</label>; }
function Modal({ locale, title, onClose, children }: { locale: PortalLocale; title: string; onClose: () => void; children: ReactNode }) { return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-[#071b15]/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-lg rounded-[1.7rem] border border-white/20 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label={title}><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#19896d]">ARATTA EXPO</p><h2 className="mt-1 text-xl font-black text-[#173e32]">{title}</h2></div><button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-600" aria-label={locale === "fa" ? "بستن" : "Close"}><X size={18} /></button></div>{children}</motion.div></motion.div>; }
