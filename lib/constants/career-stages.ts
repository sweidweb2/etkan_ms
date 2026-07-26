import type { MessageKey } from "@/lib/i18n/messages";

export type CareerStageOutline = {
  id: string;
  titleKey: MessageKey;
  descKey: MessageKey;
};

/** Shared stage outline used on home + roadmap detail pages. */
export const CAREER_STAGE_OUTLINE: CareerStageOutline[] = [
  {
    id: "1",
    titleKey: "careerStages.stage1.title",
    descKey: "careerStages.stage1.desc",
  },
  {
    id: "2",
    titleKey: "careerStages.stage2.title",
    descKey: "careerStages.stage2.desc",
  },
  {
    id: "3",
    titleKey: "careerStages.stage3.title",
    descKey: "careerStages.stage3.desc",
  },
  {
    id: "4",
    titleKey: "careerStages.stage4.title",
    descKey: "careerStages.stage4.desc",
  },
  {
    id: "5",
    titleKey: "careerStages.stage5.title",
    descKey: "careerStages.stage5.desc",
  },
  {
    id: "6",
    titleKey: "careerStages.stage6.title",
    descKey: "careerStages.stage6.desc",
  },
];
