export const languages = ["fa", "en"] as const;

export type Lang = (typeof languages)[number];

export function isLang(value: string): value is Lang {
  return languages.includes(value as Lang);
}

export function getDirection(lang: Lang) {
  return lang === "fa" ? "rtl" : "ltr";
}

export function getAlternateLang(lang: Lang): Lang {
  return lang === "fa" ? "en" : "fa";
}

export function getLanguageLabel(lang: Lang) {
  return lang === "fa" ? "English" : "فارسی";
}
