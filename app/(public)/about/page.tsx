import { AboutEtkanSection } from "@/components/public/about-etkan-section";
import { AboutHero } from "@/components/public/about-hero";
import { AboutServicesSection } from "@/components/public/about-services-section";
import { HomeCertificatesSection } from "@/components/public/home-certificates-section";

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutEtkanSection />
      <AboutServicesSection />
      <HomeCertificatesSection />
    </>
  );
}
