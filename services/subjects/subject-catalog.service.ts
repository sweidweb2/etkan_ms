import type { SubjectScope } from "@/lib/constants/subject-scope";
import { saveSubjectCapabilitiesSchema } from "@/lib/validators/manager/save-subject-capabilities";
import { saveCapabilitySubjectOrderSchema } from "@/lib/validators/manager/save-capability-subject-order";
import { createCapabilitySubjectSchema } from "@/lib/validators/manager/create-capability-subject";
import { setSubjectCapabilitySchema } from "@/lib/validators/manager/set-subject-capability";
import { updateCapabilitySubjectSchema } from "@/lib/validators/manager/update-capability-subject";
import * as profileRepository from "@/repositories/profile.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { getSubjectScopeAdapter } from "@/services/subjects/subject-scope";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerSubjectCapabilityPair,
  ManagerSubjectColumn,
  ManagerSubjectScopeData,
} from "@/types/manager-capability-subject";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

function pairKey(userId: string, subjectId: string) {
  return `${userId}:${subjectId}`;
}

function toSubjectColumn(row: {
  id: string;
  name: string;
  sort_order: number;
}): ManagerSubjectColumn {
  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
  };
}

/** Catalog plus the capability pairs of everyone in the scope. */
export async function loadSubjectScopeData(
  adminClient: Supabase,
  scope: SubjectScope
): Promise<ManagerSubjectScopeData> {
  const adapter = getSubjectScopeAdapter(scope);

  const [subjectsResult, peopleIdsResult] = await Promise.all([
    adapter.catalog.list(adminClient),
    adapter.people.listIds(adminClient),
  ]);

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }
  if (peopleIdsResult.error) {
    throw new Error(peopleIdsResult.error.message);
  }

  const subjects = (subjectsResult.data ?? []).map(toSubjectColumn);
  const subjectIds = new Set(subjects.map((row) => row.id));
  const userIds = (peopleIdsResult.data ?? []).map((row) => row.id);

  const capabilitiesResult = await adapter.capabilities.listByUserIds(
    adminClient,
    userIds
  );
  if (capabilitiesResult.error) {
    throw new Error(capabilitiesResult.error.message);
  }

  const userIdSet = new Set(userIds);
  const capabilities = capabilitiesResult.data
    .filter(
      (row) => userIdSet.has(row.user_id) && subjectIds.has(row.subject_id)
    )
    .map((row) => ({ user_id: row.user_id, subject_id: row.subject_id }));

  return { subjects, capabilities };
}

export async function getSubjectScopeDataForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope
): Promise<ManagerSubjectScopeData> {
  const adapter = getSubjectScopeAdapter(scope);
  await assertPermission(adminClient, actorUserId, adapter.permissions.view);
  return loadSubjectScopeData(adminClient, scope);
}

export async function listSubjectCapabilitiesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope
): Promise<ManagerSubjectCapabilityPair[]> {
  const adapter = getSubjectScopeAdapter(scope);
  await assertPermission(adminClient, actorUserId, adapter.permissions.view);

  const peopleIdsResult = await adapter.people.listIds(adminClient);
  if (peopleIdsResult.error) {
    throw new Error(peopleIdsResult.error.message);
  }

  const userIds = (peopleIdsResult.data ?? []).map((row) => row.id);
  if (userIds.length === 0) {
    return [];
  }

  const [subjectIdsResult, capabilitiesResult] = await Promise.all([
    adapter.catalog.listIds(adminClient),
    adapter.capabilities.listByUserIds(adminClient, userIds),
  ]);

  if (subjectIdsResult.error) {
    throw new Error(subjectIdsResult.error.message);
  }
  if (capabilitiesResult.error) {
    throw new Error(capabilitiesResult.error.message);
  }

  const subjectIds = new Set((subjectIdsResult.data ?? []).map((r) => r.id));
  const userIdSet = new Set(userIds);

  return capabilitiesResult.data
    .filter(
      (row) => userIdSet.has(row.user_id) && subjectIds.has(row.subject_id)
    )
    .map((row) => ({ user_id: row.user_id, subject_id: row.subject_id }));
}

export type SaveSubjectCapabilitiesResult =
  | {
      success: true;
      message: string;
      capabilities: ManagerSubjectCapabilityPair[];
    }
  | { success: false; error: string };

export async function saveSubjectCapabilitiesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope,
  input: { capabilities: ManagerSubjectCapabilityPair[] }
): Promise<SaveSubjectCapabilitiesResult> {
  const adapter = getSubjectScopeAdapter(scope);
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    adapter.permissions.capabilitiesUpdate
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = saveSubjectCapabilitiesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please fix the capability selections." };
  }

  const peopleIdsResult = await adapter.people.listIds(adminClient);
  if (peopleIdsResult.error) {
    return { success: false, error: peopleIdsResult.error.message };
  }

  const userIds = (peopleIdsResult.data ?? []).map((row) => row.id);

  const [subjectIdsResult, existingResult] = await Promise.all([
    adapter.catalog.listIds(adminClient),
    adapter.capabilities.listByUserIds(adminClient, userIds),
  ]);

  if (subjectIdsResult.error) {
    return { success: false, error: subjectIdsResult.error.message };
  }
  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  const subjectIds = new Set((subjectIdsResult.data ?? []).map((r) => r.id));
  const userIdSet = new Set(userIds);

  const desired = parsed.data.capabilities.filter(
    (pair) => userIdSet.has(pair.user_id) && subjectIds.has(pair.subject_id)
  );
  const desiredKeys = new Set(
    desired.map((pair) => pairKey(pair.user_id, pair.subject_id))
  );

  const existing = existingResult.data.filter((row) =>
    userIdSet.has(row.user_id)
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

  const { error: deleteError } = await adapter.capabilities.deleteByPairs(
    adminClient,
    toDelete
  );
  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const { error: insertError } = await adapter.capabilities.insert(
    adminClient,
    toInsert
  );
  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    message: `${adapter.copy.personSingular} capabilities saved.`,
    capabilities: desired,
  };
}

export type SetSubjectCapabilityServiceResult =
  | {
      success: true;
      message: string;
      user_id: string;
      subject_id: string;
      enabled: boolean;
    }
  | { success: false; error: string };

export async function setSubjectCapabilityForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope,
  input: { user_id: string; subject_id: string; enabled: boolean }
): Promise<SetSubjectCapabilityServiceResult> {
  const adapter = getSubjectScopeAdapter(scope);
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    adapter.permissions.capabilitiesUpdate
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = setSubjectCapabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid capability selection." };
  }

  const { user_id, subject_id, enabled } = parsed.data;

  const [profileResult, subjectResult, existingResult] = await Promise.all([
    profileRepository.findProfileById(adminClient, user_id),
    adapter.catalog.findById(adminClient, subject_id),
    adapter.capabilities.listByUserIds(adminClient, [user_id]),
  ]);

  if (profileResult.error) {
    return { success: false, error: profileResult.error.message };
  }
  if (!profileResult.data || !adapter.people.isMember(profileResult.data)) {
    return {
      success: false,
      error: `${adapter.copy.personSingular} not found.`,
    };
  }

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message };
  }
  if (!subjectResult.data) {
    return {
      success: false,
      error: `${adapter.copy.subjectSingular} not found.`,
    };
  }

  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  const alreadyEnabled = existingResult.data.some(
    (row) => row.subject_id === subject_id
  );

  if (enabled === alreadyEnabled) {
    return {
      success: true,
      message: "Capability updated.",
      user_id,
      subject_id,
      enabled,
    };
  }

  if (enabled) {
    const { error } = await adapter.capabilities.insert(adminClient, [
      { user_id, subject_id },
    ]);
    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await adapter.capabilities.deleteByPairs(adminClient, [
      { user_id, subject_id },
    ]);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  return {
    success: true,
    message: "Capability updated.",
    user_id,
    subject_id,
    enabled,
  };
}

export type SubjectMutationResult =
  | { success: true; message: string; subject: ManagerSubjectColumn }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export async function createSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope,
  input: { name: string }
): Promise<SubjectMutationResult> {
  const adapter = getSubjectScopeAdapter(scope);
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    adapter.permissions.subjectsCreate
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createCapabilitySubjectSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: flattened.name },
    };
  }

  const name = parsed.data.name.trim();
  const existingByName = await adapter.catalog.findByName(adminClient, name);
  if (existingByName.error) {
    return { success: false, error: existingByName.error.message };
  }
  if (existingByName.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        name: [
          `A ${adapter.copy.subjectSingularLower} with this name already exists.`,
        ],
      },
    };
  }

  const maxSortResult = await adapter.catalog.getMaxSortOrder(adminClient);
  if (maxSortResult.error) {
    return { success: false, error: maxSortResult.error.message };
  }

  const nextSortOrder =
    maxSortResult.data?.sort_order !== undefined
      ? maxSortResult.data.sort_order + 1
      : 0;

  const created = await adapter.catalog.create(adminClient, {
    name,
    sort_order: nextSortOrder,
  });
  if (created.error || !created.data) {
    return {
      success: false,
      error:
        created.error?.message ??
        `Unable to create ${adapter.copy.subjectSingularLower}.`,
    };
  }

  return {
    success: true,
    message: `${adapter.copy.subjectSingular} created.`,
    subject: toSubjectColumn(created.data),
  };
}

export async function updateSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope,
  input: { id: string; name: string }
): Promise<SubjectMutationResult> {
  const adapter = getSubjectScopeAdapter(scope);
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    adapter.permissions.subjectsUpdate
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateCapabilitySubjectSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { id: flattened.id, name: flattened.name },
    };
  }

  const existing = await adapter.catalog.findById(adminClient, parsed.data.id);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return {
      success: false,
      error: `${adapter.copy.subjectSingular} not found.`,
    };
  }

  const name = parsed.data.name.trim();
  const existingByName = await adapter.catalog.findByName(adminClient, name);
  if (existingByName.error) {
    return { success: false, error: existingByName.error.message };
  }
  if (existingByName.data && existingByName.data.id !== parsed.data.id) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        name: [
          `A ${adapter.copy.subjectSingularLower} with this name already exists.`,
        ],
      },
    };
  }

  const updated = await adapter.catalog.updateById(
    adminClient,
    parsed.data.id,
    { name }
  );
  if (updated.error || !updated.data) {
    return {
      success: false,
      error:
        updated.error?.message ??
        `Unable to update ${adapter.copy.subjectSingularLower}.`,
    };
  }

  return {
    success: true,
    message: `${adapter.copy.subjectSingular} updated.`,
    subject: toSubjectColumn(updated.data),
  };
}

export type DeleteSubjectResult =
  | { success: true; message: string; subjectId: string }
  | { success: false; error: string };

export async function deleteSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope,
  subjectId: string
): Promise<DeleteSubjectResult> {
  const adapter = getSubjectScopeAdapter(scope);
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    adapter.permissions.subjectsDelete
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const trimmedId = subjectId.trim();
  if (!trimmedId) {
    return {
      success: false,
      error: `${adapter.copy.subjectSingular} not found.`,
    };
  }

  const existing = await adapter.catalog.findById(adminClient, trimmedId);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return {
      success: false,
      error: `${adapter.copy.subjectSingular} not found.`,
    };
  }

  const { error } = await adapter.catalog.deleteById(adminClient, trimmedId);
  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: `${adapter.copy.subjectSingular} deleted.`,
    subjectId: trimmedId,
  };
}

export type SaveSubjectOrderResult =
  | { success: true; message: string; subjects: ManagerSubjectColumn[] }
  | { success: false; error: string };

export async function saveSubjectOrderForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  scope: SubjectScope,
  input: { orderedIds: string[] }
): Promise<SaveSubjectOrderResult> {
  const adapter = getSubjectScopeAdapter(scope);
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    adapter.permissions.subjectsUpdate
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = saveCapabilitySubjectOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Please fix the ${adapter.copy.subjectSingularLower} order.`,
    };
  }

  const reorderResult = await adapter.catalog.reorder(
    adminClient,
    parsed.data.orderedIds
  );
  if (reorderResult.error) {
    return { success: false, error: reorderResult.error.message };
  }

  return {
    success: true,
    message: `${adapter.copy.subjectSingular} order saved.`,
    subjects: (reorderResult.data ?? []).map(toSubjectColumn),
  };
}
