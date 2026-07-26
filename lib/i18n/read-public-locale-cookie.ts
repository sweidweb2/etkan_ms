import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/locales";

/** Read locale from document cookie (client only). */
export function readPublicLocaleCookie(): Locale {
  if (typeof document === "undefined") {
    return DEFAULT_LOCALE;
  }

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));

  if (!match) {
    return DEFAULT_LOCALE;
  }

  const value = decodeURIComponent(match.split("=").slice(1).join("="));
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
