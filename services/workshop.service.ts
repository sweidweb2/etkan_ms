import {
  WORKSHOP_INSTRUCTOR_ROLE_VALUES,
  WORKSHOP_OFFERING_TYPE_VALUES,
  WORKSHOP_OFFERING_TYPES,
  WORKSHOP_PAYMENT_TYPES,
  WORKSHOP_PAYMENT_TYPE_VALUES,
  WORKSHOP_SESSION_STATUS_VALUES,
  WORKSHOP_SESSION_STATUSES,
  WORKSHOP_WAGE_TYPE_VALUES,
  type WorkshopInstructorRole,
  type WorkshopOfferingType,
  type WorkshopPaymentMethod,
  type WorkshopPaymentType,
  type WorkshopSessionStatus,
  type WorkshopWageType,
} from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_VALUES,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  deleteAllMirrorsForWorkshop,
  deleteAllWorkshopEntitySlots,
  deleteMirrorsForWorkshopInstructor,
  mirrorWorkshopSlotsToInstructor,
  recopyAllMirrorsForWorkshop,
} from "@/lib/manager/workshops/mirror-instructor-schedule";
import { ENTITY_SCHEDULE_TYPE_WORKSHOP } from "@/lib/validators/manager/instructor-schedule-slot";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { roleSchema } from "@/lib/validators/role";
import { changeWorkshopStatusSchema } from "@/lib/validators/manager/change-workshop-status";
import { createWorkshopSchema } from "@/lib/validators/manager/create-workshop";
import { updateWorkshopSchema } from "@/lib/validators/manager/update-workshop";
import { updateWorkshopProposalNotesSchema } from "@/lib/validators/manager/update-workshop-proposal-notes";
import {
  createWorkshopInstructorSchema,
  removeWorkshopInstructorSchema,
  updateWorkshopInstructorSchema,
} from "@/lib/validators/manager/workshop-instructor";
import {
  deleteWorkshopDocumentSchema,
  renameWorkshopDocumentSchema,
  uploadWorkshopDocumentSchema,
} from "@/lib/validators/manager/workshop-document";
import {
  createWorkshopPaymentSchema,
  deleteWorkshopPaymentSchema,
  updateWorkshopPaymentSchema,
} from "@/lib/validators/manager/workshop-payment";
import {
  createWorkshopSessionSchema,
  deleteWorkshopSessionSchema,
  updateWorkshopSessionSchema,
} from "@/lib/validators/manager/workshop-session";
import {
  assertWorkshopStatusTransition,
  formatLocalDateYmd,
  isWorkshopContentMutationLocked,
  WORKSHOP_CONTENT_LOCKED_MESSAGE,
} from "@/lib/manager/workshops/status-transitions";
import {
  buildWorkshopDocumentStoragePath,
  getWorkshopDocumentPublicUrl,
} from "@/lib/manager/workshops/storage-path";
import * as profileRepository from "@/repositories/profile.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import type { InstructorScheduleSlotRecord } from "@/repositories/instructor-schedule-slot.repository";
import * as workshopDocumentRepository from "@/repositories/workshop-document.repository";
import type { WorkshopDocumentRecord } from "@/repositories/workshop-document.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import type { WorkshopInstructorWithProfileRecord } from "@/repositories/workshop-instructor.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import type { WorkshopPaymentRecord } from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import type { WorkshopRecord } from "@/repositories/workshop.repository";
import * as workshopSessionRepository from "@/repositories/workshop-session.repository";
import type { WorkshopSessionRecord } from "@/repositories/workshop-session.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
  hasPermission,
} from "@/services/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import { mapInstructorScheduleSlotRecordToSession } from "@/services/instructor-schedule-slot.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerWorkshopDetailPageData,
  ManagerWorkshopDocumentRow,
  ManagerWorkshopInstructorCandidate,
  ManagerWorkshopInstructorRow,
  ManagerWorkshopPaymentLedgerRow,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopPaymentSummary,
  ManagerWorkshopPaymentsTotals,
  ManagerWorkshopRow,
  ManagerWorkshopSessionRow,
} from "@/types/manager-workshop";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateWorkshopSuccess = {
  success: true;
  workshop: ManagerWorkshopRow;
  message: string;
};

export type CreateWorkshopFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateWorkshopResult = CreateWorkshopSuccess | CreateWorkshopFailure;

export type UpdateWorkshopSuccess = {
  success: true;
  workshop: ManagerWorkshopRow;
  message: string;
};

export type UpdateWorkshopFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateWorkshopResult = UpdateWorkshopSuccess | UpdateWorkshopFailure;

export type DeleteWorkshopSuccess = {
  success: true;
  message: string;
};

export type DeleteWorkshopFailure = {
  success: false;
  error: string;
};

export type DeleteWorkshopResult = DeleteWorkshopSuccess | DeleteWorkshopFailure;

function contentLockErrorForWorkshopStatus(status: string): string | null {
  if (isWorkshopContentMutationLocked(status)) {
    return WORKSHOP_CONTENT_LOCKED_MESSAGE;
  }
  return null;
}

export type ChangeWorkshopStatusSuccess = {
  success: true;
  workshop: ManagerWorkshopRow;
  message: string;
};

export type ChangeWorkshopStatusFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ChangeWorkshopStatusResult =
  | ChangeWorkshopStatusSuccess
  | ChangeWorkshopStatusFailure;

export type WorkshopInstructorMutationSuccess = {
  success: true;
  instructor: ManagerWorkshopInstructorRow;
  message: string;
};

export type WorkshopInstructorMutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type WorkshopInstructorMutationResult =
  | WorkshopInstructorMutationSuccess
  | WorkshopInstructorMutationFailure;

export type RemoveWorkshopInstructorSuccess = {
  success: true;
  message: string;
};

export type RemoveWorkshopInstructorFailure = {
  success: false;
  error: string;
};

export type RemoveWorkshopInstructorResult =
  | RemoveWorkshopInstructorSuccess
  | RemoveWorkshopInstructorFailure;

export type WorkshopDocumentMutationSuccess = {
  success: true;
  document: ManagerWorkshopDocumentRow;
  message: string;
};

export type WorkshopDocumentMutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type WorkshopDocumentMutationResult =
  | WorkshopDocumentMutationSuccess
  | WorkshopDocumentMutationFailure;

export type DeleteWorkshopDocumentSuccess = {
  success: true;
  message: string;
};

export type DeleteWorkshopDocumentFailure = {
  success: false;
  error: string;
};

export type DeleteWorkshopDocumentResult =
  | DeleteWorkshopDocumentSuccess
  | DeleteWorkshopDocumentFailure;

export type WorkshopPaymentMutationSuccess = {
  success: true;
  payment: ManagerWorkshopPaymentRow;
  message: string;
};

export type WorkshopPaymentMutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type WorkshopPaymentMutationResult =
  | WorkshopPaymentMutationSuccess
  | WorkshopPaymentMutationFailure;

export type DeleteWorkshopPaymentSuccess = {
  success: true;
  message: string;
};

export type DeleteWorkshopPaymentFailure = {
  success: false;
  error: string;
};

export type DeleteWorkshopPaymentResult =
  | DeleteWorkshopPaymentSuccess
  | DeleteWorkshopPaymentFailure;

export type WorkshopSessionMutationSuccess = {
  success: true;
  session: ManagerWorkshopSessionRow;
  message: string;
};

export type WorkshopSessionMutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type WorkshopSessionMutationResult =
  | WorkshopSessionMutationSuccess
  | WorkshopSessionMutationFailure;

export type DeleteWorkshopSessionSuccess = {
  success: true;
  message: string;
};

export type DeleteWorkshopSessionFailure = {
  success: false;
  error: string;
};

export type DeleteWorkshopSessionResult =
  | DeleteWorkshopSessionSuccess
  | DeleteWorkshopSessionFailure;

export const WORKSHOP_HAS_PAYMENTS_DELETE_ERROR =
  "Remove workshop payments before deleting this workshop.";

function mapWorkshopStatus(status: string): WorkshopStatusValue {
  if (
    (WORKSHOP_STATUS_VALUES as readonly string[]).includes(status)
  ) {
    return status as WorkshopStatusValue;
  }
  return WORKSHOP_STATUSES.DRAFT;
}

function mapWorkshopOfferingType(type: string): WorkshopOfferingType {
  if (
    (WORKSHOP_OFFERING_TYPE_VALUES as readonly string[]).includes(type)
  ) {
    return type as WorkshopOfferingType;
  }
  return WORKSHOP_OFFERING_TYPES.WORKSHOP;
}

function mapWorkshopRecordToRow(record: WorkshopRecord): ManagerWorkshopRow {
  return {
    id: record.id,
    name: record.name,
    subject: record.subject,
    status: mapWorkshopStatus(record.status),
    type: mapWorkshopOfferingType(record.type),
    phone: record.phone,
    target_audience: record.target_audience,
    nb_participants: record.nb_participants,
    proposal_notes: record.proposal_notes,
    number_of_sessions: record.number_of_sessions,
    price: record.price,
    start_date: record.start_date,
    end_date: record.end_date,
    delivery_place: record.delivery_place,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapCreateWorkshopError(message: string): string {
  return message || "Unable to create workshop. Please try again.";
}

function mapUpdateWorkshopError(message: string): string {
  return message || "Unable to update workshop. Please try again.";
}

function mapInstructorRole(role: string): WorkshopInstructorRole {
  if (
    (WORKSHOP_INSTRUCTOR_ROLE_VALUES as readonly string[]).includes(role)
  ) {
    return role as WorkshopInstructorRole;
  }
  return "lead";
}

function mapWageType(wageType: string): WorkshopWageType {
  if (
    (WORKSHOP_WAGE_TYPE_VALUES as readonly string[]).includes(wageType)
  ) {
    return wageType as WorkshopWageType;
  }
  return "fixed";
}

function mapWorkshopInstructorRecord(
  record: WorkshopInstructorWithProfileRecord
): ManagerWorkshopInstructorRow {
  return {
    id: record.id,
    workshop_id: record.workshop_id,
    user_id: record.user_id,
    role: mapInstructorRole(record.role),
    wage_type: mapWageType(record.wage_type),
    wage_amount: record.wage_amount,
    notes: record.notes,
    created_at: record.created_at,
    username: record.profiles?.username ?? null,
  };
}

function mapWorkshopDocumentRecord(
  record: WorkshopDocumentRecord
): ManagerWorkshopDocumentRow {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return {
    id: record.id,
    workshop_id: record.workshop_id,
    name: record.name,
    storage_path: record.storage_path,
    file_size: record.file_size,
    mime_type: record.mime_type,
    uploaded_by: record.uploaded_by,
    created_at: record.created_at,
    public_url: supabaseUrl
      ? getWorkshopDocumentPublicUrl(supabaseUrl, record.storage_path)
      : undefined,
  };
}

function mapPaymentType(type: string): WorkshopPaymentType {
  if ((WORKSHOP_PAYMENT_TYPE_VALUES as readonly string[]).includes(type)) {
    return type as WorkshopPaymentType;
  }
  return WORKSHOP_PAYMENT_TYPES.CREDIT;
}

function mapWorkshopPaymentRecord(
  record: WorkshopPaymentRecord
): ManagerWorkshopPaymentRow {
  return {
    id: record.id,
    workshop_id: record.workshop_id,
    amount: Number(record.amount),
    type: mapPaymentType(record.type),
    payment_date: record.payment_date,
    payment_method: record.payment_method as WorkshopPaymentMethod | string | null,
    notes: record.notes,
    created_by: record.created_by,
    created_at: record.created_at,
  };
}

function mapWorkshopSessionStatus(status: string): WorkshopSessionStatus {
  if (
    (WORKSHOP_SESSION_STATUS_VALUES as readonly string[]).includes(status)
  ) {
    return status as WorkshopSessionStatus;
  }
  return WORKSHOP_SESSION_STATUSES.PLANNED;
}

function mapWorkshopSessionRecord(
  record: WorkshopSessionRecord
): ManagerWorkshopSessionRow {
  return {
    id: record.id,
    workshop_id: record.workshop_id,
    nb_order: record.nb_order,
    session_date: record.session_date,
    start_time: record.start_time,
    end_time: record.end_time,
    nb_hours: Number(record.nb_hours),
    topic: record.topic,
    notes: record.notes,
    suggestions: record.suggestions,
    status: mapWorkshopSessionStatus(record.status),
    participants_eval: record.participants_eval,
    session_eval: record.session_eval,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

async function syncWorkshopSessionCount(
  adminClient: Supabase,
  workshopId: string
): Promise<string | null> {
  const countResult =
    await workshopSessionRepository.countWorkshopSessionsByWorkshopId(
      adminClient,
      workshopId
    );

  if (countResult.error) {
    return countResult.error.message || "Unable to sync session count.";
  }

  const { error } = await workshopRepository.updateWorkshopNumberOfSessionsById(
    adminClient,
    workshopId,
    countResult.count ?? 0
  );

  if (error) {
    return error.message || "Unable to sync session count.";
  }

  return null;
}

export function buildWorkshopPaymentSummary(
  payments: ManagerWorkshopPaymentRow[],
  price: number | null
): ManagerWorkshopPaymentSummary {
  let credits = 0;
  let debits = 0;

  for (const payment of payments) {
    if (payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT) {
      credits += payment.amount;
    } else {
      debits += payment.amount;
    }
  }

  const net = credits - debits;
  const remaining = price == null ? null : price - net;

  return { credits, debits, net, price, remaining };
}

/** Manager and CEO see every workshop; other roles only assigned ones. */
function roleCanViewAllWorkshops(role: RoleValue | null | undefined): boolean {
  return role === ROLES.MANAGER || role === ROLES.CEO;
}

async function resolveActorRole(
  adminClient: Supabase,
  actorUserId: string
): Promise<RoleValue | null> {
  const result = await profileRepository.findRoleById(adminClient, actorUserId);
  if (result.error) {
    throw new Error(result.error.message);
  }
  const parsed = roleSchema.safeParse(result.data?.role);
  return parsed.success ? parsed.data : null;
}

async function actorCanAccessWorkshop(
  adminClient: Supabase,
  actorUserId: string,
  workshopId: string
): Promise<boolean> {
  const role = await resolveActorRole(adminClient, actorUserId);
  if (roleCanViewAllWorkshops(role)) {
    return true;
  }

  const assignment =
    await workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser(
      adminClient,
      workshopId,
      actorUserId
    );

  if (assignment.error) {
    throw new Error(assignment.error.message);
  }

  return Boolean(assignment.data);
}

export async function listWorkshopsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerWorkshopRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.WORKSHOPS_VIEW);

  if (!actorUserId) {
    return [];
  }

  const role = await resolveActorRole(adminClient, actorUserId);

  if (roleCanViewAllWorkshops(role)) {
    const result = await workshopRepository.listWorkshops(adminClient);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return (result.data ?? []).map(mapWorkshopRecordToRow);
  }

  const assignmentsResult =
    await workshopInstructorRepository.listWorkshopInstructorsByUserId(
      adminClient,
      actorUserId
    );

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const workshopIds = [
    ...new Set(
      (assignmentsResult.data ?? []).map((row) => row.workshop_id)
    ),
  ];

  const result = await workshopRepository.listWorkshopsByIds(
    adminClient,
    workshopIds
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).map(mapWorkshopRecordToRow);
}

export function buildWorkshopPaymentsTotals(
  payments: ManagerWorkshopPaymentLedgerRow[]
): ManagerWorkshopPaymentsTotals {
  let credits = 0;
  let debits = 0;
  const workshopIds = new Set<string>();

  for (const payment of payments) {
    workshopIds.add(payment.workshop_id);
    if (payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT) {
      credits += payment.amount;
    } else {
      debits += payment.amount;
    }
  }

  return {
    credits,
    debits,
    net: credits - debits,
    payment_count: payments.length,
    workshops_with_payments: workshopIds.size,
  };
}

export async function listAllWorkshopPaymentsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<{
  payments: ManagerWorkshopPaymentLedgerRow[];
  totals: ManagerWorkshopPaymentsTotals;
}> {
  const overview = await getWorkshopPaymentsOverviewForManager(
    adminClient,
    actorUserId,
    { page: 1, pageSize: 10 }
  );
  return {
    payments: overview.payments,
    totals: overview.totals,
  };
}

export async function getWorkshopPaymentsOverviewForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options: { page?: number; pageSize?: number } = {}
): Promise<{
  payments: ManagerWorkshopPaymentLedgerRow[];
  totals: ManagerWorkshopPaymentsTotals;
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW
  );

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const [pageResult, totalsResult] = await Promise.all([
    workshopPaymentRepository.listWorkshopPaymentsPage(adminClient, {
      offset,
      limit: pageSize,
    }),
    workshopPaymentRepository.aggregateWorkshopPaymentsTotals(
      adminClient,
      WORKSHOP_PAYMENT_TYPES.CREDIT,
      WORKSHOP_PAYMENT_TYPES.DEBIT
    ),
  ]);

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }
  if (totalsResult.error) {
    throw new Error(totalsResult.error.message);
  }

  const payments: ManagerWorkshopPaymentLedgerRow[] = (pageResult.data ?? []).map(
    (record) => {
      const workshopRelation = record.workshops as
        | { name: string }
        | { name: string }[]
        | null;
      const workshopName = Array.isArray(workshopRelation)
        ? (workshopRelation[0]?.name ?? "—")
        : (workshopRelation?.name ?? "—");

      return {
        ...mapWorkshopPaymentRecord(record),
        workshop_name: workshopName,
      };
    }
  );

  return {
    payments,
    totals: totalsResult.data!,
    totalCount: pageResult.count ?? payments.length,
    page,
    pageSize,
  };
}

export async function getWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  workshopId: string
): Promise<ManagerWorkshopDetailPageData | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.WORKSHOPS_VIEW);

  if (!actorUserId) {
    return null;
  }

  const canAccess = await actorCanAccessWorkshop(
    adminClient,
    actorUserId,
    workshopId
  );
  if (!canAccess) {
    return null;
  }

  const [canViewPayments, canViewScheduleSlots, canAssignInstructors] =
    await Promise.all([
      hasPermission(
        adminClient,
        actorUserId,
        PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW
      ),
      hasPermission(
        adminClient,
        actorUserId,
        PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
      ),
      hasPermission(
        adminClient,
        actorUserId,
        PERMISSIONS.WORKSHOPS_INSTRUCTORS_CREATE
      ),
    ]);

  const [
    workshopResult,
    instructorsResult,
    documentsResult,
    sessionsResult,
    paymentCountResult,
    paymentsResult,
    scheduleSlotsResult,
    candidatesResult,
  ] = await Promise.all([
    workshopRepository.findWorkshopById(adminClient, workshopId),
    workshopInstructorRepository.listWorkshopInstructorsByWorkshopId(
      adminClient,
      workshopId
    ),
    workshopDocumentRepository.listWorkshopDocumentsByWorkshopId(
      adminClient,
      workshopId
    ),
    workshopSessionRepository.listWorkshopSessionsByWorkshopId(
      adminClient,
      workshopId
    ),
    workshopRepository.countWorkshopPaymentsByWorkshopId(
      adminClient,
      workshopId
    ),
    canViewPayments
      ? workshopPaymentRepository.listWorkshopPaymentsByWorkshopId(
          adminClient,
          workshopId
        )
      : Promise.resolve({ data: [], error: null }),
    canViewScheduleSlots
      ? instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord(
          adminClient,
          ENTITY_SCHEDULE_TYPE_WORKSHOP,
          workshopId
        )
      : Promise.resolve({ data: [], error: null }),
    canAssignInstructors
      ? profileRepository.listInstructorProfiles(adminClient)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (workshopResult.error) {
    throw new Error(workshopResult.error.message);
  }

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  if (candidatesResult.error) {
    throw new Error(candidatesResult.error.message);
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  if (scheduleSlotsResult.error) {
    throw new Error(scheduleSlotsResult.error.message);
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (paymentCountResult.error) {
    throw new Error(paymentCountResult.error.message);
  }

  if (!workshopResult.data) {
    return null;
  }

  const workshop = mapWorkshopRecordToRow(workshopResult.data);
  const allPayments = (paymentsResult.data ?? []).map(mapWorkshopPaymentRecord);
  const payments = canViewPayments ? allPayments : [];
  const instructors = (
    (instructorsResult.data ?? []) as WorkshopInstructorWithProfileRecord[]
  ).map(mapWorkshopInstructorRecord);

  const assignedUserIds = new Set(instructors.map((row) => row.user_id));
  const instructorCandidates: ManagerWorkshopInstructorCandidate[] = (
    candidatesResult.data ?? []
  )
    .filter((profile) => !assignedUserIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      username: profile.username ?? "Unknown",
    }));

  const documents = (documentsResult.data ?? []).map(mapWorkshopDocumentRecord);

  const scheduleSlots = canViewScheduleSlots
    ? (scheduleSlotsResult.data ?? []).map((record) =>
        mapInstructorScheduleSlotRecordToSession(
          record as InstructorScheduleSlotRecord
        )
      )
    : [];

  const sessions = (sessionsResult.data ?? []).map(mapWorkshopSessionRecord);

  return {
    workshop,
    payment_count: paymentCountResult.count ?? allPayments.length,
    payments,
    payment_summary: canViewPayments
      ? buildWorkshopPaymentSummary(allPayments, workshop.price)
      : buildWorkshopPaymentSummary([], workshop.price),
    instructors,
    instructorCandidates,
    documents,
    scheduleSlots,
    sessions,
  };
}

export async function createWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<CreateWorkshopResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWorkshopSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const { data, error } = await workshopRepository.createWorkshop(adminClient, {
    name: dataInput.name.trim(),
    subject: dataInput.subject,
    status: WORKSHOP_STATUSES.DRAFT,
    type: dataInput.type,
    phone: dataInput.phone,
    target_audience: dataInput.target_audience,
    nb_participants: dataInput.nb_participants,
    proposal_notes: dataInput.proposal_notes,
    number_of_sessions: 0,
    price: dataInput.price,
    start_date: dataInput.start_date,
    end_date: dataInput.end_date,
    delivery_place: dataInput.delivery_place,
    created_by: actorUserId,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapCreateWorkshopError(error?.message ?? "Unknown error"),
    };
  }

  const workshop = mapWorkshopRecordToRow(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshops",
    record_id: data.id,
    new_data: {
      name: workshop.name,
      subject: workshop.subject,
      status: workshop.status,
      type: workshop.type,
      phone: workshop.phone,
      price: workshop.price,
      start_date: workshop.start_date,
      end_date: workshop.end_date,
    },
    metadata: { note: "Workshop created." },
  });

  return {
    success: true,
    workshop,
    message: "Workshop created.",
  };
}

export async function updateWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdateWorkshopResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: mapUpdateWorkshopError(existing.error.message),
    };
  }

  if (!existing.data) {
    return { success: false, error: "Workshop not found." };
  }

  const { data, error } = await workshopRepository.updateWorkshopById(
    adminClient,
    dataInput.id,
    {
      name: dataInput.name.trim(),
      subject: dataInput.subject,
      type: dataInput.type,
      phone: dataInput.phone,
      target_audience: dataInput.target_audience,
      nb_participants: dataInput.nb_participants,
      proposal_notes: dataInput.proposal_notes,
      price: dataInput.price,
      start_date: dataInput.start_date,
      end_date: dataInput.end_date,
      delivery_place: dataInput.delivery_place,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateWorkshopError(error?.message ?? "Unknown error"),
    };
  }

  const workshop = mapWorkshopRecordToRow(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshops",
    record_id: data.id,
    old_data: {
      name: existing.data.name,
      subject: existing.data.subject,
      status: existing.data.status,
      type: existing.data.type,
      phone: existing.data.phone,
      price: existing.data.price,
      start_date: existing.data.start_date,
      end_date: existing.data.end_date,
    },
    new_data: {
      name: workshop.name,
      subject: workshop.subject,
      status: workshop.status,
      type: workshop.type,
      phone: workshop.phone,
      price: workshop.price,
      start_date: workshop.start_date,
      end_date: workshop.end_date,
    },
    metadata: { note: "Workshop updated." },
  });

  return {
    success: true,
    workshop,
    message: "Workshop updated.",
  };
}

export async function updateWorkshopProposalNotesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdateWorkshopResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopProposalNotesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { id, proposal_notes } = parsed.data;

  const existing = await workshopRepository.findWorkshopById(adminClient, id);

  if (existing.error) {
    return {
      success: false,
      error: mapUpdateWorkshopError(existing.error.message),
    };
  }

  if (!existing.data) {
    return { success: false, error: "Workshop not found." };
  }

  const { data, error } =
    await workshopRepository.updateWorkshopProposalNotesById(
      adminClient,
      id,
      proposal_notes
    );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateWorkshopError(error?.message ?? "Unknown error"),
    };
  }

  const workshop = mapWorkshopRecordToRow(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshops",
    record_id: data.id,
    old_data: {
      proposal_notes: existing.data.proposal_notes,
    },
    new_data: {
      proposal_notes: workshop.proposal_notes,
    },
    metadata: { note: "Workshop proposal notes updated." },
  });

  return {
    success: true,
    workshop,
    message: "Proposal notes saved.",
  };
}

export async function changeWorkshopStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<ChangeWorkshopStatusResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_CHANGE_STATUS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = changeWorkshopStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { id, status: nextStatus } = parsed.data;

  const existing = await workshopRepository.findWorkshopById(adminClient, id);

  if (existing.error) {
    return {
      success: false,
      error: "Unable to update workshop status. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Workshop not found." };
  }

  const currentStatus = mapWorkshopStatus(existing.data.status);
  const transition = assertWorkshopStatusTransition({
    from: currentStatus,
    to: nextStatus,
    startDate: existing.data.start_date,
    endDate: existing.data.end_date,
    today: formatLocalDateYmd(),
  });

  if (!transition.ok) {
    return { success: false, error: transition.error };
  }

  const isTerminalStatus =
    nextStatus === WORKSHOP_STATUSES.CANCELLED ||
    nextStatus === WORKSHOP_STATUSES.COMPLETED;

  if (isTerminalStatus) {
    const mirrorClear = await deleteAllMirrorsForWorkshop(adminClient, id);
    if (mirrorClear.error) {
      return {
        success: false,
        error: mirrorClear.error,
      };
    }

    const shouldStampEndDate =
      nextStatus === WORKSHOP_STATUSES.COMPLETED &&
      (existing.data.end_date == null || existing.data.end_date === "");
    const stampedEndDate = shouldStampEndDate
      ? formatLocalDateYmd()
      : undefined;

    const { data, error } = await workshopRepository.updateWorkshopStatusById(
      adminClient,
      id,
      nextStatus,
      stampedEndDate !== undefined ? { end_date: stampedEndDate } : undefined
    );

    if (error || !data) {
      await recopyAllMirrorsForWorkshop(adminClient, id);
      return {
        success: false,
        error: "Unable to update workshop status. Please try again.",
      };
    }

    const workshop = mapWorkshopRecordToRow(data);

    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "workshops",
      record_id: data.id,
      old_data: {
        status: currentStatus,
        ...(shouldStampEndDate ? { end_date: existing.data.end_date } : {}),
      },
      new_data: {
        status: workshop.status,
        ...(shouldStampEndDate ? { end_date: workshop.end_date } : {}),
      },
      metadata: {
        note: shouldStampEndDate
          ? "Workshop status changed; end date set to today."
          : "Workshop status changed.",
      },
    });

    return {
      success: true,
      workshop,
      message: "Workshop status updated.",
    };
  }

  const { data, error } = await workshopRepository.updateWorkshopStatusById(
    adminClient,
    id,
    nextStatus
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to update workshop status. Please try again.",
    };
  }

  const mirrorSync = await recopyAllMirrorsForWorkshop(adminClient, id);
  if (mirrorSync.error) {
    await workshopRepository.updateWorkshopStatusById(
      adminClient,
      id,
      currentStatus
    );
    return {
      success: false,
      error: mirrorSync.error,
    };
  }

  const workshop = mapWorkshopRecordToRow(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshops",
    record_id: data.id,
    old_data: { status: currentStatus },
    new_data: { status: workshop.status },
    metadata: { note: "Workshop status changed." },
  });

  return {
    success: true,
    workshop,
    message: "Workshop status updated.",
  };
}

export async function deleteWorkshopForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  workshopId: string
): Promise<DeleteWorkshopResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existingWorkshop = await workshopRepository.findWorkshopById(
    adminClient,
    workshopId
  );

  if (existingWorkshop.error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  if (!existingWorkshop.data) {
    return { success: false, error: "Workshop not found." };
  }

  const paymentCountResult =
    await workshopRepository.countWorkshopPaymentsByWorkshopId(
      adminClient,
      workshopId
    );

  if (paymentCountResult.error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  if ((paymentCountResult.count ?? 0) > 0) {
    return {
      success: false,
      error: WORKSHOP_HAS_PAYMENTS_DELETE_ERROR,
    };
  }

  const documentsResult =
    await workshopRepository.listWorkshopDocumentStoragePaths(
      adminClient,
      workshopId
    );

  if (documentsResult.error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  const storagePaths = (documentsResult.data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));

  const storageResult =
    await workshopStorageRepository.removeWorkshopStorageObjects(
      adminClient,
      storagePaths
    );

  if (storageResult.error) {
    return {
      success: false,
      error: "Unable to remove workshop documents from storage. Please try again.",
    };
  }

  const mirrorClear = await deleteAllMirrorsForWorkshop(adminClient, workshopId);
  if (mirrorClear.error) {
    return {
      success: false,
      error: mirrorClear.error,
    };
  }

  const workshopSlotsClear = await deleteAllWorkshopEntitySlots(
    adminClient,
    workshopId
  );
  if (workshopSlotsClear.error) {
    return {
      success: false,
      error: workshopSlotsClear.error,
    };
  }

  const { error } = await workshopRepository.deleteWorkshopById(
    adminClient,
    workshopId
  );

  if (error) {
    return {
      success: false,
      error: "Unable to delete workshop. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "workshops",
    record_id: workshopId,
    old_data: {
      name: existingWorkshop.data.name,
      subject: existingWorkshop.data.subject,
      status: existingWorkshop.data.status,
      price: existingWorkshop.data.price,
      start_date: existingWorkshop.data.start_date,
      end_date: existingWorkshop.data.end_date,
    },
    metadata: {
      note: "Workshop hard-deleted with instructors and documents.",
      storage_objects_removed: storagePaths.length,
    },
  });

  return {
    success: true,
    message: "Workshop deleted.",
  };
}

/**
 * Assigns an instructor profile to a workshop.
 * Profile hard-delete cascades workshop_instructors via FK `on delete cascade`.
 */
export async function addWorkshopInstructorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopInstructorMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_INSTRUCTORS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWorkshopInstructorSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.workshop_id
  );

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to add instructor.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const profileResult = await profileRepository.findProfileById(
    adminClient,
    dataInput.user_id
  );

  if (profileResult.error) {
    return {
      success: false,
      error: profileResult.error.message || "Unable to add instructor.",
    };
  }

  if (!profileResult.data) {
    return { success: false, error: "User not found." };
  }

  if (!profileResult.data.is_instructor) {
    return {
      success: false,
      error: "Only instructor profiles can be assigned to a workshop.",
    };
  }

  const existingAssignment =
    await workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser(
      adminClient,
      dataInput.workshop_id,
      dataInput.user_id
    );

  if (existingAssignment.error) {
    return {
      success: false,
      error: existingAssignment.error.message || "Unable to add instructor.",
    };
  }

  if (existingAssignment.data) {
    return {
      success: false,
      error: "This instructor is already assigned to this workshop.",
    };
  }

  const { data, error } =
    await workshopInstructorRepository.createWorkshopInstructor(adminClient, {
      workshop_id: dataInput.workshop_id,
      user_id: dataInput.user_id,
      role: dataInput.role,
      wage_type: dataInput.wage_type,
      wage_amount: dataInput.wage_amount,
      notes: dataInput.notes,
    });

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to add instructor.",
    };
  }

  const instructor = mapWorkshopInstructorRecord(
    data as WorkshopInstructorWithProfileRecord
  );

  const mirrorResult = await mirrorWorkshopSlotsToInstructor(
    adminClient,
    dataInput.workshop_id,
    dataInput.user_id
  );

  if (mirrorResult.error) {
    await workshopInstructorRepository.deleteWorkshopInstructorById(
      adminClient,
      instructor.id
    );
    return {
      success: false,
      error: mirrorResult.error,
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_instructors",
    record_id: instructor.id,
    new_data: {
      workshop_id: instructor.workshop_id,
      user_id: instructor.user_id,
      role: instructor.role,
      wage_type: instructor.wage_type,
      wage_amount: instructor.wage_amount,
    },
    metadata: {
      note: "Workshop instructor assigned.",
      mirrored_busy_slots: mirrorResult.count ?? 0,
    },
  });

  return {
    success: true,
    instructor,
    message: "Instructor added.",
  };
}

export async function updateWorkshopInstructorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopInstructorMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_INSTRUCTORS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopInstructorSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing =
    await workshopInstructorRepository.findWorkshopInstructorById(
      adminClient,
      dataInput.id
    );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to update instructor.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Instructor assignment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Instructor assignment not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to update instructor.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopInstructorRecord(
    existing.data as WorkshopInstructorWithProfileRecord
  );

  const { data, error } =
    await workshopInstructorRepository.updateWorkshopInstructorById(
      adminClient,
      dataInput.id,
      {
        role: dataInput.role,
        wage_type: dataInput.wage_type,
        wage_amount: dataInput.wage_amount,
        notes: dataInput.notes,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to update instructor.",
    };
  }

  const instructor = mapWorkshopInstructorRecord(
    data as WorkshopInstructorWithProfileRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_instructors",
    record_id: instructor.id,
    old_data: {
      role: previous.role,
      wage_type: previous.wage_type,
      wage_amount: previous.wage_amount,
      notes: previous.notes,
    },
    new_data: {
      role: instructor.role,
      wage_type: instructor.wage_type,
      wage_amount: instructor.wage_amount,
      notes: instructor.notes,
    },
    metadata: { note: "Workshop instructor updated." },
  });

  return {
    success: true,
    instructor,
    message: "Instructor updated.",
  };
}

export async function removeWorkshopInstructorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<RemoveWorkshopInstructorResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_INSTRUCTORS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = removeWorkshopInstructorSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing =
    await workshopInstructorRepository.findWorkshopInstructorById(
      adminClient,
      dataInput.id
    );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to remove instructor.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Instructor assignment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Instructor assignment not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to remove instructor.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopInstructorRecord(
    existing.data as WorkshopInstructorWithProfileRecord
  );

  const mirrorDeleteResult = await deleteMirrorsForWorkshopInstructor(
    adminClient,
    previous.workshop_id,
    previous.user_id
  );

  if (mirrorDeleteResult.error) {
    return {
      success: false,
      error: mirrorDeleteResult.error,
    };
  }

  const { error } =
    await workshopInstructorRepository.deleteWorkshopInstructorById(
      adminClient,
      dataInput.id
    );

  if (error) {
    await mirrorWorkshopSlotsToInstructor(
      adminClient,
      previous.workshop_id,
      previous.user_id
    );
    return {
      success: false,
      error: error.message || "Unable to remove instructor.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_instructors",
    record_id: dataInput.id,
    old_data: {
      workshop_id: previous.workshop_id,
      user_id: previous.user_id,
      role: previous.role,
      wage_type: previous.wage_type,
      wage_amount: previous.wage_amount,
    },
    metadata: {
      note: "Workshop instructor removed.",
    },
  });

  return {
    success: true,
    message: "Instructor removed.",
  };
}

export async function uploadWorkshopDocumentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopDocumentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DOCUMENTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = uploadWorkshopDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.workshop_id
  );

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to upload document.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const storagePath = buildWorkshopDocumentStoragePath(
    dataInput.workshop_id,
    dataInput.file.name
  );
  const contentType = dataInput.file.type.trim();
  const fileBytes = await dataInput.file.arrayBuffer();

  const uploadResult =
    await workshopStorageRepository.uploadWorkshopStorageObject(
      adminClient,
      storagePath,
      fileBytes,
      contentType
    );

  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload document.",
    };
  }

  const { data, error } =
    await workshopDocumentRepository.createWorkshopDocument(adminClient, {
      workshop_id: dataInput.workshop_id,
      name: dataInput.name,
      storage_path: storagePath,
      file_size: dataInput.file.size,
      mime_type: contentType,
      uploaded_by: actorUserId,
    });

  if (error || !data) {
    await workshopStorageRepository.removeWorkshopStorageObjects(adminClient, [
      storagePath,
    ]);
    return {
      success: false,
      error: error?.message || "Unable to save document.",
    };
  }

  const document = mapWorkshopDocumentRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_documents",
    record_id: document.id,
    new_data: {
      workshop_id: document.workshop_id,
      name: document.name,
      storage_path: document.storage_path,
      file_size: document.file_size,
      mime_type: document.mime_type,
    },
    metadata: { note: "Workshop document uploaded." },
  });

  return {
    success: true,
    document,
    message: "Document uploaded.",
  };
}

export async function renameWorkshopDocumentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopDocumentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DOCUMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = renameWorkshopDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopDocumentRepository.findWorkshopDocumentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to rename document.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Document not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Document not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to rename document.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previousName = existing.data.name;

  const { data, error } =
    await workshopDocumentRepository.updateWorkshopDocumentNameById(
      adminClient,
      dataInput.id,
      dataInput.name
    );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to rename document.",
    };
  }

  const document = mapWorkshopDocumentRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_documents",
    record_id: document.id,
    old_data: { name: previousName },
    new_data: { name: document.name },
    metadata: { note: "Workshop document renamed." },
  });

  return {
    success: true,
    document,
    message: "Document renamed.",
  };
}

export async function deleteWorkshopDocumentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteWorkshopDocumentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DOCUMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteWorkshopDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopDocumentRepository.findWorkshopDocumentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to delete document.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Document not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Document not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to delete document.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const storageResult =
    await workshopStorageRepository.removeWorkshopStorageObjects(adminClient, [
      existing.data.storage_path,
    ]);

  if (storageResult.error) {
    return {
      success: false,
      error: storageResult.error.message || "Unable to delete document file.",
    };
  }

  const { error } = await workshopDocumentRepository.deleteWorkshopDocumentById(
    adminClient,
    dataInput.id
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete document.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_documents",
    record_id: dataInput.id,
    old_data: {
      workshop_id: existing.data.workshop_id,
      name: existing.data.name,
      storage_path: existing.data.storage_path,
      file_size: existing.data.file_size,
      mime_type: existing.data.mime_type,
    },
    metadata: { note: "Workshop document deleted." },
  });

  return {
    success: true,
    message: "Document deleted.",
  };
}

export async function createWorkshopPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopPaymentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWorkshopPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.workshop_id
  );

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to create payment.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const { data, error } = await workshopPaymentRepository.createWorkshopPayment(
    adminClient,
    {
      workshop_id: dataInput.workshop_id,
      amount: dataInput.amount,
      type: dataInput.type,
      payment_date: dataInput.payment_date,
      payment_method: dataInput.payment_method,
      notes: dataInput.notes,
      created_by: actorUserId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to create payment.",
    };
  }

  const payment = mapWorkshopPaymentRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_payments",
    record_id: payment.id,
    new_data: {
      workshop_id: payment.workshop_id,
      amount: payment.amount,
      type: payment.type,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
    },
    metadata: { note: "Workshop payment created." },
  });

  return {
    success: true,
    payment,
    message:
      payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT
        ? "Credit recorded."
        : "Debit recorded.",
  };
}

export async function updateWorkshopPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopPaymentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopPaymentRepository.findWorkshopPaymentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to update payment.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Payment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Payment not found." };
  }

  const workshopForUpdate = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopForUpdate.error) {
    return {
      success: false,
      error: workshopForUpdate.error.message || "Unable to update payment.",
    };
  }
  if (!workshopForUpdate.data) {
    return { success: false, error: "Workshop not found." };
  }
  const updateLocked = contentLockErrorForWorkshopStatus(
    workshopForUpdate.data.status
  );
  if (updateLocked) {
    return { success: false, error: updateLocked };
  }

  const previous = mapWorkshopPaymentRecord(existing.data);

  const { data, error } =
    await workshopPaymentRepository.updateWorkshopPaymentById(
      adminClient,
      dataInput.id,
      {
        amount: dataInput.amount,
        type: dataInput.type,
        payment_date: dataInput.payment_date,
        payment_method: dataInput.payment_method,
        notes: dataInput.notes,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to update payment.",
    };
  }

  const payment = mapWorkshopPaymentRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_payments",
    record_id: payment.id,
    old_data: {
      amount: previous.amount,
      type: previous.type,
      payment_date: previous.payment_date,
      payment_method: previous.payment_method,
      notes: previous.notes,
    },
    new_data: {
      amount: payment.amount,
      type: payment.type,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      notes: payment.notes,
    },
    metadata: { note: "Workshop payment updated." },
  });

  return {
    success: true,
    payment,
    message: "Payment updated.",
  };
}

export async function deleteWorkshopPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteWorkshopPaymentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteWorkshopPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopPaymentRepository.findWorkshopPaymentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to delete payment.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Payment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Payment not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to delete payment.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopPaymentRecord(existing.data);

  const { error } = await workshopPaymentRepository.deleteWorkshopPaymentById(
    adminClient,
    dataInput.id
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete payment.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_payments",
    record_id: dataInput.id,
    old_data: {
      workshop_id: previous.workshop_id,
      amount: previous.amount,
      type: previous.type,
      payment_date: previous.payment_date,
      payment_method: previous.payment_method,
    },
    metadata: { note: "Workshop payment deleted." },
  });

  return {
    success: true,
    message: "Payment deleted.",
  };
}

export async function createWorkshopSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopSessionMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_SESSIONS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWorkshopSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;
  const nbHours = dataInput.nb_hours;

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.workshop_id
  );

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to create session.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  let nbOrder = dataInput.nb_order;
  if (nbOrder == null) {
    const maxOrderResult =
      await workshopSessionRepository.getMaxWorkshopSessionOrder(
        adminClient,
        dataInput.workshop_id
      );
    if (maxOrderResult.error) {
      return {
        success: false,
        error: maxOrderResult.error.message || "Unable to create session.",
      };
    }
    nbOrder = (maxOrderResult.data?.nb_order ?? 0) + 1;
  }

  const { data, error } = await workshopSessionRepository.createWorkshopSession(
    adminClient,
    {
      workshop_id: dataInput.workshop_id,
      nb_order: nbOrder,
      session_date: dataInput.session_date,
      start_time: dataInput.start_time,
      end_time: dataInput.end_time,
      nb_hours: nbHours,
      topic: dataInput.topic.trim(),
      notes: dataInput.notes,
      suggestions: dataInput.suggestions,
      status: dataInput.status,
      participants_eval: dataInput.participants_eval,
      session_eval: dataInput.session_eval,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapWorkshopSessionError(error?.message ?? "Unable to create session."),
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    dataInput.workshop_id
  );
  if (syncError) {
    return { success: false, error: syncError };
  }

  const session = mapWorkshopSessionRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_sessions",
    record_id: session.id,
    new_data: {
      workshop_id: session.workshop_id,
      nb_order: session.nb_order,
      session_date: session.session_date,
      topic: session.topic,
      status: session.status,
    },
    metadata: { note: "Workshop session created." },
  });

  return {
    success: true,
    session,
    message: "Session created.",
  };
}

export async function updateWorkshopSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopSessionMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_SESSIONS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;
  const nbHours = dataInput.nb_hours;

  const existing = await workshopSessionRepository.findWorkshopSessionById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to update session.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Session not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Session not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to update session.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const nbOrder = dataInput.nb_order ?? existing.data.nb_order;

  const { data, error } =
    await workshopSessionRepository.updateWorkshopSessionById(
      adminClient,
      dataInput.id,
      {
        nb_order: nbOrder,
        session_date: dataInput.session_date,
        start_time: dataInput.start_time,
        end_time: dataInput.end_time,
        nb_hours: nbHours,
        topic: dataInput.topic.trim(),
        notes: dataInput.notes,
        suggestions: dataInput.suggestions,
        status: dataInput.status,
        participants_eval: dataInput.participants_eval,
        session_eval: dataInput.session_eval,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: mapWorkshopSessionError(error?.message ?? "Unable to update session."),
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    dataInput.workshop_id
  );
  if (syncError) {
    return { success: false, error: syncError };
  }

  const session = mapWorkshopSessionRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_sessions",
    record_id: session.id,
    old_data: {
      nb_order: existing.data.nb_order,
      session_date: existing.data.session_date,
      topic: existing.data.topic,
      status: existing.data.status,
    },
    new_data: {
      nb_order: session.nb_order,
      session_date: session.session_date,
      topic: session.topic,
      status: session.status,
    },
    metadata: { note: "Workshop session updated." },
  });

  return {
    success: true,
    session,
    message: "Session updated.",
  };
}

export async function deleteWorkshopSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteWorkshopSessionResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_SESSIONS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteWorkshopSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopSessionRepository.findWorkshopSessionById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to delete session.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Session not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Session not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to delete session.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopSessionRecord(existing.data);

  const { error } = await workshopSessionRepository.deleteWorkshopSessionById(
    adminClient,
    dataInput.id
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete session.",
    };
  }

  const syncError = await syncWorkshopSessionCount(
    adminClient,
    dataInput.workshop_id
  );
  if (syncError) {
    return { success: false, error: syncError };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_sessions",
    record_id: dataInput.id,
    old_data: {
      workshop_id: previous.workshop_id,
      nb_order: previous.nb_order,
      session_date: previous.session_date,
      topic: previous.topic,
      status: previous.status,
    },
    metadata: { note: "Workshop session deleted." },
  });

  return {
    success: true,
    message: "Session deleted.",
  };
}

function mapWorkshopSessionError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("workshop_sessions_workshop_nb_order_key") ||
    normalized.includes("duplicate key")
  ) {
    return "A session with this order already exists for this workshop.";
  }
  if (normalized.includes("workshop_sessions_end_after_start")) {
    return "End time must be after start time.";
  }
  return message || "Unable to save session.";
}
