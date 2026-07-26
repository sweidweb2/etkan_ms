"use server";

import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/locales";

export async function setPublicLocaleAction(locale: string): Promise<Locale> {
  const nextLocale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE, nextLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return nextLocale;
}
