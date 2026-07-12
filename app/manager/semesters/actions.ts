"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAddStudentToSemesterFormData } from "@/lib/validators/manager/add-student-to-semester";
import { parseConnectSemesterClassFormData } from "@/lib/validators/manager/connect-semester-class";
import { parseCreatePhaseFormData } from "@/lib/validators/manager/create-phase";
import { parseUpdatePhaseFormData } from "@/lib/validators/manager/update-phase";
import {
  connectClassToSemesterForManager,
  createSemesterForManager,
  updateSemesterForManager,
} from "@/services/semester.service";
import { addStudentToSemesterForManager } from "@/services/student-semester.service";
import type {
  AddStudentToSemesterActionState,
  ConnectSemesterClassActionState,
  CreateSemesterActionState,
  UpdateSemesterActionState,
} from "@/types/manager-phase";

export async function createSemesterAction(
  _prevState: CreateSemesterActionState,
  formData: FormData
): Promise<CreateSemesterActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseCreatePhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createSemesterForManager(
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
    semester: result.semester,
  };
}

export async function updateSemesterAction(
  _prevState: UpdateSemesterActionState,
  formData: FormData
): Promise<UpdateSemesterActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseUpdatePhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSemesterForManager(
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
    semester: result.semester,
  };
}

export async function addStudentToSemesterAction(
  _prevState: AddStudentToSemesterActionState,
  formData: FormData
): Promise<AddStudentToSemesterActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseAddStudentToSemesterFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await addStudentToSemesterForManager(
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
    enrollment: result.enrollment,
  };
}

export async function connectClassToSemesterAction(
  _prevState: ConnectSemesterClassActionState,
  formData: FormData
): Promise<ConnectSemesterClassActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseConnectSemesterClassFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await connectClassToSemesterForManager(
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
    semester: result.semester,
  };
}
