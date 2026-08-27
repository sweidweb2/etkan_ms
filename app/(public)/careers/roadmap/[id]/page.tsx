import { notFound } from "next/navigation";
import { RoadmapStageDetailSection } from "@/components/public/roadmap-stage-detail-section";
import {
  CAREERS_ROADMAP_STAGE_IDS,
  getCareersRoadmapStageById,
  isCareersRoadmapStageId,
} from "@/lib/constants/careers-roadmaps";

type RoadmapStageDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return CAREERS_ROADMAP_STAGE_IDS.map((id) => ({ id }));
}

export default async function RoadmapStageDetailPage({
  params,
}: RoadmapStageDetailPageProps) {
  const { id } = await params;

  if (!isCareersRoadmapStageId(id)) {
    notFound();
  }

  return (
    <main className="flex-1">
      <RoadmapStageDetailSection stage={getCareersRoadmapStageById(id)} />
    </main>
  );
}
