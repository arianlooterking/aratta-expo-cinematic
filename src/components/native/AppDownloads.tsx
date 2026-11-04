import { Download, Globe } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/lang";
import { formatSize, type AppRelease } from "@/lib/native/releases";
import { QrCode } from "./QrCode";

/**
 * Download cards for the Android and iPhone staff apps. Used on the public
 * page (/fa/app) and inside the staff portal (/fa/staff/app); `tone` picks the
 * site's dark styling or the portal's light / dark tokens.
 */

type Tone = "site" | "portal";

const tones = {
  site: {
    card: "rounded-3xl border border-white/15 bg-white/[0.03] p-5 sm:p-6",
    mark: "bg-white/10 text-white",
    title: "text-white",
    muted: "text-white/65",
    faint: "text-white/50",
    primary: "bg-[var(--gold)] text-black hover:brightness-110",
    secondary: "border border-white/20 text-white hover:border-white/40",
    step: "bg-white/10 text-[var(--gold)]",
    pending: "border border-dashed border-white/20 text-white/70",
    pill: "bg-white/10 text-white/80",
    code: "bg-white/10",
    divider: "border-white/10",
  },
  portal: {
    card: "rounded-2xl border border-p-line bg-p-surface p-5 shadow-[var(--p-shadow)] sm:p-6",
    mark: "bg-p-brand-soft text-p-brand",
    title: "text-p-ink",
    muted: "text-p-ink-2",
    faint: "text-p-ink-3",
    primary: "bg-p-brand text-p-brand-ink hover:opacity-90",
    secondary: "border border-p-line text-p-ink hover:border-p-line-strong",
    step: "bg-p-brand-soft text-p-brand",
    pending: "border border-dashed border-p-line text-p-ink-2",
    pill: "bg-p-sunken text-p-ink-2",
    code: "bg-p-sunken",
    divider: "border-p-line",
  },
} satisfies Record<Tone, Record<string, string>>;

function AndroidMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52ZM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
    </svg>
  );
}

function AppleMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M16.37 12.73c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.82 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.29-1.27 3.14-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.72-4.11ZM13.8 5.1c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.76-1.24 1.99-1.09 3.16 1.15.09 2.33-.58 3.05-1.44Z" />
    </svg>
  );
}

const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

function releaseDetails(release: AppRelease, lang: Lang) {
  if (release.status !== "ready") return null;
  const fa = lang === "fa";
  const parts: string[] = [];
  if (release.version) parts.push(fa ? `نسخه ${faDigits(release.version)}` : `Version ${release.version}`);
  if (release.size) parts.push(formatSize(release.size, lang));
  if (release.updatedAt) {
    const date = new Intl.DateTimeFormat(fa ? "fa-IR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(release.updatedAt),
    );
    parts.push(fa ? `به‌روزرسانی ${date}` : `Updated ${date}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** Settings paths are English on most phones; keep them left-to-right inside Persian text. */
function Path({ children }: { children: string }) {
  return (
    <bdi dir="ltr" className="font-medium">
      {children}
    </bdi>
  );
}

type CardProps = {
  tone: Tone;
  lang: Lang;
  mark: ReactNode;
  name: string;
  subtitle: string;
  details: string | null;
  action: { href: string; label: string; download?: boolean } | null;
  qr: { value: string; caption: string } | null;
  intro?: ReactNode;
  steps: ReactNode[];
  note?: ReactNode;
  pendingText: string;
};

function PlatformCard({ tone, lang, mark, name, subtitle, details, action, qr, intro, steps, note, pendingText }: CardProps) {
  const s = tones[tone];
  const fa = lang === "fa";
  return (
    <section className={cn(s.card, "flex flex-col gap-5")} aria-label={name}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", s.mark)}>{mark}</span>
        <div className="min-w-0">
          <h2 className={cn("text-lg font-bold leading-tight", s.title)}>{name}</h2>
          <p className={cn("text-sm", s.faint)}>{subtitle}</p>
        </div>
      </div>

      {action ? (
        <div className="flex items-center gap-5">
          <div className="grid min-w-0 flex-1 gap-2">
            <a
              href={action.href}
              {...(action.download ? { download: "" } : { target: "_blank", rel: "noreferrer" })}
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold transition",
                s.primary,
              )}
            >
              <Download aria-hidden className="size-5" />
              {action.label}
            </a>
            {details ? <p className={cn("text-xs", s.faint)}>{details}</p> : null}
          </div>
          {qr ? (
            <figure className="hidden shrink-0 text-center lg:block">
              <QrCode value={qr.value} label={qr.caption} className="size-28 rounded-xl" />
              <figcaption className={cn("mt-1.5 max-w-28 text-[11px] leading-snug", s.faint)}>{qr.caption}</figcaption>
            </figure>
          ) : null}
        </div>
      ) : (
        <p className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed", s.pending)}>{pendingText}</p>
      )}

      {intro ? <p className={cn("text-sm leading-7", s.muted)}>{intro}</p> : null}
      <ol className="grid gap-3">
        {steps.map((step, i) => (
          <li key={i} className={cn("flex gap-3 text-sm leading-7", s.muted)}>
            <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", s.step)}>
              {fa ? faDigits(String(i + 1)) : i + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
      {note ? <p className={cn("mt-auto border-t pt-4 text-xs leading-6", s.divider, s.faint)}>{note}</p> : null}
    </section>
  );
}

export function AppDownloads({
  lang,
  tone,
  android,
  ios,
  testflightUrl,
  portalHref,
}: {
  lang: Lang;
  tone: Tone;
  android: AppRelease;
  ios: AppRelease;
  /** Public TestFlight invite, once the Apple account exists (IOS_TESTFLIGHT_URL). */
  testflightUrl: string | null;
  /** Shown as "use it in the browser instead"; omit inside the portal. */
  portalHref?: string;
}) {
  const fa = lang === "fa";
  const s = tones[tone];
  const androidUrl = android.status === "pending" ? null : android.url;
  const iosUrl = ios.status === "pending" ? null : ios.url;

  const androidCard = (
    <PlatformCard
      tone={tone}
      lang={lang}
      mark={<AndroidMark className="size-7" />}
      name={fa ? "اندروید" : "Android"}
      subtitle={fa ? "برای همه گوشی‌های اندروید ۷ به بالا" : "For Android 7 and later"}
      details={releaseDetails(android, lang)}
      action={androidUrl ? { href: androidUrl, label: fa ? "دانلود برای اندروید" : "Download for Android", download: true } : null}
      qr={androidUrl ? { value: androidUrl, caption: fa ? "با دوربین گوشی اسکن کنید" : "Scan with the phone camera" } : null}
      steps={
        fa
          ? [
              "این صفحه را روی گوشی باز کنید و «دانلود برای اندروید» را بزنید، یا کد را با دوربین گوشی اسکن کنید.",
              "فایل دانلودشده را باز کنید. اگر گوشی پرسید، اجازه نصب از مرورگر («نصب برنامه‌های ناشناس») را بدهید.",
              "Aratta Staff را باز کنید و با حساب کاری Google یا Apple وارد شوید.",
            ]
          : [
              "Open this page on the phone and tap “Download for Android”, or scan the code with the phone camera.",
              "Open the downloaded file. If the phone asks, allow your browser to install apps (“Install unknown apps”).",
              "Open Aratta Staff and sign in with your work Google or Apple account.",
            ]
      }
      note={
        fa
          ? "برای به‌روزرسانی، نسخه تازه را از همین صفحه دانلود و روی برنامه قبلی نصب کنید؛ از حساب خارج نمی‌شوید."
          : "To update, download the new version from this page and install it over the old one. You stay signed in."
      }
      pendingText={
        fa
          ? "نسخه اندروید در حال آماده‌سازی است و به‌محض انتشار، همین‌جا قرار می‌گیرد."
          : "The Android version is being prepared and will appear here as soon as it’s published."
      }
    />
  );

  const iosCard = testflightUrl ? (
    <PlatformCard
      tone={tone}
      lang={lang}
      mark={<AppleMark className="size-7" />}
      name={fa ? "آیفون" : "iPhone"}
      subtitle={fa ? "برای iOS ۱۵ به بالا، از طریق TestFlight" : "For iOS 15 and later, through TestFlight"}
      details={null}
      action={{ href: testflightUrl, label: fa ? "نصب با TestFlight" : "Install with TestFlight" }}
      qr={{ value: testflightUrl, caption: fa ? "با دوربین آیفون اسکن کنید" : "Scan with the iPhone camera" }}
      steps={
        fa
          ? [
              "برنامه TestFlight را از App Store نصب کنید.",
              "این لینک را روی آیفون باز کنید و «Accept» و سپس «Install» را بزنید.",
              "Aratta Staff را باز کنید و با حساب کاری Google یا Apple وارد شوید.",
            ]
          : [
              "Install the TestFlight app from the App Store.",
              "Open this link on the iPhone, tap Accept, then Install.",
              "Open Aratta Staff and sign in with your work Google or Apple account.",
            ]
      }
      note={fa ? "نسخه‌های تازه از طریق TestFlight خودکار می‌رسند." : "New versions arrive through TestFlight automatically."}
      pendingText=""
    />
  ) : (
    <PlatformCard
      tone={tone}
      lang={lang}
      mark={<AppleMark className="size-7" />}
      name={fa ? "آیفون" : "iPhone"}
      subtitle={fa ? "برای iOS ۱۵ به بالا" : "For iOS 15 and later"}
      details={releaseDetails(ios, lang)}
      action={iosUrl ? { href: iosUrl, label: fa ? "دانلود فایل نصب آیفون" : "Download for iPhone (.ipa)", download: true } : null}
      qr={null}
      intro={
        fa
          ? "آیفون فقط از App Store یا TestFlight برنامه نصب می‌کند. تا آماده شدن دعوت TestFlight، این فایل را با یک ابزار رایگان از روی کامپیوتر Mac یا Windows نصب کنید:"
          : "iPhones only install apps from the App Store or TestFlight. Until our TestFlight invite is ready, install this file from a Mac or Windows computer with a free tool:"
      }
      steps={
        fa
          ? [
              <>روی کامپیوتر، فایل aratta-staff.ipa را دانلود و برنامه Sideloadly را از <Path>sideloadly.io</Path> نصب کنید.</>,
              "آیفون را با کابل وصل کنید، فایل را داخل Sideloadly بکشید و با Apple ID خود وارد شوید.",
              <>
                روی آیفون به <Path>Settings › General › VPN &amp; Device Management</Path> بروید و به Apple ID خود اعتماد کنید.
                اگر خواست، <Path>Developer Mode</Path> را در <Path>Settings › Privacy &amp; Security</Path> روشن کنید.
              </>,
            ]
          : [
              <>On the computer, download aratta-staff.ipa and install Sideloadly from <Path>sideloadly.io</Path>.</>,
              "Connect the iPhone with a cable, drag the file into Sideloadly and sign in with your Apple ID.",
              <>
                On the iPhone, open <Path>Settings › General › VPN &amp; Device Management</Path> and trust your Apple ID. If asked,
                turn on <Path>Developer Mode</Path> in <Path>Settings › Privacy &amp; Security</Path>.
              </>,
            ]
      }
      note={
        fa
          ? "با Apple ID رایگان، برنامه هر ۷ روز باید دوباره با Sideloadly نصب شود (AltStore این کار را خودکار انجام می‌دهد). اعلان‌ها در آیفون با نسخه TestFlight فعال می‌شوند."
          : "With a free Apple ID the app has to be reinstalled with Sideloadly every 7 days (AltStore can do it automatically). Notifications on iPhone come with the TestFlight version."
      }
      pendingText={
        fa
          ? "نسخه آیفون در حال آماده‌سازی است و به‌محض انتشار، همین‌جا قرار می‌گیرد."
          : "The iPhone version is being prepared and will appear here as soon as it’s published."
      }
    />
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        {androidCard}
        {iosCard}
      </div>
      {portalHref ? (
        <div className={cn(s.card, "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
          <div className="flex items-start gap-3">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s.mark)}>
              <Globe aria-hidden className="size-5" />
            </span>
            <p className={cn("text-sm leading-7", s.muted)}>
              {fa
                ? "بدون نصب هم می‌شود: پورتال کارکنان در مرورگر هر گوشی و کامپیوتری باز می‌شود."
                : "No install needed to get started: the staff portal also works in any phone or computer browser."}
            </p>
          </div>
          <a
            href={portalHref}
            className={cn("inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition", s.secondary)}
          >
            {fa ? "باز کردن پورتال در مرورگر" : "Open the portal in the browser"}
          </a>
        </div>
      ) : null}
    </div>
  );
}
