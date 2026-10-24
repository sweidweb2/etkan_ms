import type { Metadata } from "next";
import { AboutEtkanSection } from "@/components/public/about-etkan-section";
import { AboutHero } from "@/components/public/about-hero";
import { AboutServicesSection } from "@/components/public/about-services-section";
import { HomeCertificatesSection } from "@/components/public/home-certificates-section";
import { JsonLd } from "@/components/seo/json-ld";
import { FEATURED_ABOUT_FOUNDATIONS } from "@/lib/constants/about-services";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";
import { shuffleArray } from "@/lib/utils/shuffle-array";
import { listGalleryImagesForPublic } from "@/services/public/gallery-image.service";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_SEO.about.title,
  description: PAGE_SEO.about.description,
  path: PAGE_SEO.about.path,
});

export default async function AboutPage() {
  const galleryImages = await listGalleryImagesForPublic();
  const randomUrls = shuffleArray(galleryImages)
    .slice(0, FEATURED_ABOUT_FOUNDATIONS.length)
    .map((image) => image.url);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: PAGE_SEO.home.path },
          { name: PAGE_SEO.about.title, path: PAGE_SEO.about.path },
        ])}
      />
      <AboutHero />
      <AboutEtkanSection />
      <AboutServicesSection imageUrls={randomUrls} />
      <HomeCertificatesSection />
    </>
  );
}
