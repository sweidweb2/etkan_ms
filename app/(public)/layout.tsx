import { SiteFooter } from "@/components/layout/site-footer";
import { SiteNavbar } from "@/components/layout/site-navbar";
import { getPublicLocale } from "@/lib/i18n/get-public-locale";
import { getDir } from "@/lib/i18n/locales";
import { PublicI18nProvider } from "@/lib/i18n/public-i18n-provider";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getPublicLocale();
  const dir = getDir(locale);

  return (
    <PublicI18nProvider locale={locale}>
      <div
        dir={dir}
        lang={locale}
        className="flex min-h-dvh flex-col"
      >
        <SiteNavbar />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <SiteFooter />
      </div>
    </PublicI18nProvider>
  );
}
