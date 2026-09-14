import archive from "../data/legacy-content.json" with { type: "json" };

const aliases: Record<string, string> = {
  ...archive.pathMap,
  "/about-us/": "/fa/about",
  "/news/": "/fa/news",
  "/photo-gallery/": "/fa/gallery",
  "/home-registration/": "/fa/registration",
  "/contact-us/": "/fa/contact",
  "/دهمین-نمایشگاه-بین-المللی-معدن،-صنایع/": "/fa/archive/5807",
};

export const legacyRedirectRules = [
  ...Object.entries(aliases).map(([source, destination]) => ({
    source: source.replace(/\/$/, "") || "/", destination, permanent: true,
  })),
  ...archive.assets.map(asset => ({
    source: decodeURIComponent(new URL(asset.sourceUrl).pathname), destination: asset.src, permanent: true,
  })),
];
const destinations = new Map(legacyRedirectRules.map(rule => [rule.source, rule.destination]));

export function legacyRedirectUrl(url: URL): URL | null {
  let path: string;
  try { path = decodeURIComponent(url.pathname); } catch { return null; }
  const destination = destinations.get(path.replace(/\/$/, "") || "/");
  if (destination) {
    const target = new URL(destination, url.origin);
    target.search = url.search;
    return target;
  }
  // The current Sites adapter decodes paths before constructing slash redirects.
  // Normalize here using URL's ASCII serialization, never a raw Persian header.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    const target = new URL(url);
    target.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return target;
  }
  return null;
}
