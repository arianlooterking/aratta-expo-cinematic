"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileDown,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
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
  type Exhibition,
  type NewsItem,
  type RelatedNewsItem,
  type SiteContent,
} from "@/data/aratta-content";
import type { Lang } from "@/lib/lang";

type AdminTab = "overview" | "news" | "related" | "exhibitions" | "downloads" | "gallery" | "contact" | "publishing";
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

const tabs: Array<{ id: AdminTab; label: string; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "news", label: "Official News", icon: Newspaper },
  { id: "related", label: "Related News", icon: Newspaper },
  { id: "exhibitions", label: "Exhibitions", icon: Database },
  { id: "downloads", label: "Downloads", icon: FileDown },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  { id: "contact", label: "Map & Contact", icon: MapPin },
  { id: "publishing", label: "Publish", icon: Settings },
];

function cloneContent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStoredDrafts() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Record<Lang, SiteContent>;
    if (parsed.fa?.lang === "fa" && parsed.en?.lang === "en") {
      return parsed;
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

export function AdminPanel() {
  const [activeLang, setActiveLang] = useState<Lang>("fa");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [drafts, setDrafts] = useState<Record<Lang, SiteContent>>(() => readStoredDrafts() ?? cloneContent(contentByLang));
  const [rawOverrides, setRawOverrides] = useState<Partial<Record<Lang, string>>>({});
  const [token, setToken] = useState("");
  const [changeSummary, setChangeSummary] = useState("Content update from Aratta admin panel");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(() =>
    readStoredDrafts() ? { tone: "ok", text: "Local draft restored from this browser." } : null,
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
    setMessage({ tone: "ok", text: "Draft saved in this browser. This does not change production." });
  }

  function resetLocal() {
    const fresh = cloneContent(contentByLang);
    setDrafts(fresh);
    window.localStorage.removeItem(STORAGE_KEY);
    setMessage({ tone: "warn", text: "Local draft reset to bundled site content." });
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
        setMessage({ tone: "error", text: "Raw JSON language must match the selected language." });
        return;
      }
      updateContent((next) => Object.assign(next, parsed));
      setRawOverrides((current) => {
        const next = { ...current };
        delete next[activeLang];
        return next;
      });
      setMessage({ tone: "ok", text: "Raw JSON applied to the selected language draft." });
    } catch {
      setMessage({ tone: "error", text: "Raw JSON is invalid." });
    }
  }

  async function publishDraft() {
    setMessage({ tone: "warn", text: "Sending draft to the configured admin backend..." });
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

  return (
    <main dir="ltr" lang="en" className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,220,232,0.12),transparent_34rem),linear-gradient(180deg,#020405,#071012_54%,#020405)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="glass flex flex-col gap-5 rounded-[2rem] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-latin text-xs font-black uppercase tracking-[0.28em] text-[var(--cyan)]">
              Aratta Admin / Content Operations
            </div>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Admin panel for the live expo site</h1>
            <p className="site-copy mt-3 text-white/62">
              Edit bilingual drafts, prepare related news, manage downloads, and publish only through a configured secure backend.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/fa" className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
              Persian site
            </Link>
            <Link href="/en" className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
              English site
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
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-5">
            <StatusStrip status={status} health={contentHealth} message={message} />
            {activeTab === "overview" ? <OverviewEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "news" ? (
              <NewsEditor
                title="Official news archive"
                items={content.news.items}
                makeItem={() => makeNewsItem(activeLang)}
                updateItems={(items) => updateContent((next) => void (next.news.items = items))}
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
            {activeTab === "downloads" ? <DownloadsEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "gallery" ? <GalleryEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "contact" ? <ContactEditor content={content} updateContent={updateContent} /> : null}
            {activeTab === "publishing" ? (
              <PublishingPanel
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
    </main>
  );
}

function StatusStrip({
  status,
  health,
  message,
}: {
  status: AdminStatus | null;
  health: { passed: number; total: number };
  message: { tone: "ok" | "warn" | "error"; text: string } | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="industrial-card rounded-[1.4rem] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          {status?.configured ? <CheckCircle2 className="text-[var(--success)]" size={18} /> : <AlertTriangle className="text-[var(--gold)]" size={18} />}
          Backend
        </div>
        <p className="mt-2 text-sm leading-6 text-white/58">
          {status?.configured ? "Production publish endpoint configured." : "Draft mode until admin env vars are configured."}
        </p>
      </div>
      <div className="industrial-card rounded-[1.4rem] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <Database className="text-[var(--cyan)]" size={18} />
          Content health
        </div>
        <p className="mt-2 text-sm leading-6 text-white/58">
          {health.passed}/{health.total} structural checks passing for selected language.
        </p>
      </div>
      <div className="industrial-card rounded-[1.4rem] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <KeyRound className="text-[var(--gold)]" size={18} />
          Status
        </div>
        <p className={["mt-2 text-sm leading-6", message?.tone === "error" ? "text-red-200" : message?.tone === "ok" ? "text-emerald-200" : "text-white/58"].join(" ")}>
          {message?.text ?? "No changes have been submitted in this session."}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl" | "ltr";
  type?: "text" | "password";
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-white/44">{label}</span>
      <input
        type={type}
        dir={dir}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/12 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-200/45"
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

function OverviewEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  return (
    <Panel title="Core copy" body="Fast edits for brand, hero, about, service positioning, and footer copy.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Brand" value={content.brand} dir={content.dir} onChange={(value) => updateContent((next) => void (next.brand = value))} />
        <Field label="Hero title" value={content.hero.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.title = value))} />
        <TextArea label="Hero subtitle" value={content.hero.subtitle} dir={content.dir} onChange={(value) => updateContent((next) => void (next.hero.subtitle = value))} />
        <TextArea label="About body" value={content.about.body} dir={content.dir} onChange={(value) => updateContent((next) => void (next.about.body = value))} />
        <Field label="Services title" value={content.services.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.services.title = value))} />
        <Field label="Footer credit" value={content.footer.credit} dir={content.dir} onChange={(value) => updateContent((next) => void (next.footer.credit = value))} />
      </div>
    </Panel>
  );
}

function NewsEditor({
  title,
  items,
  makeItem,
  updateItems,
}: {
  title: string;
  items: NewsItem[];
  makeItem: () => NewsItem;
  updateItems: (items: NewsItem[]) => void;
}) {
  return (
    <Panel title={title} body="Add, edit, remove, and source-check news entries.">
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.title}-${index}`} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label="Date" value={item.date} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, date: value } : entry)))} />
            <Field label="Title" value={item.title} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, title: value } : entry)))} />
            <TextArea label="Body" value={item.body} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, body: value } : entry)))} />
            <Field label="Source URL" value={item.href ?? ""} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label="Add news item" onClick={() => updateItems([...items, makeItem()])} />
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
  const items = content.news.relatedItems;
  const updateItems = (nextItems: RelatedNewsItem[]) => updateContent((next) => void (next.news.relatedItems = nextItems));
  return (
    <Panel title="Related news hub" body="Manage the dedicated related-news page and the home preview cards.">
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Field label="Section title" value={content.news.relatedTitle} dir={content.dir} onChange={(value) => updateContent((next) => void (next.news.relatedTitle = value))} />
        <Field label="Kicker" value={content.news.relatedKicker} onChange={(value) => updateContent((next) => void (next.news.relatedKicker = value))} />
        <TextArea label="Section body" value={content.news.relatedBody} dir={content.dir} onChange={(value) => updateContent((next) => void (next.news.relatedBody = value))} />
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.title}-${index}`} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label="Date" value={item.date} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, date: value } : entry)))} />
            <Field label="Sector" value={item.sector} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, sector: value } : entry)))} />
            <Field label="Title" value={item.title} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, title: value } : entry)))} />
            <Field label="Image path" value={item.image} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, image: value } : entry)))} />
            <TextArea label="Body" value={item.body} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, body: value } : entry)))} />
            <Field label="Source" value={item.source} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, source: value } : entry)))} />
            <Field label="Source URL" value={item.href ?? ""} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label="Add related news" onClick={() => updateItems([...items, makeItem()])} />
      </div>
    </Panel>
  );
}

function ExhibitionsEditor({ content, updateContent, makeItem }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void; makeItem: () => Exhibition }) {
  const items = content.exhibitions.items;
  const updateItems = (nextItems: Exhibition[]) => updateContent((next) => void (next.exhibitions.items = nextItems));
  return (
    <Panel title="Exhibitions" body="Manage archived event cards. Dates remain archived until a fresh official calendar is provided.">
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Field label="Page title" value={content.exhibitions.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.exhibitions.title = value))} />
        <TextArea label="Archive note" value={content.exhibitions.note} dir={content.dir} onChange={(value) => updateContent((next) => void (next.exhibitions.note = value))} />
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.title}-${index}`} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label="Title" value={item.title} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, title: value } : entry)))} />
            <Field label="Date" value={item.date} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, date: value } : entry)))} />
            <Field label="Location" value={item.location} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, location: value } : entry)))} />
            <Field label="Image path" value={item.image} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, image: value } : entry)))} />
            <Field label="Official URL" value={item.href} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
            <TextArea label="Summary" value={item.summary} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, summary: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label="Add exhibition" onClick={() => updateItems([...items, makeItem()])} />
      </div>
    </Panel>
  );
}

function DownloadsEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  const items = content.registration.downloads;
  const updateItems = (nextItems: SiteContent["registration"]["downloads"]) => updateContent((next) => void (next.registration.downloads = nextItems));
  return (
    <Panel title="Downloads and forms" body="Keep direct local files and official source links aligned.">
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.href}-${index}`} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label="Label" value={item.label} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, label: value } : entry)))} />
            <Field label="Local href" value={item.href} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, href: value } : entry)))} />
            <Field label="Official source" value={item.sourceHref} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, sourceHref: value } : entry)))} />
            <Field label="File name" value={item.fileName} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, fileName: value } : entry)))} />
            <Field label="Type" value={item.type} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, type: value } : entry)))} />
            <Field label="Size" value={item.size} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, size: value } : entry)))} />
            <TextArea label="Description" value={item.description} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, description: value } : entry)))} />
          </EditableCard>
        ))}
      </div>
    </Panel>
  );
}

function GalleryEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  const items = content.gallery.items;
  const updateItems = (nextItems: SiteContent["gallery"]["items"]) => updateContent((next) => void (next.gallery.items = nextItems));
  return (
    <Panel title="Gallery" body="Manage homepage gallery images, alt text, and captions.">
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Field label="Gallery title" value={content.gallery.title} dir={content.dir} onChange={(value) => updateContent((next) => void (next.gallery.title = value))} />
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <EditableCard key={`${item.src}-${index}`} onRemove={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
            <Field label="Image src" value={item.src} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, src: value } : entry)))} />
            <Field label="Alt text" value={item.alt} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, alt: value } : entry)))} />
            <Field label="Caption" value={item.caption} onChange={(value) => updateItems(items.map((entry, itemIndex) => (itemIndex === index ? { ...entry, caption: value } : entry)))} />
          </EditableCard>
        ))}
        <AddButton label="Add gallery item" onClick={() => updateItems([...items, { src: "/gallery/archive-07.jpg", alt: "New gallery image", caption: "New image" }])} />
      </div>
    </Panel>
  );
}

function ContactEditor({ content, updateContent }: { content: SiteContent; updateContent: (updater: (next: SiteContent) => void) => void }) {
  return (
    <Panel title="Map and contact" body="Update address, phone numbers, Google Maps links, and map embed details.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Place name" value={content.contact.placeName} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.placeName = value))} />
        <Field label="Address" value={content.contact.address} dir={content.dir} onChange={(value) => updateContent((next) => void (next.contact.address = value))} />
        <Field label="Phones, comma separated" value={content.contact.phones.join(", ")} onChange={(value) => updateContent((next) => void (next.contact.phones = value.split(",").map((phone) => phone.trim()).filter(Boolean)))} />
        <Field label="Plus code" value={content.contact.plusCode} onChange={(value) => updateContent((next) => void (next.contact.plusCode = value))} />
        <Field label="Google Maps URL" value={content.contact.mapsUrl} onChange={(value) => updateContent((next) => void (next.contact.mapsUrl = value))} />
        <Field label="Directions URL" value={content.contact.directionsUrl} onChange={(value) => updateContent((next) => void (next.contact.directionsUrl = value))} />
        <TextArea label="Embed URL" value={content.contact.mapEmbedUrl} rows={3} onChange={(value) => updateContent((next) => void (next.contact.mapEmbedUrl = value))} />
      </div>
    </Panel>
  );
}

function PublishingPanel({
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
    <Panel title="Publishing and advanced editing" body="Local drafts are safe. Production publishing requires a configured server-side token and persistence webhook.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Admin token" value={token} onChange={setToken} type="password" />
        <Field label="Change summary" value={changeSummary} onChange={setChangeSummary} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={saveLocal} className="liquid-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black">
          <Save size={17} />
          Save local draft
        </button>
        <button type="button" onClick={() => exportJson("active")} className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
          <Download className="me-2 inline-block" size={17} />
          Export active language
        </button>
        <button type="button" onClick={() => exportJson("all")} className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/78">
          <Download className="me-2 inline-block" size={17} />
          Export all
        </button>
        <button type="button" onClick={() => void publishDraft()} className="rounded-2xl border border-emerald-200/20 bg-emerald-200/10 px-4 py-3 text-sm font-black text-white">
          <ExternalLink className="me-2 inline-block" size={17} />
          Publish through backend
        </button>
        <button type="button" onClick={resetLocal} className="rounded-2xl border border-red-200/18 bg-red-200/8 px-4 py-3 text-sm font-black text-red-100">
          Reset local draft
        </button>
      </div>
      <div className="mt-7">
        <TextArea label="Raw selected-language JSON" value={rawJson} rows={18} onChange={setRawJson} />
        <button type="button" onClick={applyRawJson} className="mt-3 rounded-2xl border border-cyan-200/25 bg-cyan-200/10 px-4 py-3 text-sm font-black text-white">
          Apply raw JSON
        </button>
      </div>
    </Panel>
  );
}

function EditableCard({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-2 rounded-xl border border-red-200/18 bg-red-200/8 px-3 py-2 text-xs font-black text-red-100">
          <Trash2 size={15} />
          Remove
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
