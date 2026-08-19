import {
  canMutateGuestPipeline,
  GUEST_CREATE_STUDENT_PIPELINE_STATUSES,
  GUEST_CURRENT_STATUSES,
  isGuestCurrentStatus,
  type GuestCurrentStatus,
} from "@/lib/constants/guest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createStudentFromGuestSchema,
  resolveCreateStudentFromGuestInput,
  type CreateStudentFromGuestInput,
} from "@/lib/validators/manager/create-student-from-guest";
import * as guestRepository from "@/repositories/guest.repository";
import type { GuestRecord } from "@/repositories/guest.repository";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import type { StudentRegistrationApplicationRecord } from "@/repositories/student-registration-application.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  applyGuestProfileStatusForGuestRecord,
  recordGuestPipelineStatusesForGuest,
} from "@/services/guests/guest.service";
import { createStudent } from "@/services/students/student.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerGuestRegistrationApplicationSummary } from "@/types/manager-guest";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateStudentFromGuestSuccess = {
  success: true;
  message: string;
  student: ManagerStudentRow;
  application: ManagerGuestRegistrationApplicationSummary;
};

export type CreateStudentFromGuestFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateStudentFromGuestResult =
  | CreateStudentFromGuestSuccess
  | CreateStudentFromGuestFailure;

function mapApplicationSummary(
  record: StudentRegistrationApplicationRecord
): ManagerGuestRegistrationApplicationSummary {
  return {
    id: record.id,
    status: record.status,
    created_at: record.created_at,
    user_id: record.user_id,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone,
    date_of_birth: (record.date_of_birth ?? "").slice(0, 10),
  };
}

export async function createStudentFromGuestRegistrationForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateStudentFromGuestInput
): Promise<CreateStudentFromGuestResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_CREATE_STUDENT
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createStudentFromGuestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    guest_id: guestId,
    markGuestAsFinished,
    username,
    fullName,
    email,
    password,
    confirmPassword,
    birthDate,
    phone,
  } = resolveCreateStudentFromGuestInput(parsed.data);

  const [guestResult, applicationResult] = await Promise.all([
    guestRepository.findGuestById(adminClient, guestId),
    registrationRepository.findActiveApplicationByGuestId(adminClient, guestId),
  ]);

  if (guestResult.error) {
    return { success: false, error: guestResult.error.message };
  }
  if (!guestResult.data) {
    return { success: false, error: "Guest not found." };
  }

  if (applicationResult.error) {
    return { success: false, error: applicationResult.error.message };
  }
  if (!applicationResult.data) {
    return {
      success: false,
      error: "This guest has no registration application to map.",
    };
  }
  if (applicationResult.data.user_id) {
    return {
      success: false,
      error: "A student is already linked to this registration.",
    };
  }

  const created = await createStudent(adminClient, actorUserId, actor, {
    username,
    fullName,
    email,
    password,
    confirmPassword,
    birthDate,
    phone,
  });
  if (!created.success) {
    return {
      success: false,
      error: created.error,
      fieldErrors: created.fieldErrors,
    };
  }

  const linked = await registrationRepository.updateApplicationUserId(
    adminClient,
    applicationResult.data.id,
    created.student.user_id
  );
  if (linked.error || !linked.data) {
    return {
      success: false,
      error:
        linked.error?.message ??
        "Student was created, but the registration could not be linked.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_registration_applications",
    record_id: linked.data.id,
    old_data: { user_id: applicationResult.data.user_id },
    new_data: {
      user_id: created.student.user_id,
      guest_id: guestId,
    },
    metadata: { note: "Guest registration linked to created student." },
  });

  let guestRecord: GuestRecord = guestResult.data;
  let guestStatus: GuestCurrentStatus | null = isGuestCurrentStatus(
    guestRecord.status
  )
    ? guestRecord.status
    : null;

  if (guestStatus === GUEST_CURRENT_STATUSES.SCHEDULED) {
    const pending = await applyGuestProfileStatusForGuestRecord(
      adminClient,
      actor,
      guestRecord,
      {
        status: GUEST_CURRENT_STATUSES.PENDING,
        note: "Pending so a student can be created from this registration.",
      }
    );
    if (!pending.success) {
      return {
        success: false,
        error: `Student was created, but guest status could not be updated: ${pending.error}`,
      };
    }
    guestStatus = pending.guest.status;
    guestRecord = { ...guestRecord, status: pending.guest.status };
  }

  if (guestStatus && canMutateGuestPipeline(guestStatus)) {
    const recorded = await recordGuestPipelineStatusesForGuest(
      adminClient,
      actor,
      guestRecord,
      {
        statuses: [...GUEST_CREATE_STUDENT_PIPELINE_STATUSES],
        note: "Recorded when creating a student from this registration.",
        finishProfileOnPipelineFinished: false,
      }
    );
    if (!recorded.success) {
      return {
        success: false,
        error: `Student was created, but guest pipeline could not be updated: ${recorded.error}`,
      };
    }
    guestStatus = recorded.guest.status;
    guestRecord = { ...guestRecord, status: recorded.guest.status };
  }

  if (
    markGuestAsFinished &&
    guestStatus !== GUEST_CURRENT_STATUSES.FINISHED
  ) {
    const finished = await applyGuestProfileStatusForGuestRecord(
      adminClient,
      actor,
      guestRecord,
      {
        status: GUEST_CURRENT_STATUSES.FINISHED,
        note: "Marked finished after creating a student from this registration.",
      }
    );
    if (!finished.success) {
      return {
        success: false,
        error: `Student was created, but the guest could not be marked finished: ${finished.error}`,
      };
    }
  }

  return {
    success: true,
    student: created.student,
    application: mapApplicationSummary(linked.data),
    message: markGuestAsFinished
      ? "Student created and guest marked finished."
      : "Student created from guest registration.",
  };
}
