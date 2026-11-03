// Writes the bundled shell's config (portal URL) and copies the app icon,
// so the offline screen can reopen the right deployment. Run before `cap sync`.
import { copyFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const url = (process.env.ARATTA_APP_URL ?? "https://aratta-expo-cinematic.vercel.app").replace(/\/+$/, "");
new URL(url); // throws on a malformed value

writeFileSync(
  join(root, "mobile/shell/config.js"),
  `window.ARATTA_APP = ${JSON.stringify({ url, startPath: "/fa/staff" })};\n`,
);
copyFileSync(join(root, "mobile/assets/icon-only.png"), join(root, "mobile/shell/icon.png"));
console.log(`shell ready for ${url}`);
