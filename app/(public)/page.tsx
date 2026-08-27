import dynamic from "next/dynamic";
import { HomeHero } from "@/components/public/home-hero";

const HomeCareerStagesSection = dynamic(
  () =>
    import("@/components/public/home-career-stages-section").then((mod) => ({
      default: mod.HomeCareerStagesSection,
    }))
);
const HomeLearningWaysSection = dynamic(
  () =>
    import("@/components/public/home-learning-ways-section").then((mod) => ({
      default: mod.HomeLearningWaysSection,
    }))
);
const HomeTestimonialsSection = dynamic(
  () =>
    import("@/components/public/home-testimonials-section").then((mod) => ({
      default: mod.HomeTestimonialsSection,
    }))
);
const HomeJourneySection = dynamic(
  () =>
    import("@/components/public/home-journey-section").then((mod) => ({
      default: mod.HomeJourneySection,
    }))
);
const HomeCourseLogosSection = dynamic(
  () =>
    import("@/components/public/home-course-logos-section").then((mod) => ({
      default: mod.HomeCourseLogosSection,
    }))
);
const HomeHeatmapSection = dynamic(
  () =>
    import("@/components/public/home-heatmap-section").then((mod) => ({
      default: mod.HomeHeatmapSection,
    }))
);
const HomeContactCtaSection = dynamic(
  () =>
    import("@/components/public/home-contact-cta-section").then((mod) => ({
      default: mod.HomeContactCtaSection,
    }))
);

export default function HomePage() {
  return (
    <>
      <HomeHero />
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
