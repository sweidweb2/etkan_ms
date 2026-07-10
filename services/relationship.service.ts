import { unstable_cache } from "next/cache";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { MANAGER_CACHE_TAGS } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createRelationshipSchema } from "@/lib/validators/manager/create-relationship";
import { updateRelationshipSchema } from "@/lib/validators/manager/update-relationship";
import * as relationshipRepository from "@/repositories/relationship.repository";
import type { RelationshipRecord } from "@/repositories/relationship.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerRelationshipRow } from "@/types/manager-relationship";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateRelationshipSuccess = {
  success: true;
  relationship: ManagerRelationshipRow;
  message: string;
};

export type CreateRelationshipFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateRelationshipResult =
  | CreateRelationshipSuccess
  | CreateRelationshipFailure;

export type UpdateRelationshipSuccess = {
  success: true;
  relationship: ManagerRelationshipRow;
  message: string;
};

export type UpdateRelationshipFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateRelationshipResult =
  | UpdateRelationshipSuccess
  | UpdateRelationshipFailure;

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapRelationshipRecordToRow(
  record: RelationshipRecord
): ManagerRelationshipRow {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    relation_with: record.relation_with,
    major: record.major,
    speciality: record.speciality,
    is_useful: record.is_useful ?? true,
    created_at: record.created_at ?? "",
  };
}

function mapCreateRelationshipError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A relationship with these details already exists.";
  }

  return "Unable to create relationship. Please try again.";
}

function mapUpdateRelationshipError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A relationship with these details already exists.";
  }

  return "Unable to update relationship. Please try again.";
}

async function fetchRelationshipsForManager(
  adminClient: Supabase
): Promise<ManagerRelationshipRow[]> {
  const { data, error } = await relationshipRepository.listRelationships(
    adminClient
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRelationshipRecordToRow);
}

const listRelationshipsForManagerCached = unstable_cache(
  async () => {
    const adminClient = createSupabaseAdminClient();
    return fetchRelationshipsForManager(adminClient);
  },
  ["manager-relationships-list"],
  { tags: [MANAGER_CACHE_TAGS.RELATIONSHIPS] }
);

/**
 * Lists all relationships for the manager panel.
 * Auth is checked outside the cache; the list body is shared-server-cached
 * with no TTL (invalidated only on relationship create/update/delete).
 * The `adminClient` argument is kept for call-site compatibility.
 */
export async function listRelationshipsForManager(
  _adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerRelationshipRow[]> {
  assertManagerRole(actorRole);
  return listRelationshipsForManagerCached();
}

export async function createRelationshipForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    name: string;
    phone?: string;
    relation_with?: string;
    major?: string;
    speciality?: string;
    is_useful: boolean;
  }
): Promise<CreateRelationshipResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createRelationshipSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, phone, relation_with, major, speciality, is_useful } =
    parsed.data;

  const { data, error } = await relationshipRepository.createRelationship(
    adminClient,
    {
      name: name.trim(),
      phone: normalizeOptionalString(phone),
      relation_with: normalizeOptionalString(relation_with),
      major: normalizeOptionalString(major),
      speciality: normalizeOptionalString(speciality),
      is_useful,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapCreateRelationshipError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "relationships",
    record_id: data.id,
    new_data: {
      name: data.name,
      phone: data.phone,
      relation_with: data.relation_with,
      major: data.major,
      speciality: data.speciality,
      is_useful: data.is_useful,
    },
    metadata: { note: "Relationship created." },
  });

  return {
    success: true,
    relationship: mapRelationshipRecordToRow(data),
    message: "Relationship created.",
  };
}

export async function updateRelationshipForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    phone?: string;
    relation_with?: string;
    major?: string;
    speciality?: string;
    is_useful: boolean;
  }
): Promise<UpdateRelationshipResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateRelationshipSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, name, phone, relation_with, major, speciality, is_useful } =
    parsed.data;

  const existing = await relationshipRepository.findRelationshipById(
    adminClient,
    id
  );

  if (existing.error) {
    return {
      success: false,
      error: mapUpdateRelationshipError(existing.error.message),
    };
  }

  if (!existing.data) {
    return {
      success: false,
      error: "Relationship not found.",
    };
  }

  const { data, error } = await relationshipRepository.updateRelationship(
    adminClient,
    id,
    {
      name: name.trim(),
      phone: normalizeOptionalString(phone),
      relation_with: normalizeOptionalString(relation_with),
      major: normalizeOptionalString(major),
      speciality: normalizeOptionalString(speciality),
      is_useful,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateRelationshipError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "relationships",
    record_id: data.id,
    old_data: {
      name: existing.data.name,
      phone: existing.data.phone,
      relation_with: existing.data.relation_with,
      major: existing.data.major,
      speciality: existing.data.speciality,
      is_useful: existing.data.is_useful,
    },
    new_data: {
      name: data.name,
      phone: data.phone,
      relation_with: data.relation_with,
      major: data.major,
      speciality: data.speciality,
      is_useful: data.is_useful,
    },
    metadata: {
      note: "Relationship updated.",
      changed_fields: [
        "name",
        "phone",
        "relation_with",
        "major",
        "speciality",
        "is_useful",
      ],
    },
  });

  return {
    success: true,
    relationship: mapRelationshipRecordToRow(data),
    message: "Relationship updated.",
  };
}
