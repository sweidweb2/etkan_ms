import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoadmapStageDetailSection } from "@/components/public/roadmap-stage-detail-section";
import { JsonLd } from "@/components/seo/json-ld";
import {
  CAREERS_ROADMAP_STAGE_IDS,
  getCareersRoadmapStageById,
  isCareersRoadmapStageId,
} from "@/lib/constants/careers-roadmaps";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getCareersRoadmapPageSeo, PAGE_SEO } from "@/lib/seo/page-seo";

type RoadmapStageDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return CAREERS_ROADMAP_STAGE_IDS.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: RoadmapStageDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isCareersRoadmapStageId(id)) {
    return { title: PAGE_SEO.careers.title };
  }

  const seo = getCareersRoadmapPageSeo(id);
  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  });
}

export default async function RoadmapStageDetailPage({
  params,
}: RoadmapStageDetailPageProps) {
  const { id } = await params;

  if (!isCareersRoadmapStageId(id)) {
    notFound();
  }

  const seo = getCareersRoadmapPageSeo(id);

  return (
    <main className="flex-1">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: PAGE_SEO.home.path },
          { name: PAGE_SEO.careers.title, path: PAGE_SEO.careers.path },
          { name: seo.title, path: seo.path },
        ])}
      />
      <RoadmapStageDetailSection stage={getCareersRoadmapStageById(id)} />
    </main>
  );
}
