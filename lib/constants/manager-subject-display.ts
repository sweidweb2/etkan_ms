export const SUBJECT_CARD_LIMITS = {
  name: 32,
  link: 24,
} as const;

export const CLASS_CARD_LIMITS = {
  name: 28,
  id: 12,
} as const;

export {
  MANAGER_CLASS_STATUS_BADGE_CLASSES as CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_LABELS as CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
