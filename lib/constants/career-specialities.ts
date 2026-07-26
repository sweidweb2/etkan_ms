import type { MessageKey } from "@/lib/i18n/messages";

export type CareerSpecialityOutline = {
  id: string;
  titleKey: MessageKey;
  descKey: MessageKey;
};

/** Specialization roadmap tree (security, communication, embedded AI, IoT). */
export const CAREER_SPECIALITY_OUTLINE: CareerSpecialityOutline[] = [
  {
    id: "security",
    titleKey: "careerSpecialities.security.title",
    descKey: "careerSpecialities.security.desc",
  },
  {
    id: "communication",
    titleKey: "careerSpecialities.communication.title",
    descKey: "careerSpecialities.communication.desc",
  },
  {
    id: "embedded-ai",
    titleKey: "careerSpecialities.embeddedAi.title",
    descKey: "careerSpecialities.embeddedAi.desc",
  },
  {
    id: "iot",
    titleKey: "careerSpecialities.iot.title",
    descKey: "careerSpecialities.iot.desc",
  },
];
