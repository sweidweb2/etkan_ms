import { HomeHero } from "@/components/public/home-hero";
import { HomeJourneySection } from "@/components/public/home-journey-section";
import { HomeCareerStagesSection } from "@/components/public/home-career-stages-section";
import { getSessionRole } from "@/lib/auth/session";
import { getDashboardRouteForRole } from "@/lib/constants/routes";

export default async function HomePage() {
  const role = await getSessionRole();
  const initialDashboardHref = role ? getDashboardRouteForRole(role) : null;

  return (
    <>
      <HomeHero initialDashboardHref={initialDashboardHref} />
      <HomeCareerStagesSection />
      <HomeJourneySection />
    </>
  );
}
