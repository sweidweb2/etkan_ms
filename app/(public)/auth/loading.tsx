import { RouteLoading } from "@/components/loaders/route-loading";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/messages";

/**
 * No cookies()/getPublicLocale here — loading.tsx must stay fetch-free.
 * Auth segment is already force-dynamic; marketing SSR uses DEFAULT_LOCALE
 * until the client PublicI18nProvider reads the locale cookie.
 */
export default function AuthLoading() {
  return (
    <RouteLoading
      variant="full-page"
      label={translate(DEFAULT_LOCALE, "auth.loading")}
    />
  );
}
