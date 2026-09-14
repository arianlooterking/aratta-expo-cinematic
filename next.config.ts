import type { NextConfig } from "next";
import { legacyRedirectRules } from "./src/lib/legacy-redirects";
const nextConfig: NextConfig = {
  async redirects() {
    // Sources include Persian and Latin filenames. Both the Next and Sites runtimes
    // receive URI-encoded paths; explicit aliases retain old external bookmarks.
    return legacyRedirectRules.flatMap((rule) => {
      const encoded = encodeURI(rule.source);
      return encoded === rule.source
        ? [rule]
        : [rule, { ...rule, source: encoded }];
    });
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
