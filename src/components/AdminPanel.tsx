"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileDown,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  ListTree,
  MapPin,
  Newspaper,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  contentByLang,
  type BlogPost,
  type Exhibition,
  type NewsItem,
  type RelatedNewsItem,
  type SiteContent,
} from "@/data/aratta-content";
import type { Lang } from "@/lib/lang";

type AdminTab = "overview" | "navigation" | "blog" | "news" | "related" | "exhibitions" | "downloads" | "gallery" | "contact" | "publishing";
type AdminStatus = {
  configured: boolean;
  config?: {
    hasWriteToken: boolean;
    hasWebhook: boolean;
    hasWebhookToken: boolean;
  };
  requirements?: string[];
};

const STORAGE_KEY = "aratta-admin-content-drafts-v1";

const tabs: Array<{ id: AdminTab; label: Record<Lang, string>; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { id: "overview", label: { fa: "صفحه اصلی و بخش‌ها", en: "Landing & sections" }, icon: LayoutDashboard },
  { id: "navigation", label: { fa: "منو و مسیرها", en: "Navigation" }, icon: ListTree },
  { id: "blog", label: { fa: "مجله و مقاله‌ها", en: "Blog & articles" }, icon: BookOpenText },
  { id: "news", label: { fa: "اخبار رسمی", en: "Official news" }, icon: Newspaper },
  { id: "related", label: { fa: "اخبار مرتبط", en: "Related news" }, icon: Newspaper },
  { id: "exhibitions", label: { fa: "نمایشگاه‌ها", en: "Exhibitions" }, icon: Database },
  { id: "downloads", label: { fa: "فرم‌ها و دانلودها", en: "Forms & downloads" }, icon: FileDown },
  { id: "gallery", label: { fa: "گالری", en: "Gallery" }, icon: ImageIcon },
  { id: "contact", label: { fa: "نقشه و تماس", en: "Map & contact" }, icon: MapPin },
  { id: "publishing", label: { fa: "انتشار", en: "Publishing" }, icon: Settings },
];

function cloneContent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStoredDrafts() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Record<Lang, Partial<SiteContent>>;
    if (parsed.fa?.lang === "fa" && parsed.en?.lang === "en") {
      const hydrated = cloneContent(contentByLang);
      for (const lang of ["fa", "en"] as Lang[]) {
        const storedContent = parsed[lang];
        hydrated[lang] = {
          ...hydrated[lang],
          ...storedContent,
          blog: storedContent.blog ?? hydrated[lang].blog,
          nav: storedContent.nav?.some((item) => item.id === "blog")
            ? storedContent.nav
            : hydrated[lang].nav,
        };
      }
      return hydrated;
    }
  } catch {
    return null;
  }
  return null;
}

function makeNewsItem(lang: Lang): NewsItem {
  return {
    date: lang === "fa" ? "تاریخ جدید" : "New date",
    title: lang === "fa" ? "عنوان خبر جدید" : "New news title",
    body: lang === "fa" ? "خلاصه کوتاه خبر را اینجا وارد کنید." : "Enter a concise news summary here.",
    href: "",
  };
}

function makeRelatedNewsItem(lang: Lang): RelatedNewsItem {
  return {
    ...makeNewsItem(lang),
    source: "arattaexpo.ir",
    sector: lang === "fa" ? "حوزه مرتبط" : "Related sector",
    image: "/gallery/archive-05.jpg",
  };
}

function makeExhibition(lang: Lang): Exhibition {
  return {
    title: lang === "fa" ? "عنوان نمایشگاه جدید" : "New exhibition title",
    date: lang === "fa" ? "تاریخ منتشرشده" : "Published date",
    location: lang === "fa" ? "محل برگزاری" : "Location",
    status: "archived",
    image: "/official/kimex-2025-poster.jpg",
    href: "https://arattaexpo.ir/",
    summary: lang === "fa" ? "خلاصه وضعیت و منبع نمایشگاه." : "Archive status and source summary.",
  };
}

function makeBlogPost(lang: Lang): BlogPost {
  return {
    slug: `new-article-${Date.now()}`,
    status: "draft",
    featured: false,
    title: lang === "fa" ? "عنوان مقاله جدید" : "New article title",
    excerpt: lang === "fa" ? "خلاصه کوتاه و روشن مقاله را وارد کنید." : "Add a concise article summary.",
    body: [lang === "fa" ? "متن پاراگراف اول مقاله." : "The first article paragraph."],
    category: lang === "fa" ? "راهنمای نمایشگاه" : "Exhibition guide",
    publishedAt: lang === "fa" ? "تاریخ انتشار" : "Publication date",
    readTime: lang === "fa" ? "۵ دقیقه" : "5 min read",
    author: lang === "fa" ? "تیم اَرَت" : "Aratta Team",
    coverImage: "/gallery/expo-floor-01.jpg",
    coverAlt: lang === "fa" ? "تصویر مقاله نمایشگاهی" : "Exhibition article cover",
    seoTitle: lang === "fa" ? "عنوان سئو مقاله | مجله اَرَت" : "Article SEO title | Aratta Journal",
    seoDescription: lang === "fa" ? "توضیح کوتاه مقاله برای موتورهای جستجو." : "A concise search description for the article.",
  };
}

function makeDownload(lang: Lang): SiteContent["registration"]["downloads"][number] {
  return {
    label: lang === "fa" ? "فایل جدید" : "New file",
    href: "/downloads/new-file.pdf",
    sourceHref: "https://arattaexpo.ir/",
    type: "PDF",
    fileName: "new-file.pdf",
    size: "—",
    category: "form",
    description: lang === "fa" ? "توضیح کوتاه فایل را وارد کنید." : "Add a concise file description.",
  };
}

export function AdminPanel({ embedded = false, initialLang = "fa" }: { embedded?: boolean; initialLang?: Lang }) {
  const [activeLang, setActiveLang] = useState<Lang>(initialLang);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [drafts, setDrafts] = useState<Record<Lang, SiteContent>>(() => readStoredDrafts() ?? cloneContent(contentByLang));
  const [rawOverrides, setRawOverrides] = useState<Partial<Record<Lang, string>>>({});
  const [token, setToken] = useState("");
  const [changeSummary, setChangeSummary] = useState("Content update from Aratta admin panel");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(() =>
    readStoredDrafts() ? { tone: "ok", text: initialLang === "fa" ? "پیش‌نویس محلی از همین مرورگر بازیابی شد." : "Local draft restored from this browser." } : null,
  );
  const content = drafts[activeLang];
  const rawJson = rawOverrides[activeLang] ?? JSON.stringify(content, null, 2);

  useEffect(() => {
    void fetch("/api/admin/content")
      .then((response) => response.json())
      .then((data: AdminStatus) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  const contentHealth = useMemo(() => {
    const checks = [
      content.nav.length >= 10,
      content.news.items.length > 0,
      content.news.relatedItems.length > 0,
      content.blog.posts.every((post) => post.slug && post.title && post.body.length > 0),
      content.exhibitions.items.every((item) => item.status === "archived"),
      Boolean(content.contact.mapEmbedUrl),
      content.registration.downloads.every((item) => item.href && item.fileName),
    ];
    return { passed: checks.filter(Boolean).length, total: checks.length };
  }, [content]);

  function updateContent(updater: (next: SiteContent) => void) {
    setDrafts((current) => {
      const next = cloneContent(current);
      updater(next[activeLang]);
      return next;
    });
    setRawOverrides((current) => {
      const next = { ...current };
      delete next[activeLang];
      return next;
    });
  }

  function saveLocal() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    setMessage({ tone: "ok", text: activeLang === "fa" ? "پیش‌نویس در همین مرورگر ذخیره شد و هنوز سایت اصلی را تغییر نداده است." : "Draft saved in this browser. This does not change production." });
  }

  function resetLocal() {
    const fresh = cloneContent(contentByLang);
    setDrafts(fresh);
    window.localStorage.removeItem(STORAGE_KEY);
    setMessage({ tone: "warn", text: activeLang === "fa" ? "پیش‌نویس محلی به محتوای اصلی همراه برنامه بازگردانده شد." : "Local draft reset to bundled site content." });
  }

  function exportJson(scope: "active" | "all") {
    const payload = scope === "active" ? drafts[activeLang] : drafts;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = scope === "active" ? `aratta-content-${activeLang}.json` : "aratta-content-all.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function applyRawJson() {
    try {
      const parsed = JSON.parse(rawJson) as SiteContent;
      if (parsed.lang !== activeLang) {
        setMessage({ tone: "error", text: activeLang === "fa" ? "زبان JSON باید با زبان انتخاب‌شده یکسان باشد." : "Raw JSON language must match the selected language." });
        return;
      }
      if (!parsed.blog || !Array.isArray(parsed.blog.posts)) {
        setMessage({ tone: "error", text: activeLang === "fa" ? "JSON باید بخش مجله و فهرست مقاله‌ها را داشته باشد." : "Raw JSON must include the blog section and posts array." });
        return;
      }
      updateContent((next) => Object.assign(next, parsed));
      setRawOverrides((current) => {
        const next = { ...current };
        delete next[activeLang];
        return next;
      });
      setMessage({ tone: "ok", text: activeLang === "fa" ? "JSON روی پیش‌نویس زبان انتخاب‌شده اعمال شد." : "Raw JSON applied to the selected language draft." });
    } catch {
      setMessage({ tone: "error", text: activeLang === "fa" ? "ساختار JSON معتبر نیست." : "Raw JSON is invalid." });
    }
  }

  async function publishDraft() {
    setMessage({ tone: "warn", text: activeLang === "fa" ? "در حال ارسال پیش‌نویس به سامانه انتشار پیکربندی‌شده…" : "Sending draft to the configured admin backend..." });
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ lang: activeLang, content, changeSummary }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string; errors?: string[] };
    if (!response.ok || !data.ok) {
      setMessage({
        tone: "error",
        text: data.errors?.join(" ") || data.message || "Publish failed. Production content was not changed.",
      });
      return;
    }
    setMessage({ tone: "ok", text: data.message || "Publish accepted by backend." });
  }

  const Root = embedded ? "section" : "main";
  const isFa = activeLang === "fa";

  return (
    <Root
      dir={isFa ? "rtl" : "ltr"}
      lang={activeLang}
      className={[
        "bg-[radial-gradient(circle_at_top_left,rgba(125,220,232,0.12),transparent_34rem),linear-gradient(180deg,#020405,#071012_54%,#020405)] text-white",
        embedded ? "overflow-hidden rounded-[2rem] border border-white/10 px-3 py-4 sm:px-5" : "min-h-screen px-4 py-6 sm:px-6 lg:px-8",
      ].join(" ")}
    >
      <div className={embedded ? "mx-auto max-w-[1380px]" : "mx-auto max-w-[1440px]"}>
        <header className="glass flex flex-col gap-5 rounded-[2rem] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-latin text-xs font-black uppercase tracking-[0.28em] text-[var(--cyan)]">
              Aratta Admin / Content Operations
            </div>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              {isFa ? "استودیوی محتوای وب‌سایت اَرَت" : "Aratta website content studio"}
            </h1>
            <p className="site-copy mt-3 text-white/62">
              {isFa
                ? "صفحه اصلی، منوها، مقاله‌ها، اخبار، نمایشگاه‌ها، فرم‌ها، گالری و اطلاعات تماس را در یک پیش‌نویس امن مدیریت کنید."
                : "Manage landing content, navigation, articles, news, exhibitions, forms, gallery, and contact details in one safe draft."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/fa" className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
              {isFa ? "مشاهده سایت فارسی" : "Persian site"}
            </Link>
            <Link href="/en" className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
              {isFa ? "مشاهده سایت انگلیسی" : "English site"}
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-[18rem_1fr]">
          <aside className="glass h-fit rounded-[2rem] p-3">
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["fa", "en"] as Lang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={[
                    "rounded-2xl px-4 py-3 text-sm font-black transition",
                    activeLang === lang ? "bg-cyan-200/16 text-white ring-1 ring-cyan-200/35" : "bg-white/[0.04] text-white/58",
                  ].join(" ")}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <nav className="grid gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-start text-sm font-black transition",
                      activeTab === tab.id ? "bg-amber-200/14 text-white ring-1 ring-amber-200/28" : "text-white/62 hover:bg-white/[0.055] hover:text-white",
                    ].join(" ")}
                  >
                    <Icon size={18} />
                    {tab.label[activeLang]}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-5">
            <StatusStrip lang={activeLang} status={status} health={contentHealth} message={message} />
            {activeTab === "overview" ? <OverviewEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "navigation" ? <NavigationEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "blog" ? (
              <BlogEditor
                content={content}
                updateContent={updateContent}
                makeItem={() => makeBlogPost(activeLang)}
              />
            ) : null}
            {activeTab === "news" ? (
              <NewsEditor
                content={content}
                updateContent={updateContent}
                makeItem={() => makeNewsItem(activeLang)}
              />
            ) : null}
            {activeTab === "related" ? (
              <RelatedNewsEditor
                content={content}
                updateContent={updateContent}
                makeItem={() => makeRelatedNewsItem(activeLang)}
              />
            ) : null}
            {activeTab === "exhibitions" ? <ExhibitionsEditor content={content} updateContent={updateContent} makeItem={() => makeExhibition(activeLang)} /> : null}
            {activeTab === "downloads" ? <DownloadsEditor content={content} updateContent={updateContent} makeItem={() => makeDownload(activeLang)} /> : null}
            {activeTab === "gallery" ? <GalleryEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "contact" ? <ContactEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "publishing" ? (
              <PublishingPanel
                lang={activeLang}
                token={token}
                setToken={setToken}
                changeSummary={changeSummary}
                setChangeSummary={setChangeSummary}
                rawJson={rawJson}
                setRawJson={(value) => setRawOverrides((current) => ({ ...current, [activeLang]: value }))}
                applyRawJson={applyRawJson}
                saveLocal={saveLocal}
                resetLocal={resetLocal}
                exportJson={exportJson}
                publishDraft={publishDraft}
              />
            ) : null}
          </div>
        </section>
      </div>
    </Root>
  );
}

function StatusStrip({
  lang,
  status,
  health,
  message,
}: {
  lang: Lang;
  status: AdminStatus | null;
  health: { passed: number; total: number };
  message: { tone: "ok" | "warn" | "error"; text: string } | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="industrial-card rounded-[1.4rem] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          {status?.configured ? <CheckCircle2 className="text-[var(--success)]" size={18} /> : <AlertTriangle className="text-[var(--gold)]" size={18} />}
          {label(lang, "سامانه انتشار", "Backend")}
        </div>
        <p className="mt-2 text-sm leading-6 text-white/58">
          {status?.configured
            ? label(lang, "مسیر انتشار سایت اصلی پیکربندی شده است.", "Production publish endpoint configured.")
            : label(lang, "تا زمان تنظیم متغیرهای امن، ویرایش‌ها فقط پیش‌نویس هستند.", "Draft mode until admin env vars are configured.")}
        </p>
      </div>
      <div className="industrial-card rounded-[1.4rem] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <Database className="text-[var(--cyan)]" size={18} />
          {label(lang, "سلامت محتوا", "Content health")}
        </div>
        <p className="mt-2 text-sm leading-6 text-white/58">
          {label(lang, `${health.passed} از ${health.total} کنترل ساختاری زبان انتخاب‌شده درست است.`, `${health.passed}/${health.total} structural checks passing for selected language.`)}
        </p>
      </div>
      <div className="industrial-card rounded-[1.4rem] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <KeyRound className="text-[var(--gold)]" size={18} />
          {label(lang, "وضعیت", "Status")}
        </div>
        <p className={["mt-2 text-sm leading-6", message?.tone === "error" ? "text-red-200" : message?.tone === "ok" ? "text-emerald-200" : "text-white/58"].join(" ")}>
          {message?.text ?? label(lang, "در این جلسه هنوز تغییری ارسال نشده است.", "No changes have been submitted in this session.")}
        </p>
      </div>
    </div>
  );
}

function Panel({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <section className="glass rounded-[2rem] p-5 sm:p-7">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white sm:text-3xl">{title}</h2>
        {body ? <p className="site-copy mt-2 text-white/58">{body}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl" | "ltr";
  type?: "text" | "password";
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-white/44">{label}</span>
      <input
        type={type}
        dir={dir}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/12 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-200/45 disabled:cursor-not-allowed disabled:opacity-45"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 4, dir }: { label: string; value: string; onChange: (value: string) => void; rows?: number; dir?: "rtl" | "ltr" }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-white/44">{label}</span>
      <textarea
        dir={dir}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y rounded-2xl border border-white/12 bg-black/28 px-4 py-3 text-sm font-bold leading-7 text-white outline-none transition focus:border-cyan-200/45"
      />
    </label>
  );
}

function SelectField({ label: fieldLabel, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-white/44">{fieldLabel}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-2xl border border-white/12 bg-[#071012] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-200/45"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function label(lang: Lang, fa: string, en: string) {
  return lang === "fa" ? fa : en;
}

function OverviewEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  const lang = content.lang;
  return (
    <Panel
      title={label(lang, "صفحه اصلی و همه بخش‌های اصلی", "Landing page and core sections")}
      body={label(lang, "متن هدر، مراحل ساخت، آمار، خدمات، درباره ما و فوتر را ویرایش کنید.", "Edit the hero, build stages, metrics, services, about content, and footer.")}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "نام برند", "Brand")} value={content.brand} dir={content.dir} onChange={(value) => updateContent((next) => void (next.brand = value))} />
        <Field label={label(lang, "عنوان اصلی", "Hero title")} value={content.hero.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.title = value))} />
        <TextArea label={label(lang, "زیرعنوان اصلی", "Hero subtitle")} value={content.hero.subtitle} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.subtitle = value))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={label(lang, "دکمه اصلی", "Primary action")} value={content.hero.primary} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.primary = value))} />
          <Field label={label(lang, "دکمه دوم", "Secondary action")} value={content.hero.secondary} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.secondary = value))} />
        </div>
        <Field label={label(lang, "عنوان درباره ما", "About title")} value={content.about.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.about.title = value))} />
        <TextArea label={label(lang, "متن درباره ما", "About body")} value={content.about.body} dir={content.dir} onChange={(value) => updateContent((next) => void (next.about.body = value))} />
        <Field label={label(lang, "عنوان خدمات", "Services title")} value={content.services.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.services.title = value))} />
        <Field label={label(lang, "برچسب خدمات", "Services kicker")} value={content.services.kicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.services.kicker = value))} />
        <Field label={label(lang, "گواه‌ها، جداشده با ویرگول", "Proof points, comma separated")} value={content.about.proof.join(", ")} dir={content.dir} onChange={(value) => updateContent((next) => void (next.about.proof = value.split(",").map((item) => item.trim()).filter(Boolean)))} />
        <Field label={label(lang, "متن حق نشر", "Footer copyright")} value={content.footer.copyright} dir={content.dir} onChange={(value) => updateContent((next) => void (next.footer.copyright = value))} />
        <Field label={label(lang, "اعتبار فوتر", "Footer credit")} value={content.footer.credit} dir={content.dir} onChange={(value) => updateContent((next) => void (next.footer.credit = value))} />
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        <ContentCollection title={label(lang, "مراحل روایت صفحه اصلی", "Landing story stages")}>
          {content.hero.stages.map((stage, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <Field label={label(lang, "برچسب مرحله", "Stage label")} value={stage.label} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.stages[index].label = value))} />
              <Field label={label(lang, "عنوان مرحله", "Stage title")} value={stage.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.stages[index].title = value))} />
              <TextArea label={label(lang, "شرح مرحله", "Stage body")} value={stage.body} dir={content.dir} rows={3} onChange={(value) => updateContent((next) => void (next.hero.stages[index].body = value))} />
            </div>
          ))}
        </ContentCollection>

        <div className="grid gap-4">
          <ContentCollection title={label(lang, "آمارهای صفحه اصلی", "Landing metrics")}>
            {content.hero.metrics.map((metric, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
                <Field label={label(lang, "مقدار", "Value")} value={metric.value} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.metrics[index].value = value))} />
                <Field label={label(lang, "عنوان آمار", "Metric label")} value={metric.label} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.metrics[index].label = value))} />
              </div>
            ))}
          </ContentCollection>

          <ContentCollection title={label(lang, "کارت‌های خدمات", "Service cards")}>
            {content.services.items.map((service, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <Field label={label(lang, "عنوان خدمت", "Service title")} value={service.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.services.items[index].title = value))} />
                <TextArea label={label(lang, "شرح خدمت", "Service body")} value={service.body} dir={content.dir} rows={3} onChange={(value) => updateContent((next) => void (next.services.items[index].body = value))} />
              </div>
            ))}
          </ContentCollection>
        </div>
      </div>
    </Panel>
  );
}

function ContentCollection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-4">
      <h3 className="mb-4 text-lg font-black text-white">{title}</h3>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function NavigationEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  const lang = content.lang;
  return (
    <Panel
      title={label(lang, "منوی اصلی وب‌سایت", "Primary website navigation")}
      body={label(lang, "برچسب مسیرها را تغییر دهید و با دکمه‌ها ترتیب نمایش آنها را مشخص کنید. شناسه مسیر برای جلوگیری از لینک خراب قفل است.", "Edit labels and control their order. Route identifiers stay locked to prevent broken links.")}
    >
      <div className="grid gap-3">
        {content.nav.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
            <Field label={label(lang, "شناسه مسیر", "Route id")} value={item.id} disabled onChange={() => undefined} />
            <Field label={label(lang, "عنوان منو", "Navigation label")} value={item.label} dir={content.dir} onChange={(value) => updateContent((next) => void (next.nav[index].label = value))} />
            <div className="flex gap-2">
              <button type="button" disabled={index === 0} onClick={() => updateContent((next) => void (next.nav = moveItem(next.nav, index, index - 1)))} className="min-h-11 rounded-xl border border-white/12 px-3 text-sm font-black text-white/72 disabled:cursor-not-allowed disabled:opacity-30">↑</button>
              <button type="button" disabled={index === content.nav.length - 1} onClick={() => updateContent((next) => void (next.nav = moveItem(next.nav, index, index + 1)))} className="min-h-11 rounded-xl border border-white/12 px-3 text-sm font-black text-white/72 disabled:cursor-not-allowed disabled:opacity-30">↓</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function BlogEditor({ content, updateContent, makeItem }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void; makeItem: () => BlogPost }) {
  const lang = content.lang;
  const posts = content.blog.posts;
  const updatePosts = (nextPosts: BlogPost[]) => updateContent((next) => void (next.blog.posts = nextPosts));

  return (
    <Panel
      title={label(lang, "مجله و مدیریت مقاله‌ها", "Blog and article management")}
      body={label(lang, "مقاله را به‌صورت پیش‌نویس آماده کنید، پیش‌نمایش اطلاعات را بررسی کنید و فقط پس از تایید منتشر کنید.", "Prepare drafts, review article details, and publish only after approval.")}
    >
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "برچسب بخش", "Section kicker")} value={content.blog.kicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.blog.kicker = value))} />
        <Field label={label(lang, "عنوان مجله", "Blog title")} value={content.blog.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.blog.title = value))} />
        <TextArea label={label(lang, "معرفی مجله", "Blog introduction")} value={content.blog.body} dir={content.dir} onChange={(value) => updateContent((next) => void (next.blog.body = value))} />
        <Field label={label(lang, "متن دکمه همه مقاله‌ها", "All articles button")} value={content.blog.allPostsLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.blog.allPostsLabel = value))} />
        <Field label={label(lang, "متن دکمه مطالعه مقاله", "Read article button")} value={content.blog.readMoreLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.blog.readMoreLabel = value))} />
        <Field label={label(lang, "برچسب مقاله پیشنهادی", "Featured article label")} value={content.blog.featuredLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.blog.featuredLabel = value))} />
        <Field label={label(lang, "پیام نبود مقاله", "Empty blog message")} value={content.blog.emptyLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.blog.emptyLabel = value))} />
      </div>

      <div className="space-y-5">
        {posts.map((post, index) => (
          <EditableCard
            key={`${post.slug}-${index}`}
            removeLabel={label(lang, "حذف مقاله", "Remove article")}
            confirmMessage={label(lang, `مقاله «${post.title}» از پیش‌نویس حذف شود؟`, `Remove “${post.title}” from this draft?`)}
            onRemove={() => updatePosts(posts.filter((_, itemIndex) => itemIndex !== index))}
          >
            <SelectField
              label={label(lang, "وضعیت انتشار", "Publication status")}
              value={post.status}
              options={[
                { value: "draft", label: label(lang, "پیش‌نویس", "Draft") },
                { value: "published", label: label(lang, "منتشرشده", "Published") },
              ]}
              onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, status: value as BlogPost["status"] } : entry))}
            />
            <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/12 bg-black/28 px-4 py-3 text-sm font-black text-white/78">
              <input type="checkbox" checked={post.featured} onChange={(event) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, featured: event.target.checked } : entry))} className="size-5 accent-cyan-400" />
              {label(lang, "نمایش به‌عنوان مقاله پیشنهادی", "Feature this article")}
            </label>
            <Field label={label(lang, "نامک انگلیسی آدرس", "URL slug")} value={post.slug} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : entry))} />
            <Field label={label(lang, "عنوان مقاله", "Article title")} value={post.title} dir={content.dir} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: value } : entry))} />
            <Field label={label(lang, "دسته‌بندی", "Category")} value={post.category} dir={content.dir} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, category: value } : entry))} />
            <Field label={label(lang, "تاریخ انتشار", "Publication date")} value={post.publishedAt} dir={content.dir} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, publishedAt: value } : entry))} />
            <Field label={label(lang, "زمان مطالعه", "Reading time")} value={post.readTime} dir={content.dir} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, readTime: value } : entry))} />
            <Field label={label(lang, "نویسنده", "Author")} value={post.author} dir={content.dir} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, author: value } : entry))} />
            <Field label={label(lang, "مسیر تصویر", "Cover image path")} value={post.coverImage} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, coverImage: value } : entry))} />
            <Field label={label(lang, "توضیح تصویر", "Cover alt text")} value={post.coverAlt} dir={content.dir} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, coverAlt: value } : entry))} />
            <TextArea label={label(lang, "خلاصه کارت مقاله", "Article excerpt")} value={post.excerpt} dir={content.dir} rows={4} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, excerpt: value } : entry))} />
            <TextArea label={label(lang, "متن مقاله؛ پاراگراف‌ها را با یک خط خالی جدا کنید", "Article body; separate paragraphs with a blank line")} value={post.body.join("\n\n")} dir={content.dir} rows={12} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, body: value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean) } : entry))} />
            <Field label={label(lang, "عنوان سئو", "SEO title")} value={post.seoTitle} dir={content.dir} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, seoTitle: value } : entry))} />
            <TextArea label={label(lang, "توضیح سئو", "SEO description")} value={post.seoDescription} dir={content.dir} rows={3} onChange={(value) => updatePosts(posts.map((entry, itemIndex) => itemIndex === index ? { ...entry, seoDescription: value } : entry))} />
          </EditableCard>
        ))}
        <AddButton label={label(lang, "افزودن مقاله جدید", "Add article")} onClick={() => updatePosts([...posts, makeItem()])} />
      </div>
    </Panel>
  );
}

function NewsEditor({
  content,
  updateContent,
  makeItem,
}: {
  content: SiteContent;
  updateContent: (updater: (next: SiteContent) => void) => void;
  makeItem: () => NewsItem;
}) {
  const lang = content.lang;
  const items = content.news.items;
  const updateItems = (nextItems: NewsItem[]) => updateContent((next) => void (next.news.items = nextItems));
  return (
    <Panel
      title={label(lang, "آرشیو اخبار رسمی", "Official news archive")}
      body={label(lang, "عنوان بخش و خبرهای رسمی را همراه با تاریخ و منبع مدیریت کنید.", "Manage the section copy and official news entries with dates and sources.")}
    >
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "برچسب بخش", "Section kicker")} value={content.news.kicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.news.kicker = value))} />
        <Field label={label(lang, "عنوان بخش", "Section title")} value={content.news.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.news.title = value))} />
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.title}-${index}`} removeLabel={label(lang, "حذف خبر", "Remove news")} confirmMessage={label(lang, `خبر «${item.title}» از پیش‌نویس حذف شود؟`, `Remove “${item.title}” from this draft?`)} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label={label(lang, "تاریخ", "Date")} value={item.date} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, date: value } : entry)))} />
            <Field label={label(lang, "عنوان", "Title")} value={item.title} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, title: value } : entry)))} />
            <TextArea label={label(lang, "خلاصه خبر", "Summary")} value={item.body} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, body: value } : entry)))} />
            <Field label={label(lang, "نشانی منبع", "Source URL")} value={item.href ?? ""} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label={label(lang, "افزودن خبر", "Add news item")} onClick={() => updateItems([...items, makeItem()])} />
      </div>
    </Panel>
  );
}

function RelatedNewsEditor({
  content,
  updateContent,
  makeItem,
}: {
  content: SiteContent;
  updateContent: (updater: (next: SiteContent) => void) => void;
  makeItem: () => RelatedNewsItem;
}) {
  const lang = content.lang;
  const items = content.news.relatedItems;
  const updateItems = (nextItems: RelatedNewsItem[]) => updateContent((next) => void (next.news.relatedItems = nextItems));
  return (
    <Panel title={label(lang, "مرکز اخبار مرتبط", "Related news hub")} body={label(lang, "صفحه اخبار مرتبط و کارت‌های پیش‌نمایش صفحه اصلی را مدیریت کنید.", "Manage the dedicated related-news page and the home preview cards.")}>
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "عنوان بخش", "Section title")} value={content.news.relatedTitle} dir={content.dir} onChange={(value) => updateContent((next) => void (next.news.relatedTitle = value))} />
        <Field label={label(lang, "برچسب بخش", "Kicker")} value={content.news.relatedKicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.news.relatedKicker = value))} />
        <TextArea label={label(lang, "متن معرفی", "Section body")} value={content.news.relatedBody} dir={content.dir} onChange={(value) => updateContent((next) => void (next.news.relatedBody = value))} />
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.title}-${index}`} removeLabel={label(lang, "حذف خبر", "Remove news")} confirmMessage={label(lang, `خبر «${item.title}» از پیش‌نویس حذف شود؟`, `Remove “${item.title}” from this draft?`)} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label={label(lang, "تاریخ", "Date")} value={item.date} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, date: value } : entry)))} />
            <Field label={label(lang, "حوزه", "Sector")} value={item.sector} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, sector: value } : entry)))} />
            <Field label={label(lang, "عنوان", "Title")} value={item.title} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, title: value } : entry)))} />
            <Field label={label(lang, "مسیر تصویر", "Image path")} value={item.image} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, image: value } : entry)))} />
            <TextArea label={label(lang, "خلاصه خبر", "Summary")} value={item.body} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, body: value } : entry)))} />
            <Field label={label(lang, "نام منبع", "Source")} value={item.source} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, source: value } : entry)))} />
            <Field label={label(lang, "نشانی منبع", "Source URL")} value={item.href ?? ""} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label={label(lang, "افزودن خبر مرتبط", "Add related news")} onClick={() => updateItems([...items, makeItem()])} />
      </div>
    </Panel>
  );
}

function ExhibitionsEditor({ content, updateContent, makeItem }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void; makeItem: () => Exhibition }) {
  const lang = content.lang;
  const items = content.exhibitions.items;
  const updateItems = (nextItems: Exhibition[]) => updateContent((next) => void (next.exhibitions.items = nextItems));
  return (
    <Panel title={label(lang, "نمایشگاه‌ها", "Exhibitions")} body={label(lang, "کارت‌های رویداد آرشیوی را مدیریت کنید. تاریخ‌ها تا دریافت تقویم رسمی تازه آرشیوی می‌مانند.", "Manage archived event cards. Dates remain archived until a fresh official calendar is provided.")}>
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "برچسب بخش", "Section kicker")} value={content.exhibitions.kicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.exhibitions.kicker = value))} />
        <Field label={label(lang, "عنوان صفحه", "Page title")} value={content.exhibitions.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.exhibitions.title = value))} />
        <TextArea label={label(lang, "یادداشت آرشیو", "Archive note")} value={content.exhibitions.note} dir={content.dir} onChange={(value) => updateContent((next) => void (next.exhibitions.note = value))} />
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.title}-${index}`} removeLabel={label(lang, "حذف نمایشگاه", "Remove exhibition")} confirmMessage={label(lang, `نمایشگاه «${item.title}» از پیش‌نویس حذف شود؟`, `Remove “${item.title}” from this draft?`)} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label={label(lang, "عنوان", "Title")} value={item.title} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, title: value } : entry)))} />
            <Field label={label(lang, "تاریخ", "Date")} value={item.date} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, date: value } : entry)))} />
            <Field label={label(lang, "محل", "Location")} value={item.location} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, location: value } : entry)))} />
            <Field label={label(lang, "مسیر تصویر", "Image path")} value={item.image} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, image: value } : entry)))} />
            <Field label={label(lang, "نشانی رسمی", "Official URL")} value={item.href} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
            <TextArea label={label(lang, "خلاصه", "Summary")} value={item.summary} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, summary: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label={label(lang, "افزودن نمایشگاه", "Add exhibition")} onClick={() => updateItems([...items, makeItem()])} />
      </div>
    </Panel>
  );
}

function DownloadsEditor({ content, updateContent, makeItem }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void; makeItem: () => SiteContent["registration"]["downloads"][number] }) {
  const lang = content.lang;
  const items = content.registration.downloads;
  const updateItems = (nextItems: SiteContent["registration"]["downloads"]) => updateContent((next) => void (next.registration.downloads = nextItems));
  return (
    <Panel title={label(lang, "ثبت‌نام، فرم‌ها و دانلودها", "Registration, forms, and downloads")} body={label(lang, "متن فرم درخواست و فایل‌های محلی را همراه با منبع رسمی مدیریت کنید.", "Manage inquiry copy and keep local files aligned with their official sources.")}>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "برچسب بخش", "Section kicker")} value={content.registration.kicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.registration.kicker = value))} />
        <Field label={label(lang, "عنوان ثبت‌نام", "Registration title")} value={content.registration.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.registration.title = value))} />
        <TextArea label={label(lang, "متن معرفی ثبت‌نام", "Registration body")} value={content.registration.body} dir={content.dir} onChange={(value) => updateContent((next) => void (next.registration.body = value))} />
        <Field label={label(lang, "عنوان فرم", "Form title")} value={content.registration.formTitle} dir={content.dir} onChange={(value) => updateContent((next) => void (next.registration.formTitle = value))} />
      </div>

      <ContentCollection title={label(lang, "برچسب‌های فرم درخواست", "Inquiry form labels")}>
        <div className="grid gap-4 lg:grid-cols-2">
          {(Object.keys(content.registration.fields) as Array<keyof SiteContent["registration"]["fields"]>).map((field) => (
            <Field key={field} label={field} value={content.registration.fields[field]} dir={content.dir} onChange={(value) => updateContent((next) => void (next.registration.fields[field] = value))} />
          ))}
        </div>
      </ContentCollection>

      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.href}-${index}`} removeLabel={label(lang, "حذف فایل", "Remove file")} confirmMessage={label(lang, `فایل «${item.label}» از پیش‌نویس حذف شود؟`, `Remove “${item.label}” from this draft?`)} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label={label(lang, "عنوان", "Label")} value={item.label} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, label: value } : entry)))} />
            <SelectField label={label(lang, "دسته‌بندی", "Category")} value={item.category} options={[{ value: "form", label: label(lang, "فرم", "Form") }, { value: "participants", label: label(lang, "مشارکت‌کنندگان", "Participants") }, { value: "equipment", label: label(lang, "تجهیزات", "Equipment") }]} onChange={(value) => updateItems(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, category: value as typeof item.category } : entry))} />
            <Field label={label(lang, "مسیر فایل محلی", "Local file path")} value={item.href} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
            <Field label={label(lang, "منبع رسمی", "Official source")} value={item.sourceHref} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, sourceHref: value } : entry)))} />
            <Field label={label(lang, "نام فایل", "File name")} value={item.fileName} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, fileName: value } : entry)))} />
            <Field label={label(lang, "نوع فایل", "Type")} value={item.type} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, type: value } : entry)))} />
            <Field label={label(lang, "حجم فایل", "Size")} value={item.size} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, size: value } : entry)))} />
            <TextArea label={label(lang, "توضیح فایل", "Description")} value={item.description} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, description: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label={label(lang, "افزودن فایل", "Add file")} onClick={() => updateItems([...items, makeItem()])} />
      </div>
    </Panel>
  );
}

function GalleryEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  const lang = content.lang;
  const items = content.gallery.items;
  const updateItems = (nextItems: SiteContent["gallery"]["items"]) => updateContent((next) => void (next.gallery.items = nextItems));
  return (
    <Panel title={label(lang, "گالری", "Gallery")} body={label(lang, "عنوان بخش، تصاویر، توضیح دسترس‌پذیری و زیرنویس‌ها را مدیریت کنید.", "Manage the section copy, images, accessible alt text, and captions.")}>
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "برچسب بخش", "Section kicker")} value={content.gallery.kicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.gallery.kicker = value))} />
        <Field label={label(lang, "عنوان گالری", "Gallery title")} value={content.gallery.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.gallery.title = value))} />
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.src}-${index}`} removeLabel={label(lang, "حذف تصویر", "Remove image")} confirmMessage={label(lang, `تصویر «${item.caption}» از پیش‌نویس حذف شود؟`, `Remove “${item.caption}” from this draft?`)} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label={label(lang, "مسیر تصویر", "Image path")} value={item.src} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, src: value } : entry)))} />
            <Field label={label(lang, "توضیح تصویر", "Alt text")} value={item.alt} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, alt: value } : entry)))} />
            <Field label={label(lang, "زیرنویس", "Caption")} value={item.caption} dir={content.dir} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, caption: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label={label(lang, "افزودن تصویر", "Add gallery item")} onClick={() => updateItems([...items, { src: "/gallery/archive-07.jpg", alt: label(lang, "تصویر جدید گالری", "New gallery image"), caption: label(lang, "تصویر جدید", "New image") }])} />
      </div>
    </Panel>
  );
}

function ContactEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  const lang = content.lang;
  return (
    <Panel title={label(lang, "نقشه و تماس", "Map and contact")} body={label(lang, "عنوان‌ها، نشانی، تلفن‌ها و پیوندهای نقشه را در یک محل مدیریت کنید.", "Manage labels, address, phone numbers, Google Maps links, and embed details in one place.")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "برچسب بخش", "Section kicker")} value={content.contact.kicker} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.kicker = value))} />
        <Field label={label(lang, "عنوان بخش", "Section title")} value={content.contact.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.title = value))} />
        <Field label={label(lang, "نام مکان", "Place name")} value={content.contact.placeName} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.placeName = value))} />
        <Field label={label(lang, "برچسب نشانی", "Address label")} value={content.contact.addressLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.addressLabel = value))} />
        <Field label={label(lang, "نشانی", "Address")} value={content.contact.address} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.address = value))} />
        <Field label={label(lang, "برچسب ایمیل", "Email label")} value={content.contact.emailLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.emailLabel = value))} />
        <Field label={label(lang, "برچسب تلفن", "Phone label")} value={content.contact.phoneLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.phoneLabel = value))} />
        <Field label={label(lang, "برچسب نقشه", "Map label")} value={content.contact.mapLabel} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.mapLabel = value))} />
        <Field label={label(lang, "تلفن‌ها، جداشده با ویرگول", "Phones, comma separated")} value={content.contact.phones.join(", ")} onChange={(value) => updateContent((next) => void (next.contact.phones = value.split(",").map((phone) => phone.trim()).filter(Boolean)))} />
        <Field label={label(lang, "کد پلاس", "Plus code")} value={content.contact.plusCode} onChange={(value) => updateContent((next) => void (next.contact.plusCode = value))} />
        <Field label={label(lang, "نشانی Google Maps", "Google Maps URL")} value={content.contact.mapsUrl} onChange={(value) => updateContent((next) => void (next.contact.mapsUrl = value))} />
        <Field label={label(lang, "نشانی مسیریابی", "Directions URL")} value={content.contact.directionsUrl} onChange={(value) => updateContent((next) => void (next.contact.directionsUrl = value))} />
        <TextArea label={label(lang, "نشانی نمایش نقشه", "Embed URL")} value={content.contact.mapEmbedUrl} rows={3} onChange={(value) => updateContent((next) => void (next.contact.mapEmbedUrl = value))} />
      </div>
    </Panel>
  );
}

function PublishingPanel({
  lang,
  token,
  setToken,
  changeSummary,
  setChangeSummary,
  rawJson,
  setRawJson,
  applyRawJson,
  saveLocal,
  resetLocal,
  exportJson,
  publishDraft,
}: {
  lang: Lang;
  token: string;
  setToken: (value: string) => void;
  changeSummary: string;
  setChangeSummary: (value: string) => void;
  rawJson: string;
  setRawJson: (value: string) => void;
  applyRawJson: () => void;
  saveLocal: () => void;
  resetLocal: () => void;
  exportJson: (scope: "active" | "all") => void;
  publishDraft: () => Promise<void>;
}) {
  return (
    <Panel title={label(lang, "انتشار و ویرایش پیشرفته", "Publishing and advanced editing")} body={label(lang, "پیش‌نویس محلی امن و قابل بازگشت است. انتشار روی سایت اصلی به توکن سمت سرور و وب‌هوک ذخیره‌سازی نیاز دارد.", "Local drafts are safe and reversible. Production publishing requires a configured server-side token and persistence webhook.")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label={label(lang, "توکن مدیر", "Admin token")} value={token} onChange={setToken} type="password" />
        <Field label={label(lang, "خلاصه تغییر", "Change summary")} value={changeSummary} dir={lang === "fa" ? "rtl" : "ltr"} onChange={setChangeSummary} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={saveLocal} className="liquid-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black">
          <Save size={17} />
          {label(lang, "ذخیره پیش‌نویس محلی", "Save local draft")}
        </button>
        <button type="button" onClick={() => exportJson("active")} className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
          <Download className="me-2 inline-block" size={17} />
          {label(lang, "خروجی زبان فعال", "Export active language")}
        </button>
        <button type="button" onClick={() => exportJson("all")} className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
          <Download className="me-2 inline-block" size={17} />
          {label(lang, "خروجی همه زبان‌ها", "Export all")}
        </button>
        <button type="button" onClick={() => void publishDraft()} className="rounded-2xl border border-emerald-200/20 bg-emerald-200/10 px-4 py-3 text-sm font-black text-white">
          <ExternalLink className="me-2 inline-block" size={17} />
          {label(lang, "انتشار از مسیر امن", "Publish through backend")}
        </button>
        <button type="button" onClick={resetLocal} className="rounded-2xl border border-red-200/18 bg-red-200/8 px-4 py-3 text-sm font-black text-red-100">
          {label(lang, "بازنشانی پیش‌نویس", "Reset local draft")}
        </button>
      </div>
      <div className="mt-7">
        <TextArea label={label(lang, "JSON پیشرفته زبان انتخاب‌شده", "Raw selected-language JSON")} value={rawJson} rows={18} onChange={setRawJson} />
        <button type="button" onClick={applyRawJson} className="mt-3 rounded-2xl border border-cyan-200/25 bg-cyan-200/10 px-4 py-3 text-sm font-black text-white">
          {label(lang, "اعمال JSON", "Apply raw JSON")}
        </button>
      </div>
    </Panel>
  );
}

function EditableCard({ children, onRemove, removeLabel = "Remove", confirmMessage = "Remove this item from the current draft?" }: { children: ReactNode; onRemove: () => void; removeLabel?: string; confirmMessage?: string }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => { if (window.confirm(confirmMessage)) onRemove(); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200/18 bg-red-200/8 px-3 py-2 text-xs font-black text-red-100">
          <Trash2 size={15} />
          {removeLabel}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{children}</div>
    </article>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/24 bg-cyan-200/10 px-4 py-3 text-sm font-black text-white">
      <Plus size={17} />
      {label}
    </button>
  );
}
