export {
  listClassesForManager,
  getClassCreateDialogDataForManager,
  getClassForManager,
  assertClassGradesUnlockedForManager,
  listTeacherOptionsForManager,
  listClassTeacherOptionsForManager,
  listClassSessionsForManager,
  listClassStudentsForManager,
  fetchClassStudentRowForManager,
  listAvailableStudentsForClass,
  getClassFinalExamForManager,
  getClassAnalyticsForManager,
  type ManagerClassCreateDialogData,
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
  removeStudentFromClassForManager,
  transferStudentBetweenClassesForManager,
  type AddStudentToClassResult,
  type AddStudentsToClassResult,
  type RemoveStudentFromClassResult,
  type TransferStudentBetweenClassesResult,
} from "@/services/classes/class-enrollment.service";

