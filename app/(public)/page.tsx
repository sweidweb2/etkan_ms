import { HomeHero } from "@/components/public/home-hero";
import { HomeJourneySection } from "@/components/public/home-journey-section";
import { HomeCareerStagesSection } from "@/components/public/home-career-stages-section";
import { HomeLearningWaysSection } from "@/components/public/home-learning-ways-section";
import { HomeTestimonialsSection } from "@/components/public/home-testimonials-section";
import { HomeCourseLogosSection } from "@/components/public/home-course-logos-section";
import { HomeActivitySection } from "@/components/public/home-activity-section";
import { HomeContactCtaSection } from "@/components/public/home-contact-cta-section";

export default function HomePage() {
  return (
    <>
      <HomeHero initialDashboardHref={null} />
      <HomeCareerStagesSection />
      <HomeLearningWaysSection />
      <HomeTestimonialsSection />
      <HomeActivitySection />
      <HomeCourseLogosSection />
      <HomeJourneySection />
      <HomeContactCtaSection />
    </>
  );
}
