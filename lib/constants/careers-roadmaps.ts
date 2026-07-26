import type { MessageKey } from "@/lib/i18n/messages";

export const CAREERS_ROADMAP_IDS = ["general", "specialized"] as const;

export type CareersRoadmapId = (typeof CAREERS_ROADMAP_IDS)[number];

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

export function isCareersRoadmapId(value: string): value is CareersRoadmapId {
  return (CAREERS_ROADMAP_IDS as readonly string[]).includes(value);
}

export function getCareersRoadmapById(
  id: CareersRoadmapId
): CareersRoadmapCard {
  const card = CAREERS_ROADMAP_CARDS.find((item) => item.id === id);
  if (!card) {
    throw new Error(`Unknown careers roadmap id: ${id}`);
  }
  return card;
}
