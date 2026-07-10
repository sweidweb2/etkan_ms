"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAddStudentToClassFormData } from "@/lib/validators/manager/add-student-to-class";
import {
  parseAssignClassTeacherFormData,
  parseUnassignClassTeacherFormData,
} from "@/lib/validators/manager/assign-class-teacher";
import { parseCreateClassFormData } from "@/lib/validators/manager/create-class";
import { parseCreateClassSessionFormData } from "@/lib/validators/manager/create-class-session";
import { parseCreateFinalExamFormData } from "@/lib/validators/manager/create-final-exam";
import { parseEditStudentFinalExamGradeFormData } from "@/lib/validators/manager/edit-student-finalexam-grade";
import {
  parseChangeClassStatusFormData,
  parseUpdateClassFormData,
} from "@/lib/validators/manager/update-class";
import {
  addStudentToClassForManager,
  assignTeacherToClassForManager,
  createClassForManager,
  createClassSessionForManager,
  createFinalExamForManager,
  unassignTeacherFromClassForManager,
  updateClassForManager,
  updateClassStatusForManager,
  updateStudentFinalExamGradeForManager,
} from "@/services/class.service";
import type {
  AddStudentToClassActionState,
  AssignClassTeacherActionState,
  CreateClassActionState,
  CreateClassSessionActionState,
  CreateFinalExamActionState,
  UnassignClassTeacherActionState,
  UpdateClassActionState,
  UpdateClassStatusActionState,
  UpdateStudentFinalExamGradeActionState,
} from "@/types/manager-class-detail";

export async function createClassAction(
  _prevState: CreateClassActionState,
  formData: FormData
): Promise<CreateClassActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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

export async function createClassSessionAction(
  _prevState: CreateClassSessionActionState,
  formData: FormData
): Promise<CreateClassSessionActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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

export async function updateStudentFinalExamGradeAction(
  _prevState: UpdateStudentFinalExamGradeActionState,
  formData: FormData
): Promise<UpdateStudentFinalExamGradeActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseAddStudentToClassFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await addStudentToClassForManager(
    adminClient,
    actorRole,
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
    student: result.student,
    studentGrade: result.studentGrade,
    classRow: result.classRow,
  };
}

export async function assignClassTeacherAction(
  _prevState: AssignClassTeacherActionState,
  formData: FormData
): Promise<AssignClassTeacherActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    actorRole,
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
