import type { ManagerStudentDetailStats } from "@/types/manager-student";

const DEFAULT_STUDENT_DETAIL_STATS: ManagerStudentDetailStats = {
  classesRegistered: 4,
  classesDone: 1,
  classesPending: 3,
  tasksDone: 6,
  tasksTotal: 14,
};

/** Preview stats keyed by student_profile_id until backend is connected. */
export const MANAGER_STUDENT_STATS_MOCK: Record<string, ManagerStudentDetailStats> =
  {
    "s1a2b3c4-d5e6-7890-abcd-ef1234567890": {
      classesRegistered: 6,
      classesDone: 4,
      classesPending: 2,
      tasksDone: 18,
      tasksTotal: 24,
    },
    "s2b3c4d5-e6f7-8901-bcde-f12345678901": {
      classesRegistered: 5,
      classesDone: 3,
      classesPending: 2,
      tasksDone: 12,
      tasksTotal: 20,
    },
    "s4d5e6f7-a8b9-0123-def0-234567890123": {
      classesRegistered: 3,
      classesDone: 0,
      classesPending: 3,
      tasksDone: 2,
      tasksTotal: 9,
    },
    "s6f7a8b9-c0d1-2345-f012-456789012345": {
      classesRegistered: 7,
      classesDone: 5,
      classesPending: 2,
      tasksDone: 21,
      tasksTotal: 28,
    },
    "s8b9c0d1-e2f3-4567-1234-678901234567": {
      classesRegistered: 4,
      classesDone: 1,
      classesPending: 3,
      tasksDone: 4,
      tasksTotal: 16,
    },
    "s0d1e2f3-a4b5-6789-3456-890123456789": {
      classesRegistered: 5,
      classesDone: 5,
      classesPending: 0,
      tasksDone: 15,
      tasksTotal: 15,
    },
    "s1e2f3a4-b5c6-7890-4567-901234567890": {
      classesRegistered: 2,
      classesDone: 0,
      classesPending: 2,
      tasksDone: 0,
      tasksTotal: 6,
    },
    "s6d7e8f9-a0b1-2345-9012-456789012345": {
      classesRegistered: 8,
      classesDone: 8,
      classesPending: 0,
      tasksDone: 32,
      tasksTotal: 32,
    },
  };

export function getDefaultStudentDetailStats(): ManagerStudentDetailStats {
  return { ...DEFAULT_STUDENT_DETAIL_STATS };
}
