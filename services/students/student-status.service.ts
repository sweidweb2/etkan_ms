import "server-only";

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
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentClassWithClassRecord } from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import type { StudentPaymentPhaseWithPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { createImmediateSemesterDropsBatchForInactivate } from "@/services/classes/drop-semester.service";
import { loadPaymentCountsBySppIds } from "@/services/students/student-payment-counts";
import type {
  StudentStatusDroppableSemester,
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
      semester_id: row.payment_phases?.semester_id ?? null,
    }));
}

function pickOriginMembershipForSemester(
  memberships: StudentClassWithClassRecord[],
  semesterId: string
): { class_id: string; class_name: string } | null {
  const inSemester = memberships.filter(
    (row) => row.classes?.semester_id === semesterId
  );
  const preferred =
    inSemester.find((row) => {
      const status = row.classes?.status;
      return status != null && ELIGIBLE_CLASS_STATUSES.has(status);
    }) ?? inSemester[0];
  if (!preferred) {
    return null;
  }
  return {
    class_id: preferred.class_id,
    class_name: preferred.classes?.name ?? "Class",
  };
}

/**
 * Align with SQL internal_resolve_semester_drop_spp for opened phases:
 * one droppable row per semester from the newest opened paid SPP that has an origin class.
 */
function buildDroppableSemesters(
  openSpps: StudentStatusOpenSpp[],
  sppRows: StudentPaymentPhaseWithPhaseRecord[],
  memberships: StudentClassWithClassRecord[]
): StudentStatusDroppableSemester[] {
  const sppById = new Map(sppRows.map((row) => [row.id, row]));
  const paidOpenBySemester = new Map<string, StudentStatusOpenSpp[]>();

  for (const spp of openSpps) {
    if (spp.payment_count <= 0 || !spp.semester_id) {
      continue;
    }
    const list = paidOpenBySemester.get(spp.semester_id) ?? [];
    list.push(spp);
    paidOpenBySemester.set(spp.semester_id, list);
  }

  const droppable: StudentStatusDroppableSemester[] = [];

  for (const [semesterId, semesterSpps] of paidOpenBySemester) {
    const origin = pickOriginMembershipForSemester(memberships, semesterId);
    if (!origin) {
      continue;
    }

    const sorted = [...semesterSpps].sort((a, b) => {
      const aCreated = sppById.get(a.spp_id)?.payment_phases?.created_at ?? "";
      const bCreated = sppById.get(b.spp_id)?.payment_phases?.created_at ?? "";
      return bCreated.localeCompare(aCreated);
    });
    const chosen = sorted[0];
    const sppRow = sppById.get(chosen.spp_id);

    droppable.push({
      semester_id: semesterId,
      payment_phase_name: chosen.payment_phase_name,
      spp_id: chosen.spp_id,
      payment_count: chosen.payment_count,
      origin_class_id: origin.class_id,
      origin_class_name: origin.class_name,
      total_paid: Number(sppRow?.total_paid ?? 0),
      final_amount_due: Number(sppRow?.final_amount_due ?? 0),
    });
  }

  return droppable;
}


async function loadSideEffectData(adminClient: Supabase, userId: string) {
  const [membershipsResult, sppsResult, pendingDropsResult] = await Promise.all([
    studentClassRepository.listStudentClassesWithClassByUserId(
      adminClient,
      userId
    ),
    studentPaymentPhaseRepository.listSppsWithPhaseByStudentId(
      adminClient,
      userId
    ),
    semesterDropRequestRepository.listPendingDropsByStudentIds(adminClient, [
      userId,
    ]),
  ]);

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message);
  }
  if (sppsResult.error) {
    throw new Error(sppsResult.error.message);
  }
  if (pendingDropsResult.error) {
    throw new Error(pendingDropsResult.error.message);
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
  const unpaidOpenSpps = openSpps.filter((spp) => spp.payment_count <= 0);
  const paidOpenSpps = openSpps.filter((spp) => spp.payment_count > 0);
  const canRemoveOpenSpps = unpaidOpenSpps.length > 0;
  const hasPendingDrop = (pendingDropsResult.data ?? []).length > 0;
  const droppableSemesters = buildDroppableSemesters(
    openSpps,
    spps,
    memberships
  );
  const needsImmediateDrop = droppableSemesters.length > 0;

  const orphanedPaidOpenSpps = paidOpenSpps.filter((spp) => {
    if (!spp.semester_id) {
      return true;
    }
    return !pickOriginMembershipForSemester(memberships, spp.semester_id);
  });
  const hasOrphanedPaidBilling = orphanedPaidOpenSpps.length > 0;

  let canInactivate = !hasPendingDrop && !hasOrphanedPaidBilling;
  let inactivateBlockedReason: string | null = null;
  if (hasPendingDrop) {
    inactivateBlockedReason =
      "Finish or cancel the pending semester drop before inactivating this student.";
  } else if (hasOrphanedPaidBilling) {
    inactivateBlockedReason =
      "This student has paid open billing with no class membership to drop. Resolve it in Accounting first.";
  }

  return {
    eligibleClasses,
    openSpps,
    canRemoveOpenSpps,
    openSppsBlockedReason:
      paidOpenSpps.length > 0 && unpaidOpenSpps.length === 0
        ? "Open SPPs with payments cannot be deleted here — inactivate will drop those semesters instead."
        : paidOpenSpps.length > 0
          ? "Paid open SPPs stay for semester drop; unpaid open SPPs can still be deleted."
          : null,
    hasPendingDrop,
    canInactivate,
    inactivateBlockedReason,
    droppableSemesters,
    needsImmediateDrop,
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
    can_inactivate: sideEffects.canInactivate,
    inactivate_blocked_reason: sideEffects.inactivateBlockedReason,
    has_pending_drop: sideEffects.hasPendingDrop,
    droppable_semesters: sideEffects.droppableSemesters,
    needs_immediate_drop: sideEffects.needsImmediateDrop,
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

    if (data.target_status === STUDENT_STATUSES.INACTIVE) {
      const sideEffects = await timer.step("preview", () =>
        loadSideEffectData(adminClient, data.user_id)
      );

      if (!sideEffects.canInactivate) {
        return {
          success: false,
          error:
            sideEffects.inactivateBlockedReason ??
            "Cannot inactivate while a semester drop is pending.",
        };
      }

      if (sideEffects.needsImmediateDrop) {
        const dropResult = await timer.step("drop:batch", () =>
          createImmediateSemesterDropsBatchForInactivate(
            adminClient,
            actorUserId,
            actor,
            {
              student_id: data.user_id,
              targets: sideEffects.droppableSemesters.map((semester) => ({
                class_id: semester.origin_class_id,
                semester_id: semester.semester_id,
                // Droppable rows are paid opened SPPs only — always settleable.
                final_amount_due: semester.spp_id
                  ? semester.final_amount_due
                  : undefined,
              })),
              restriction_mode: data.drop_restriction_mode,
              required_percent: data.drop_required_percent,
              required_amount: data.drop_required_amount,
              notes: "Drop from student inactivate.",
            }
          )
        );
        if (!dropResult.success) {
          return {
            success: false,
            error: dropResult.error,
            fieldErrors: dropResult.fieldErrors,
          };
        }
      }
    }

    let removeFromClasses = data.remove_from_classes;
    let removeOpenSpps = data.remove_open_spps;
    if (data.target_status === STUDENT_STATUSES.INACTIVE && removeFromClasses) {
      // Drop may have cleared memberships; avoid RPC error when none remain.
      const remaining = await loadSideEffectData(adminClient, data.user_id);
      if (remaining.eligibleClasses.length === 0) {
        removeFromClasses = false;
      }
      if (!remaining.canRemoveOpenSpps) {
        removeOpenSpps = false;
      }
    }

    const { data: rpcData, error } = await timer.step("rpc", () =>
      studentProfileRepository.changeStudentStatusWithSideEffects(adminClient, {
        user_id: data.user_id,
        target_status: data.target_status,
        remove_from_classes: removeFromClasses,
        remove_open_spps: removeOpenSpps,
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

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "update",
        severity: rpcData.deletedSpps.length > 0 ? "warning" : "info",
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
          student_id: data.user_id,
          removed_classes: rpcData.removedClasses.map((membership) => ({
            student_class_id: membership.studentClassId,
            class_id: membership.classId,
            class_name: membership.className,
          })),
          retained_spps: rpcData.retainedSpps.flatMap((item) => {
            if (!item.spp) {
              return [];
            }
            return [
              {
                spp_id: item.spp.id,
                class_id: item.classId,
                semester_id: item.semesterId,
                status: item.spp.status,
                remaining_amount: item.spp.remaining_amount,
              },
            ];
          }),
          deleted_spps: rpcData.deletedSpps.map((spp) => ({
            spp_id: spp.sppId,
            payment_phase_id: spp.paymentPhaseId,
            payment_phase_name: spp.paymentPhaseName,
            status: spp.sppStatus,
          })),
        },
      })
    );

    return {
      success: true,
      status: nextStatus,
      message: isActivate ? "Student activated." : "Student inactivated.",
    };
  } finally {
    timer.end();
  }
}
