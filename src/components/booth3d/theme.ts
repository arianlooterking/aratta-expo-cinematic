// Scene theme for the surroundings: "dark" is the hall at dusk during build-up
// and on the opening evening; "light" is the same hall on a bright opening day
// (daylight through the skylights and the curtain wall, lighter shell, lighter
// haze, a deep red aisle carpet). Only hall and neighbour materials, the hall
// lights and the air change; our own stand and its show lighting do not.
// Switching changes colours, levels and one pre-built texture: no rebuilds.

import type { Ctx } from "./core";

export type SceneTheme = "dark" | "light";

/** Static swaps registered by the hall modules; per-frame levels read `themeLevel`. */
type ThemeHook = (theme: SceneTheme) => void;

export function onTheme(ctx: Ctx, hook: ThemeHook) {
  const hooks = (ctx.hooks.themeHooks as ThemeHook[] | undefined) ?? [];
  hooks.push(hook);
  ctx.hooks.themeHooks = hooks;
}

/** 0 = dark, 1 = light (read every frame by the hall and light modules). */
export const themeLevel = (ctx: Ctx) => (ctx.hooks.theme === "light" ? 1 : 0);

export function applyTheme(ctx: Ctx, theme: SceneTheme) {
  ctx.hooks.theme = theme;
  for (const hook of (ctx.hooks.themeHooks as ThemeHook[] | undefined) ?? []) hook(theme);
}

/** `?booth-theme=light` (testing), else the option, else dark. */
export function initialTheme(option?: SceneTheme): SceneTheme {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("booth-theme") === "light") return "light";
  return option ?? "dark";
}
