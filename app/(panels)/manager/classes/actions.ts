"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
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
import {
  parseDeleteStudentTaskUploadFormData,
  parseStudentTaskUploadSignedUrlFormData,
  parseUploadStudentTaskFileFormData,
} from "@/lib/validators/manager/student-task-upload";
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
import {
  deleteStudentTaskUploadForManager,
  getStudentTaskUploadSignedUrlForManager,
  uploadStudentTaskFileForManager,
} from "@/services/classes/student-task-upload.service";
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
  DeleteStudentTaskUploadActionState,
  UpdateAttendeeActionState,
  UpdateClassSessionActionState,
  UpdateSessionSettingsActionState,
  UpdateSessionTaskActionState,
  UpdateStudentTaskActionState,
  UploadStudentTaskFileActionState,
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
  return runManagerAction({
    formData,
    parse: parseCreateClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      createClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      classRow: result.classRow,
    }),
  });
}

export async function updateClassAction(
  _prevState: UpdateClassActionState,
  formData: FormData
): Promise<UpdateClassActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      classRow: result.classRow,
    }),
  });
}

export async function updateClassStatusAction(
  _prevState: UpdateClassStatusActionState,
  formData: FormData
): Promise<UpdateClassStatusActionState> {
  return runManagerAction({
    formData,
    parse: parseChangeClassStatusFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassStatusForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      classRow: result.classRow,
    }),
  });
}

export async function createClassSessionAction(
  _prevState: CreateClassSessionActionState,
  formData: FormData
): Promise<CreateClassSessionActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateClassSessionFormData,
    mutate: ({ adminClient, actor, data }) =>
      createClassSessionForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
      classRow: result.classRow,
    }),
  });
}

export async function createFinalExamAction(
  _prevState: CreateFinalExamActionState,
  formData: FormData
): Promise<CreateFinalExamActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateFinalExamFormData,
    mutate: ({ adminClient, actor, data }) =>
      createFinalExamForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      finalExam: result.finalExam,
      studentGrades: result.studentGrades,
    }),
  });
}

export async function updateFinalExamAction(
  _prevState: UpdateFinalExamActionState,
  formData: FormData
): Promise<UpdateFinalExamActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateFinalExamFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateFinalExamForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      finalExam: result.finalExam,
    }),
  });
}

export async function updateStudentFinalExamGradeAction(
  _prevState: UpdateStudentFinalExamGradeActionState,
  formData: FormData
): Promise<UpdateStudentFinalExamGradeActionState> {
  return runManagerAction({
    formData,
    parse: parseEditStudentFinalExamGradeFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentFinalExamGradeForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      studentGrade: result.studentGrade,
    }),
  });
}

export async function addStudentToClassAction(
  _prevState: AddStudentToClassActionState,
  formData: FormData
): Promise<AddStudentToClassActionState> {
  return runManagerAction({
    formData,
    parse: parseAddStudentsToClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      addStudentsToClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      students: result.students,
      student: result.students[0],
      studentGrades: result.studentGrades,
      studentGrade: result.studentGrades[0],
      classRow: result.classRow,
      autoAssignedPhase: result.autoAssignedPhase,
      optionalPaymentPhases: result.optionalPaymentPhases,
    }),
  });
}

export async function removeStudentFromClassAction(
  _prevState: RemoveStudentFromClassActionState,
  formData: FormData
): Promise<RemoveStudentFromClassActionState> {
  return runManagerAction({
    formData,
    parse: parseRemoveStudentFromClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      removeStudentFromClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      removedStudentId: result.removedStudentId,
    }),
  });
}

export async function transferStudentBetweenClassesAction(
  _prevState: TransferStudentBetweenClassesActionState,
  formData: FormData
): Promise<TransferStudentBetweenClassesActionState> {
  return runManagerAction({
    formData,
    parse: parseTransferStudentBetweenClassesFormData,
    mutate: ({ adminClient, actor, data }) =>
      transferStudentBetweenClassesForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      revalidatePath(getManagerClassDetailRoute(result.from_class_id));
      revalidatePath(getManagerClassDetailRoute(result.to_class_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      student: result.student,
      from_class_id: result.from_class_id,
      to_class_id: result.to_class_id,
    }),
  });
}

export async function assignClassTeacherAction(
  _prevState: AssignClassTeacherActionState,
  formData: FormData
): Promise<AssignClassTeacherActionState> {
  return runManagerAction({
    formData,
    parse: parseAssignClassTeacherFormData,
    mutate: ({ adminClient, actor, data }) =>
      assignTeacherToClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      teacher: result.teacher,
      classRow: result.classRow,
    }),
  });
}

export async function unassignClassTeacherAction(
  _prevState: UnassignClassTeacherActionState,
  formData: FormData
): Promise<UnassignClassTeacherActionState> {
  return runManagerAction({
    formData,
    parse: parseUnassignClassTeacherFormData,
    mutate: ({ adminClient, actor, data }) =>
      unassignTeacherFromClassForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      teacherId: result.teacherId,
      classRow: result.classRow,
    }),
  });
}

export async function updateSessionSettingsAction(
  _prevState: UpdateSessionSettingsActionState,
  formData: FormData
): Promise<UpdateSessionSettingsActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSessionSettingsFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSessionSettingsForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
      linkedPhase: result.linkedPhase,
    }),
  });
}

export async function updateClassSessionAction(
  _prevState: UpdateClassSessionActionState,
  formData: FormData
): Promise<UpdateClassSessionActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateClassSessionFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateClassSessionForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      session: result.session,
    }),
  });
}

export async function deleteClassSessionAction(
  _prevState: DeleteClassSessionActionState,
  formData: FormData
): Promise<DeleteClassSessionActionState> {
  const sessionId = String(formData.get("session_id") ?? "").trim();

  if (!sessionId) {
    return {
      success: false,
      error: "Session not found.",
    };
  }

  return runManagerMutation({
    data: sessionId,
    mutate: ({ adminClient, actor, data }) =>
      deleteClassSessionForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(getManagerClassDetailRoute(result.classId));
    },
    mapSuccess: (result) => {
      redirect(
        appendQueryParam(
          getManagerClassDetailRoute(result.classId),
          "toast",
          "session_deleted"
        )
      );
    },
  });
}

export async function createSessionTaskAction(
  _prevState: CreateSessionTaskActionState,
  formData: FormData
): Promise<CreateSessionTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateSessionTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSessionTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath(
        getManagerClassSessionDetailRoute(data.class_id, data.session_id)
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
    }),
  });
}

export async function updateSessionTaskAction(
  _prevState: UpdateSessionTaskActionState,
  formData: FormData
): Promise<UpdateSessionTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSessionTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSessionTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getManagerClassDetailRoute(data.class_id));
      revalidatePath(
        getManagerClassSessionDetailRoute(data.class_id, data.session_id)
      );
      revalidatePath(
        getManagerClassSessionTaskDetailRoute(
          data.class_id,
          data.session_id,
          data.id
        )
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      task: result.task,
      gradesClamped: result.gradesClamped,
    }),
  });
}

export async function deleteSessionTaskAction(
  _prevState: DeleteSessionTaskActionState,
  formData: FormData
): Promise<DeleteSessionTaskActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();
  const session_id = String(formData.get("session_id") ?? "").trim();

  if (!id || !class_id || !session_id) {
    return {
      success: false,
      error: "Task not found.",
    };
  }

  return runManagerMutation({
    data: { id, class_id, session_id },
    mutate: ({ adminClient, actor, data }) =>
      deleteSessionTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(getManagerClassDetailRoute(result.classId));
      revalidatePath(
        getManagerClassSessionDetailRoute(result.classId, result.sessionId)
      );
    },
    mapSuccess: (result) => {
      redirect(
        appendQueryParam(
          getManagerClassSessionDetailRoute(result.classId, result.sessionId),
          "toast",
          "task_deleted"
        )
      );
    },
  });
}

export async function updateAttendeeAction(
  _prevState: UpdateAttendeeActionState,
  formData: FormData
): Promise<UpdateAttendeeActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateAttendeeFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateAttendeeForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      attendee: result.attendee,
    }),
  });
}

export async function updateStudentTaskAction(
  _prevState: UpdateStudentTaskActionState,
  formData: FormData
): Promise<UpdateStudentTaskActionState> {
  return runManagerAction({
    formData,
    parse: parseEditStudentTaskFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentTaskForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
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
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      studentTask: result.studentTask,
    }),
  });
}

export async function uploadStudentTaskFileAction(
  _prevState: UploadStudentTaskFileActionState,
  formData: FormData
): Promise<UploadStudentTaskFileActionState> {
  return runManagerAction({
    formData,
    parse: parseUploadStudentTaskFileFormData,
    mutate: ({ adminClient, actor, data }) =>
      uploadStudentTaskFileForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
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
            result.taskId
          )
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      upload: result.upload,
    }),
  });
}

export async function deleteStudentTaskUploadAction(
  _prevState: DeleteStudentTaskUploadActionState,
  formData: FormData
): Promise<DeleteStudentTaskUploadActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteStudentTaskUploadFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteStudentTaskUploadForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
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
            result.taskId
          )
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      uploadId: result.uploadId,
    }),
  });
}

export async function getStudentTaskUploadSignedUrlAction(
  formData: FormData
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  return runManagerAction({
    formData,
    parse: parseStudentTaskUploadSignedUrlFormData,
    mutate: ({ adminClient, actor, data }) =>
      getStudentTaskUploadSignedUrlForManager(adminClient, actor.userId, data),
    mapSuccess: (result) => ({
      success: true,
      signedUrl: result.signedUrl,
    }),
  });
}
