"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerClassDetailRoute,
  getManagerClassSessionDetailRoute,
  getManagerClassSessionTaskDetailRoute,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAddStudentsToClassFormData } from "@/lib/validators/manager/add-student-to-class";
import {
  parseAssignClassTeacherFormData,
  parseUnassignClassTeacherFormData,
} from "@/lib/validators/manager/assign-class-teacher";
import { parseCreateClassFormData } from "@/lib/validators/manager/create-class";
import { parseCreateClassSessionFormData } from "@/lib/validators/manager/create-class-session";
import { parseCreateFinalExamFormData } from "@/lib/validators/manager/create-final-exam";
import { parseCreateSessionTaskFormData } from "@/lib/validators/manager/create-session-task";
import { parseUpdateSessionTaskFormData } from "@/lib/validators/manager/update-session-task";
import { parseEditStudentFinalExamGradeFormData } from "@/lib/validators/manager/edit-student-finalexam-grade";
import { parseEditStudentTaskFormData } from "@/lib/validators/manager/edit-student-task";
import { parseUpdateAttendeeFormData } from "@/lib/validators/manager/update-attendee";
import { parseUpdateClassSessionFormData } from "@/lib/validators/manager/update-class-session";
import { parseUpdateFinalExamFormData } from "@/lib/validators/manager/update-final-exam";
import { parseUpdateSessionSettingsFormData } from "@/lib/validators/manager/update-session-settings";
import { parseRemoveStudentFromClassFormData } from "@/lib/validators/manager/remove-student-from-class";
import { parseTransferStudentBetweenClassesFormData } from "@/lib/validators/manager/transfer-student-between-classes";
import {
  parseChangeClassStatusFormData,
  parseUpdateClassFormData,
} from "@/lib/validators/manager/update-class";
import {
  addStudentsToClassForManager,
  assignTeacherToClassForManager,
  createClassForManager,
  createClassSessionForManager,
  createFinalExamForManager,
  getClassCreateDialogDataForManager,
  listAvailableStudentsForClass,
  listClassesForManager,
  transferStudentBetweenClassesForManager,
  unassignTeacherFromClassForManager,
  updateClassForManager,
  updateClassStatusForManager,
  removeStudentFromClassForManager,
  updateFinalExamForManager,
  updateStudentFinalExamGradeForManager,
} from "@/services/classes/class.service";
import {
  createSessionTaskForManager,
  deleteClassSessionForManager,
  deleteSessionTaskForManager,
  updateAttendeeForManager,
  updateClassSessionForManager,
  updateSessionSettingsForManager,
  updateSessionTaskForManager,
  updateStudentTaskForManager,
} from "@/services/classes/session.service";
import { listSemestersForManager } from "@/services/classes/semester.service";
import { listSubjectsForManager } from "@/services/classes/subject.service";
import { listStudentsWithoutInProgressClassForManager } from "@/services/students/student.service";
import type {
  AddStudentToClassActionState,
  AssignClassTeacherActionState,
  CreateClassActionState,
  CreateClassSessionActionState,
  CreateFinalExamActionState,
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherSelectOption,
  TransferStudentBetweenClassesActionState,
  UnassignClassTeacherActionState,
  UpdateClassActionState,
  UpdateClassStatusActionState,
  RemoveStudentFromClassActionState,
  UpdateFinalExamActionState,
  UpdateStudentFinalExamGradeActionState,
} from "@/types/manager-class-detail";
import type {
  ManagerStudentRow,
  ManagerStudentWithoutActiveClassRow,
} from "@/types/manager-student";
import type {
  CreateSessionTaskActionState,
  DeleteClassSessionActionState,
  DeleteSessionTaskActionState,
  UpdateAttendeeActionState,
  UpdateClassSessionActionState,
  UpdateSessionSettingsActionState,
  UpdateSessionTaskActionState,
  UpdateStudentTaskActionState,
} from "@/types/manager-class-session-detail";

export async function loadAvailableStudentsForClassAction(
  classId: string
): Promise<ManagerStudentRow[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listAvailableStudentsForClass(
      adminClient,
      actor.userId,
      classId
    );
  } catch {
    return [];
  }
}

export async function loadTransferClassOptionsAction(
  excludeClassId: string
): Promise<Array<{ id: string; name: string }>> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    const classes = await listClassesForManager(adminClient, actor.userId);
    return classes
      .filter((row) => row.id !== excludeClassId)
      .map((row) => ({ id: row.id, name: row.name }));
  } catch {
    return [];
  }
}

export async function loadClassEditOptionsAction(): Promise<{
  subjects: Array<{ id: string; name: string; nb_sessions: number }>;
  semesters: Array<{ id: string; name: string }>;
}> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return { subjects: [], semesters: [] };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    const [subjects, semesters] = await Promise.all([
      listSubjectsForManager(adminClient, actor.userId),
      listSemestersForManager(adminClient, actor.userId),
    ]);
    return {
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        nb_sessions: subject.nb_sessions,
      })),
      semesters: semesters.map((semester) => ({
        id: semester.id,
        name: semester.name,
      })),
    };
  } catch {
    return { subjects: [], semesters: [] };
  }
}

export async function loadClassCreateDialogDataAction(): Promise<{
  subjects: ManagerClassSubjectOption[];
  semesters: ManagerClassSemesterOption[];
  teachers: ManagerClassTeacherSelectOption[];
}> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return { subjects: [], semesters: [], teachers: [] };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await getClassCreateDialogDataForManager(adminClient, actor.userId);
  } catch {
    return { subjects: [], semesters: [], teachers: [] };
  }
}

export async function loadStudentsWithoutActiveClassAction(): Promise<
  ManagerStudentWithoutActiveClassRow[]
> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listStudentsWithoutInProgressClassForManager(
      adminClient,
      actor.userId,
      PERMISSIONS.CLASSES_VIEW
    );
  } catch {
    return [];
  }
}

export async function createClassAction(
  _prevState: CreateClassActionState,
  formData: FormData
): Promise<CreateClassActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateClassFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createClassForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    classRow: result.classRow,
  };
}

export async function updateClassAction(
  _prevState: UpdateClassActionState,
  formData: FormData
): Promise<UpdateClassActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateClassFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateClassForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    classRow: result.classRow,
  };
}

export async function updateClassStatusAction(
  _prevState: UpdateClassStatusActionState,
  formData: FormData
): Promise<UpdateClassStatusActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseChangeClassStatusFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateClassStatusForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    warning: result.warning,
    classRow: result.classRow,
  };
}

export async function createClassSessionAction(
  _prevState: CreateClassSessionActionState,
  formData: FormData
): Promise<CreateClassSessionActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateClassSessionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createClassSessionForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    session: result.session,
    classRow: result.classRow,
  };
}

export async function createFinalExamAction(
  _prevState: CreateFinalExamActionState,
  formData: FormData
): Promise<CreateFinalExamActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateFinalExamFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createFinalExamForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    finalExam: result.finalExam,
    studentGrades: result.studentGrades,
  };
}

export async function updateFinalExamAction(
  _prevState: UpdateFinalExamActionState,
  formData: FormData
): Promise<UpdateFinalExamActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateFinalExamFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateFinalExamForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    finalExam: result.finalExam,
  };
}

export async function updateStudentFinalExamGradeAction(
  _prevState: UpdateStudentFinalExamGradeActionState,
  formData: FormData
): Promise<UpdateStudentFinalExamGradeActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseEditStudentFinalExamGradeFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateStudentFinalExamGradeForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    studentGrade: result.studentGrade,
  };
}

export async function addStudentToClassAction(
  _prevState: AddStudentToClassActionState,
  formData: FormData
): Promise<AddStudentToClassActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseAddStudentsToClassFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await addStudentsToClassForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    warning: result.warning,
    students: result.students,
    student: result.students[0],
    studentGrades: result.studentGrades,
    studentGrade: result.studentGrades[0],
    classRow: result.classRow,
  };
}

export async function removeStudentFromClassAction(
  _prevState: RemoveStudentFromClassActionState,
  formData: FormData
): Promise<RemoveStudentFromClassActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseRemoveStudentFromClassFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await removeStudentFromClassForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    warning: result.warning,
    removedStudentId: result.removedStudentId,
  };
}

export async function transferStudentBetweenClassesAction(
  _prevState: TransferStudentBetweenClassesActionState,
  formData: FormData
): Promise<TransferStudentBetweenClassesActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseTransferStudentBetweenClassesFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await transferStudentBetweenClassesForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(getManagerClassDetailRoute(result.from_class_id));
  revalidatePath(getManagerClassDetailRoute(result.to_class_id));

  return {
    success: true,
    message: result.message,
    warning: result.warning,
    student: result.student,
    from_class_id: result.from_class_id,
    to_class_id: result.to_class_id,
  };
}

export async function assignClassTeacherAction(
  _prevState: AssignClassTeacherActionState,
  formData: FormData
): Promise<AssignClassTeacherActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseAssignClassTeacherFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await assignTeacherToClassForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    teacher: result.teacher,
    classRow: result.classRow,
  };
}

export async function unassignClassTeacherAction(
  _prevState: UnassignClassTeacherActionState,
  formData: FormData
): Promise<UnassignClassTeacherActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUnassignClassTeacherFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await unassignTeacherFromClassForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    teacherId: result.teacherId,
    classRow: result.classRow,
  };
}

export async function updateSessionSettingsAction(
  _prevState: UpdateSessionSettingsActionState,
  formData: FormData
): Promise<UpdateSessionSettingsActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateSessionSettingsFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSessionSettingsForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    session: result.session,
    linkedPhase: result.linkedPhase,
  };
}

export async function updateClassSessionAction(
  _prevState: UpdateClassSessionActionState,
  formData: FormData
): Promise<UpdateClassSessionActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateClassSessionFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateClassSessionForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    session: result.session,
  };
}

export async function deleteClassSessionAction(
  _prevState: DeleteClassSessionActionState,
  formData: FormData
): Promise<DeleteClassSessionActionState> {
  const actor = await getSessionAuditActor();

  const sessionId = String(formData.get("session_id") ?? "").trim();

  if (!sessionId) {
    return {
      success: false,
      error: "Session not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteClassSessionForManager(
    adminClient,
    actor.userId,
    actor,
    sessionId
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(getManagerClassDetailRoute(result.classId));
  redirect(
    appendQueryParam(
      getManagerClassDetailRoute(result.classId),
      "toast",
      "session_deleted"
    )
  );
}

export async function createSessionTaskAction(
  _prevState: CreateSessionTaskActionState,
  formData: FormData
): Promise<CreateSessionTaskActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateSessionTaskFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createSessionTaskForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(getManagerClassDetailRoute(parsed.data.class_id));
  revalidatePath(
    getManagerClassSessionDetailRoute(parsed.data.class_id, parsed.data.session_id)
  );

  return {
    success: true,
    message: result.message,
    task: result.task,
  };
}

export async function updateSessionTaskAction(
  _prevState: UpdateSessionTaskActionState,
  formData: FormData
): Promise<UpdateSessionTaskActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateSessionTaskFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSessionTaskForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(getManagerClassDetailRoute(parsed.data.class_id));
  revalidatePath(
    getManagerClassSessionDetailRoute(parsed.data.class_id, parsed.data.session_id)
  );
  revalidatePath(
    getManagerClassSessionTaskDetailRoute(
      parsed.data.class_id,
      parsed.data.session_id,
      parsed.data.id
    )
  );

  return {
    success: true,
    message: result.message,
    task: result.task,
    gradesClamped: result.gradesClamped,
  };
}

export async function deleteSessionTaskAction(
  _prevState: DeleteSessionTaskActionState,
  formData: FormData
): Promise<DeleteSessionTaskActionState> {
  const actor = await getSessionAuditActor();

  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();
  const session_id = String(formData.get("session_id") ?? "").trim();

  if (!id || !class_id || !session_id) {
    return {
      success: false,
      error: "Task not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteSessionTaskForManager(
    adminClient,
    actor.userId,
    actor,
    { id, class_id, session_id }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(getManagerClassDetailRoute(result.classId));
  revalidatePath(
    getManagerClassSessionDetailRoute(result.classId, result.sessionId)
  );
  redirect(
    appendQueryParam(
      getManagerClassSessionDetailRoute(result.classId, result.sessionId),
      "toast",
      "task_deleted"
    )
  );
}

export async function updateAttendeeAction(
  _prevState: UpdateAttendeeActionState,
  formData: FormData
): Promise<UpdateAttendeeActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateAttendeeFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateAttendeeForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    attendee: result.attendee,
  };
}

export async function updateStudentTaskAction(
  _prevState: UpdateStudentTaskActionState,
  formData: FormData
): Promise<UpdateStudentTaskActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseEditStudentTaskFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateStudentTaskForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  if (result.classId) {
    revalidatePath(getManagerClassDetailRoute(result.classId));
  }

  if (result.classId && result.sessionId) {
    revalidatePath(
      getManagerClassSessionDetailRoute(result.classId, result.sessionId)
    );
    revalidatePath(
      getManagerClassSessionTaskDetailRoute(
        result.classId,
        result.sessionId,
        result.studentTask.task_id
      )
    );
  }

  return {
    success: true,
    message: result.message,
    studentTask: result.studentTask,
  };
}
