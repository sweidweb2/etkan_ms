import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HomeHero } from "@/components/public/home-hero";
import { HomeLearningPathSection } from "@/components/public/home-learning-path-section";
import { SITE } from "@/lib/config/site";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";

export const metadata: Metadata = buildPageMetadata({
  title: `${SITE.name} — Hands-on tech learning`,
  description: PAGE_SEO.home.description,
  path: PAGE_SEO.home.path,
  absoluteTitle: true,
});

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
      <HomeLearningPathSection />
      <HomeContactCtaSection />
    </>
  );
}
