import "server-only";
import { getExhibitionSeries } from "@/data/exhibition-series";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { fromWebsiteRows, mergeCalendar, type CalendarLang, type PublicExhibition, type WebsiteExhibitionRow } from "@/lib/public-calendar";

/**
 * Upcoming exhibitions for the public website.
 *
 * Reads the narrow website_exhibitions view with the publishable key (anon
 * role), refreshed every ten minutes. Without Supabase settings, or if the
 * request fails, only the recurring series are shown, all as "dates to be
 * announced".
 */
export async function getUpcomingExhibitions(lang: CalendarLang): Promise<{ items: PublicExhibition[]; live: boolean }> {
  const series = getExhibitionSeries(lang);
  const config = getSupabaseConfig();
  if (!config) return { items: series, live: false };
  try {
    const res = await fetch(`${config.url}/rest/v1/website_exhibitions?select=*&order=starts_on.asc.nullslast`, {
      headers: { apikey: config.publishableKey },
      next: { revalidate: 600, tags: ["website-exhibitions"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { items: series, live: false };
    const rows = (await res.json()) as WebsiteExhibitionRow[];
    return { items: mergeCalendar(fromWebsiteRows(rows, lang), series), live: true };
  } catch {
    return { items: series, live: false };
  }
}
