import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/locales";

/**
 * Reads the public locale cookie. Calling this opts the route into dynamic
 * rendering — use only under already-dynamic segments (e.g. `app/(public)/auth`).
 * Marketing pages must keep `DEFAULT_LOCALE` on the server and let
 * `PublicI18nProvider` apply the cookie on the client.
 */
export async function getPublicLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
