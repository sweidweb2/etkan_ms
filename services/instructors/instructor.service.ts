import { unstable_cache } from "next/cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import * as authRepository from "@/repositories/auth.repository";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as mentorSubjectCapabilityRepository from "@/repositories/mentor-subject-capability.repository";
import * as mentorSubjectRepository from "@/repositories/mentor-subject.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { saveInstructorCapabilitiesSchema } from "@/lib/validators/manager/save-instructor-capabilities";
import { setInstructorCapabilitySchema } from "@/lib/validators/manager/set-instructor-capability";
import { createMentorSubjectSchema } from "@/lib/validators/manager/create-mentor-subject";
import { updateMentorSubjectSchema } from "@/lib/validators/manager/update-mentor-subject";
import { saveMentorSubjectOrderSchema } from "@/lib/validators/manager/save-mentor-subject-order";
import { addInstructorsSchema } from "@/lib/validators/manager/add-instructors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ManagerInstructorCandidateRow,
  ManagerInstructorCapabilityPair,
  ManagerInstructorsPageData,
  ManagerMentorSubjectColumn,
} from "@/types/manager-instructor";
import type { FieldErrors } from "@/types/auth";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

function pairKey(userId: string, mentorSubjectId: string) {
  return `${userId}:${mentorSubjectId}`;
}

function toMentorSubjectColumn(row: {
  id: string;
  name: string;
  sort_order: number;
}): ManagerMentorSubjectColumn {
  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
  };
}

async function mapProfilesWithEmail(
  adminClient: Supabase,
  profiles: {
    id: string;
    username: string | null;
    role: string;
    created_at: string | null;
  }[]
) {
  const emailResult = await authRepository.listAuthEmailsByIds(
    adminClient,
    profiles.map((profile) => profile.id)
  );

  if (emailResult.error) {
    throw new Error(emailResult.error.message);
  }

  const emailById = emailResult.data ?? new Map<string, string>();

  return profiles.map((profile) => ({
    id: profile.id,
    username: profile.username,
    role: profile.role as RoleValue,
    email: emailById.get(profile.id) ?? "",
    created_at: profile.created_at ?? new Date().toISOString(),
  }));
}

async function fetchInstructorsPageForManager(
  adminClient: Supabase
): Promise<ManagerInstructorsPageData> {
  const [instructorsResult, mentorSubjectsResult] = await Promise.all([
    profileRepository.listInstructorProfiles(adminClient),
    mentorSubjectRepository.listMentorSubjects(adminClient),
  ]);

  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }
  if (mentorSubjectsResult.error) {
    throw new Error(mentorSubjectsResult.error.message);
  }

  const mentorSubjects = (mentorSubjectsResult.data ?? []).map(
    toMentorSubjectColumn
  );

  const profiles = instructorsResult.data ?? [];
  const instructorIds = profiles.map((row) => row.id);
  const mentorSubjectIds = new Set(mentorSubjects.map((row) => row.id));

  const [instructorsMapped, capabilitiesResult] = await Promise.all([
    mapProfilesWithEmail(adminClient, profiles),
    mentorSubjectCapabilityRepository.listMentorSubjectCapabilitiesByUserIds(
      adminClient,
      instructorIds
    ),
  ]);

  if (capabilitiesResult.error) {
    throw new Error(capabilitiesResult.error.message);
  }

  const instructors = instructorsMapped.sort((a, b) =>
    (a.username ?? a.email).localeCompare(b.username ?? b.email)
  );

  const capabilities = (capabilitiesResult.data ?? [])
    .filter(
      (row) =>
        instructorIds.includes(row.user_id) &&
        mentorSubjectIds.has(row.mentor_subject_id)
    )
    .map((row) => ({
      user_id: row.user_id,
      mentor_subject_id: row.mentor_subject_id,
    }));

  return {
    instructors,
    candidateUsers: [],
    mentorSubjects,
    capabilities,
  };
}

const getInstructorsPageForManagerCached = unstable_cache(
  async () => {
    const adminClient = createSupabaseAdminClient();
    return fetchInstructorsPageForManager(adminClient);
  },
  ["manager-instructors-page"],
  { tags: [MANAGER_CACHE_TAGS.INSTRUCTORS], revalidate: 3600 }
);

export async function getInstructorsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerInstructorsPageData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.INSTRUCTORS_VIEW);
  return getInstructorsPageForManagerCached();
}

export async function listInstructorCandidatesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerInstructorCandidateRow[]> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_CREATE
  );
  if (unauthorized) {
    return [];
  }

  const candidatesResult =
    await profileRepository.listNonInstructorProfiles(adminClient);

  if (candidatesResult.error) {
    throw new Error(candidatesResult.error.message);
  }

  const candidatesMapped = await mapProfilesWithEmail(
    adminClient,
    candidatesResult.data ?? []
  );

  return candidatesMapped
    .map(({ id, username, role, email }) => ({
      id,
      username,
      role,
      email,
    }))
    .sort((a, b) =>
      (a.username ?? a.email).localeCompare(b.username ?? b.email)
    );
}

export type SaveInstructorCapabilitiesResult =
  | {
      success: true;
      message: string;
      capabilities: ManagerInstructorCapabilityPair[];
    }
  | { success: false; error: string };

export async function saveInstructorSubjectCapabilities(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { capabilities: ManagerInstructorCapabilityPair[] }
): Promise<SaveInstructorCapabilitiesResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = saveInstructorCapabilitiesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please fix the capability selections." };
  }

  const instructorIdsResult =
    await profileRepository.listInstructorProfileIds(adminClient);

  if (instructorIdsResult.error) {
    return { success: false, error: instructorIdsResult.error.message };
  }

  const instructorIds = (instructorIdsResult.data ?? []).map((row) => row.id);

  const [mentorSubjectIdsResult, existingResult] = await Promise.all([
    mentorSubjectRepository.listMentorSubjectIds(adminClient),
    mentorSubjectCapabilityRepository.listMentorSubjectCapabilitiesByUserIds(
      adminClient,
      instructorIds
    ),
  ]);

  if (mentorSubjectIdsResult.error) {
    return { success: false, error: mentorSubjectIdsResult.error.message };
  }

  const mentorSubjectIds = new Set(
    (mentorSubjectIdsResult.data ?? []).map((row) => row.id)
  );

  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  const instructorIdSet = new Set(instructorIds);

  const desired = parsed.data.capabilities.filter(
    (pair) =>
      instructorIdSet.has(pair.user_id) &&
      mentorSubjectIds.has(pair.mentor_subject_id)
  );

  const desiredKeys = new Set(
    desired.map((pair) => pairKey(pair.user_id, pair.mentor_subject_id))
  );

  const existing = (existingResult.data ?? []).filter((row) =>
    instructorIdSet.has(row.user_id)
  );
  const existingKeys = new Set(
    existing.map((row) => pairKey(row.user_id, row.mentor_subject_id))
  );

  const toInsert = desired.filter(
    (pair) => !existingKeys.has(pairKey(pair.user_id, pair.mentor_subject_id))
  );
  const toDelete = existing
    .filter(
      (row) => !desiredKeys.has(pairKey(row.user_id, row.mentor_subject_id))
    )
    .map((row) => ({
      user_id: row.user_id,
      mentor_subject_id: row.mentor_subject_id,
    }));

  const { error: deleteError } =
    await mentorSubjectCapabilityRepository.deleteCapabilitiesByPairs(
      adminClient,
      toDelete
    );
  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const { error: insertError } =
    await mentorSubjectCapabilityRepository.insertCapabilities(
      adminClient,
      toInsert
    );
  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    message: "Instructor capabilities saved.",
    capabilities: desired,
  };
}

export type SetInstructorCapabilityResult =
  | {
      success: true;
      message: string;
      user_id: string;
      mentor_subject_id: string;
      enabled: boolean;
    }
  | { success: false; error: string };

export async function setInstructorCapabilityForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { user_id: string; mentor_subject_id: string; enabled: boolean }
): Promise<SetInstructorCapabilityResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = setInstructorCapabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid capability selection." };
  }

  const { user_id, mentor_subject_id, enabled } = parsed.data;

  const [profileResult, subjectResult, existingResult] = await Promise.all([
    profileRepository.findProfileById(adminClient, user_id),
    mentorSubjectRepository.findMentorSubjectById(
      adminClient,
      mentor_subject_id
    ),
    mentorSubjectCapabilityRepository.listMentorSubjectCapabilitiesByUserIds(
      adminClient,
      [user_id]
    ),
  ]);

  if (profileResult.error) {
    return { success: false, error: profileResult.error.message };
  }
  if (!profileResult.data?.is_instructor) {
    return { success: false, error: "Instructor not found." };
  }

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message };
  }
  if (!subjectResult.data) {
    return { success: false, error: "Mentor subject not found." };
  }

  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  const alreadyEnabled = (existingResult.data ?? []).some(
    (row) => row.mentor_subject_id === mentor_subject_id
  );

  if (enabled === alreadyEnabled) {
    return {
      success: true,
      message: "Capability updated.",
      user_id,
      mentor_subject_id,
      enabled,
    };
  }

  if (enabled) {
    const { error } = await mentorSubjectCapabilityRepository.insertCapabilities(
      adminClient,
      [{ user_id, mentor_subject_id }]
    );
    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } =
      await mentorSubjectCapabilityRepository.deleteCapabilitiesByPairs(
        adminClient,
        [{ user_id, mentor_subject_id }]
      );
    if (error) {
      return { success: false, error: error.message };
    }
  }

  return {
    success: true,
    message: "Capability updated.",
    user_id,
    mentor_subject_id,
    enabled,
  };
}

export async function listInstructorCapabilitiesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerInstructorCapabilityPair[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.INSTRUCTORS_VIEW);

  const instructorIdsResult =
    await profileRepository.listInstructorProfileIds(adminClient);
  if (instructorIdsResult.error) {
    throw new Error(instructorIdsResult.error.message);
  }

  const instructorIds = (instructorIdsResult.data ?? []).map((row) => row.id);
  if (instructorIds.length === 0) {
    return [];
  }

  const [mentorSubjectIdsResult, capabilitiesResult] = await Promise.all([
    mentorSubjectRepository.listMentorSubjectIds(adminClient),
    mentorSubjectCapabilityRepository.listMentorSubjectCapabilitiesByUserIds(
      adminClient,
      instructorIds
    ),
  ]);

  if (mentorSubjectIdsResult.error) {
    throw new Error(mentorSubjectIdsResult.error.message);
  }
  if (capabilitiesResult.error) {
    throw new Error(capabilitiesResult.error.message);
  }

  const mentorSubjectIds = new Set(
    (mentorSubjectIdsResult.data ?? []).map((row) => row.id)
  );
  const instructorIdSet = new Set(instructorIds);

  return (capabilitiesResult.data ?? [])
    .filter(
      (row) =>
        instructorIdSet.has(row.user_id) &&
        mentorSubjectIds.has(row.mentor_subject_id)
    )
    .map((row) => ({
      user_id: row.user_id,
      mentor_subject_id: row.mentor_subject_id,
    }));
}

export type MentorSubjectMutationResult =
  | {
      success: true;
      message: string;
      mentorSubject: ManagerMentorSubjectColumn;
    }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export async function createMentorSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { name: string }
): Promise<MentorSubjectMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createMentorSubjectSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        name: flattened.name,
      },
    };
  }

  const name = parsed.data.name.trim();
  const existingByName = await mentorSubjectRepository.findMentorSubjectByName(
    adminClient,
    name
  );
  if (existingByName.error) {
    return { success: false, error: existingByName.error.message };
  }
  if (existingByName.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A mentor subject with this name already exists."] },
    };
  }

  const maxSortResult =
    await mentorSubjectRepository.getMaxMentorSubjectSortOrder(adminClient);
  if (maxSortResult.error) {
    return { success: false, error: maxSortResult.error.message };
  }

  const nextSortOrder =
    maxSortResult.data?.sort_order !== undefined
      ? maxSortResult.data.sort_order + 1
      : 0;

  const created = await mentorSubjectRepository.createMentorSubject(
    adminClient,
    { name, sort_order: nextSortOrder }
  );
  if (created.error || !created.data) {
    return {
      success: false,
      error: created.error?.message ?? "Unable to create mentor subject.",
    };
  }

  return {
    success: true,
    message: "Mentor subject created.",
    mentorSubject: toMentorSubjectColumn(created.data),
  };
}

export async function updateMentorSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { id: string; name: string }
): Promise<MentorSubjectMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateMentorSubjectSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        id: flattened.id,
        name: flattened.name,
      },
    };
  }

  const existing = await mentorSubjectRepository.findMentorSubjectById(
    adminClient,
    parsed.data.id
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Mentor subject not found." };
  }

  const name = parsed.data.name.trim();
  const existingByName = await mentorSubjectRepository.findMentorSubjectByName(
    adminClient,
    name
  );
  if (existingByName.error) {
    return { success: false, error: existingByName.error.message };
  }
  if (existingByName.data && existingByName.data.id !== parsed.data.id) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A mentor subject with this name already exists."] },
    };
  }

  const updated = await mentorSubjectRepository.updateMentorSubjectById(
    adminClient,
    parsed.data.id,
    { name }
  );
  if (updated.error || !updated.data) {
    return {
      success: false,
      error: updated.error?.message ?? "Unable to update mentor subject.",
    };
  }

  return {
    success: true,
    message: "Mentor subject updated.",
    mentorSubject: toMentorSubjectColumn(updated.data),
  };
}

export type DeleteMentorSubjectResult =
  | { success: true; message: string; mentorSubjectId: string }
  | { success: false; error: string };

export async function deleteMentorSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  mentorSubjectId: string
): Promise<DeleteMentorSubjectResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const trimmedId = mentorSubjectId.trim();
  if (!trimmedId) {
    return { success: false, error: "Mentor subject not found." };
  }

  const existing = await mentorSubjectRepository.findMentorSubjectById(
    adminClient,
    trimmedId
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Mentor subject not found." };
  }

  const { error } = await mentorSubjectRepository.deleteMentorSubjectById(
    adminClient,
    trimmedId
  );
  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "Mentor subject deleted.",
    mentorSubjectId: trimmedId,
  };
}

export type SaveMentorSubjectOrderResult =
  | {
      success: true;
      message: string;
      mentorSubjects: ManagerMentorSubjectColumn[];
    }
  | { success: false; error: string };

export async function saveMentorSubjectOrderForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { orderedIds: string[] }
): Promise<SaveMentorSubjectOrderResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_MENTOR_SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = saveMentorSubjectOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please fix the mentor subject order." };
  }

  const orderedIds = parsed.data.orderedIds;
  const reorderResult = await mentorSubjectRepository.reorderMentorSubjects(
    adminClient,
    orderedIds
  );

  if (reorderResult.error) {
    return { success: false, error: reorderResult.error.message };
  }

  return {
    success: true,
    message: "Mentor subject order saved.",
    mentorSubjects: (reorderResult.data ?? []).map(toMentorSubjectColumn),
  };
}

export type RemoveInstructorResult =
  | { success: true; message: string; userId: string }
  | { success: false; error: string };

export async function removeInstructorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<RemoveInstructorResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const trimmedId = userId.trim();
  if (!trimmedId) {
    return { success: false, error: "Instructor not found." };
  }

  const existing = await profileRepository.findProfileById(
    adminClient,
    trimmedId
  );
  if (existing.error || !existing.data) {
    return { success: false, error: "Instructor not found." };
  }

  if (!existing.data.is_instructor) {
    return { success: false, error: "This user is not an instructor." };
  }

  const relatedClear = await clearInstructorWorkshopRelatedData(
    adminClient,
    trimmedId
  );
  if (relatedClear.error) {
    return { success: false, error: relatedClear.error };
  }

  const { error: profileError } =
    await profileRepository.updateProfileInstructorFlag(
      adminClient,
      trimmedId,
      false
    );
  if (profileError) {
    return { success: false, error: profileError.message };
  }

  clearCachedSessionShell(trimmedId);

  return {
    success: true,
    message: "Instructor removed.",
    userId: trimmedId,
  };
}

export type AddInstructorsResult =
  | { success: true; message: string; addedCount: number }
  | { success: false; error: string };

export async function addInstructorsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { userIds: string[] }
): Promise<AddInstructorsResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTORS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = addInstructorsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Select at least one user.",
    };
  }

  const uniqueIds = [...new Set(parsed.data.userIds)];

  const { data: profiles, error: listError } =
    await profileRepository.listProfilesByIds(adminClient, uniqueIds);

  if (listError) {
    return { success: false, error: listError.message };
  }

  const foundIds = new Set((profiles ?? []).map((row) => row.id));
  if (foundIds.size !== uniqueIds.length) {
    return { success: false, error: "One or more users were not found." };
  }

  const toPromote = (profiles ?? [])
    .filter((row) => !row.is_instructor)
    .map((row) => row.id);

  if (toPromote.length === 0) {
    return {
      success: true,
      message: "Selected users are already instructors.",
      addedCount: 0,
    };
  }

  const { error: updateError } =
    await profileRepository.setProfilesInstructorFlag(
      adminClient,
      toPromote,
      true
    );

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  for (const id of toPromote) {
    clearCachedSessionShell(id);
  }

  return {
    success: true,
    message:
      toPromote.length === 1
        ? "Instructor added."
        : `${toPromote.length} instructors added.`,
    addedCount: toPromote.length,
  };
}
