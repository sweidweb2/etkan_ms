"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerScheduleInstructors } from "@/lib/cache/instructor-schedule-cache";
import { revalidateManagerInstructorsList, revalidateManagerUsersList } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAddInstructorsFormData } from "@/lib/validators/manager/add-instructors";
import { parseSaveInstructorCapabilitiesFormData } from "@/lib/validators/manager/save-instructor-capabilities";
import {
  addInstructorsForManager,
  listInstructorCandidatesForManager,
  removeInstructorForManager,
  saveInstructorSubjectCapabilities,
} from "@/services/instructors/instructor.service";
import type {
  AddInstructorsActionState,
  ManagerInstructorCandidateRow,
  RemoveInstructorActionState,
  SaveInstructorCapabilitiesActionState,
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

export async function saveInstructorCapabilitiesAction(
  _prevState: SaveInstructorCapabilitiesActionState,
  formData: FormData
): Promise<SaveInstructorCapabilitiesActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSaveInstructorCapabilitiesFormData(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await saveInstructorSubjectCapabilities(
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
    capabilities: result.capabilities,
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
