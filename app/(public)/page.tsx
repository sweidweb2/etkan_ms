import { HomeHero } from "@/components/public/home-hero";
import { HomeJourneySection } from "@/components/public/home-journey-section";
import { HomeCareerStagesSection } from "@/components/public/home-career-stages-section";
import { HomeLearningWaysSection } from "@/components/public/home-learning-ways-section";
import { HomeContactCtaSection } from "@/components/public/home-contact-cta-section";
import { getSessionRole } from "@/lib/auth/session";
import { getDashboardRouteForRole } from "@/lib/constants/routes";

export default async function HomePage() {
  const role = await getSessionRole();
  const initialDashboardHref = role ? getDashboardRouteForRole(role) : null;

  return (
    <>
      <HomeHero initialDashboardHref={initialDashboardHref} />
      <HomeCareerStagesSection />
      <HomeLearningWaysSection />
      <HomeJourneySection />
      <HomeContactCtaSection />
    </>
  );
}
