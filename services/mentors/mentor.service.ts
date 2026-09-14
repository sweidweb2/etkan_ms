import { unstable_cache } from "next/cache";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addMentorsSchema } from "@/lib/validators/manager/add-mentors";
import { SUBJECT_SCOPES } from "@/lib/constants/subject-scope";
import * as authRepository from "@/repositories/auth.repository";
import { clearMentorRelatedData } from "@/repositories/clear-mentor-related.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { loadSubjectScopeData } from "@/services/subjects/subject-catalog.service";
import type {
  ManagerMentorCandidateRow,
  ManagerMentorRow,
} from "@/types/manager-mentor";
import type { ManagerSubjectScopeData } from "@/types/manager-capability-subject";
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
): Promise<ManagerMentorRow[]> {
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

async function fetchMentorsForManager(
  adminClient: Supabase
): Promise<ManagerMentorRow[]> {
  const mentorsResult = await profileRepository.listMentorProfiles(adminClient);

  if (mentorsResult.error) {
    throw new Error(mentorsResult.error.message);
  }

  const mentors = await mapProfilesWithEmail(
    adminClient,
    mentorsResult.data ?? []
  );

  return mentors.sort((a, b) =>
    (a.username ?? a.email).localeCompare(b.username ?? b.email)
  );
}

const getMentorsForManagerCached = unstable_cache(
  async () => {
    const adminClient = createSupabaseAdminClient();
    return fetchMentorsForManager(adminClient);
  },
  ["manager-mentors-list"],
  { tags: [MANAGER_CACHE_TAGS.MENTORS], revalidate: 3600 }
);

export async function getMentorsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerMentorRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.MENTORS_VIEW);
  return getMentorsForManagerCached();
}

const getMentorSubjectsPageForManagerCached = unstable_cache(
  async () => {
    const adminClient = createSupabaseAdminClient();
    return loadSubjectScopeData(adminClient, SUBJECT_SCOPES.MENTOR);
  },
  ["manager-mentor-subjects-page"],
  { tags: [MANAGER_CACHE_TAGS.MENTOR_SUBJECTS], revalidate: 3600 }
);

/** Lazy payload for the Mentors tab: mentor catalog plus capability pairs. */
export async function getMentorSubjectsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerSubjectScopeData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.MENTORS_VIEW);
  return getMentorSubjectsPageForManagerCached();
}

export async function listMentorCandidatesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerMentorCandidateRow[]> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.MENTORS_CREATE
  );
  if (unauthorized) {
    return [];
  }

  const candidatesResult =
    await profileRepository.listNonMentorProfiles(adminClient);

  if (candidatesResult.error) {
    throw new Error(candidatesResult.error.message);
  }

  const candidates = await mapProfilesWithEmail(
    adminClient,
    candidatesResult.data ?? []
  );

  return candidates
    .map(({ id, username, role, email }) => ({ id, username, role, email }))
    .sort((a, b) =>
      (a.username ?? a.email).localeCompare(b.username ?? b.email)
    );
}

export type RemoveMentorResult =
  | { success: true; message: string; userId: string }
  | { success: false; error: string };

export async function removeMentorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<RemoveMentorResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.MENTORS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const trimmedId = userId.trim();
  if (!trimmedId) {
    return { success: false, error: "Mentor not found." };
  }

  const existing = await profileRepository.findProfileById(
    adminClient,
    trimmedId
  );
  if (existing.error || !existing.data) {
    return { success: false, error: "Mentor not found." };
  }

  if (!existing.data.is_mentor) {
    return { success: false, error: "This user is not a mentor." };
  }

  const relatedClear = await clearMentorRelatedData(adminClient, trimmedId);
  if (relatedClear.error) {
    return { success: false, error: relatedClear.error.message };
  }

  const { error: profileError } =
    await profileRepository.updateProfileMentorFlag(
      adminClient,
      trimmedId,
      false
    );
  if (profileError) {
    return { success: false, error: profileError.message };
  }

  clearCachedSessionShell(trimmedId);

  return { success: true, message: "Mentor removed.", userId: trimmedId };
}

export type AddMentorsResult =
  | { success: true; message: string; addedCount: number }
  | { success: false; error: string };

export async function addMentorsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { userIds: string[] }
): Promise<AddMentorsResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.MENTORS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = addMentorsSchema.safeParse(input);
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
    .filter((row) => !row.is_mentor)
    .map((row) => row.id);

  if (toPromote.length === 0) {
    return {
      success: true,
      message: "Selected users are already mentors.",
      addedCount: 0,
    };
  }

  const { error: updateError } = await profileRepository.setProfilesMentorFlag(
    adminClient,
    toPromote,
    true
  );

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  for (const profile of profiles ?? []) {
    if (profile.is_mentor) {
      continue;
    }
    clearCachedSessionShell(profile.id);
  }

  return {
    success: true,
    message:
      toPromote.length === 1
        ? "Mentor added."
        : `${toPromote.length} mentors added.`,
    addedCount: toPromote.length,
  };
}
