import type { MessageKey } from "@/lib/i18n/messages";

export type CareersRoadmapId = "general" | "specialized";

export type CareersRoadmapCard = {
  id: CareersRoadmapId;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  imageAltKey: MessageKey;
  imageSrc: string;
};

export const CAREERS_ROADMAP_CARDS: CareersRoadmapCard[] = [
  {
    id: "general",
    titleKey: "careers.roadmap.card1.title",
    bodyKey: "careers.roadmap.card1.body",
    imageAltKey: "careers.roadmap.card1.imageAlt",
    imageSrc:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "specialized",
    titleKey: "careers.roadmap.card2.title",
    bodyKey: "careers.roadmap.card2.body",
    imageAltKey: "careers.roadmap.card2.imageAlt",
    imageSrc: "/public_images/solution-built-1.jpg",
  },
];

/** Six static nodes in the careers roadmap chain. */
export const CAREERS_ROADMAP_STAGE_IDS = [
  "stage-1",
  "stage-2",
  "stage-3",
  "stage-4",
  "stage-5",
  "stage-6",
] as const;

export type CareersRoadmapStageId =
  (typeof CAREERS_ROADMAP_STAGE_IDS)[number];

export type CareersRoadmapStage = {
  id: CareersRoadmapStageId;
  index: number;
  titleKey: MessageKey;
  shortLabelKey: MessageKey;
};

export const CAREERS_ROADMAP_STAGES: CareersRoadmapStage[] = [
  {
    id: "stage-1",
    index: 1,
    titleKey: "careers.roadmap.stage1.title",
    shortLabelKey: "careers.roadmap.stage1",
  },
  {
    id: "stage-2",
    index: 2,
    titleKey: "careers.roadmap.stage2.title",
    shortLabelKey: "careers.roadmap.stage2",
  },
  {
    id: "stage-3",
    index: 3,
    titleKey: "careers.roadmap.stage3.title",
    shortLabelKey: "careers.roadmap.stage3",
  },
  {
    id: "stage-4",
    index: 4,
    titleKey: "careers.roadmap.stage4.title",
    shortLabelKey: "careers.roadmap.stage4",
  },
  {
    id: "stage-5",
    index: 5,
    titleKey: "careers.roadmap.stage5.title",
    shortLabelKey: "careers.roadmap.stage5",
  },
  {
    id: "stage-6",
    index: 6,
    titleKey: "careers.roadmap.stage6.title",
    shortLabelKey: "careers.roadmap.stage6",
  },
];

export function isCareersRoadmapStageId(
  value: string
): value is CareersRoadmapStageId {
  return (CAREERS_ROADMAP_STAGE_IDS as readonly string[]).includes(value);
}

export function getCareersRoadmapStageById(
  id: CareersRoadmapStageId
): CareersRoadmapStage {
  const stage = CAREERS_ROADMAP_STAGES.find((item) => item.id === id);
  if (!stage) {
    throw new Error(`Unknown careers roadmap stage id: ${id}`);
  }
  return stage;
}

export function getAdjacentCareersRoadmapStages(id: CareersRoadmapStageId): {
  prev: CareersRoadmapStage | null;
  next: CareersRoadmapStage | null;
} {
  const index = CAREERS_ROADMAP_STAGES.findIndex((stage) => stage.id === id);
  if (index < 0) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? CAREERS_ROADMAP_STAGES[index - 1]! : null,
    next:
      index < CAREERS_ROADMAP_STAGES.length - 1
        ? CAREERS_ROADMAP_STAGES[index + 1]!
        : null,
  };
}
