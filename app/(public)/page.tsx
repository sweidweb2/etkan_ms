import { HomeHero } from "@/components/public/home-hero";
import { getSessionRole } from "@/lib/auth/session";
import { getDashboardRouteForRole } from "@/lib/constants/routes";
import { getPublicLocale } from "@/lib/i18n/get-public-locale";
import { translate } from "@/lib/i18n/messages";

export default async function HomePage() {
  const role = await getSessionRole();
  const initialDashboardHref = role ? getDashboardRouteForRole(role) : null;
  const locale = await getPublicLocale();

  return (
    <HomeHero
      initialDashboardHref={initialDashboardHref}
      copy={{
        brandName: translate(locale, "brand.name"),
        title: translate(locale, "hero.title"),
        subtitle: translate(locale, "hero.subtitle"),
        ctaLogin: translate(locale, "hero.ctaLogin"),
        ctaRegister: translate(locale, "hero.ctaRegister"),
        ctaDashboard: translate(locale, "hero.ctaDashboard"),
      }}
    />
  );
}
