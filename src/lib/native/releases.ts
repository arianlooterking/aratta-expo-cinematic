/**
 * Where the staff app installers live and how the download pages read them.
 *
 * CI publishes each platform to a fixed GitHub release (see
 * .github/workflows/mobile-*.yml and mobile/scripts/publish-release.sh), so the
 * download links never change while the file behind them is replaced by every
 * new build. The pages read the release once in a while to show the version,
 * size and date, and to say "coming soon" before the first build exists.
 *
 * No path aliases here so node tests can import this file directly.
 */

export const APP_REPO = "arianlooterking/aratta-expo-cinematic";

export const APP_RELEASES = {
  android: { tag: "android-app", file: "aratta-staff.apk" },
  ios: { tag: "ios-app", file: "aratta-staff.ipa" },
} as const;

export type AppPlatform = keyof typeof APP_RELEASES;

export type AppRelease =
  /** Published: link, plus whatever details GitHub reported. */
  | { status: "ready"; url: string; version: string | null; size: number | null; updatedAt: string | null }
  /** No build published yet. */
  | { status: "pending" }
  /** GitHub couldn't be asked (offline, rate limit): offer the link without details. */
  | { status: "unknown"; url: string };

export function downloadUrl(platform: AppPlatform) {
  const { tag, file } = APP_RELEASES[platform];
  return `https://github.com/${APP_REPO}/releases/download/${tag}/${file}`;
}

type GitHubAsset = { name?: unknown; size?: unknown; updated_at?: unknown; browser_download_url?: unknown };
type GitHubRelease = { name?: unknown; assets?: unknown };

/** Turns a GitHub "release by tag" response into what the download page shows. */
export function parseRelease(platform: AppPlatform, httpStatus: number, body: unknown): AppRelease {
  const url = downloadUrl(platform);
  if (httpStatus === 404) return { status: "pending" };
  if (httpStatus < 200 || httpStatus >= 300 || !body || typeof body !== "object") return { status: "unknown", url };
  const release = body as GitHubRelease;
  const assets = Array.isArray(release.assets) ? (release.assets as GitHubAsset[]) : [];
  const asset = assets.find((a) => a?.name === APP_RELEASES[platform].file);
  if (!asset) return { status: "pending" };
  const version = typeof release.name === "string" ? (release.name.match(/\d+\.\d+\.\d+/)?.[0] ?? null) : null;
  return {
    status: "ready",
    url: typeof asset.browser_download_url === "string" && asset.browser_download_url.startsWith("https://github.com/")
      ? asset.browser_download_url
      : url,
    version,
    size: typeof asset.size === "number" && asset.size > 0 ? asset.size : null,
    updatedAt: typeof asset.updated_at === "string" ? asset.updated_at : null,
  };
}

/** Reads one platform's release, cached for ten minutes. Never throws. */
export async function fetchAppRelease(platform: AppPlatform): Promise<AppRelease> {
  try {
    const res = await fetch(`https://api.github.com/repos/${APP_REPO}/releases/tags/${APP_RELEASES[platform].tag}`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "aratta-staff-downloads" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(4000),
    });
    return parseRelease(platform, res.status, res.ok ? await res.json() : null);
  } catch {
    return { status: "unknown", url: downloadUrl(platform) };
  }
}

/** "6.4 MB" / "۶٫۴ مگابایت" */
export function formatSize(bytes: number, lang: "fa" | "en") {
  const mb = bytes / (1024 * 1024);
  const value = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-GB", { maximumFractionDigits: 1 }).format(mb);
  return lang === "fa" ? `${value} مگابایت` : `${value} MB`;
}
