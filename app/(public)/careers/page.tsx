import type { Metadata } from "next";
import { CareersSection } from "@/components/public/careers-section";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_SEO.careers.title,
  description: PAGE_SEO.careers.description,
  path: PAGE_SEO.careers.path,
});

export default function CareersPage() {
  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: PAGE_SEO.home.path },
          { name: PAGE_SEO.careers.title, path: PAGE_SEO.careers.path },
        ])}
      />
      <CareersSection />
    </>
  );
}
