import "server-only";

import type { PermissionKey } from "@/lib/constants/permissions";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { ZodType } from "zod";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

type ListResult<TRecord> = {
  data: TRecord[] | null;
  error: { message?: string } | null;
};

type UpdateResult = {
  error: { message?: string } | null;
};

export async function reorderKanbanColumnsForManager<
  TRecord extends { id: string },
  TRow,
>(options: {
  adminClient: Supabase;
  actorUserId: string | null;
  actor: AuditActor;
  permission: PermissionKey;
  schema: ZodType<{ ordered_ids: string[] }>;
  input: { ordered_ids: string[] };
  listRows: () => Promise<ListResult<TRecord>>;
  updateSortOrders: (orderedIds: string[]) => Promise<UpdateResult>;
  mapRow: (record: TRecord) => TRow;
  tableName: string;
  outOfDateMessage: string;
  failMessage: string;
  successMessage: string;
  auditNote: string;
}): Promise<{ success: true; rows: TRow[]; message: string } | MutationFailure> {
  const unauthorized = await getUnauthorizedError(
    options.adminClient,
    options.actorUserId,
    options.permission
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = options.schema.safeParse(options.input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orderedIds = [...new Set(parsed.data.ordered_ids)];
  const existing = await options.listRows();
  if (existing.error) {
    return { success: false, error: options.failMessage };
  }

  const existingIds = new Set((existing.data ?? []).map((row) => row.id));
  if (
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { success: false, error: options.outOfDateMessage };
  }

  const { error } = await options.updateSortOrders(orderedIds);
  if (error) {
    return { success: false, error: options.failMessage };
  }

  const refreshed = await options.listRows();
  if (refreshed.error || !refreshed.data) {
    return { success: false, error: options.failMessage };
  }

  await recordManagerAuditLog(options.adminClient, options.actor, {
    action: "update",
    severity: "info",
    table_name: options.tableName,
    record_id: orderedIds[0] ?? null,
    new_data: { ordered_ids: orderedIds },
    metadata: { note: options.auditNote },
  });

  return {
    success: true,
    rows: refreshed.data.map(options.mapRow),
    message: options.successMessage,
  };
}

export async function saveKanbanBoardForManager<TPlacement>(options: {
  adminClient: Supabase;
  actorUserId: string | null;
  actor: AuditActor;
  permission: PermissionKey;
  schema: ZodType<{ columns: Record<string, string[]> }>;
  input: { columns: Record<string, string[]> };
  unassignedId: string;
  listColumnEntities?: () => Promise<ListResult<{ id: string }>>;
  columnEntityNotFoundMessage: string;
  buildPlacements: (
    columns: Record<string, string[]>
  ) => TPlacement[];
  validatePlacements?: (
    placements: TPlacement[]
  ) => Promise<MutationFailure | null>;
  updatePositions: (placements: TPlacement[]) => Promise<UpdateResult>;
  getPlacementRecordId: (placement: TPlacement) => string | null;
  tableName: string;
  failMessage: string;
  successMessage: string;
  auditNote: string;
}): Promise<{ success: true; message: string } | MutationFailure> {
  const unauthorized = await getUnauthorizedError(
    options.adminClient,
    options.actorUserId,
    options.permission
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = options.schema.safeParse(options.input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const columns = parsed.data.columns;
  const columnIds = Object.keys(columns).filter(
    (key) => key !== options.unassignedId
  );

  if (columnIds.length > 0 && options.listColumnEntities) {
    const listed = await options.listColumnEntities();
    if (listed.error) {
      return { success: false, error: options.failMessage };
    }
    const known = new Set((listed.data ?? []).map((row) => row.id));
    if (columnIds.some((id) => !known.has(id))) {
      return { success: false, error: options.columnEntityNotFoundMessage };
    }
  }

  const placements = options.buildPlacements(columns);

  // Validate before the empty short-circuit so a partial/empty payload cannot
  // skip a required full-board partition check.
  if (options.validatePlacements) {
    const validationError = await options.validatePlacements(placements);
    if (validationError) {
      return validationError;
    }
  }

  if (placements.length === 0) {
    return { success: true, message: "Board unchanged." };
  }

  const { error } = await options.updatePositions(placements);
  if (error) {
    return { success: false, error: options.failMessage };
  }

  await recordManagerAuditLog(options.adminClient, options.actor, {
    action: "update",
    severity: "info",
    table_name: options.tableName,
    record_id: options.getPlacementRecordId(placements[0]!) ?? null,
    new_data: { columns },
    metadata: { note: options.auditNote },
  });

  return {
    success: true,
    message: options.successMessage,
  };
}
