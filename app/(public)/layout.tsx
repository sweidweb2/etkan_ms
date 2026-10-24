import { PublicShell } from "@/components/layout/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { PublicI18nProvider } from "@/lib/i18n/public-i18n-provider";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/json-ld";

/**
 * Marketing ISR shell. Do not call cookies()/headers()/getPublicLocale here —
 * that would dynamize every public route. Locale cookie is applied client-side
 * via PublicI18nProvider. Auth, /life, and tokenized routes opt into
 * force-dynamic in their own layouts/pages.
 */
export const dynamic = "force-static";
export const revalidate = 600;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicI18nProvider locale={DEFAULT_LOCALE}>
      <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
      <PublicShell>{children}</PublicShell>
    </PublicI18nProvider>
  );
}
