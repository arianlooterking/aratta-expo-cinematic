"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/lang";
import { toggleTheme, useTheme } from "@/lib/theme";

const labels: Record<Lang, { toLight: string; toDark: string }> = {
  fa: { toLight: "حالت روشن", toDark: "حالت تیره" },
  en: { toLight: "Light theme", toDark: "Dark theme" },
};

/**
 * The sun/moon switch in the header. Both icons are always rendered and CSS
 * (keyed on <html data-theme>) shows the right one, so the icon is correct
 * before hydration; the label says what a press will do.
 */
export function ThemeSwitch({ lang, className }: { lang: Lang; className?: string }) {
  const theme = useTheme();
  const light = theme === "light";
  const label = light ? labels[lang].toDark : labels[lang].toLight;

  return (
    <button
      type="button"
      aria-pressed={light}
      aria-label={label}
      title={label}
      data-theme-switch=""
      onClick={toggleTheme}
      className={cn(
        "theme-switch liquid-button grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink",
        className,
      )}
    >
      <Moon aria-hidden="true" size={19} className="theme-switch__icon theme-switch__moon" />
      <Sun aria-hidden="true" size={20} className="theme-switch__icon theme-switch__sun" />
    </button>
  );
}
