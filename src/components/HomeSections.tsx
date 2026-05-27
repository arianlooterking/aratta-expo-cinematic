import Image from "next/image";
import {
  ArrowUpRight,
  CalendarClock,
  Download,
  FileDown,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { SiteContent } from "@/data/aratta-content";
import { AboutExperience } from "@/components/AboutExperience";
import { AnimatedTabs } from "@/components/AnimatedTabs";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { InquiryForm } from "@/components/InquiryForm";

type HomeSectionsProps = {
  content: SiteContent;
};

export function HomeSections({ content }: HomeSectionsProps) {
  return (
    <>
      <AboutExperience content={content} />
      <ExhibitionsSection content={content} />
      <AnimatedTabs content={content} />
      <RegistrationSection content={content} />
      <EquipmentParticipantsSection content={content} />
      <NewsSection content={content} />
      <GallerySection content={content} />
      <ContactSection content={content} />
      <Footer content={content} />
    </>
  );
}

function ExhibitionsSection({ content }: HomeSectionsProps) {
  return (
    <section id="exhibitions" className="py-24">
      <div className="section-shell">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <div className="section-kicker">{content.exhibitions.kicker}</div>
            <h2 className="section-display-title mt-4 font-black text-white">
              {content.exhibitions.title}
            </h2>
          </div>
          <p className="industrial-card site-copy rounded-[1.5rem] p-5 text-white/68">
            {content.exhibitions.note}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {content.exhibitions.items.map((event) => (
            <article
              key={event.title}
              className="industrial-card group overflow-hidden rounded-[2rem]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/22 to-transparent" />
                <span className="absolute start-4 top-4 rounded-full border border-amber-200/25 bg-black/38 px-3 py-1 text-xs font-bold text-[var(--gold)] backdrop-blur-xl">
                  Archived
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-[var(--cyan)]">
                  <CalendarClock size={16} />
                  <span>{event.date}</span>
                  <span className="text-white/38">/</span>
                  <span>{event.location}</span>
                </div>
                <h3 className="mt-4 min-h-24 text-xl font-black leading-8 text-white">
                  {event.title}
                </h3>
                <p className="mt-3 min-h-24 text-sm leading-7 text-white/62">{event.summary}</p>
                <a
                  href={event.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)] hover:text-white"
                >
                  <ArrowUpRight size={17} />
                  {content.lang === "fa" ? "جزئیات رسمی" : "Official details"}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RegistrationSection({ content }: HomeSectionsProps) {
  return (
    <section id="registration" className="py-24">
      <div className="section-shell grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="industrial-card rounded-[2rem] p-7">
          <div className="section-kicker">{content.registration.kicker}</div>
          <h2 className="card-display-title mt-4 font-black text-white">{content.registration.title}</h2>
          <p className="site-copy mt-5 text-lg text-white/70">{content.registration.body}</p>
          <div className="mt-8 grid gap-3">
            {content.registration.downloads.map((download) => (
              <a
                key={download.href}
                href={download.href}
                download={download.fileName}
                className="group flex items-center justify-between gap-4 rounded-3xl border border-white/12 bg-white/[0.045] p-4 transition hover:border-cyan-200/38 hover:bg-cyan-200/8"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/28 text-[var(--cyan)]">
                    <FileDown size={22} />
                  </span>
                  <span>
                    <span className="block font-bold text-white">{download.label}</span>
                    <span className="font-latin mt-1 block text-xs uppercase tracking-[0.2em] text-white/42">
                      {download.type}
                    </span>
                  </span>
                </span>
                <Download className="shrink-0 text-[var(--gold)]" size={20} />
              </a>
            ))}
          </div>
        </div>

        <div className="glass rounded-[2rem] p-7">
          <h3 className="text-2xl font-black text-white">{content.registration.formTitle}</h3>
          <p className="mt-3 flex items-start gap-2 text-sm leading-7 text-white/56">
            <ShieldCheck className="mt-1 shrink-0 text-[var(--success)]" size={17} />
            {content.lang === "fa"
              ? "این فرم اطلاعات را در مرورگر نگه می دارد و فقط پیش نویس ایمیل ایجاد می کند."
              : "This form keeps data in the browser and only creates an email draft."}
          </p>
          <div className="mt-6">
            <InquiryForm content={content} />
          </div>
        </div>
      </div>
    </section>
  );
}

function EquipmentParticipantsSection({ content }: HomeSectionsProps) {
  const downloads = content.registration.downloads.slice(1);
  return (
    <section id="equipment" className="py-20">
      <div className="section-shell grid gap-5 md:grid-cols-2" id="participants">
        {downloads.map((item) => (
          <a
            key={item.href}
            href={item.href}
            download={item.fileName}
            className="industrial-card group relative overflow-hidden rounded-[2rem] p-7 transition hover:-translate-y-1 hover:border-cyan-200/40"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(62,231,255,0.14),transparent_18rem)]" />
            <div className="relative">
              <div className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-[var(--cyan)]">
                {item.type}
              </div>
              <h2 className="card-display-title mt-5 font-black text-white">{item.label}</h2>
              <p className="site-copy mt-4 text-white/62">
                {content.lang === "fa"
                  ? "مسیر مستقیم به فایل رسمی، بدون لینک مرده و بدون وعده ثبت خودکار."
                  : "Direct path to the official file, with no dead link and no automated-registration claim."}
              </p>
              <span className="mt-8 inline-flex items-center gap-2 font-bold text-[var(--gold)]">
                <Download size={18} />
                {content.lang === "fa" ? "دریافت فایل" : "Open file"}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function NewsSection({ content }: HomeSectionsProps) {
  return (
    <section id="news" className="py-24">
      <div className="section-shell">
        <div className="section-kicker">{content.news.kicker}</div>
        <h2 className="section-display-title mt-4 font-black text-white">{content.news.title}</h2>
        <div className="mt-10 grid gap-4">
          {content.news.items.map((item) => (
            <article
              key={item.title}
              className="industrial-card grid gap-4 rounded-[1.7rem] p-6 md:grid-cols-[11rem_1fr]"
            >
              <time className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
                {item.date}
              </time>
              <div>
                <h3 className="text-2xl font-black text-white">{item.title}</h3>
                <p className="mt-3 leading-8 text-white/62">{item.body}</p>
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 font-bold text-[var(--gold)]"
                  >
                    <ArrowUpRight size={17} />
                    {content.lang === "fa" ? "مشاهده منبع رسمی" : "Open official source"}
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ content }: HomeSectionsProps) {
  return (
    <section id="gallery" className="py-24">
      <div className="section-shell">
        <div className="mb-10 max-w-3xl">
          <div className="section-kicker">{content.gallery.kicker}</div>
          <h2 className="section-display-title mt-4 font-black text-white">
            {content.gallery.title}
          </h2>
        </div>
        <GalleryLightbox content={content} />
      </div>
    </section>
  );
}

function ContactSection({ content }: HomeSectionsProps) {
  return (
    <section id="contact" className="py-24">
      <div className="section-shell grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="industrial-card rounded-[2rem] p-7">
          <div className="section-kicker">{content.contact.kicker}</div>
          <h2 className="card-display-title mt-4 font-black text-white">{content.contact.title}</h2>
          <div className="mt-8 grid gap-5">
            <ContactRow icon={<MapPin size={21} />} label={content.contact.addressLabel}>
              {content.contact.address}
            </ContactRow>
            <ContactRow icon={<Mail size={21} />} label={content.contact.emailLabel}>
              <a href="mailto:info@arattaexpo.ir">info@arattaexpo.ir</a>
            </ContactRow>
            <ContactRow icon={<Phone size={21} />} label={content.contact.phoneLabel}>
              {content.contact.phones.map((phone) => (
                <a key={phone} href={`tel:${phone}`} className="me-4 inline-block">
                  {phone}
                </a>
              ))}
            </ContactRow>
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

function Footer({ content }: HomeSectionsProps) {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="section-shell flex flex-col gap-4 text-sm text-white/52 md:flex-row md:items-center md:justify-between">
        <p>{content.footer.copyright}</p>
        <p className="font-latin">{content.footer.credit}</p>
      </div>
    </footer>
  );
}
