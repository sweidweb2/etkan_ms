import { PERMISSIONS } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { timingAsync, timingMark } from "@/lib/debug/request-timing";
import * as authRepository from "@/repositories/auth.repository";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import { saveInstructorCapabilitiesSchema } from "@/lib/validators/manager/save-instructor-capabilities";
import { addInstructorsSchema } from "@/lib/validators/manager/add-instructors";
import type {
  ManagerInstructorCandidateRow,
  ManagerInstructorCapabilityPair,
  ManagerInstructorsPageData,
} from "@/types/manager-instructor";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

function pairKey(userId: string, subjectId: string) {
  return `${userId}:${subjectId}`;
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
  const emailResult = await timingAsync(
    `instructors:listAuthEmailsByIds n=${profiles.length}`,
    () =>
      authRepository.listAuthEmailsByIds(
        adminClient,
        profiles.map((profile) => profile.id)
      )
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

export async function getInstructorsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerInstructorsPageData> {
  timingMark("instructorsPage:service:start");
  await timingAsync("instructorsPage:assertPermission", () =>
    assertPermission(adminClient, actorUserId, PERMISSIONS.INSTRUCTORS_VIEW)
  );

  const [instructorsResult, subjectsResult, capabilitiesResult] =
    await timingAsync("instructorsPage:parallelLists", () =>
      Promise.all([
        profileRepository.listInstructorProfiles(adminClient),
        subjectRepository.listSubjects(adminClient),
        instructorSubjectCapabilityRepository.listAllInstructorSubjectCapabilities(
          adminClient
        ),
      ])
    );

  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }
  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }
  if (capabilitiesResult.error) {
    throw new Error(capabilitiesResult.error.message);
  }

  timingMark(
    `instructorsPage:rows instructors=${instructorsResult.data?.length ?? 0} subjects=${subjectsResult.data?.length ?? 0} caps=${capabilitiesResult.data?.length ?? 0}`
  );

  const subjects = (subjectsResult.data ?? [])
    .map((row) => ({ id: row.id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const instructorsMapped = await mapProfilesWithEmail(
    adminClient,
    instructorsResult.data ?? []
  );

  const instructors = instructorsMapped.sort((a, b) =>
    (a.username ?? a.email).localeCompare(b.username ?? b.email)
  );

  const instructorIds = new Set(instructors.map((row) => row.id));
  const subjectIds = new Set(subjects.map((row) => row.id));

  const capabilities = (capabilitiesResult.data ?? [])
    .filter(
      (row) =>
        instructorIds.has(row.user_id) && subjectIds.has(row.subject_id)
    )
    .map((row) => ({
      user_id: row.user_id,
      subject_id: row.subject_id,
    }));

  timingMark("instructorsPage:service:done");

  return {
    instructors,
    candidateUsers: [],
    subjects,
    capabilities,
  };
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

  const [instructorsResult, subjectsResult, existingResult] = await Promise.all(
    [
      profileRepository.listInstructorProfiles(adminClient),
      subjectRepository.listSubjects(adminClient),
      instructorSubjectCapabilityRepository.listAllInstructorSubjectCapabilities(
        adminClient
      ),
    ]
  );

  if (instructorsResult.error) {
    return { success: false, error: instructorsResult.error.message };
  }
  if (subjectsResult.error) {
    return { success: false, error: subjectsResult.error.message };
  }
  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  const instructorIds = new Set(
    (instructorsResult.data ?? []).map((row) => row.id)
  );
  const subjectIds = new Set((subjectsResult.data ?? []).map((row) => row.id));

  const desired = parsed.data.capabilities.filter(
    (pair) =>
      instructorIds.has(pair.user_id) && subjectIds.has(pair.subject_id)
  );

  const desiredKeys = new Set(
    desired.map((pair) => pairKey(pair.user_id, pair.subject_id))
  );

  const existing = (existingResult.data ?? []).filter((row) =>
    instructorIds.has(row.user_id)
  );
  const existingKeys = new Set(
    existing.map((row) => pairKey(row.user_id, row.subject_id))
  );

  const toInsert = desired.filter(
    (pair) => !existingKeys.has(pairKey(pair.user_id, pair.subject_id))
  );
  const toDelete = existing
    .filter((row) => !desiredKeys.has(pairKey(row.user_id, row.subject_id)))
    .map((row) => ({ user_id: row.user_id, subject_id: row.subject_id }));

  const { error: deleteError } =
    await instructorSubjectCapabilityRepository.deleteCapabilitiesByPairs(
      adminClient,
      toDelete
    );
  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const { error: insertError } =
    await instructorSubjectCapabilityRepository.insertCapabilities(
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
