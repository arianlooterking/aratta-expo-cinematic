import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  Download,
  FileDown,
  Images,
  LayoutGrid,
  Mail,
  MapPin,
  Navigation,
  Newspaper,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { SiteContent } from "@/data/aratta-content";
import { telHref } from "@/data/site-nav";
import { BuildBackdrop } from "@/components/backdrops/BuildBackdrop";
import { AboutExperience } from "@/components/AboutExperience";
import { AnimatedTabs } from "@/components/AnimatedTabs";
import { BlogCards } from "@/components/BlogCards";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { PartnersSection } from "@/components/PartnersSection";
import { ArchiveOverview } from "@/components/ArchiveSections";
import { ExhibitorJourney, FaqList, QuickActions } from "@/components/SiteGuides";
import { SiteFooter } from "@/components/SiteFooter";
import { UpcomingExhibitions } from "@/components/UpcomingExhibitions";
import type { CalendarCard } from "@/lib/public-calendar";

type HomeSectionsProps = {
  content: SiteContent;
};

type HomeProps = HomeSectionsProps & {
  upcoming: { items: CalendarCard[]; live: boolean };
};

export function HomeSections({ content, upcoming }: HomeProps) {
  return (
    <>
      <section id="quick-actions" className="section-shell relative isolate z-10 -mt-px pt-10 sm:pt-14">
        <BuildBackdrop motif="plan" lang={content.lang} tone="quiet" className="inset-x-0 top-0 mx-auto w-[min(1640px,260vw)] max-w-none" />
        <QuickActions lang={content.lang} />
      </section>
      <UpcomingSection content={content} upcoming={upcoming} />
      <AboutExperience content={content} />
      <PartnersSection lang={content.lang} />
      <AnimatedTabs content={content} />
      <section id="journey" className="relative isolate section-pad">
        <BuildBackdrop motif="plan" lang={content.lang} className="inset-x-0 top-6 mx-auto w-[min(1640px,230vw)]" />
        <div className="section-shell">
          <ExhibitorJourney lang={content.lang} />
        </div>
      </section>
      <RegistrationSection content={content} />
      <NewsSection content={content} />
      <RelatedNewsSection content={content} />
      <BlogSection content={content} />
      <GallerySection content={content} />
      <FaqSection content={content} />
      <ContactSection content={content} />
      <SiteFooter content={content} />
    </>
  );
}

function UpcomingSection({ content, upcoming }: HomeProps) {
  return (
    <section id="exhibitions" className="section-pad relative isolate">
      <BuildBackdrop motif="stand" lang={content.lang} className="inset-x-0 top-[-1rem] mx-auto w-[min(1560px,200vw)]" />
      <div className="section-shell">
        <UpcomingExhibitions lang={content.lang} items={upcoming.items} live={upcoming.live} />
      </div>
    </section>
  );
}

function RegistrationSection({ content }: HomeSectionsProps) {
  const fa = content.lang === "fa";
  const base = `/${content.lang}`;
  return (
    <section id="registration" className="relative isolate section-pad">
      <BuildBackdrop motif="floor" lang={content.lang} className="end-[-20%] top-[-2.5rem] w-[min(560px,110vw)] lg:end-[calc(50%-min(590px,47%)-24rem)] lg:top-0 lg:w-[32rem] min-[1600px]:end-[calc(50%-590px-30rem)] min-[1600px]:w-[34rem]" />
      <div className="section-shell grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass relative isolate min-w-0 overflow-hidden rounded-[2rem] p-5 sm:p-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(125,220,232,0.14),transparent_22rem),radial-gradient(circle_at_90%_90%,rgba(214,174,101,0.14),transparent_20rem)]" />
          <div className="section-kicker">{content.registration.kicker}</div>
          <h2 className="card-display-title mt-4 font-black text-white">{content.registration.title}</h2>
          <p className="site-copy mt-4 text-white/68">{content.registration.body}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href={`${base}/registration#booth-request`} className="liquid-button flex items-center gap-3 rounded-2xl p-4 text-white">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/25"><LayoutGrid size={20} /></span>
              <span>
                <span className="block font-black">{fa ? "ساخت درخواست غرفه" : "Build a booth request"}</span>
                <span className="block text-xs text-white/70">{fa ? "نوع، متراژ، موقعیت و خدمات" : "Type, size, position and services"}</span>
              </span>
            </Link>
            <Link href={`${base}/equipment#equipment-request`} className="flex items-center gap-3 rounded-2xl border border-white/14 bg-white/[0.05] p-4 text-white transition hover:border-cyan-200/35">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/25 text-[var(--cyan)]"><Wrench size={20} /></span>
              <span>
                <span className="block font-black">{fa ? "فهرست اجاره تجهیزات" : "Equipment rental list"}</span>
                <span className="block text-xs text-white/60">{fa ? "مبلمان، تلویزیون، برق و پذیرایی" : "Furniture, screens, power, refreshments"}</span>
              </span>
            </Link>
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm leading-7 text-white/52">
            <ShieldCheck className="mt-1 shrink-0 text-[var(--success)]" size={17} />
            {fa
              ? "درخواست با ایمیل به دفتر اَرَتَ می‌رسد؛ قرارداد و پرداخت فقط پس از هماهنگی با کارشناس فروش انجام می‌شود."
              : "Requests reach the Aratta office by email; contracts and payment are arranged only with a sales specialist."}
          </p>
        </div>

        <div className="industrial-card min-w-0 rounded-[2rem] p-5 sm:p-7">
          <h3 className="text-xl font-black text-white">{fa ? "فایل‌های رسمی" : "Official files"}</h3>
          <div className="mt-5 grid gap-3">
            {content.registration.downloads.map((download) => (
              <a
                key={download.href}
                href={download.href}
                download={download.fileName}
                className="group flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/[0.045] p-3.5 transition hover:border-cyan-200/38 hover:bg-cyan-200/8"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/28 text-[var(--cyan)]">
                    <FileDown size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block font-bold leading-6 text-white">{download.label}</span>
                    <span className="font-latin mt-0.5 block text-xs uppercase tracking-[0.18em] text-white/42">
                      {download.type} · {download.size}
                    </span>
                  </span>
                </span>
                <Download className="shrink-0 text-[var(--gold)]" size={19} />
              </a>
            ))}
          </div>
          <Link href={`${base}/forms`} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--gold)] hover:text-white">
            <ArrowUpRight size={16} />
            {fa ? "همه فرم‌ها و کاتالوگ‌ها" : "All forms and catalogues"}
          </Link>
        </div>
      </div>
    </section>
  );
}

function NewsSection({ content }: HomeSectionsProps) {
  return (
    <section id="news" className="section-pad relative isolate">
      <BuildBackdrop motif="plan" lang={content.lang} tone="quiet" className="inset-x-0 top-0 mx-auto w-[min(1640px,240vw)]" />
      <div className="section-shell">
        {/* Six latest posts on wide screens, three on phones. */}
        <div className="max-md:[&_.grid>a:nth-child(n+4)]:hidden">
          <ArchiveOverview lang={content.lang} />
        </div>
      </div>
    </section>
  );
}

function FaqSection({ content }: HomeSectionsProps) {
  const fa = content.lang === "fa";
  return (
    <section id="faq" className="relative isolate section-pad">
      <BuildBackdrop motif="walls" lang={content.lang} className="start-[-2%] bottom-[6%] w-[min(600px,125vw)] max-lg:bottom-auto max-lg:top-0" />
      <div className="section-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="section-kicker">{fa ? "پرسش‌های پرتکرار" : "Common questions"}</div>
          <h2 className="section-display-title mt-4 font-black text-white">{fa ? "پیش از تماس بدانید" : "Before you call"}</h2>
          <p className="site-copy mt-4 text-white/60">
            {fa ? "پاسخ کوتاه به سوال‌هایی که بیشتر از دفتر اَرَتَ پرسیده می‌شود." : "Short answers to the questions the Aratta office hears most."}
          </p>
          <Link href={`/${content.lang}/contact`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/22 bg-cyan-200/8 px-4 py-3 text-sm font-black text-white hover:border-cyan-200/42">
            <Phone size={16} />
            {fa ? "سوال دیگری دارید؟" : "Another question?"}
          </Link>
        </div>
        <FaqList lang={content.lang} />
      </div>
    </section>
  );
}

function RelatedNewsSection({ content }: HomeSectionsProps) {
  const featuredItems = content.news.relatedItems.slice(0, 3);
  return (
    <section id="industry-news" className="section-pad relative isolate">
      <BuildBackdrop motif="truss" lang={content.lang} tone="quiet" className="start-[-25%] top-0 w-[150vw] lg:start-[calc(50%-min(590px,47%)-8rem)] lg:w-[min(760px,52vw)]" />
      <div className="section-shell">
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <div className="section-kicker">{content.news.relatedKicker}</div>
            <h2 className="section-display-title mt-4 font-black text-white">
              {content.news.relatedTitle}
            </h2>
          </div>
          <div className="industrial-card rounded-[1.6rem] p-5">
            <div className="flex items-start gap-3">
              <Newspaper className="mt-1 shrink-0 text-[var(--gold)]" size={22} />
              <p className="site-copy text-white/66">{content.news.relatedBody}</p>
            </div>
            <Link
              href={`/${content.lang}/industry-news`}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-200/22 bg-cyan-200/8 px-4 py-3 text-sm font-black text-white transition hover:border-cyan-200/42 hover:bg-cyan-200/12"
            >
              <ArrowUpRight size={17} />
              {content.lang === "fa" ? "مشاهده اخبار مرتبط" : "View related news"}
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3 max-md:[&>a:nth-child(n+3)]:hidden">
          {featuredItems.map((item) => (
            <Link
              key={item.title}
              href={`/${content.lang}/industry-news`}
              className="industrial-card group overflow-hidden rounded-[1.8rem] transition hover:-translate-y-1 hover:border-cyan-200/34"
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent" />
                <span className="absolute start-4 top-4 rounded-full border border-white/12 bg-black/42 px-3 py-1 text-xs font-bold text-white/82 backdrop-blur-xl">
                  {item.sector}
                </span>
              </div>
              <div className="p-5">
                <time className="text-xs font-black text-[var(--gold)]">{item.date}</time>
                <h3 className="mt-3 text-lg font-black leading-8 text-white sm:text-xl">{item.title}</h3>
                <p className="mt-3 line-clamp-2 text-sm leading-7 text-white/60">{item.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BlogSection({ content }: HomeSectionsProps) {
  const posts = content.blog.posts.filter((post) => post.status === "published");
  const featuredPosts = [...posts].sort(
    (left, right) => Number(right.featured) - Number(left.featured),
  );

  return (
    <section id="blog" className="section-pad relative isolate">
      <BuildBackdrop motif="walls" lang={content.lang} tone="quiet" className="end-[-20%] top-0 w-[120vw] lg:end-[calc(50%-min(590px,47%)-6rem)] lg:top-[-4.5rem] lg:w-[34rem]" />
      <div className="section-shell">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="section-kicker">{content.blog.kicker}</div>
            <h2 className="section-display-title mt-4 font-black text-white">
              {content.blog.title}
            </h2>
          </div>
          <div className="industrial-card rounded-[1.6rem] p-5">
            <div className="flex items-start gap-3">
              <BookOpenText className="mt-1 shrink-0 text-[var(--gold)]" size={22} />
              <p className="site-copy text-white/66">{content.blog.body}</p>
            </div>
            <Link
              href={`/${content.lang}/blog`}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/22 bg-cyan-200/8 px-4 py-3 text-sm font-black text-white transition hover:border-cyan-200/42 hover:bg-cyan-200/12"
            >
              <ArrowUpRight size={17} />
              {content.blog.allPostsLabel}
            </Link>
          </div>
        </div>

        <div className="mt-9 max-md:[&_.grid>*:nth-child(n+3)]:hidden">
          <BlogCards content={content} posts={featuredPosts} limit={3} />
        </div>
      </div>
    </section>
  );
}

function GallerySection({ content }: HomeSectionsProps) {
  const fa = content.lang === "fa";
  return (
    <section id="gallery" className="section-pad relative isolate">
      <BuildBackdrop motif="stand" lang={content.lang} tone="quiet" className="inset-x-0 top-[-2rem] mx-auto w-[min(1500px,190vw)]" />
      <div className="section-shell">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="section-kicker">{content.gallery.kicker}</div>
            <h2 className="section-display-title mt-4 font-black text-white">{content.gallery.title}</h2>
          </div>
          <Link href={`/${content.lang}/gallery`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-[var(--gold)] hover:bg-white/10">
            <Images size={17} />
            {fa ? "همه گزارش‌های تصویری" : "All photo reports"}
          </Link>
        </div>
        <div className="max-sm:[&_.grid>button:nth-child(n+5)]:hidden">
          <GalleryLightbox content={content} limit={6} />
        </div>
      </div>
    </section>
  );
}

function ContactSection({ content }: HomeSectionsProps) {
  return (
    <section id="contact" className="section-pad relative isolate">
      <BuildBackdrop motif="floor" lang={content.lang} className="start-[-15%] top-[-2rem] w-[min(560px,110vw)] lg:start-auto lg:end-[calc(50%-min(590px,47%)-22rem)] lg:top-auto lg:bottom-0 lg:w-[30rem]" />
      <div className="section-shell grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="industrial-card rounded-[2rem] p-5 sm:p-7">
          <div className="section-kicker">{content.contact.kicker}</div>
          <h2 className="card-display-title mt-4 font-black text-white">{content.contact.title}</h2>
          <div className="mt-8 grid gap-5">
            <ContactRow icon={<MapPin size={21} />} label={content.contact.addressLabel}>
              {content.contact.address}
            </ContactRow>
            <ContactRow icon={<Mail size={21} />} label={content.contact.emailLabel}>
              <a href="mailto:info@arattaexpo.ir" className="font-latin inline-flex min-h-11 items-center">info@arattaexpo.ir</a>
            </ContactRow>
            <ContactRow icon={<Phone size={21} />} label={content.contact.phoneLabel}>
              {content.contact.phones.map((phone) => (
                <a key={phone} href={telHref(phone)} className="font-latin me-5 inline-flex min-h-11 items-center">
                  {phone}
                </a>
              ))}
            </ContactRow>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-2 [&>a]:px-2 sm:[&>a]:px-4">
            <a href={telHref(content.contact.phones[0])} className="liquid-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-black text-white">
              <Phone size={17} />
              {content.lang === "fa" ? "تماس" : "Call"}
            </a>
            <a href="mailto:info@arattaexpo.ir" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.05] px-4 font-black text-white">
              <Mail size={17} />
              {content.lang === "fa" ? "ایمیل" : "Email"}
            </a>
            <a href={content.contact.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.05] px-4 font-black text-white">
              <Navigation size={17} />
              {content.lang === "fa" ? "مسیریابی" : "Directions"}
            </a>
          </div>
        </div>
        <GoogleMapPanel content={content} compact />
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/8 text-[var(--cyan)]">
        {icon}
      </span>
      <div>
        <div className="text-sm font-bold text-[var(--gold)]">{label}</div>
        <div className="mt-1 leading-8 text-white/72">{children}</div>
      </div>
    </div>
  );
}
