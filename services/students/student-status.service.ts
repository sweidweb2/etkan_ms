import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import {
  PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { changeStudentStatusSchema } from "@/lib/validators/manager/change-student-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentClassWithClassRecord } from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import type { StudentPaymentPhaseWithPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
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

function mapStatusWriteError(
  message: string,
  fallback: string
): MutationFailure {
  if (
    message.includes(
      "This student has no scheduled, in-progress, or paused class memberships to remove."
    )
  ) {
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

  if (
    message.includes(
      "This student has no SPPs on an opened payment phase to delete."
    )
  ) {
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

  if (
    message.includes(
      "One or more open SPPs have payments. Delete payments from Accounting first."
    ) ||
    message.includes("Open SPPs with payments cannot be deleted here.")
  ) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        remove_open_spps: [
          "One or more open SPPs have payments. Delete payments from Accounting first.",
        ],
      },
    };
  }

  const known = [
    "Student profile not found.",
    "You cannot change your own student status.",
    "Select activate or inactivate.",
    "Unable to activate student.",
    "Unable to inactivate student.",
  ];

  for (const item of known) {
    if (message.includes(item)) {
      return { success: false, error: item };
    }
  }

  return { success: false, error: fallback };
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

  const [profileResult, sideEffects] = await Promise.all([
    studentProfileRepository.findStudentProfileByUserId(adminClient, userId),
    loadSideEffectData(adminClient, userId),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  if (!profileResult.data) {
    throw new Error("Student profile not found.");
  }

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
  const timer = createNavStepTimer("changeStudentStatus");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.STUDENTS_CHANGE_STATUS
      )
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

    const { data: rpcData, error } = await timer.step("rpc", () =>
      studentProfileRepository.changeStudentStatusWithSideEffects(adminClient, {
        user_id: data.user_id,
        target_status: data.target_status,
        remove_from_classes: data.remove_from_classes,
        remove_open_spps: data.remove_open_spps,
      })
    );

    if (error) {
      return mapStatusWriteError(
        error.message,
        data.target_status === STUDENT_STATUSES.ACTIVE
          ? "Unable to activate student."
          : "Unable to inactivate student."
      );
    }

    if (!rpcData?.profileId || !rpcData.status) {
      return {
        success: false,
        error:
          data.target_status === STUDENT_STATUSES.ACTIVE
            ? "Unable to activate student."
            : "Unable to inactivate student.",
      };
    }

    const nextStatus = mapStudentStatus(rpcData.status);
    const isActivate = nextStatus === STUDENT_STATUSES.ACTIVE;

    await timer.step("audit", async () => {
      const classAudits = rpcData.removedClasses.map((membership) =>
        recordManagerAuditLog(adminClient, actor, {
          action: "delete",
          severity: "info",
          table_name: "student_class",
          record_id: membership.studentClassId,
          old_data: {
            class_id: membership.classId,
            user_id: data.user_id,
          },
          new_data: null,
          metadata: {
            note: "Student removed from class during inactivation.",
            class_id: membership.classId,
            student_id: data.user_id,
          },
        })
      );

      const retainedAudits = rpcData.retainedSpps.flatMap((item) => {
        if (!item.spp) {
          return [];
        }
        return [
          recordManagerAuditLog(adminClient, actor, {
            action: "update",
            severity: "info",
            table_name: "student_payment_phases",
            record_id: item.spp.id,
            old_data: {
              status: item.spp.status,
              remaining_amount: item.spp.remaining_amount,
            },
            new_data: {
              status: item.spp.status,
              remaining_amount: item.spp.remaining_amount,
            },
            metadata: {
              note: "Student left class; SPP retained.",
              spp_id: item.spp.id,
              class_id: item.classId,
              semester_id: item.semesterId,
              student_id: data.user_id,
            },
          }),
        ];
      });

      const sppAudits = rpcData.deletedSpps.map((spp) =>
        recordManagerAuditLog(adminClient, actor, {
          action: "delete",
          severity: "warning",
          table_name: "student_payment_phases",
          record_id: spp.sppId,
          old_data: {
            student_id: data.user_id,
            payment_phase_id: spp.paymentPhaseId,
            status: spp.sppStatus,
          },
          new_data: null,
          metadata: {
            note: "Open SPP deleted during student inactivation.",
            payment_phase_name: spp.paymentPhaseName,
          },
        })
      );

      await Promise.all([
        ...classAudits,
        ...retainedAudits,
        ...sppAudits,
        recordManagerAuditLog(adminClient, actor, {
          action: "update",
          severity: "info",
          table_name: "student_profiles",
          record_id: rpcData.profileId,
          old_data: { status: rpcData.previousStatus, user_id: data.user_id },
          new_data: isActivate
            ? { status: STUDENT_STATUSES.ACTIVE, user_id: data.user_id }
            : {
                status: STUDENT_STATUSES.INACTIVE,
                user_id: data.user_id,
                remove_from_classes: data.remove_from_classes,
                remove_open_spps: data.remove_open_spps,
              },
          metadata: {
            note: isActivate ? "Student activated." : "Student inactivated.",
          },
        }),
      ]);
    });

    return {
      success: true,
      status: nextStatus,
      message: isActivate ? "Student activated." : "Student inactivated.",
    };
  } finally {
    timer.end();
  }
}
