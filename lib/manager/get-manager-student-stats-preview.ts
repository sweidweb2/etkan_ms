import {
  getDefaultStudentDetailStats,
  MANAGER_STUDENT_STATS_MOCK,
} from "@/lib/constants/manager-student-stats-mock";
import type { ManagerStudentDetailStats } from "@/types/manager-student";

/** Preview lookup until student detail stats are backed by a service. */
export function getManagerStudentStatsPreview(
  studentProfileId: string
): ManagerStudentDetailStats {
  return (
    MANAGER_STUDENT_STATS_MOCK[studentProfileId] ?? getDefaultStudentDetailStats()
  );
}
