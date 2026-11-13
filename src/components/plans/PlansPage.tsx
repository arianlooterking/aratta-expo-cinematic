import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BellRing,
  Building2,
  CalendarClock,
  ClipboardList,
  Download,
  ExternalLink,
  FileDown,
  Hammer,
  Info,
  LayoutGrid,
  Mail,
  MapPin,
  Ruler,
  Sofa,
  Wrench,
} from "lucide-react";
import type { getContent } from "@/data/aratta-content";
import { KIMEX_2025_LIST_PDF, kimex2025Halls } from "@/data/plans";
import { hallPlanRequestDraft, OFFICE_EMAIL } from "@/lib/public-requests";
import type { CalendarCard } from "@/lib/public-calendar";
import { PlanViewer, type ViewerPage } from "@/components/plans/PlanViewer";
import { StandTypeGuide } from "@/components/plans/StandTypeGuide";
import { cn } from "@/lib/cn";

type Content = ReturnType<typeof getContent>;

const faDigits = (text: string) => text.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export function PlansPage({ content, calendar }: { content: Content; calendar: CalendarCard[] }) {
  const lang = content.lang;
  const fa = lang === "fa";
  const base = `/${lang}`;
  const kimexDocs = content.registration.downloads.filter((d) => d.category === "form" || d.category === "participants");
  const listDoc = content.registration.downloads.find((d) => d.category === "participants");
  const kimexSeries = calendar.find((item) => item.key === "kimex");
  const pages: ViewerPage[] = kimex2025Halls.map((hall) => ({
    key: hall.key,
    label: hall.name[lang],
    hint: `${hall.prefix}${hall.first}–${hall.prefix}${hall.last}`,
    src: hall.image,
    width: hall.width,
    height: hall.height,
    alt: fa
      ? `صفحه ${faDigits(String(hall.page))} فهرست رسمی مشارکت‌کنندگان KIMEX 2025: ${hall.name.fa}، غرفه‌های ${hall.prefix}${hall.first} تا ${hall.prefix}${hall.last}`
      : `Page ${hall.page} of the official KIMEX 2025 participants list: ${hall.name.en}, stands ${hall.prefix}${hall.first} to ${hall.prefix}${hall.last}`,
  }));

  return (
    <div className="space-y-14 sm:space-y-16">
      {/* What exists today. */}
      <section className="glass relative isolate overflow-hidden rounded-[2rem] p-5 sm:p-7">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(125,220,232,0.13),transparent_22rem),radial-gradient(circle_at_88%_90%,rgba(214,174,101,0.14),transparent_20rem)]" />
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="section-kicker">{fa ? "آنچه امروز در دسترس است" : "What is available today"}</div>
            <h2 className="card-display-title mt-4 font-black text-ink">
              {fa ? "پلان هر دوره، پس از آماده شدن" : "Each edition's plan, once it is ready"}
            </h2>
            <p className="site-copy mt-4 text-ink-68">
              {fa
                ? "پلان سالن دوره‌های آینده هنوز منتشر نشده است: دهمین KIMEX تا اطلاع بعدی به تعویق افتاده و دیگر رویدادها هنوز تاریخ اعلام‌شده ندارند. در این صفحه فهرست رسمی سالن‌ها و کدهای غرفه KIMEX 2025، راهنمای انواع غرفه و مدارک هر نمایشگاه را می‌بینید. پلان هر دوره را کارشناس فروش پس از آماده شدن با ایمیل می‌فرستد."
                : "No hall plan has been published for the coming editions yet: the 10th KIMEX is postponed until further notice and the other events have no announced dates. This page shows the official hall and stand-code list of KIMEX 2025, a guide to stand types and each exhibition's documents. The sales team emails an edition's hall plan once it is ready."}
            </p>
          </div>
          <nav aria-label={fa ? "بخش‌های این صفحه" : "On this page"} className="grid gap-2 sm:grid-cols-2">
            <Anchor href="#halls" icon={<Building2 size={18} />} label={fa ? "سالن‌ها و کدها" : "Halls and codes"} />
            <Anchor href="#stand-guide" icon={<Ruler size={18} />} label={fa ? "راهنمای انواع غرفه" : "Stand type guide"} />
            <Anchor href="#documents" icon={<FileDown size={18} />} label={fa ? "مدارک و درخواست پلان" : "Documents and plans"} />
            <Anchor href="#prepare" icon={<ClipboardList size={18} />} label={fa ? "آماده‌سازی حضور" : "Getting ready"} />
          </nav>
        </div>
      </section>

      {/* Halls of the last edition, from the official list. */}
      <section id="halls" className="scroll-mt-32">
        <SectionHead
          kicker="KIMEX 2025"
          title={fa ? "سالن‌ها و کدهای غرفه" : "Halls and stand codes"}
          body={
            fa
              ? "از فهرست رسمی مشارکت‌کنندگان نهمین KIMEX (مرداد ۱۴۰۴). هر صفحه فهرست، کدهای غرفه یک سالن را با نام شرکت آورده است؛ این یک فهرست است، نه نقشه جای غرفه‌ها."
              : "From the official participants list of the 9th KIMEX (August 2025). Each page of the list gives one hall's stand codes with company names; it is a list, not a drawing of where the stands stood."
          }
        />
        <div className="mt-7 grid gap-6 lg:grid-cols-[0.72fr_1.28fr] [&>*]:min-w-0">
          <div className="grid content-start gap-3">
            <div className="grid grid-cols-2 gap-3">
              {kimex2025Halls.map((hall) => (
                <div key={hall.key} className="industrial-card rounded-[1.4rem] p-4">
                  <span className="font-latin grid h-11 w-11 place-items-center rounded-xl border border-gilt-200/30 bg-gilt-200/10 text-lg font-black text-[var(--gold)]">
                    {hall.prefix}
                  </span>
                  <div className="mt-3 font-black leading-6 text-ink">{hall.name[lang]}</div>
                  <div className="font-latin mt-1 text-sm text-ink-60" dir="ltr">
                    {hall.prefix}
                    {hall.first} – {hall.prefix}
                    {hall.last}
                  </div>
                </div>
              ))}
            </div>
            <dl className="grid gap-2 text-sm">
              <Fact label={fa ? "محل برگزاری" : "Venue"} value={kimexSeries?.venue ?? (fa ? "محل دائمی نمایشگاه‌های بین‌المللی کرمان" : "Kerman International Fairground")} />
              <Fact label={fa ? "کد غرفه" : "Stand codes"} value={fa ? "با حرف سالن شروع می‌شود: \u2066K · B · M · H\u2069" : "Start with the hall's letter: K, B, M and H"} />
              <Fact label={fa ? "شماره سالن و غرفه" : "Hall and stand number"} value={fa ? "برگزارکننده روی فرم مشارکت ثبت می‌کند" : "Filled in by the organiser on the participation form"} />
              <Fact label={fa ? "وضعیت" : "Status"} value={kimexSeries?.notice ?? (fa ? "آرشیو" : "Archived")} />
            </dl>
          </div>
          <PlanViewer
            lang={lang}
            pages={pages}
            downloadHref={listDoc?.href ?? KIMEX_2025_LIST_PDF}
            downloadName={listDoc?.fileName ?? "kimex-2025-participants-list.pdf"}
            downloadLabel={fa ? "دانلود فهرست کامل (PDF)" : "Download the full list (PDF)"}
          />
        </div>
      </section>

      {/* Stand types to scale. */}
      <section id="stand-guide" className="scroll-mt-32">
        <SectionHead
          kicker={fa ? "راهنمای غرفه" : "Stand guide"}
          title={fa ? "انواع غرفه، با مقیاس واقعی" : "Stand types, drawn to scale"}
          body={
            fa
              ? "نوع غرفه، نوع ساخت و اندازه را انتخاب کنید تا ببینید غرفه چند بر باز دارد، کجا دیوار است و راهروها از کدام طرف می‌گذرند. همه اندازه‌ها با یک مقیاس کشیده شده‌اند."
              : "Pick a stand type, a build and a size to see how many sides are open, where the walls are and which sides face the aisles. Every size is drawn at the same scale."
          }
        />
        <div className="mt-7">
          <StandTypeGuide lang={lang} />
        </div>
      </section>

      {/* Documents and hall plan requests, per exhibition. */}
      <section id="documents" className="scroll-mt-32">
        <SectionHead
          kicker={fa ? "مدارک هر نمایشگاه" : "Per exhibition"}
          title={fa ? "مدارک رسمی و درخواست پلان سالن" : "Official documents and hall plan requests"}
          body={
            fa
              ? `دکمه‌ها یک ایمیل آماده به ${OFFICE_EMAIL} باز می‌کنند که پیش از ارسال می‌بینید؛ چیزی رزرو یا تخصیص داده نمی‌شود.`
              : `The buttons open a ready email to ${OFFICE_EMAIL} that you review before sending; nothing is booked or allocated.`
          }
        />
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {calendar.map((item) => {
            const docs = item.key === "kimex" ? kimexDocs : [];
            const request = hallPlanRequestDraft(lang, item.name);
            return (
              <article key={item.key} className="industrial-card flex flex-col rounded-[1.8rem] p-5 sm:p-6">
                <span className="h-1 w-14 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                <h3 className="mt-4 text-xl font-black leading-8 text-ink">{item.name}</h3>
                <p className="mt-2 flex items-start gap-2 text-sm leading-7 text-ink-62">
                  <MapPin size={15} className="mt-1.5 shrink-0 text-[var(--cyan)]" />
                  {item.city} · {item.venue}
                </p>
                <p className="mt-1 flex items-start gap-2 text-sm leading-7 text-ink-62">
                  <CalendarClock size={15} className="mt-1.5 shrink-0 text-[var(--cyan)]" />
                  {item.dateText ?? (item.postponed ? (fa ? "به تعویق افتاده؛ تاریخ جدید اعلام نشده" : "Postponed; no new date announced") : fa ? "تاریخ دوره بعد هنوز اعلام نشده" : "Next dates not announced yet")}
                </p>
                {item.lastEdition ? (
                  <p className="mt-1 text-xs leading-6 text-ink-50">
                    {fa ? "آخرین دوره: " : "Last edition: "}
                    {item.lastEdition}
                  </p>
                ) : null}

                <div className="mt-5 grid gap-2">
                  {docs.length ? (
                    docs.map((doc) => (
                      <a
                        key={doc.href}
                        href={doc.href}
                        download={doc.fileName}
                        className="group flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-ink/12 bg-ink/[0.04] px-3.5 py-2.5 transition hover:border-aqua-200/38"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <FileDown size={18} className="shrink-0 text-[var(--cyan)]" />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold leading-6 text-ink">{doc.label}</span>
                            <span className="font-latin block text-xs text-ink-50">
                              {doc.type} · {doc.size}
                            </span>
                          </span>
                        </span>
                        <Download size={17} className="shrink-0 text-[var(--gold)]" />
                      </a>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-ink/16 px-4 py-3 text-sm leading-7 text-ink-58">
                      {fa ? "برای دوره بعد هنوز مدرکی در این سایت منتشر نشده است." : "No documents for the next edition have been published on this site yet."}
                    </p>
                  )}
                  {item.sourceHref ? (
                    <a
                      href={item.sourceHref}
                      {...(item.sourceHref.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-bold text-[var(--gold)] hover:text-ink"
                    >
                      {item.sourceHref.startsWith("http") ? <ExternalLink size={15} /> : <ArrowUpRight size={15} />}
                      {fa ? "آخرین گزارش و اطلاعیه رسمی" : "Latest official report and notice"}
                    </a>
                  ) : null}
                </div>

                <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 [&>a]:whitespace-nowrap">
                  <a href={request.mailto} className="liquid-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-ink">
                    <LayoutGrid size={17} />
                    {fa ? "درخواست پلان سالن" : "Request the hall plan"}
                  </a>
                  <a href={item.mailto} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-ink/14 bg-ink/[0.05] px-4 text-sm font-black text-ink hover:border-ink/28">
                    <BellRing size={17} />
                    {fa ? "خبرم کنید" : "Notify me"}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Everything else an exhibitor needs already has a page. */}
      <section id="prepare" className="scroll-mt-32">
        <SectionHead
          kicker={fa ? "پیش از حضور" : "Before the show"}
          title={fa ? "آماده‌سازی حضور در نمایشگاه" : "Getting ready to exhibit"}
          body={fa ? "هر مرحله صفحه خودش را دارد؛ از اینجا مستقیم بروید." : "Each step has its own page; go straight there from here."}
        />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Guide href={`${base}/registration#booth-request`} icon={<LayoutGrid size={20} />} title={fa ? "درخواست غرفه" : "Booth request"} body={fa ? "نوع، متراژ، موقعیت و خدمات در سه قدم." : "Type, size, position and services in three steps."} />
          <Guide href={`${base}/registration`} icon={<Hammer size={20} />} title={fa ? "مراحل حضور تا غرفه‌سازی" : "From request to build-up"} body={fa ? "شش مرحله از انتخاب رویداد تا روزهای نمایشگاه و جمع آوری." : "Six steps from choosing an event to show days and strike."} />
          <Guide href={`${base}/forms`} icon={<FileDown size={20} />} title={fa ? "فرم‌ها و فایل‌ها" : "Forms and files"} body={fa ? "فرم رسمی، فهرست مشارکت‌کنندگان و لیست تجهیزات." : "Official form, participants list and equipment list."} />
          <Guide href={`${base}/equipment`} icon={<Sofa size={20} />} title={fa ? "اجاره تجهیزات" : "Equipment rental"} body={fa ? "مبلمان، نمایشگر، برق و پذیرایی غرفه." : "Furniture, screens, power and refreshments."} />
          <Guide href={`${base}/about`} icon={<Wrench size={20} />} title={fa ? "خدمات اَرَتَ" : "Aratta services"} body={fa ? "طراحی و سازماندهی رویداد، اجاره تجهیزات و پشتیبانی اجرا." : "Event design and organisation, equipment rental and on-site support."} />
          <Guide href={`${base}/contact`} icon={<Mail size={20} />} title={fa ? "دفتر کرمان و مسیریابی" : "Kerman office and directions"} body={fa ? "تماس، ایمیل و مسیر دفتر اَرَتَ." : "Phone, email and the way to the Aratta office."} />
        </div>
        <p className="mt-5 flex items-start gap-2 text-sm leading-7 text-ink-55">
          <Info size={16} className="mt-1.5 shrink-0 text-[var(--cyan)]" />
          {fa
            ? "قرارداد و پرداخت فقط پس از هماهنگی با کارشناس فروش انجام می‌شود؛ این سایت ثبت‌نام خودکار، پرداخت یا تخصیص غرفه ندارد."
            : "Contracts and payment are arranged only with a sales specialist; this website has no automatic sign-up, payment or stand allocation."}
        </p>
      </section>
    </div>
  );
}

function SectionHead({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
      <div>
        <div className="section-kicker">{kicker}</div>
        <h2 className="card-display-title mt-3 font-black text-ink">{title}</h2>
      </div>
      <p className="site-copy text-ink-62">{body}</p>
    </div>
  );
}

function Anchor({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a href={href} className="flex min-h-12 items-center gap-3 rounded-2xl border border-ink/12 bg-shade/24 px-4 py-3 font-bold text-ink transition hover:border-aqua-200/38">
      <span className="text-[var(--cyan)]">{icon}</span>
      {label}
    </a>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-ink/10 bg-ink/[0.035] px-4 py-3">
      <dt className="text-xs font-bold text-[var(--gold)]">{label}</dt>
      <dd className="leading-7 text-ink-76">{value}</dd>
    </div>
  );
}

function Guide({ href, icon, title, body }: { href: string; icon: ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className={cn("industrial-card group flex items-start gap-4 rounded-[1.5rem] p-5 transition hover:border-aqua-200/34")}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-ink/12 bg-shade/28 text-[var(--cyan)]">{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-black text-ink">
          {title}
          <ArrowUpRight size={15} className="text-ink-30 transition group-hover:text-[var(--gold)]" />
        </span>
        <span className="mt-1 block text-sm leading-7 text-ink-60">{body}</span>
      </span>
    </Link>
  );
}
