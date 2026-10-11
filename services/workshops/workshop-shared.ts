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
import { TRANSACTION_CATEGORIES } from "@/lib/manager/accounting/constants";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { getWorkshopDocumentPublicUrl } from "@/lib/manager/workshops/storage-path";
import {
  isWorkshopContentMutationLocked,
  WORKSHOP_CONTENT_LOCKED_MESSAGE,
} from "@/lib/manager/workshops/status-transitions";
import { roleSchema } from "@/lib/validators/role";
import { WORKSHOP_PAYMENT_REMAINING_AMOUNT_MESSAGE } from "@/lib/validators/manager/workshop-payment";
import * as profileRepository from "@/repositories/profile.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import type { WorkshopInstructorWithProfileRecord } from "@/repositories/workshop-instructor.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import type { WorkshopPaymentRecord } from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import type { WorkshopRecord } from "@/repositories/workshop.repository";
import type { WorkshopDocumentRecord } from "@/repositories/workshop-document.repository";
import type { WorkshopSessionRecord } from "@/repositories/workshop-session.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerWorkshopDocumentRow,
  ManagerWorkshopInstructorRow,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopRow,
  ManagerWorkshopSessionRow,
} from "@/types/manager-workshop";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type Supabase = SupabaseClient<Database>;

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

export function contentLockErrorForWorkshopStatus(status: string): string | null {
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

export function mapWorkshopStatus(status: string): WorkshopStatusValue {
  if (
    (WORKSHOP_STATUS_VALUES as readonly string[]).includes(status)
  ) {
    return status as WorkshopStatusValue;
  }
  return WORKSHOP_STATUSES.DRAFT;
}

function mapWorkshopOfferingType(type: string): WorkshopOfferingType {
  if (type === "online") {
    return WORKSHOP_OFFERING_TYPES.PRIVATE;
  }
  if (
    (WORKSHOP_OFFERING_TYPE_VALUES as readonly string[]).includes(type)
  ) {
    return type as WorkshopOfferingType;
  }
  return WORKSHOP_OFFERING_TYPES.WORKSHOP;
}

export function mapWorkshopRecordToRow(
  record: Omit<WorkshopRecord, "proposal_notes"> & {
    proposal_notes?: string | null;
  }
): ManagerWorkshopRow {
  return {
    id: record.id,
    name: record.name,
    subject: record.subject,
    status: mapWorkshopStatus(record.status),
    type: mapWorkshopOfferingType(record.type),
    phone: record.phone,
    target_audience: record.target_audience,
    nb_participants: record.nb_participants,
    proposal_notes: record.proposal_notes ?? null,
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

export function mapCreateWorkshopError(message: string): string {
  return message || "Unable to create workshop. Please try again.";
}

export function mapUpdateWorkshopError(message: string): string {
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

export function mapWorkshopInstructorRecord(
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

export function mapWorkshopDocumentRecord(
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

export function mapWorkshopPaymentRecord(
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
    transaction_id: record.transaction_id ?? null,
  };
}

const WORKSHOP_PAYMENT_TRANSACTION_DESCRIPTION_MAX = 200;

function workshopPaymentTransactionDescription(workshopName: string): string {
  const prefix = "Workshop: ";
  const name = workshopName.trim() || "Untitled";
  const full = `${prefix}${name}`;
  if (full.length <= WORKSHOP_PAYMENT_TRANSACTION_DESCRIPTION_MAX) {
    return full;
  }
  return `${full.slice(0, WORKSHOP_PAYMENT_TRANSACTION_DESCRIPTION_MAX - 1)}…`;
}

export function buildWorkshopPaymentTransactionInput(
  payment: {
    amount: number;
    type: string;
    payment_date: string;
    payment_method: string | null;
    notes: string | null;
  },
  workshopName: string,
  actor: AuditActor
) {
  return {
    transaction_date: payment.payment_date,
    type: payment.type,
    amount: Number(payment.amount),
    description: workshopPaymentTransactionDescription(workshopName),
    category: TRANSACTION_CATEGORIES.WORKSHOP,
    payment_method: payment.payment_method,
    recorded_by: actor.userLabel.trim() || "Manager",
    notes: payment.notes?.trim() ? payment.notes.trim() : null,
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

export function mapWorkshopSessionRecord(
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

export async function syncWorkshopSessionCount(
  adminClient: Supabase,
  workshopId: string,
  delta: number
): Promise<string | null> {
  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    workshopId
  );

  if (workshopResult.error) {
    return workshopResult.error.message || "Unable to sync session count.";
  }

  if (!workshopResult.data) {
    return "Workshop not found.";
  }

  const current = workshopResult.data.number_of_sessions ?? 0;
  const nextCount = Math.max(0, current + delta);

  const { error } = await workshopRepository.updateWorkshopNumberOfSessionsById(
    adminClient,
    workshopId,
    nextCount
  );

  if (error) {
    return error.message || "Unable to sync session count.";
  }

  return null;
}

export async function resolveWorkshopPaidNet(
  adminClient: Supabase,
  workshopId: string
): Promise<{ paidNet: number; error: string | null }> {
  const { data, error } =
    await workshopPaymentRepository.sumWorkshopPaymentNetsByWorkshopIds(
      adminClient,
      [workshopId]
    );

  if (error) {
    return { paidNet: 0, error: error.message };
  }

  const paidNet =
    data?.find((row) => row.workshop_id === workshopId)?.paid_net ?? 0;

  return { paidNet, error: null };
}

export function creditExceedsRemainingError(
  amount: number,
  remainingCap: number | null
): WorkshopPaymentMutationFailure | null {
  if (remainingCap == null || amount <= remainingCap) {
    return null;
  }
  return {
    success: false,
    error: "Please fix the errors below.",
    fieldErrors: { amount: [WORKSHOP_PAYMENT_REMAINING_AMOUNT_MESSAGE] },
  };
}

/** Manager, CEO, and supervisor see every workshop; other roles only assigned ones. */
export function roleCanViewAllWorkshops(role: RoleValue | null | undefined): boolean {
  return (
    role === ROLES.MANAGER ||
    role === ROLES.CEO ||
    role === ROLES.SUPERVISOR
  );
}

export async function resolveActorRole(
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

export async function actorCanAccessWorkshop(
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

export async function attachPaidNet(
  adminClient: Supabase,
  workshops: ManagerWorkshopRow[]
): Promise<ManagerWorkshopRow[]> {
  if (workshops.length === 0) {
    return workshops;
  }

  const { data, error } =
    await workshopPaymentRepository.sumWorkshopPaymentNetsByWorkshopIds(
      adminClient,
      workshops.map((workshop) => workshop.id)
    );

  if (error) {
    throw new Error(error.message);
  }

  const netByWorkshop = new Map(
    (data ?? []).map((row) => [row.workshop_id, row.paid_net])
  );

  return workshops.map((workshop) => ({
    ...workshop,
    paid_net: netByWorkshop.get(workshop.id) ?? 0,
  }));
}
