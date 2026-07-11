import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";

export const CLASS_GRADES_LOCKED_ERROR =
  "Grades are only available when the class status is Done.";

export function isClassGradesUnlocked(status: ClassStatusValue): boolean {
  return status === CLASS_STATUSES.DONE;
}

export function getClassGradesLockedCopy(status: ClassStatusValue): {
  title: string;
  description: string;
  statusLabel: string;
} {
  const statusLabel = MANAGER_CLASS_STATUS_LABELS[status] ?? status;

  return {
    title: "Grades locked",
    description: `Class grades become available after the class is marked Done. Current status: ${statusLabel}.`,
    statusLabel,
  };
}
