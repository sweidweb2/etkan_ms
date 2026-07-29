import {
  BORROW_EQUIPMENT_STATUSES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import { getEquipmentRemainingQuantity, getMaxEditableBorrowQuantity } from "@/lib/constants/manager-equipment-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import { createBorrowsSchema } from "@/lib/validators/manager/create-borrows";
import {
  toggleBorrowReturnedSchema,
  updateBorrowRecordSchema,
} from "@/lib/validators/manager/update-borrow-equipment";
import * as borrowEquipmentRepository from "@/repositories/borrow-equipment.repository";
import type { BorrowEquipmentRecord } from "@/repositories/borrow-equipment.repository";
import * as classRepository from "@/repositories/class.repository";
import * as equipmentRepository from "@/repositories/equipment.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import {
  getEquipmentForManager,
  listEquipmentsForManager,
} from "@/services/equipment.service";
import { listStudentsForManager } from "@/services/student.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerBorrowClassOption,
  ManagerBorrowEquipmentListRow,
} from "@/types/manager-borrow-equipment-list";
import type { ManagerEquipmentBorrowRow } from "@/types/manager-equipment-borrow";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type BorrowPageData = {
  students: ManagerStudentRow[];
  equipments: ManagerEquipmentRow[];
  classes: ManagerBorrowClassOption[];
  classStudentProfileIds: Record<string, string[]>;
  borrowHistory: ManagerBorrowEquipmentListRow[];
};

export type CreateBorrowsSuccess = {
  success: true;
  message: string;
  createdCount: number;
};

export type CreateBorrowsFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateBorrowsResult = CreateBorrowsSuccess | CreateBorrowsFailure;

export type UpdateBorrowRecordSuccess = {
  success: true;
  message: string;
};

export type UpdateBorrowRecordFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateBorrowRecordResult =
  | UpdateBorrowRecordSuccess
  | UpdateBorrowRecordFailure;

export type ToggleBorrowReturnedSuccess = {
  success: true;
  message: string;
};

export type ToggleBorrowReturnedFailure = {
  success: false;
  error: string;
};

export type ToggleBorrowReturnedResult =
  | ToggleBorrowReturnedSuccess
  | ToggleBorrowReturnedFailure;

function mapBorrowStatus(status: string | null): BorrowEquipmentStatusValue {
  if (status === BORROW_EQUIPMENT_STATUSES.RETURNED) {
    return BORROW_EQUIPMENT_STATUSES.RETURNED;
  }

  return BORROW_EQUIPMENT_STATUSES.BORROWED;
}

async function buildStudentNameByUserId(
  adminClient: Supabase,
  userIds: string[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const profilesResult =
    await studentProfileRepository.listStudentProfilesByUserIds(
      adminClient,
      userIds
    );

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  return new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.user_id,
      profile.full_name,
    ])
  );
}

async function buildEquipmentById(
  adminClient: Supabase,
  equipmentIds: string[]
): Promise<
  Map<
    string,
    {
      name: string;
      description: string | null;
      unit_price: number;
    }
  >
> {
  if (equipmentIds.length === 0) {
    return new Map();
  }

  const { data, error } = await equipmentRepository.listEquipmentsByIds(
    adminClient,
    equipmentIds
  );

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((equipment) => [
      equipment.id,
      {
        name: equipment.name,
        description: equipment.description,
        unit_price: Number(equipment.unit_price ?? 0),
      },
    ])
  );
}

async function mapBorrowRecordsToListRows(
  adminClient: Supabase,
  records: BorrowEquipmentRecord[]
): Promise<ManagerBorrowEquipmentListRow[]> {
  if (records.length === 0) {
    return [];
  }

  const userIds = [...new Set(records.map((record) => record.user_id))];
  const equipmentIds = [...new Set(records.map((record) => record.equipment_id))];

  const [nameByUserId, equipmentById] = await Promise.all([
    buildStudentNameByUserId(adminClient, userIds),
    buildEquipmentById(adminClient, equipmentIds),
  ]);

  return records.map((record) => {
    const equipment = equipmentById.get(record.equipment_id);

    return {
      id: record.id,
      equipment_id: record.equipment_id,
      user_id: record.user_id,
      equipment_name: equipment?.name ?? "—",
      equipment_description: equipment?.description ?? null,
      equipment_unit_price: equipment?.unit_price ?? 0,
      quantity: record.quantity ?? 0,
      borrowed_at: record.borrowed_at ?? "",
      returned_at: record.returned_at,
      status: mapBorrowStatus(record.status),
      student_name: nameByUserId.get(record.user_id) ?? "Unknown student",
    };
  });
}

function mapBorrowRecordToEquipmentBorrowRow(
  record: BorrowEquipmentRecord,
  studentName: string
): ManagerEquipmentBorrowRow {
  return {
    id: record.id,
    equipment_id: record.equipment_id,
    user_id: record.user_id,
    student_name: studentName,
    quantity: record.quantity ?? 0,
    borrowed_at: record.borrowed_at ?? "",
    returned_at: record.returned_at,
    status: mapBorrowStatus(record.status),
  };
}

async function buildClassStudentProfileIds(
  adminClient: Supabase
): Promise<Record<string, string[]>> {
  const [enrollmentsResult, profilesResult] = await Promise.all([
    studentClassRepository.listStudentClassEnrollments(adminClient),
    studentProfileRepository.listStudentProfiles(adminClient),
  ]);

  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const profileIdByUserId = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.user_id, profile.id])
  );

  const classStudentProfileIds: Record<string, string[]> = {};

  for (const enrollment of enrollmentsResult.data ?? []) {
    const studentProfileId = profileIdByUserId.get(enrollment.user_id);
    if (!studentProfileId) {
      continue;
    }

    if (!classStudentProfileIds[enrollment.class_id]) {
      classStudentProfileIds[enrollment.class_id] = [];
    }

    classStudentProfileIds[enrollment.class_id]!.push(studentProfileId);
  }

  for (const classId of Object.keys(classStudentProfileIds)) {
    classStudentProfileIds[classId] = [
      ...new Set(classStudentProfileIds[classId]),
    ];
  }

  return classStudentProfileIds;
}

function mapCreateBorrowsError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("foreign key")) {
    return "Student or equipment not found.";
  }

  return "Unable to save borrow records. Please try again.";
}

function mapUpdateBorrowError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("foreign key")) {
    return "Borrow record not found.";
  }

  return "Unable to update borrow record. Please try again.";
}

function resolveReturnedAt(
  status: BorrowEquipmentStatusValue,
  returnedAt?: string
): string | null {
  if (status !== BORROW_EQUIPMENT_STATUSES.RETURNED) {
    return null;
  }

  const trimmed = returnedAt?.trim();
  if (trimmed) {
    return `${trimmed}T12:00:00.000Z`;
  }

  return new Date().toISOString();
}

async function validateBorrowQuantityForEquipment(
  adminClient: Supabase,
  actorUserId: string | null,
  equipmentId: string,
  currentRecord: BorrowEquipmentRecord,
  nextQuantity: number,
  nextStatus: BorrowEquipmentStatusValue
): Promise<UpdateBorrowRecordFailure | null> {
  if (nextStatus === BORROW_EQUIPMENT_STATUSES.RETURNED) {
    return null;
  }

  const equipment = await getEquipmentForManager(
    adminClient,
    actorUserId,
    equipmentId
  );

  if (!equipment) {
    return { success: false, error: "Equipment not found." };
  }

  const maxQuantity = getMaxEditableBorrowQuantity(
    equipment,
    {
      quantity: currentRecord.quantity ?? 0,
      status: mapBorrowStatus(currentRecord.status),
    },
    nextStatus
  );

  if (nextQuantity > maxQuantity) {
    return {
      success: false,
      error: `Not enough stock for ${equipment.name}. Maximum quantity is ${maxQuantity}.`,
    };
  }

  return null;
}

export async function getBorrowPageDataForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<BorrowPageData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW_BORROWS);

  const [students, equipments, classesResult, borrowHistory, classStudentProfileIds] =
    await Promise.all([
      listStudentsForManager(adminClient, actorUserId),
      listEquipmentsForManager(adminClient, actorUserId),
      classRepository.listClasses(adminClient),
      listAllBorrowsForManager(adminClient, actorUserId),
      buildClassStudentProfileIds(adminClient),
    ]);

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const classes: ManagerBorrowClassOption[] = (classesResult.data ?? []).map(
    (classRow) => ({
      id: classRow.id,
      name: classRow.name,
    })
  );

  return {
    students,
    equipments,
    classes,
    classStudentProfileIds,
    borrowHistory,
  };
}

export async function listAllBorrowsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerBorrowEquipmentListRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW_BORROWS);

  const { data, error } = await borrowEquipmentRepository.listAllBorrows(
    adminClient
  );

  if (error) {
    throw new Error(error.message);
  }

  return mapBorrowRecordsToListRows(adminClient, data ?? []);
}

export async function listEquipmentBorrowsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  equipmentId: string
): Promise<ManagerEquipmentBorrowRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW_BORROWS);

  const { data: borrows, error } =
    await borrowEquipmentRepository.listBorrowsByEquipmentId(
      adminClient,
      equipmentId
    );

  if (error) {
    throw new Error(error.message);
  }

  const records = borrows ?? [];

  if (records.length === 0) {
    return [];
  }

  const userIds = [...new Set(records.map((record) => record.user_id))];
  const nameByUserId = await buildStudentNameByUserId(adminClient, userIds);

  return records.map((record) =>
    mapBorrowRecordToEquipmentBorrowRow(
      record,
      nameByUserId.get(record.user_id) ?? "Unknown student"
    )
  );
}

export async function createBorrowsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { items: Array<{ user_id: string; equipment_id: string; quantity: number }> }
): Promise<CreateBorrowsResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_BORROW_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createBorrowsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const equipments = await listEquipmentsForManager(adminClient, actorUserId);
  const equipmentById = new Map(
    equipments.map((equipment) => [equipment.id, equipment])
  );

  const demandByEquipmentId = new Map<string, number>();

  for (const item of parsed.data.items) {
    if (!equipmentById.has(item.equipment_id)) {
      return { success: false, error: "One or more equipment items were not found." };
    }

    demandByEquipmentId.set(
      item.equipment_id,
      (demandByEquipmentId.get(item.equipment_id) ?? 0) + item.quantity
    );
  }

  for (const [equipmentId, demand] of demandByEquipmentId) {
    const equipment = equipmentById.get(equipmentId);
    if (!equipment) {
      continue;
    }

    const remaining = getEquipmentRemainingQuantity(equipment);
    if (demand > remaining) {
      return {
        success: false,
        error: `Not enough stock for ${equipment.name}. ${remaining} available, ${demand} requested.`,
      };
    }
  }

  const { data, error } = await borrowEquipmentRepository.createBorrows(
    adminClient,
    parsed.data.items.map((item) => ({
      equipment_id: item.equipment_id,
      user_id: item.user_id,
      quantity: item.quantity,
      status: BORROW_EQUIPMENT_STATUSES.BORROWED,
    }))
  );

  if (error || !data) {
    return {
      success: false,
      error: mapCreateBorrowsError(error?.message ?? "Unknown error"),
    };
  }

  const createdCount = data.length;

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "borrow_equipment",
    record_id: data[0]?.id ?? null,
    new_data: {
      ids: data.map((row) => row.id),
      items: data.map((row) => ({
        equipment_id: row.equipment_id,
        user_id: row.user_id,
        quantity: row.quantity,
        status: row.status,
      })),
    },
    metadata: {
      note: "Borrow records created.",
      createdCount,
    },
  });

  return {
    success: true,
    message: `${createdCount} borrow record${createdCount === 1 ? "" : "s"} saved.`,
    createdCount,
  };
}

export async function updateBorrowRecordForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    quantity: number;
    status: BorrowEquipmentStatusValue;
    returnedAt?: string;
  }
): Promise<UpdateBorrowRecordResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_BORROW_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateBorrowRecordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data: existing, error: fetchError } =
    await borrowEquipmentRepository.getBorrowById(adminClient, parsed.data.id);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!existing) {
    return { success: false, error: "Borrow record not found." };
  }

  const stockError = await validateBorrowQuantityForEquipment(
    adminClient,
    actorUserId,
    existing.equipment_id,
    existing,
    parsed.data.quantity,
    parsed.data.status
  );

  if (stockError) {
    return stockError;
  }

  const returnedAt = resolveReturnedAt(
    parsed.data.status,
    parsed.data.returnedAt
  );

  const { error } = await borrowEquipmentRepository.updateBorrowRecord(
    adminClient,
    parsed.data.id,
    {
      quantity: parsed.data.quantity,
      status: parsed.data.status,
      returned_at: returnedAt,
    }
  );

  if (error) {
    return {
      success: false,
      error: mapUpdateBorrowError(error.message),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "borrow_equipment",
    record_id: parsed.data.id,
    old_data: {
      quantity: existing.quantity,
      status: existing.status,
      returned_at: existing.returned_at,
    },
    new_data: {
      quantity: parsed.data.quantity,
      status: parsed.data.status,
      returned_at: returnedAt,
    },
    metadata: {
      note: "Borrow record updated.",
      changed_fields: ["quantity", "status", "returned_at"],
    },
  });

  return {
    success: true,
    message: "Borrow record updated.",
  };
}

export async function toggleBorrowReturnedForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; isReturned: boolean }
): Promise<ToggleBorrowReturnedResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_BORROW_RETURN);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = toggleBorrowReturnedSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid borrow record." };
  }

  const { data: existing, error: fetchError } =
    await borrowEquipmentRepository.getBorrowById(adminClient, parsed.data.id);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!existing) {
    return { success: false, error: "Borrow record not found." };
  }

  const nextStatus = parsed.data.isReturned
    ? BORROW_EQUIPMENT_STATUSES.RETURNED
    : BORROW_EQUIPMENT_STATUSES.BORROWED;

  if (!parsed.data.isReturned) {
    const stockError = await validateBorrowQuantityForEquipment(
      adminClient,
      actorUserId,
      existing.equipment_id,
      existing,
      existing.quantity ?? 1,
      nextStatus
    );

    if (stockError) {
      return stockError;
    }
  }

  const returnedAt = parsed.data.isReturned ? new Date().toISOString() : null;

  const { error } = await borrowEquipmentRepository.updateBorrowRecord(
    adminClient,
    parsed.data.id,
    {
      quantity: existing.quantity ?? 1,
      status: nextStatus,
      returned_at: returnedAt,
    }
  );

  if (error) {
    return {
      success: false,
      error: mapUpdateBorrowError(error.message),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "borrow_equipment",
    record_id: parsed.data.id,
    old_data: {
      status: existing.status,
      returned_at: existing.returned_at,
    },
    new_data: {
      status: nextStatus,
      returned_at: returnedAt,
    },
    metadata: {
      note: parsed.data.isReturned
        ? "Equipment marked as returned."
        : "Equipment marked as borrowed.",
      changed_fields: ["status", "returned_at"],
    },
  });

  return {
    success: true,
    message: parsed.data.isReturned
      ? "Equipment marked as returned."
      : "Equipment marked as borrowed.",
  };
}
