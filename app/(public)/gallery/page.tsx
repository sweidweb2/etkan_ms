import type { Metadata } from "next";
import { GallerySection } from "@/components/public/gallery-section";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";
import { shuffleArray } from "@/lib/utils/shuffle-array";
import { listGalleryImagesForPublic } from "@/services/public/gallery-image.service";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_SEO.gallery.title,
  description: PAGE_SEO.gallery.description,
  path: PAGE_SEO.gallery.path,
});

export default async function GalleryPage() {
  const images = await listGalleryImagesForPublic();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: PAGE_SEO.home.path },
          { name: PAGE_SEO.gallery.title, path: PAGE_SEO.gallery.path },
        ])}
      />
      <GallerySection images={shuffleArray(images)} />
    </>
  );
}
