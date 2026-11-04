// Public exhibition calendar: pure helpers shared by the website pages and tests.
//
// Two sources feed the "upcoming" list:
// - live: exhibitions a manager listed on the website from the staff portal
//   (the website_exhibitions view in Supabase), with real dates;
// - series: Aratta's recurring exhibition series from the public archive. Their
//   next dates are not announced, so they are always shown as "dates to be
//   announced" and never with an invented date.

export type CalendarLang = "fa" | "en";

export type CalendarStatus = "postponed" | "dates-tba" | "scheduled" | "registration-open" | "live" | "past";

export type PublicExhibition = {
  key: string;
  source: "live" | "series";
  name: string;
  summary: string;
  city: string;
  venue: string;
  /** ISO day, e.g. 2027-05-10. Null while dates are not announced. */
  startsOn: string | null;
  endsOn: string | null;
  registrationOpen: boolean;
  sectors: string[];
  color: string;
  image: string;
  /** The last published edition, as text, for series without new dates. */
  lastEdition?: string;
  /** Official notice about the next edition, e.g. a postponement. */
  notice?: string;
  postponed?: boolean;
  sourceHref?: string;
};

/** A row of the public.website_exhibitions view. */
export type WebsiteExhibitionRow = {
  id: string | null;
  slug: string | null;
  name_fa: string | null;
  name_en: string | null;
  edition: number | null;
  year_label: string | null;
  venue_fa: string | null;
  venue_en: string | null;
  city_fa: string | null;
  city_en: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: string | null;
  color: string | null;
  registration_open: boolean | null;
  website_summary_fa: string | null;
  website_summary_en: string | null;
};

const DAY = 86_400_000;

function dayStart(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function todayUtc(now: Date) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function calendarStatus(e: Pick<PublicExhibition, "startsOn" | "endsOn" | "registrationOpen" | "postponed">, now = new Date()): CalendarStatus {
  if (!e.startsOn) return e.postponed ? "postponed" : "dates-tba";
  const today = todayUtc(now);
  const start = dayStart(e.startsOn);
  const end = dayStart(e.endsOn ?? e.startsOn);
  if (today > end) return "past";
  if (today >= start) return "live";
  return e.registrationOpen ? "registration-open" : "scheduled";
}

/** Whole days until the first show day; 0 on the day, negative after. */
export function daysToOpen(startsOn: string, now = new Date()) {
  return Math.round((dayStart(startsOn) - todayUtc(now)) / DAY);
}

const pick = (lang: CalendarLang, fa: string | null | undefined, en: string | null | undefined) =>
  (lang === "fa" ? fa || en : en || fa) ?? "";

/** Turns website_exhibitions rows into calendar entries; drops past and broken rows. */
export function fromWebsiteRows(rows: readonly WebsiteExhibitionRow[], lang: CalendarLang, now = new Date()): PublicExhibition[] {
  const out: PublicExhibition[] = [];
  for (const r of rows) {
    if (!r.slug || !r.name_fa) continue;
    if (r.status === "archived" || r.status === "closed") continue;
    const base = pick(lang, r.name_fa, r.name_en);
    const year = r.year_label ? ` ${r.year_label}` : "";
    const entry: PublicExhibition = {
      key: r.slug,
      source: "live",
      name: `${base}${year}`.trim(),
      summary: pick(lang, r.website_summary_fa, r.website_summary_en),
      city: pick(lang, r.city_fa, r.city_en),
      venue: pick(lang, r.venue_fa, r.venue_en),
      startsOn: r.starts_on,
      endsOn: r.ends_on ?? r.starts_on,
      registrationOpen: Boolean(r.registration_open),
      sectors: [],
      color: r.color || "#c8a25a",
      image: "/official-archive/kimex-2025-web-scaled.jpg",
    };
    if (calendarStatus(entry, now) === "past") continue;
    out.push(entry);
  }
  return out;
}

/** Live listings first, by opening day; then the series without announced dates. */
export function mergeCalendar(live: readonly PublicExhibition[], series: readonly PublicExhibition[]) {
  const dated = [...live].sort((a, b) => (a.startsOn ?? "9999").localeCompare(b.startsOn ?? "9999"));
  return [...dated, ...series];
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(lang: CalendarLang, opts: Intl.DateTimeFormatOptions) {
  const key = lang + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB", { timeZone: "UTC", ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

/** "۱۸ تا ۲۱ اردیبهشت ۱۴۰۶" / "8–11 May 2027". */
export function dateRange(lang: CalendarLang, startsOn: string, endsOn: string | null) {
  const s = new Date(dayStart(startsOn));
  const e = new Date(dayStart(endsOn ?? startsOn));
  const full = fmt(lang, { day: "numeric", month: "long", year: "numeric" });
  if (s.getTime() === e.getTime()) return full.format(s);
  const sameMonth = fmt(lang, { month: "long", year: "numeric" }).format(s) === fmt(lang, { month: "long", year: "numeric" }).format(e);
  if (sameMonth) {
    const d = fmt(lang, { day: "numeric" });
    return lang === "fa" ? `${d.format(s)} تا ${full.format(e)}` : `${d.format(s)}–${full.format(e)}`;
  }
  const dm = fmt(lang, { day: "numeric", month: "long" });
  return lang === "fa" ? `${dm.format(s)} تا ${full.format(e)}` : `${dm.format(s)} – ${full.format(e)}`;
}

const compactDay = (iso: string) => iso.slice(0, 10).replaceAll("-", "");
const nextDay = (iso: string) => new Date(dayStart(iso) + DAY).toISOString().slice(0, 10);

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** One all-day VEVENT calendar file for a dated exhibition. */
export function toIcs(e: PublicExhibition, url: string, stamp = new Date()) {
  if (!e.startsOn) return null;
  const end = e.endsOn ?? e.startsOn;
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const location = [e.venue, e.city].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aratta Expo//Exhibition calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.key}@arattaexpo.ir`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${compactDay(e.startsOn)}`,
    `DTEND;VALUE=DATE:${compactDay(nextDay(end))}`,
    `SUMMARY:${icsEscape(e.name)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    e.summary ? `DESCRIPTION:${icsEscape(e.summary)}` : null,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function icsHref(e: PublicExhibition, url: string, stamp = new Date()) {
  const ics = toIcs(e, url, stamp);
  return ics ? `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` : null;
}

export function googleCalendarHref(e: PublicExhibition) {
  if (!e.startsOn) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.name,
    dates: `${compactDay(e.startsOn)}/${compactDay(nextDay(e.endsOn ?? e.startsOn))}`,
    location: [e.venue, e.city].filter(Boolean).join(", "),
    details: e.summary,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Email draft to the office: booth inquiry when open, otherwise "tell me when dates are out". */
export function interestMailto(lang: CalendarLang, e: PublicExhibition, now = new Date()) {
  const status = calendarStatus(e, now);
  const fa = lang === "fa";
  const subject =
    status === "registration-open"
      ? fa ? `درخواست غرفه - ${e.name}` : `Booth inquiry - ${e.name}`
      : fa ? `اطلاع از زمان برگزاری - ${e.name}` : `Notify me about dates - ${e.name}`;
  const body = fa
    ? [`نمایشگاه: ${e.name}`, "نام و نام خانوادگی:", "نام شرکت:", "شماره تماس:", "متراژ تقریبی غرفه (متر مربع):", "توضیحات:"]
    : [`Exhibition: ${e.name}`, "Full name:", "Company:", "Phone:", "Approximate booth area (m²):", "Notes:"];
  return `mailto:info@arattaexpo.ir?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.join("\n"))}`;
}

export type CalendarCard = PublicExhibition & {
  status: CalendarStatus;
  dateText: string | null;
  daysToOpen: number | null;
  icsHref: string | null;
  googleHref: string | null;
  mailto: string;
};

/** Everything a card needs, worked out once on the server. */
export function toCards(items: readonly PublicExhibition[], lang: CalendarLang, pageUrl: string, now = new Date()): CalendarCard[] {
  return items
    .map((e) => {
      const status = calendarStatus(e, now);
      return {
        ...e,
        status,
        dateText: e.startsOn ? dateRange(lang, e.startsOn, e.endsOn) : null,
        daysToOpen: e.startsOn ? daysToOpen(e.startsOn, now) : null,
        icsHref: icsHref(e, pageUrl, now),
        googleHref: googleCalendarHref(e),
        mailto: interestMailto(lang, e, now),
      };
    })
    .filter((c) => c.status !== "past");
}
