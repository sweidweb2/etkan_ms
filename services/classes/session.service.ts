import "server-only";

export {
  ensureSessionAttendeesForMembers,
  seedLateJoinAttendeesForStudent,
  seedLateJoinStudentTasksForStudent,
  seedLateJoinAttendeesForStudents,
  seedLateJoinStudentTasksForStudents,
} from "@/services/classes/session-seed.service";

export {
  listClassTasksForManager,
  getSessionDetailForManager,
  getSessionTaskDetailForManager,
  getClassTaskDetailForManager,
  type ManagerClassTaskDetailBundle,
  type ManagerSessionDetailBundle,
  type ManagerSessionTaskDetailBundle,
} from "@/services/classes/session-queries.service";

export {
  updateSessionSettingsForManager,
  updateClassSessionForManager,
  deleteClassSessionForManager,
  type UpdateSessionSettingsResult,
  type UpdateClassSessionResult,
  type DeleteClassSessionResult,
} from "@/services/classes/session-lifecycle.service";

export {
  createSessionTaskForManager,
  updateSessionTaskForManager,
  deleteSessionTaskForManager,
  updateAttendeeForManager,
  updateStudentTaskForManager,
  type CreateSessionTaskResult,
  type UpdateSessionTaskResult,
  type DeleteSessionTaskResult,
  type UpdateAttendeeResult,
  type UpdateStudentTaskResult,
} from "@/services/classes/session-tasks.service";
