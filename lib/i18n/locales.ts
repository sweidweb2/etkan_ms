export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "etkan_locale";

export type TextDirection = "ltr" | "rtl";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function getDir(locale: Locale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}
