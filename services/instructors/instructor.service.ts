import { unstable_cache } from "next/cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import * as authRepository from "@/repositories/auth.repository";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as profileRepository from "@/repositories/profile.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { syncWorkshopAttributeAccessOverlay } from "@/services/auth/workshop-attribute-access.service";
import { SUBJECT_SCOPES } from "@/lib/constants/subject-scope";
import { loadSubjectScopeData } from "@/services/subjects/subject-catalog.service";
import { addInstructorsSchema } from "@/lib/validators/manager/add-instructors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ManagerInstructorCandidateRow,
  ManagerInstructorsPageData,
} from "@/types/manager-instructor";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

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
  const instructorsResult =
    await profileRepository.listInstructorProfiles(adminClient);

  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  const [instructorsMapped, subjectScopeData] = await Promise.all([
    mapProfilesWithEmail(adminClient, instructorsResult.data ?? []),
    loadSubjectScopeData(adminClient, SUBJECT_SCOPES.INSTRUCTOR),
  ]);

  const instructors = instructorsMapped.sort((a, b) =>
    (a.username ?? a.email).localeCompare(b.username ?? b.email)
  );

  return {
    instructors,
    candidateUsers: [],
    subjects: subjectScopeData.subjects,
    capabilities: subjectScopeData.capabilities,
  };
}

const getInstructorsPageForManagerCached = unstable_cache(
  async () => {
    const adminClient = createSupabaseAdminClient();
    return fetchInstructorsPageForManager(adminClient);
  },
  // Key bumped when the payload moved from mentorSubjects to instructor subjects.
  ["manager-instructors-page-v2"],
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

  const overlaySync = await syncWorkshopAttributeAccessOverlay(
    adminClient,
    actorUserId ? { userId: actorUserId, userLabel: "Manager" } : null,
    {
      userId: trimmedId,
      previousIsInstructor: true,
      previousIsMentor: existing.data.is_mentor === true,
      nextIsInstructor: false,
      nextIsMentor: existing.data.is_mentor === true,
    }
  );
  if (!overlaySync.success) {
    return { success: false, error: overlaySync.error };
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

  for (const profile of profiles ?? []) {
    if (profile.is_instructor) {
      continue;
    }
    const overlaySync = await syncWorkshopAttributeAccessOverlay(
      adminClient,
      actorUserId ? { userId: actorUserId, userLabel: "Manager" } : null,
      {
        userId: profile.id,
        previousIsInstructor: false,
        previousIsMentor: profile.is_mentor === true,
        nextIsInstructor: true,
        nextIsMentor: profile.is_mentor === true,
      }
    );
    if (!overlaySync.success) {
      return { success: false, error: overlaySync.error };
    }
    clearCachedSessionShell(profile.id);
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
