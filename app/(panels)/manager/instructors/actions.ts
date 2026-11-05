"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerScheduleInstructors } from "@/lib/cache/instructor-schedule-cache";
import {
  revalidateManagerInstructorsList,
  revalidateManagerUsersList,
} from "@/lib/cache/manager-list-cache";
import { isSubjectScope, type SubjectScope } from "@/lib/constants/subject-scope";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAddInstructorsFormData } from "@/lib/validators/manager/add-instructors";
import { parseCreateCapabilitySubjectFormData } from "@/lib/validators/manager/create-capability-subject";
import { parseSaveCapabilitySubjectOrderFormData } from "@/lib/validators/manager/save-capability-subject-order";
import { parseSetSubjectCapabilityInput } from "@/lib/validators/manager/set-subject-capability";
import { parseUpdateCapabilitySubjectFormData } from "@/lib/validators/manager/update-capability-subject";
import {
  addInstructorsForManager,
  listInstructorCandidatesForManager,
  removeInstructorForManager,
} from "@/services/instructors/instructor.service";
import {
  createSubjectForManager,
  deleteSubjectForManager,
  listSubjectCapabilitiesForManager,
  saveSubjectOrderForManager,
  setSubjectCapabilityForManager,
  updateSubjectForManager,
} from "@/services/subjects/subject-catalog.service";
import type {
  AddInstructorsActionState,
  ManagerInstructorCandidateRow,
  RemoveInstructorActionState,
} from "@/types/manager-instructor";
import type {
  CreateSubjectActionState,
  DeleteSubjectActionState,
  ManagerSubjectCapabilityPair,
  SaveSubjectOrderActionState,
  SetSubjectCapabilityResult,
  UpdateSubjectActionState,
} from "@/types/manager-capability-subject";

export async function loadInstructorCandidatesAction(): Promise<
  ManagerInstructorCandidateRow[]
> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listInstructorCandidatesForManager(adminClient, actor.userId);
  } catch {
    return [];
  }
}

export async function loadSubjectCapabilitiesAction(
  scope: SubjectScope
): Promise<ManagerSubjectCapabilityPair[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId || !isSubjectScope(scope)) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listSubjectCapabilitiesForManager(
      adminClient,
      actor.userId,
      scope
    );
  } catch {
    return [];
  }
}

export async function setSubjectCapabilityAction(
  input: unknown
): Promise<SetSubjectCapabilityResult> {
  const actor = await getSessionAuditActor();
  const parsed = parseSetSubjectCapabilityInput(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  const { scope, ...capability } = parsed.data;

  const adminClient = createSupabaseAdminClient();
  const result = await setSubjectCapabilityForManager(
    adminClient,
    actor.userId,
    scope,
    capability
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    scope,
    user_id: result.user_id,
    subject_id: result.subject_id,
    enabled: result.enabled,
  };
}

export async function createSubjectAction(
  _prevState: CreateSubjectActionState,
  formData: FormData
): Promise<CreateSubjectActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateCapabilitySubjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createSubjectForManager(
    adminClient,
    actor.userId,
    parsed.scope,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    subject: result.subject,
  };
}

export async function updateSubjectAction(
  _prevState: UpdateSubjectActionState,
  formData: FormData
): Promise<UpdateSubjectActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateCapabilitySubjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSubjectForManager(
    adminClient,
    actor.userId,
    parsed.scope,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    subject: result.subject,
  };
}

export async function deleteSubjectAction(
  _prevState: DeleteSubjectActionState,
  formData: FormData
): Promise<DeleteSubjectActionState> {
  const actor = await getSessionAuditActor();
  const scope = formData.get("scope");
  const subjectId = String(formData.get("id") ?? "").trim();

  if (!isSubjectScope(scope)) {
    return { success: false, error: "Invalid subject scope." };
  }
  if (!subjectId) {
    return { success: false, error: "Subject not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteSubjectForManager(
    adminClient,
    actor.userId,
    scope,
    subjectId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    subjectId: result.subjectId,
  };
}

export async function saveSubjectOrderAction(
  _prevState: SaveSubjectOrderActionState,
  formData: FormData
): Promise<SaveSubjectOrderActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSaveCapabilitySubjectOrderFormData(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await saveSubjectOrderForManager(
    adminClient,
    actor.userId,
    parsed.scope,
    parsed.data
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    subjects: result.subjects,
  };
}

export async function removeInstructorAction(
  _prevState: RemoveInstructorActionState,
  formData: FormData
): Promise<RemoveInstructorActionState> {
  const actor = await getSessionAuditActor();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    return { success: false, error: "Instructor not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await removeInstructorForManager(
    adminClient,
    actor.userId,
    userId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();
  revalidateManagerUsersList();
  revalidateManagerScheduleInstructors();

  return {
    success: true,
    message: result.message,
    userId: result.userId,
  };
}

export async function addInstructorsAction(
  _prevState: AddInstructorsActionState,
  formData: FormData
): Promise<AddInstructorsActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseAddInstructorsFormData(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await addInstructorsForManager(
    adminClient,
    actor.userId,
    parsed.data
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();
  revalidateManagerUsersList();
  revalidateManagerScheduleInstructors();

  return {
    success: true,
    message: result.message,
    addedCount: result.addedCount,
  };
}
