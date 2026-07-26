import { HomeHero } from "@/components/public/home-hero";
import { HomeJourneySection } from "@/components/public/home-journey-section";
import { getSessionRole } from "@/lib/auth/session";
import { getDashboardRouteForRole } from "@/lib/constants/routes";

export default async function HomePage() {
  const role = await getSessionRole();
  const initialDashboardHref = role ? getDashboardRouteForRole(role) : null;

  return (
    <>
      <HomeHero initialDashboardHref={initialDashboardHref} />
      <HomeJourneySection />
    </>
  );
}
