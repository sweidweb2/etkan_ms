import { PublicShell } from "@/components/layout/public-shell";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { PublicI18nProvider } from "@/lib/i18n/public-i18n-provider";

/** Public marketing UI is static so soft navigations reuse the cached shell. */
export const dynamic = "force-static";
export const revalidate = 600;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicI18nProvider locale={DEFAULT_LOCALE}>
      <PublicShell>{children}</PublicShell>
    </PublicI18nProvider>
  );
}
