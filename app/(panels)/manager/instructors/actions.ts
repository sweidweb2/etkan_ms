"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerScheduleInstructors } from "@/lib/cache/instructor-schedule-cache";
import { revalidateManagerInstructorsList, revalidateManagerUsersList } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAddInstructorsFormData } from "@/lib/validators/manager/add-instructors";
import { parseCreateMentorSubjectFormData } from "@/lib/validators/manager/create-mentor-subject";
import { parseSaveMentorSubjectOrderFormData } from "@/lib/validators/manager/save-mentor-subject-order";
import { parseSetInstructorCapabilityInput } from "@/lib/validators/manager/set-instructor-capability";
import { parseUpdateMentorSubjectFormData } from "@/lib/validators/manager/update-mentor-subject";
import {
  addInstructorsForManager,
  createMentorSubjectForManager,
  deleteMentorSubjectForManager,
  listInstructorCapabilitiesForManager,
  listInstructorCandidatesForManager,
  removeInstructorForManager,
  saveMentorSubjectOrderForManager,
  setInstructorCapabilityForManager,
  updateMentorSubjectForManager,
} from "@/services/instructors/instructor.service";
import type {
  AddInstructorsActionState,
  CreateMentorSubjectActionState,
  DeleteMentorSubjectActionState,
  ManagerInstructorCandidateRow,
  ManagerInstructorCapabilityPair,
  RemoveInstructorActionState,
  SaveMentorSubjectOrderActionState,
  SetInstructorCapabilityResult,
  UpdateMentorSubjectActionState,
} from "@/types/manager-instructor";

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

export async function loadInstructorCapabilitiesAction(): Promise<
  ManagerInstructorCapabilityPair[]
> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listInstructorCapabilitiesForManager(adminClient, actor.userId);
  } catch {
    return [];
  }
}

export async function setInstructorCapabilityAction(
  input: unknown
): Promise<SetInstructorCapabilityResult> {
  const actor = await getSessionAuditActor();
  const parsed = parseSetInstructorCapabilityInput(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await setInstructorCapabilityForManager(
    adminClient,
    actor.userId,
    parsed.data
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    user_id: result.user_id,
    mentor_subject_id: result.mentor_subject_id,
    enabled: result.enabled,
  };
}

export async function createMentorSubjectAction(
  _prevState: CreateMentorSubjectActionState,
  formData: FormData
): Promise<CreateMentorSubjectActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateMentorSubjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createMentorSubjectForManager(
    adminClient,
    actor.userId,
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
    mentorSubject: result.mentorSubject,
  };
}

export async function updateMentorSubjectAction(
  _prevState: UpdateMentorSubjectActionState,
  formData: FormData
): Promise<UpdateMentorSubjectActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateMentorSubjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateMentorSubjectForManager(
    adminClient,
    actor.userId,
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
    mentorSubject: result.mentorSubject,
  };
}

export async function deleteMentorSubjectAction(
  _prevState: DeleteMentorSubjectActionState,
  formData: FormData
): Promise<DeleteMentorSubjectActionState> {
  const actor = await getSessionAuditActor();
  const mentorSubjectId = String(formData.get("id") ?? "").trim();

  if (!mentorSubjectId) {
    return { success: false, error: "Mentor subject not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteMentorSubjectForManager(
    adminClient,
    actor.userId,
    mentorSubjectId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    mentorSubjectId: result.mentorSubjectId,
  };
}

export async function saveMentorSubjectOrderAction(
  _prevState: SaveMentorSubjectOrderActionState,
  formData: FormData
): Promise<SaveMentorSubjectOrderActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSaveMentorSubjectOrderFormData(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await saveMentorSubjectOrderForManager(
    adminClient,
    actor.userId,
    parsed.data
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateManagerInstructorsList();

  return {
    success: true,
    message: result.message,
    mentorSubjects: result.mentorSubjects,
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
