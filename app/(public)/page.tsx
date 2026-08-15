import { HomeHero } from "@/components/public/home-hero";
import { HomeCareerStagesSection } from "@/components/public/home-career-stages-section";
import { HomeLearningWaysSection } from "@/components/public/home-learning-ways-section";
import { HomeTestimonialsSection } from "@/components/public/home-testimonials-section";
import { HomeJourneySection } from "@/components/public/home-journey-section";
import { HomeCourseLogosSection } from "@/components/public/home-course-logos-section";
import { HomeHeatmapSection } from "@/components/public/home-heatmap-section";
import { HomeContactCtaSection } from "@/components/public/home-contact-cta-section";

export default function HomePage() {
  return (
    <>
      <HomeHero initialDashboardHref={null} />
      <HomeCareerStagesSection />
      <HomeLearningWaysSection />
      <HomeTestimonialsSection />
      <HomeJourneySection />
      <HomeCourseLogosSection />
      <HomeHeatmapSection />
      <HomeContactCtaSection />
    </>
  );
}
