import {
  BORROW_EQUIPMENT_STATUSES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import { getEquipmentRemainingQuantity, getMaxEditableBorrowQuantity } from "@/lib/constants/manager-equipment-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  assertPermission,
  assertStudentSelfAccess,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
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
} from "@/services/ops/audit-log.service";
import {
  listEquipmentsForManager,
} from "@/services/equipment/equipment.service";
import { listStudentsForManager } from "@/services/students/student.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerBorrowClassOption,
  ManagerBorrowEquipmentListRow,
} from "@/types/manager-borrow-equipment-list";
import type { ManagerEquipmentBorrowRow } from "@/types/manager-equipment-borrow";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";
import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type BorrowPageData = {
  classes: ManagerBorrowClassOption[];
  borrowHistory: ManagerBorrowEquipmentListRow[];
  borrowHistoryTotalCount: number;
};

export type BorrowCreateOptions = {
  students: ManagerStudentRow[];
  equipments: ManagerEquipmentRow[];
};

const BORROW_HISTORY_PAGE_SIZE = 50;

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

function mapEquipmentRecordToBorrowStockRow(
  record: {
    id: string;
    name: string;
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
    created_at: string | null;
  },
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

async function loadEquipmentStockByIds(
  adminClient: Supabase,
  equipmentIds: string[]
): Promise<Map<string, ManagerEquipmentRow>> {
  const uniqueIds = [...new Set(equipmentIds)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const [equipmentsResult, borrowedResult] = await Promise.all([
    equipmentRepository.listEquipmentsByIds(adminClient, uniqueIds),
    borrowEquipmentRepository.listActiveBorrowQuantitiesByEquipmentIds(
      adminClient,
      uniqueIds
    ),
  ]);

  if (equipmentsResult.error) {
    throw new Error(equipmentsResult.error.message);
  }
  if (borrowedResult.error) {
    throw new Error(borrowedResult.error.message);
  }

  const borrowedByEquipmentId = new Map<string, number>();
  for (const row of borrowedResult.data ?? []) {
    borrowedByEquipmentId.set(
      row.equipment_id,
      (borrowedByEquipmentId.get(row.equipment_id) ?? 0) + (row.quantity ?? 0)
    );
  }

  return new Map(
    (equipmentsResult.data ?? []).map((record) => {
      const row = mapEquipmentRecordToBorrowStockRow(
        record,
        borrowedByEquipmentId.get(record.id) ?? 0
      );
      return [record.id, row] as const;
    })
  );
}

async function validateBorrowQuantityForEquipment(
  adminClient: Supabase,
  equipmentId: string,
  currentRecord: BorrowEquipmentRecord,
  nextQuantity: number,
  nextStatus: BorrowEquipmentStatusValue
): Promise<UpdateBorrowRecordFailure | null> {
  if (nextStatus === BORROW_EQUIPMENT_STATUSES.RETURNED) {
    return null;
  }

  const equipmentById = await loadEquipmentStockByIds(adminClient, [equipmentId]);
  const equipment = equipmentById.get(equipmentId);

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
  const timer = createNavStepTimer("getBorrowPageData");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW_BORROWS)
    );

    const [classesResult, borrowsResult] = await timer.step("load", () =>
      Promise.all([
        classRepository.listClasses(adminClient),
        borrowEquipmentRepository.listBorrowsPage(adminClient, {
          offset: 0,
          limit: BORROW_HISTORY_PAGE_SIZE,
        }),
      ])
    );

    if (classesResult.error) {
      throw new Error(classesResult.error.message);
    }

    if (borrowsResult.error) {
      throw new Error(borrowsResult.error.message);
    }

    const classes: ManagerBorrowClassOption[] = (classesResult.data ?? []).map(
      (classRow) => ({
        id: classRow.id,
        name: classRow.name,
      })
    );

    return {
      classes,
      borrowHistory: await mapBorrowRecordsToListRows(
        adminClient,
        borrowsResult.data ?? []
      ),
      borrowHistoryTotalCount: borrowsResult.count ?? borrowsResult.data?.length ?? 0,
    };
  } finally {
    timer.end();
  }
}

export async function getBorrowCreateOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<BorrowCreateOptions> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW_BORROWS);

  const [students, equipments] = await Promise.all([
    listStudentsForManager(adminClient, actorUserId),
    listEquipmentsForManager(adminClient, actorUserId),
  ]);

  return { students, equipments };
}

export async function listBorrowClassStudentProfileIdsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<string[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW_BORROWS);

  const membershipResult =
    await studentClassRepository.listStudentUserIdsByClassId(
      adminClient,
      classId
    );

  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }

  const userIds = (membershipResult.data ?? []).map((row) => row.user_id);
  if (userIds.length === 0) {
    return [];
  }

  const profilesResult =
    await studentProfileRepository.listStudentProfilesByUserIds(
      adminClient,
      userIds
    );

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  return [...new Set((profilesResult.data ?? []).map((profile) => profile.id))];
}

export async function listBorrowsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ rows: ManagerBorrowEquipmentListRow[]; totalCount: number }> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EQUIPMENT_VIEW_BORROWS);

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? BORROW_HISTORY_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await borrowEquipmentRepository.listBorrowsPage(
    adminClient,
    { offset, limit: pageSize }
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: await mapBorrowRecordsToListRows(adminClient, data ?? []),
    totalCount: count ?? data?.length ?? 0,
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

export async function listStudentBorrowsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<ManagerStudentBorrowEquipmentRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.EQUIPMENT_VIEW_BORROWS
  );

  return listStudentBorrowsUnchecked(adminClient, userId);
}

export async function listStudentBorrowsForSelf(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerStudentBorrowEquipmentRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.EQUIPMENT_VIEW_OWN_BORROWS
  );
  const userId = await assertStudentSelfAccess(adminClient, actorUserId);
  return listStudentBorrowsUnchecked(adminClient, userId);
}

async function listStudentBorrowsUnchecked(
  adminClient: Supabase,
  userId: string
): Promise<ManagerStudentBorrowEquipmentRow[]> {
  const { data: borrows, error } =
    await borrowEquipmentRepository.listBorrowsByUserId(adminClient, userId);

  if (error) {
    throw new Error(error.message);
  }

  const records = borrows ?? [];

  if (records.length === 0) {
    return [];
  }

  const equipmentIds = [
    ...new Set(records.map((record) => record.equipment_id)),
  ];
  const equipmentById = await buildEquipmentById(adminClient, equipmentIds);

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
    };
  });
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

  const uniqueEquipmentIds = [
    ...new Set(parsed.data.items.map((item) => item.equipment_id)),
  ];
  let equipmentById: Map<string, ManagerEquipmentRow>;
  try {
    equipmentById = await loadEquipmentStockByIds(
      adminClient,
      uniqueEquipmentIds
    );
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to validate equipment stock.",
    };
  }

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
