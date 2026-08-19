import { AboutEtkanSection } from "@/components/public/about-etkan-section";
import { AboutHero } from "@/components/public/about-hero";
import { AboutServicesSection } from "@/components/public/about-services-section";
import { HomeCertificatesSection } from "@/components/public/home-certificates-section";
import { FEATURED_ABOUT_FOUNDATIONS } from "@/lib/constants/about-services";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { shuffleArray } from "@/lib/utils/shuffle-array";
import { listGalleryImagesForPublic } from "@/services/public/gallery-image.service";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const adminClient = createSupabaseAdminClient();
  const galleryImages = await listGalleryImagesForPublic(adminClient);
  const randomUrls = shuffleArray(galleryImages)
    .slice(0, FEATURED_ABOUT_FOUNDATIONS.length)
    .map((image) => image.direct_url);

  return (
    <>
      <AboutHero />
      <AboutEtkanSection />
      <AboutServicesSection imageUrls={randomUrls} />
      <HomeCertificatesSection />
    </>
  );
}
