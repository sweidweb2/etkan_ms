import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { createEquipmentSchema } from "@/lib/validators/manager/create-equipment";
import { updateEquipmentSchema } from "@/lib/validators/manager/update-equipment";
import * as borrowEquipmentRepository from "@/repositories/borrow-equipment.repository";
import * as equipmentRepository from "@/repositories/equipment.repository";
import type { EquipmentRecord } from "@/repositories/equipment.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateEquipmentSuccess = {
  success: true;
  equipment: ManagerEquipmentRow;
  message: string;
};

export type CreateEquipmentFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateEquipmentResult = CreateEquipmentSuccess | CreateEquipmentFailure;

export type UpdateEquipmentSuccess = {
  success: true;
  equipment: ManagerEquipmentRow;
  message: string;
};

export type UpdateEquipmentFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateEquipmentResult = UpdateEquipmentSuccess | UpdateEquipmentFailure;

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapEquipmentRecordToRow(
  record: EquipmentRecord,
  borrowedQuantity: number
): ManagerEquipmentRow {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    quantity: record.quantity ?? 0,
    unit_price: Number(record.unit_price ?? 0),
    created_at: record.created_at ?? "",
    borrowed_quantity: borrowedQuantity,
  };
}

async function buildBorrowedQuantityByEquipmentId(
  adminClient: Supabase,
  equipmentIds: string[]
): Promise<Map<string, number>> {
  const { data, error } =
    await borrowEquipmentRepository.listActiveBorrowQuantitiesByEquipmentIds(
      adminClient,
      equipmentIds
    );

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    counts.set(
      row.equipment_id,
      (counts.get(row.equipment_id) ?? 0) + (row.quantity ?? 0)
    );
  }

  return counts;
}

function mapCreateEquipmentError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "Equipment with these details already exists.";
  }

  return "Unable to create equipment. Please try again.";
}

function mapUpdateEquipmentError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "Equipment with these details already exists.";
  }

  return "Unable to update equipment. Please try again.";
}

export async function listEquipmentsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerEquipmentRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW);

  const { data, error } = await equipmentRepository.listEquipments(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  const records = data ?? [];

  if (records.length === 0) {
    return [];
  }

  const borrowedByEquipmentId = await buildBorrowedQuantityByEquipmentId(
    adminClient,
    records.map((record) => record.id)
  );

  return records.map((record) =>
    mapEquipmentRecordToRow(
      record,
      borrowedByEquipmentId.get(record.id) ?? 0
    )
  );
}

export async function getEquipmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  equipmentId: string
): Promise<ManagerEquipmentRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW);

  const { data, error } = await equipmentRepository.findEquipmentById(
    adminClient,
    equipmentId
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const borrowedByEquipmentId = await buildBorrowedQuantityByEquipmentId(
    adminClient,
    [data.id]
  );

  return mapEquipmentRecordToRow(
    data,
    borrowedByEquipmentId.get(data.id) ?? 0
  );
}

export async function createEquipmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    description?: string | null;
    quantity: number;
    unit_price: number;
  }
): Promise<CreateEquipmentResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createEquipmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, description, quantity, unit_price } = parsed.data;

  const { data, error } = await equipmentRepository.createEquipment(
    adminClient,
    {
      name: name.trim(),
      description: normalizeOptionalString(description),
      quantity,
      unit_price,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapCreateEquipmentError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "equipments",
    record_id: data.id,
    new_data: {
      name: data.name,
      description: data.description,
      quantity: data.quantity,
      unit_price: data.unit_price,
    },
    metadata: { note: "Equipment created." },
  });

  return {
    success: true,
    equipment: mapEquipmentRecordToRow(data, 0),
    message: "Equipment created.",
  };
}

export async function updateEquipmentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    description?: string | null;
    quantity: number;
    unit_price: number;
  }
): Promise<UpdateEquipmentResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateEquipmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await equipmentRepository.findEquipmentById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: mapUpdateEquipmentError(existing.error.message),
    };
  }

  if (!existing.data) {
    return { success: false, error: "Equipment not found." };
  }

  const borrowedByEquipmentId = await buildBorrowedQuantityByEquipmentId(
    adminClient,
    [parsed.data.id]
  );
  const borrowedQuantity = borrowedByEquipmentId.get(parsed.data.id) ?? 0;

  if (parsed.data.quantity < borrowedQuantity) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        quantity: [
          `Quantity cannot be less than currently borrowed (${borrowedQuantity}).`,
        ],
      },
    };
  }

  const { name, description, quantity, unit_price, id } = parsed.data;

  const { data, error } = await equipmentRepository.updateEquipment(
    adminClient,
    id,
    {
      name: name.trim(),
      description: normalizeOptionalString(description),
      quantity,
      unit_price,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateEquipmentError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "equipments",
    record_id: data.id,
    old_data: {
      name: existing.data.name,
      description: existing.data.description,
      quantity: existing.data.quantity,
      unit_price: existing.data.unit_price,
    },
    new_data: {
      name: data.name,
      description: data.description,
      quantity: data.quantity,
      unit_price: data.unit_price,
    },
    metadata: {
      note: "Equipment updated.",
      changed_fields: ["name", "description", "quantity", "unit_price"],
    },
  });

  return {
    success: true,
    equipment: mapEquipmentRecordToRow(data, borrowedQuantity),
    message: "Equipment updated.",
  };
}
