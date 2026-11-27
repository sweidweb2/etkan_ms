import "server-only";

import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import {
  remainingDropRefund,
  toManagerSemesterDropRow,
} from "@/lib/manager/accounting/semester-drop-mapper";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentClassWithClassRecord } from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import type { StudentPaymentPhaseWithPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import { loadPaymentCountsBySppIds } from "@/services/students/student-payment-counts";
import { getStudentForManager } from "@/services/students/student.service";
import type {
  DropStudentConsoleClassRow,
  DropStudentConsoleDropRow,
  DropStudentConsoleDropTarget,
  DropStudentConsoleHotSignals,
  DropStudentConsolePaymentRow,
  DropStudentConsoleSnapshot,
  DropStudentConsoleSppRow,
} from "@/types/manager-drop-student-console";
import type { ManagerDropRefundPaymentRow } from "@/types/manager-semester-drop";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

const DROP_ORIGIN_CLASS_STATUSES = new Set<string>([
  CLASS_STATUSES.SCHEDULED,
  CLASS_STATUSES.IN_PROGRESS,
  CLASS_STATUSES.PAUSED,
]);

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


function buildDropTargets(
  memberships: StudentClassWithClassRecord[],
  spps: StudentPaymentPhaseWithPhaseRecord[],
  paymentCounts: Map<string, number>,
  semesterNameById: Map<string, string>,
  pendingBySemester: Map<string, string>
): DropStudentConsoleDropTarget[] {
  const originBySemester = new Map<
    string,
    {
      class_id: string;
      class_name: string;
      membership_id: string;
      preferred: boolean;
    }
  >();

  for (const membership of memberships) {
    const semesterId = membership.classes?.semester_id;
    const classStatus = membership.classes?.status;
    if (!semesterId || !classStatus) {
      continue;
    }
    if (!DROP_ORIGIN_CLASS_STATUSES.has(classStatus)) {
      continue;
    }
    const preferred =
      classStatus === CLASS_STATUSES.SCHEDULED ||
      classStatus === CLASS_STATUSES.IN_PROGRESS;
    const existing = originBySemester.get(semesterId);
    if (existing && (existing.preferred || !preferred)) {
      continue;
    }
    originBySemester.set(semesterId, {
      class_id: membership.class_id,
      class_name: membership.classes?.name ?? "Class",
      membership_id: membership.id,
      preferred,
    });
  }

  const openSppBySemester = new Map<
    string,
    {
      spp_id: string;
      payment_phase_name: string;
      payment_count: number;
      total_paid: number;
      final_amount_due: number;
    }
  >();

  for (const spp of spps) {
    const semesterId = spp.payment_phases?.semester_id;
    if (!semesterId) {
      continue;
    }
    if (spp.payment_phases?.status === PAYMENT_PHASE_STATUSES.CANCELLED) {
      continue;
    }
    const paymentCount = paymentCounts.get(spp.id) ?? 0;
    const existing = openSppBySemester.get(semesterId);
    if (
      existing &&
      spp.payment_phases?.status !== PAYMENT_PHASE_STATUSES.OPENED
    ) {
      continue;
    }
    if (
      existing &&
      spp.payment_phases?.status === PAYMENT_PHASE_STATUSES.OPENED &&
      existing.payment_count >= paymentCount
    ) {
      continue;
    }
    openSppBySemester.set(semesterId, {
      spp_id: spp.id,
      payment_phase_name: spp.payment_phases?.name ?? "Payment phase",
      payment_count: paymentCount,
      total_paid: Number(spp.total_paid ?? 0),
      final_amount_due: Number(spp.final_amount_due ?? 0),
    });
  }

  return [...originBySemester.entries()]
    .map(([semesterId, origin]) => {
      const spp = openSppBySemester.get(semesterId);
      const pendingId = pendingBySemester.get(semesterId) ?? null;
      return {
        semester_id: semesterId,
        semester_name: semesterNameById.get(semesterId) ?? "Semester",
        origin_class_id: origin.class_id,
        origin_class_name: origin.class_name,
        origin_membership_id: origin.membership_id,
        payment_phase_name: spp?.payment_phase_name ?? null,
        spp_id: spp?.spp_id ?? null,
        payment_count: spp?.payment_count ?? 0,
        total_paid: spp?.total_paid ?? 0,
        final_amount_due: spp?.final_amount_due ?? 0,
        has_pending_drop: Boolean(pendingId),
        pending_drop_request_id: pendingId,
      } satisfies DropStudentConsoleDropTarget;
    })
    .sort((a, b) => a.semester_name.localeCompare(b.semester_name));
}

/**
 * Full decision-console snapshot for one student (auth: students.view).
 */
export async function getDropStudentConsoleSnapshotForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  userId: string
): Promise<DropStudentConsoleSnapshot | null> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.STUDENTS_VIEW
  );

  const profileResult =
    await studentProfileRepository.findStudentProfileByUserId(
      adminClient,
      userId
    );
  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  if (!profileResult.data) {
    return null;
  }

  const student = await getStudentForManager(
    adminClient,
    actorUserId,
    profileResult.data.id
  );
  if (!student) {
    return null;
  }

  const [membershipsResult, sppsResult, dropsResult, needRefundResult] =
    await Promise.all([
      studentClassRepository.listStudentClassesWithClassByUserId(
        adminClient,
        userId
      ),
      studentPaymentPhaseRepository.listSppsWithPhaseByStudentId(
        adminClient,
        userId
      ),
      semesterDropRequestRepository.listDropRequestsByStudentId(
        adminClient,
        userId
      ),
      semesterDropRequestRepository.listNeedRefundDropRequestsByStudentId(
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
  if (dropsResult.error) {
    throw new Error(dropsResult.error.message);
  }
  if (needRefundResult.error) {
    throw new Error(needRefundResult.error.message);
  }

  const memberships = (membershipsResult.data ??
    []) as StudentClassWithClassRecord[];
  const spps = (sppsResult.data ?? []) as StudentPaymentPhaseWithPhaseRecord[];
  const rawDrops = dropsResult.data ?? [];
  const pendingDrops = rawDrops.filter((row) => row.status === "pending");

  const semesterIds = [
    ...new Set(
      [
        ...memberships.map((row) => row.classes?.semester_id),
        ...spps.map((row) => row.payment_phases?.semester_id),
        ...rawDrops.map((row) => row.semester_id),
      ].filter((id): id is string => Boolean(id))
    ),
  ];

  const semestersResult = await semesterRepository.listSemestersByIds(
    adminClient,
    semesterIds
  );
  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }
  const semesterNameById = new Map(
    (semestersResult.data ?? []).map((row) => [row.id, row.name])
  );

  const sppIds = spps.map((row) => row.id);
  const paymentCounts = await loadPaymentCountsBySppIds(adminClient, sppIds);

  const paymentsBySppId = new Map<string, DropStudentConsolePaymentRow[]>();
  await Promise.all(
    sppIds.map(async (sppId) => {
      const { data, error } = await studentPaymentRepository.listPaymentsBySppId(
        adminClient,
        sppId
      );
      if (error) {
        throw new Error(error.message);
      }
      paymentsBySppId.set(
        sppId,
        (data ?? []).map((payment) => ({
          id: payment.id,
          payment_date: payment.payment_date,
          amount: Number(payment.amount) || 0,
          type: payment.type,
          payment_method: payment.payment_method,
          received_by: payment.received_by,
          notes: payment.notes,
          created_at: payment.created_at,
        }))
      );
    })
  );

  const pendingBySemester = new Map<string, string>();
  for (const drop of pendingDrops) {
    if (!pendingBySemester.has(drop.semester_id)) {
      pendingBySemester.set(drop.semester_id, drop.id);
    }
  }

  const dropTargets = buildDropTargets(
    memberships,
    spps,
    paymentCounts,
    semesterNameById,
    pendingBySemester
  );

  const paymentCountBySemester = new Map<string, number>();
  for (const target of dropTargets) {
    paymentCountBySemester.set(target.semester_id, target.payment_count);
  }

  const hasAnyPending = pendingDrops.length > 0;

  const classes: DropStudentConsoleClassRow[] = memberships.map((row) => {
    const semesterId = row.classes?.semester_id ?? null;
    const paymentCount = semesterId
      ? (paymentCountBySemester.get(semesterId) ?? 0)
      : 0;
    let canRemove = true;
    let removeBlockedReason: string | null = null;
    if (hasAnyPending) {
      canRemove = false;
      removeBlockedReason =
        "Cannot remove while a semester drop is pending. Finish payment or stop the drop first.";
    } else if (paymentCount > 0) {
      canRemove = false;
      removeBlockedReason =
        "Cannot remove while this semester SPP has payments. Use Drop semester instead.";
    }
    return {
      student_class_id: row.id,
      class_id: row.class_id,
      class_name: row.classes?.name ?? "Untitled class",
      class_status: row.classes?.status ?? "",
      semester_id: semesterId,
      semester_name: semesterId
        ? (semesterNameById.get(semesterId) ?? null)
        : null,
      is_team_leader: Boolean(row.is_team_leader),
      can_remove: canRemove,
      remove_blocked_reason: removeBlockedReason,
    };
  });

  const billing: DropStudentConsoleSppRow[] = spps.map((row) => {
    const semesterId = row.payment_phases?.semester_id ?? null;
    return {
      spp_id: row.id,
      payment_phase_id: row.payment_phase_id,
      payment_phase_name: row.payment_phases?.name ?? "Payment phase",
      payment_phase_status: row.payment_phases?.status ?? "",
      semester_id: semesterId,
      semester_name: semesterId
        ? (semesterNameById.get(semesterId) ?? null)
        : null,
      spp_status: row.status,
      total_paid: Number(row.total_paid ?? 0),
      final_amount_due: Number(row.final_amount_due ?? 0),
      payment_count: paymentCounts.get(row.id) ?? 0,
      payments: paymentsBySppId.get(row.id) ?? [],
    };
  });

  const drops: DropStudentConsoleDropRow[] = rawDrops.map((row) => {
    const mapped = toManagerSemesterDropRow(row);
    return {
      ...mapped,
      semester_name: semesterNameById.get(row.semester_id) ?? null,
      phase_name: null,
    };
  });

  const needRefund = (needRefundResult.data ?? [])
    .map((row) => {
      const mapped = toManagerSemesterDropRow(row);
      const remaining = remainingDropRefund(
        mapped.refund_owed,
        mapped.refunded_amount
      );
      if (remaining <= 0) {
        return null;
      }
      return {
        ...mapped,
        student_label: student.full_name,
        phase_name: null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const { data: debitPayments, error: debitError } =
    await studentPaymentRepository.listDropRefundDebitPayments(adminClient);
  if (debitError) {
    throw new Error(debitError.message);
  }

  const studentDropIds = new Set(rawDrops.map((row) => row.id));
  const dropById = new Map(
    rawDrops.map((row) => [row.id, toManagerSemesterDropRow(row)])
  );

  const processedRefundPayments: ManagerDropRefundPaymentRow[] = (
    debitPayments ?? []
  ).flatMap((payment) => {
    const dropId = payment.semester_drop_request_id;
    if (!dropId || !studentDropIds.has(dropId)) {
      return [];
    }
    const drop = dropById.get(dropId);
    if (!drop) {
      return [];
    }
    return [
      {
        id: payment.id,
        student_payment_phase_id: payment.student_payment_phase_id,
        semester_drop_request_id: dropId,
        student_id: userId,
        student_label: student.full_name,
        phase_name: null,
        payment_date: payment.payment_date,
        amount: Number(payment.amount) || 0,
        payment_method: payment.payment_method,
        received_by: payment.received_by,
        created_at: payment.created_at,
      },
    ];
  });

  const openSpps = billing.filter(
    (row) => row.payment_phase_status === PAYMENT_PHASE_STATUSES.OPENED
  );
  const unpaidOpenSpps = openSpps.filter((row) => row.payment_count === 0);
  const paidOpenWithMembership = dropTargets.filter(
    (row) => row.payment_count > 0 && row.spp_id
  );
  const eligibleClassCount = classes.filter((row) =>
    DROP_ORIGIN_CLASS_STATUSES.has(row.class_status)
  ).length;

  const refundOwedRemainingTotal = needRefund.reduce(
    (sum, row) => sum + row.remaining_refund,
    0
  );

  const hot: DropStudentConsoleHotSignals = {
    has_pending_drop: hasAnyPending,
    pending_drop_count: pendingDrops.length,
    needs_immediate_drop: paidOpenWithMembership.length > 0,
    droppable_paid_semester_count: paidOpenWithMembership.length,
    unpaid_open_spp_count: unpaidOpenSpps.length,
    eligible_class_count: eligibleClassCount,
    refund_owed_count: needRefund.length,
    refund_owed_remaining_total: refundOwedRemainingTotal,
    can_inactivate: !hasAnyPending,
    inactivate_blocked_reason: hasAnyPending
      ? "Finish or cancel the pending semester drop before inactivating this student."
      : null,
  };

  return {
    student,
    hot,
    classes,
    drop_targets: dropTargets,
    billing,
    drops,
    need_refund: needRefund,
    processed_refund_payments: processedRefundPayments,
    status: mapStudentStatus(student.status),
  };
}
