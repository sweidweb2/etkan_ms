/**
 * Compatibility shim: session-scoped `tasks` was replaced by `class_tasks`.
 * Prefer importing from `@/repositories/class-task.repository` directly.
 */
export {
  type ClassTaskRecord as TaskRecord,
  type CreateClassTaskInput as CreateTaskInput,
  type UpdateClassTaskInput as UpdateTaskInput,
  listClassTasksByClassId as listTasksByClassId,
  listClassTasksForGradesByClassId as listTasksForGradesByClassId,
  listClassTaskIdsByClassId as listTaskIdsByClassId,
  findClassTaskById as findTaskById,
  createClassTask as createTask,
  updateClassTaskById as updateTask,
  deleteClassTaskById as deleteTaskById,
} from "@/repositories/class-task.repository";
