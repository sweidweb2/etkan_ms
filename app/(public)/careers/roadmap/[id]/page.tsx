import { notFound } from "next/navigation";
import { RoadmapDetailSection } from "@/components/public/roadmap-detail-section";
import {
  CAREERS_ROADMAP_IDS,
  getCareersRoadmapById,
  isCareersRoadmapId,
} from "@/lib/constants/careers-roadmaps";

type RoadmapDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return CAREERS_ROADMAP_IDS.map((id) => ({ id }));
}

export default async function RoadmapDetailPage({
  params,
}: RoadmapDetailPageProps) {
  const { id } = await params;

  if (!isCareersRoadmapId(id)) {
    notFound();
  }

  return <RoadmapDetailSection roadmap={getCareersRoadmapById(id)} />;
}
