import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import {
  PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { changeStudentStatusSchema } from "@/lib/validators/manager/change-student-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentClassWithClassRecord } from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import type { StudentPaymentPhaseWithPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { recalcPhaseStatusFromSpps } from "@/services/accounting-recalc.service";
import { onStudentLeftClass } from "@/services/accounting-sync.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import { getUnauthorizedError } from "@/services/authorization.service";
import type {
  StudentStatusEligibleClass,
  StudentStatusOpenSpp,
  StudentStatusSideEffectsPreview,
} from "@/types/manager-student";
import type { FieldErrors } from "@/types/auth";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

const ELIGIBLE_CLASS_STATUSES = new Set<string>([
  CLASS_STATUSES.SCHEDULED,
  CLASS_STATUSES.IN_PROGRESS,
  CLASS_STATUSES.PAUSED,
]);

const PAYMENT_SYNC_FAILURE_WARNING =
  "Student status was updated, but payment sync failed for one or more class removals. Check Accounting.";

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function mapStudentStatus(status: string | null): StudentStatusValue {
  if (
    status === STUDENT_STATUSES.ACTIVE ||
    status === STUDENT_STATUSES.INACTIVE ||
    status === STUDENT_STATUSES.GRADUATED ||
    status === STUDENT_STATUSES.SUSPENDED
  ) {
    return status;
  }
  return STUDENT_STATUSES.ACTIVE;
}

function buildEligibleClasses(
  rows: StudentClassWithClassRecord[]
): StudentStatusEligibleClass[] {
  return rows
    .filter((row) => {
      const status = row.classes?.status;
      return status != null && ELIGIBLE_CLASS_STATUSES.has(status);
    })
    .map((row) => ({
      student_class_id: row.id,
      class_id: row.class_id,
      class_name: row.classes?.name ?? "Untitled class",
      class_status: row.classes?.status ?? "",
    }));
}

function buildOpenSpps(
  rows: StudentPaymentPhaseWithPhaseRecord[],
  paymentCountBySppId: Map<string, number>
): StudentStatusOpenSpp[] {
  return rows
    .filter(
      (row) => row.payment_phases?.status === PAYMENT_PHASE_STATUSES.OPENED
    )
    .map((row) => ({
      spp_id: row.id,
      payment_phase_id: row.payment_phase_id,
      payment_phase_name: row.payment_phases?.name ?? "Payment phase",
      spp_status: row.status,
      payment_count: paymentCountBySppId.get(row.id) ?? 0,
    }));
}

async function loadPaymentCountsBySppIds(
  adminClient: Supabase,
  sppIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of sppIds) {
    counts.set(id, 0);
  }

  const { data, error } =
    await studentPaymentRepository.listPaymentSppIdsBySppIds(
      adminClient,
      sppIds
    );

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const sppId = row.student_payment_phase_id;
    counts.set(sppId, (counts.get(sppId) ?? 0) + 1);
  }

  return counts;
}

async function loadSideEffectData(adminClient: Supabase, userId: string) {
  const [membershipsResult, sppsResult] = await Promise.all([
    studentClassRepository.listStudentClassesWithClassByUserId(
      adminClient,
      userId
    ),
    studentPaymentPhaseRepository.listSppsWithPhaseByStudentId(
      adminClient,
      userId
    ),
  ]);

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }
  if (sppsResult.error) {
    throw new Error(sppsResult.error.message);
  }

  const memberships = (membershipsResult.data ??
    []) as StudentClassWithClassRecord[];
  const spps = (sppsResult.data ?? []) as StudentPaymentPhaseWithPhaseRecord[];
  const openPhaseSppIds = spps
    .filter(
      (row) => row.payment_phases?.status === PAYMENT_PHASE_STATUSES.OPENED
    )
    .map((row) => row.id);
  const paymentCounts = await loadPaymentCountsBySppIds(
    adminClient,
    openPhaseSppIds
  );

  const eligibleClasses = buildEligibleClasses(memberships);
  const openSpps = buildOpenSpps(spps, paymentCounts);
  const hasPaymentsOnOpenSpp = openSpps.some((spp) => spp.payment_count > 0);
  const canRemoveOpenSpps = openSpps.length > 0 && !hasPaymentsOnOpenSpp;

  return {
    eligibleClasses,
    openSpps,
    canRemoveOpenSpps,
    openSppsBlockedReason: hasPaymentsOnOpenSpp
      ? "One or more open SPPs have payments. Delete payments from Accounting first."
      : null,
  };
}

export async function getStudentStatusSideEffectsPreview(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<StudentStatusSideEffectsPreview> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.STUDENTS_CHANGE_STATUS
  );
  if (unauthorized) {
    throw new Error(unauthorized);
  }

  const profileResult =
    await studentProfileRepository.findStudentProfileByUserId(
      adminClient,
      userId
    );

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  if (!profileResult.data) {
    throw new Error("Student profile not found.");
  }

  const sideEffects = await loadSideEffectData(adminClient, userId);

  return {
    user_id: userId,
    student_profile_id: profileResult.data.id,
    full_name: profileResult.data.full_name,
    status: mapStudentStatus(profileResult.data.status),
    eligible_classes: sideEffects.eligibleClasses,
    open_spps: sideEffects.openSpps,
    can_remove_open_spps: sideEffects.canRemoveOpenSpps,
    open_spps_blocked_reason: sideEffects.openSppsBlockedReason,
  };
}

export type ChangeStudentStatusResult =
  | {
      success: true;
      status: StudentStatusValue;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function changeStudentStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<ChangeStudentStatusResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.STUDENTS_CHANGE_STATUS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = changeStudentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const data = parsed.data;

  if (actorUserId && actorUserId === data.user_id) {
    return {
      success: false,
      error: "You cannot change your own student status.",
    };
  }

  const profileResult =
    await studentProfileRepository.findStudentProfileByUserId(
      adminClient,
      data.user_id
    );

  if (profileResult.error) {
    return { success: false, error: profileResult.error.message };
  }
  if (!profileResult.data) {
    return { success: false, error: "Student profile not found." };
  }

  const previousStatus = mapStudentStatus(profileResult.data.status);
  const warnings: string[] = [];

  if (data.target_status === STUDENT_STATUSES.ACTIVE) {
    const { data: updated, error } =
      await studentProfileRepository.updateStudentProfileStatusById(
        adminClient,
        profileResult.data.id,
        STUDENT_STATUSES.ACTIVE
      );

    if (error || !updated) {
      return {
        success: false,
        error: error?.message ?? "Unable to activate student.",
      };
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "student_profiles",
      record_id: updated.id,
      old_data: { status: previousStatus, user_id: data.user_id },
      new_data: { status: STUDENT_STATUSES.ACTIVE, user_id: data.user_id },
      metadata: { note: "Student activated." },
    });

    return {
      success: true,
      status: STUDENT_STATUSES.ACTIVE,
      message: "Student activated.",
    };
  }

  // Inactivate path
  let sideEffects;
  try {
    sideEffects = await loadSideEffectData(adminClient, data.user_id);
  } catch (loadError) {
    return {
      success: false,
      error:
        loadError instanceof Error
          ? loadError.message
          : "Unable to load student side effects.",
    };
  }

  if (data.remove_from_classes && sideEffects.eligibleClasses.length === 0) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        remove_from_classes: [
          "This student has no scheduled, in-progress, or paused class memberships to remove.",
        ],
      },
    };
  }

  if (data.remove_open_spps) {
    if (sideEffects.openSpps.length === 0) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          remove_open_spps: [
            "This student has no SPPs on an opened payment phase to delete.",
          ],
        },
      };
    }
    if (!sideEffects.canRemoveOpenSpps) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          remove_open_spps: [
            sideEffects.openSppsBlockedReason ??
              "Open SPPs with payments cannot be deleted here.",
          ],
        },
      };
    }
  }

  if (data.remove_from_classes) {
    for (const membership of sideEffects.eligibleClasses) {
      const { data: deleted, error: deleteError } =
        await studentClassRepository.deleteStudentClassById(
          adminClient,
          membership.student_class_id
        );

      if (deleteError || !deleted) {
        return {
          success: false,
          error:
            deleteError?.message ??
            `Unable to remove student from ${membership.class_name}.`,
        };
      }

      await recordManagerAuditLog(adminClient, actor, {
        action: "delete",
        severity: "info",
        table_name: "student_class",
        record_id: deleted.id,
        old_data: {
          class_id: membership.class_id,
          user_id: data.user_id,
        },
        new_data: null,
        metadata: {
          note: "Student removed from class during inactivation.",
          class_id: membership.class_id,
          student_id: data.user_id,
        },
      });

      try {
        await onStudentLeftClass(
          adminClient,
          { studentId: data.user_id, classId: membership.class_id },
          actor
        );
      } catch {
        warnings.push(PAYMENT_SYNC_FAILURE_WARNING);
      }
    }
  }

  if (data.remove_open_spps) {
    // Re-check payment counts immediately before delete (concurrency).
    const sppIds = sideEffects.openSpps.map((spp) => spp.spp_id);
    let freshCounts: Map<string, number>;
    try {
      freshCounts = await loadPaymentCountsBySppIds(adminClient, sppIds);
    } catch (countError) {
      return {
        success: false,
        error:
          countError instanceof Error
            ? countError.message
            : "Unable to verify SPP payments.",
      };
    }

    for (const sppId of sppIds) {
      if ((freshCounts.get(sppId) ?? 0) > 0) {
        return {
          success: false,
          error: "Please fix the errors below.",
          fieldErrors: {
            remove_open_spps: [
              "One or more open SPPs now have payments. Delete payments from Accounting first.",
            ],
          },
        };
      }
    }

    const phaseIds = new Set(
      sideEffects.openSpps.map((spp) => spp.payment_phase_id)
    );

    for (const spp of sideEffects.openSpps) {
      const { data: deletedSpp, error: sppDeleteError } =
        await studentPaymentPhaseRepository.deleteStudentPaymentPhaseById(
          adminClient,
          spp.spp_id
        );

      if (sppDeleteError || !deletedSpp) {
        return {
          success: false,
          error:
            sppDeleteError?.message ??
            `Unable to delete SPP for ${spp.payment_phase_name}.`,
        };
      }

      await recordManagerAuditLog(adminClient, actor, {
        action: "delete",
        severity: "warning",
        table_name: "student_payment_phases",
        record_id: deletedSpp.id,
        old_data: {
          student_id: data.user_id,
          payment_phase_id: spp.payment_phase_id,
          status: spp.spp_status,
        },
        new_data: null,
        metadata: {
          note: "Open SPP deleted during student inactivation.",
          payment_phase_name: spp.payment_phase_name,
        },
      });
    }

    for (const phaseId of phaseIds) {
      try {
        await recalcPhaseStatusFromSpps(adminClient, phaseId);
      } catch (recalcError) {
        warnings.push(
          recalcError instanceof Error
            ? recalcError.message
            : "Unable to recalculate a payment phase after SPP deletion."
        );
      }
    }
  }

  const { data: updated, error } =
    await studentProfileRepository.updateStudentProfileStatusById(
      adminClient,
      profileResult.data.id,
      STUDENT_STATUSES.INACTIVE
    );

  if (error || !updated) {
    return {
      success: false,
      error: error?.message ?? "Unable to inactivate student.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_profiles",
    record_id: updated.id,
    old_data: { status: previousStatus, user_id: data.user_id },
    new_data: {
      status: STUDENT_STATUSES.INACTIVE,
      user_id: data.user_id,
      remove_from_classes: data.remove_from_classes,
      remove_open_spps: data.remove_open_spps,
    },
    metadata: { note: "Student inactivated." },
  });

  const uniqueWarnings = [...new Set(warnings)];

  return {
    success: true,
    status: STUDENT_STATUSES.INACTIVE,
    message: "Student inactivated.",
    warning: uniqueWarnings.length > 0 ? uniqueWarnings.join(" ") : undefined,
  };
}
