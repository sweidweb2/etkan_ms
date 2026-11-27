import "server-only";

export {
  listClassesForManager,
  listClassesPageForManager,
  listClassSemesterFilterOptionsForManager,
  getClassCreateDialogDataForManager,
  getClassForManager,
  assertClassGradesUnlockedForManager,
  listTeacherOptionsForManager,
  listAssignedClassTeachersForManager,
  loadAssignedClassTeachers,
  listClassTeacherOptionsForManager,
  listClassTransferOptionsForManager,
  listClassSessionsForManager,
  loadClassSessions,
  listClassStudentsForManager,
  listClassStudentsPageForManager,
  loadClassStudentRows,
  loadClassStudentsPage,
  fetchClassStudentRowForManager,
  listAvailableStudentsForClass,
  listSameSemesterClassesForCopy,
  listActiveStudentDiffFromClass,
  getClassFinalExamForManager,
  loadClassFinalExam,
  getClassAnalyticsForManager,
  loadClassAnalyticsDeferredForManager,
  type ManagerClassCreateDialogData,
  type ClassCopySourceOption,
} from "@/services/classes/class-queries.service";

export {
  createClassForManager,
  updateClassForManager,
  updateClassStatusForManager,
  createClassSessionForManager,
  type CreateClassResult,
  type UpdateClassResult,
  type UpdateClassStatusResult,
  type CreateClassSessionResult,
} from "@/services/classes/class-lifecycle.service";

export {
  assignTeacherToClassForManager,
  unassignTeacherFromClassForManager,
  type AssignClassTeacherResult,
  type UnassignClassTeacherResult,
} from "@/services/classes/class-teachers.service";

export { getManagerClassPageBundle } from "@/services/classes/manager-class-page-bundle.service";

export {
  createFinalExamForManager,
  updateFinalExamForManager,
  updateStudentFinalExamGradeForManager,
  type CreateFinalExamResult,
  type UpdateFinalExamResult,
  type UpdateStudentFinalExamGradeResult,
} from "@/services/classes/class-final-exam.service";

export {
  addStudentToClassForManager,
  addStudentsToClassForManager,
  copyStudentsFromClassForManager,
  removeStudentFromClassForManager,
  transferStudentBetweenClassesForManager,
  type AddStudentToClassResult,
  type AddStudentsToClassResult,
  type RemoveStudentFromClassResult,
  type TransferStudentBetweenClassesResult,
} from "@/services/classes/class-enrollment.service";

