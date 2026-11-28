import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import { SEMESTER_DROP_RESTRICTION_MODES } from "@/lib/manager/accounting/constants";
import { toManagerSemesterDropRow } from "@/lib/manager/accounting/semester-drop-mapper";
import { isNoSppDropFallbackMessage } from "@/lib/manager/accounting/semester-drop-messages";
import {
  cancelSemesterDropSchema,
  createSemesterDropSchema,
  type CreateSemesterDropInput,
} from "@/lib/validators/manager/create-semester-drop";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as classRepository from "@/repositories/class.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { ManagerSemesterDropRequestRow } from "@/types/manager-semester-drop";
import type { MutationFailure, Supabase } from "@/services/classes/class-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";

export type CreateSemesterDropResult =
  | {
      success: true;
      request: ManagerSemesterDropRequestRow | null;
      completedImmediately: boolean;
      removedFromClass: boolean;
      removedMembershipIds: string[];
      removedClassIds: string[];
      message: string;
      warning?: string;
    }
  | MutationFailure;

function mapAmountDueFieldError(message: string): MutationFailure | null {
  if (!/cannot exceed the amount due/i.test(message)) {
    return null;
  }
  return {
    success: false,
    error: "Please fix the errors below.",
    fieldErrors: {
      required_amount: [message],
    },
  };
}

export type CancelSemesterDropResult =
  | {
      success: true;
      request: ManagerSemesterDropRequestRow;
      message: string;
    }
  | MutationFailure;

async function leaveClassWithoutSppDrop(
  adminClient: Supabase,
  actor: AuditActor,
  membershipId: string,
  classId: string,
  studentId: string
): Promise<CreateSemesterDropResult> {
  const classResult = await classRepository.findClassById(adminClient, classId);
  const semesterId = classResult.data?.semester_id ?? null;
  if (!semesterId) {
    return { success: false, error: "Class has no semester." };
  }

  const { data: leaveResult, error: leaveError } =
    await studentClassRepository.leaveAndWithdrawSemesterNoSpp(
      adminClient,
      studentId,
      semesterId,
      classId
    );

  if (leaveError) {
    return { success: false, error: leaveError.message };
  }
  if (!leaveResult || leaveResult.removedCount < 1) {
    return { success: false, error: "Student is not a member of this class." };
  }

  const removedClassIds = leaveResult.removed.map((row) => row.classId);
  const removedMembershipIds = leaveResult.removed.map(
    (row) => row.membershipId
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "info",
    table_name: "student_class",
    record_id: membershipId,
    metadata: {
      note: "Semester drop with no SPP; left scheduled/in-progress/paused semester classes and withdrew enrollment.",
      class_id: classId,
      student_id: studentId,
      semester_id: semesterId,
      removed_class_ids: removedClassIds,
    },
  });

  return {
    success: true,
    request: null,
    completedImmediately: true,
    removedFromClass: true,
    removedMembershipIds,
    removedClassIds,
    message:
      "Student dropped from scheduled/in-progress/paused semester classes (no payment phase assignment).",
  };
}

type CreateSemesterDropParams = {
  student_id: string;
  class_id: string;
  membership_id?: string;
  restriction_mode?: string;
  required_percent?: number | null;
  required_amount?: number | null;
  require_immediate?: boolean;
  notes?: string | null;
  auditSource?: string;
};

async function executeCreateSemesterDrop(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  parsed: CreateSemesterDropInput,
  options?: { auditSource?: string; notes?: string | null }
): Promise<CreateSemesterDropResult> {
  const { data, error } =
    await semesterDropRequestRepository.createSemesterDropRequest(adminClient, {
      student_id: parsed.student_id,
      class_id: parsed.class_id,
      restriction_mode: parsed.restriction_mode,
      required_percent: parsed.required_percent,
      required_amount: parsed.required_amount,
      requested_by: actorUserId,
      notes: options?.notes ?? null,
      require_immediate: parsed.require_immediate,
    });

  if (error) {
    const message = error.message ?? "";
    const amountError = mapAmountDueFieldError(message);
    if (amountError) {
      return amountError;
    }
    if (isNoSppDropFallbackMessage(message)) {
      let membershipId = parsed.membership_id;
      if (!membershipId) {
        const membershipResult =
          await studentClassRepository.findStudentClassByUserAndClass(
            adminClient,
            parsed.student_id,
            parsed.class_id
          );
        membershipId = membershipResult.data?.id;
      }
      if (!membershipId) {
        return {
          success: false,
          error: "Student is not a member of this class.",
        };
      }
      return leaveClassWithoutSppDrop(
        adminClient,
        actor,
        membershipId,
        parsed.class_id,
        parsed.student_id
      );
    }
    return { success: false, error: message || "Unable to create drop request." };
  }

  if (!data?.request && !data?.completedImmediately) {
    return { success: false, error: "Unable to create drop request." };
  }

  const request = data.request ? toManagerSemesterDropRow(data.request) : null;
  const removedClasses = data.removedClasses ?? [];
  const removedMembershipIds = removedClasses.map((row) => row.membershipId);
  const removedClassIds = removedClasses.map((row) => row.classId);

  await recordManagerAuditLog(adminClient, actor, {
    action: data.completedImmediately ? "update" : "insert",
    severity: "info",
    table_name: "semester_drop_requests",
    record_id: request?.id ?? null,
    new_data: request,
    metadata: {
      note: data.completedImmediately
        ? "Semester drop completed immediately."
        : "Semester drop request created (pending).",
      completedImmediately: data.completedImmediately,
      restriction_mode: parsed.restriction_mode,
      source: options?.auditSource ?? "class_drop",
      removed_class_ids: removedClassIds,
    },
  });

  return {
    success: true,
    request,
    completedImmediately: data.completedImmediately,
    removedFromClass: data.completedImmediately,
    removedMembershipIds,
    removedClassIds,
    message: data.completedImmediately
      ? parsed.restriction_mode === SEMESTER_DROP_RESTRICTION_MODES.NONE
        ? "Semester drop completed with no payment restriction. Payments kept; no refund."
        : "Semester drop completed. Student left all scheduled/in-progress/paused classes in the semester."
      : "Semester drop pending until the required payment is met.",
  };
}

export async function createSemesterDropForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateSemesterDropParams
): Promise<CreateSemesterDropResult> {
  const timer = createNavStepTimer("createSemesterDrop");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_DROP_SEMESTER
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const scope = await assertAssignedTeacherForClassMutation(
      adminClient,
      actor,
      input.class_id
    );
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }

    const parsed = createSemesterDropSchema.safeParse({
      student_id: input.student_id,
      class_id: input.class_id,
      membership_id: input.membership_id,
      restriction_mode:
        input.restriction_mode ?? SEMESTER_DROP_RESTRICTION_MODES.PERCENT,
      required_percent: input.required_percent,
      required_amount: input.required_amount,
      require_immediate: input.require_immediate ?? false,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    return timer.step("rpc", () =>
      executeCreateSemesterDrop(adminClient, actorUserId, actor, parsed.data, {
        auditSource: input.auditSource,
        notes: input.notes,
      })
    );
  } finally {
    timer.end();
  }
}

/**
 * Internal drop used by inactivate (already authorized via students.change_status).
 * Always requires immediate completion — never leaves a pending drop.
 */
export async function createImmediateSemesterDropForInactivate(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateSemesterDropParams
): Promise<CreateSemesterDropResult> {
  const parsed = createSemesterDropSchema.safeParse({
    student_id: input.student_id,
    class_id: input.class_id,
    membership_id: input.membership_id,
    restriction_mode:
      input.restriction_mode ?? SEMESTER_DROP_RESTRICTION_MODES.NONE,
    required_percent: input.required_percent,
    required_amount: input.required_amount,
    require_immediate: true,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await executeCreateSemesterDrop(
    adminClient,
    actorUserId,
    actor,
    { ...parsed.data, require_immediate: true },
    {
      auditSource: "inactivate",
      notes: input.notes ?? "Drop from student inactivate.",
    }
  );

  if (result.success && !result.completedImmediately) {
    return {
      success: false,
      error:
        "Drop cannot complete immediately. Lower the requirement, choose no restriction, or finish the pending drop first.",
    };
  }

  return result;
}

export async function cancelSemesterDropForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { request_id: string; class_id: string }
): Promise<CancelSemesterDropResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_DROP_SEMESTER
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    input.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const parsed = cancelSemesterDropSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error } =
    await semesterDropRequestRepository.cancelSemesterDropRequest(
      adminClient,
      parsed.data.request_id
    );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to cancel drop request.",
    };
  }

  if (!data?.request) {
    return { success: false, error: "Unable to cancel drop request." };
  }

  const request = toManagerSemesterDropRow(data.request);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "semester_drop_requests",
    record_id: request.id,
    new_data: request,
    metadata: { note: "Semester drop request cancelled." },
  });

  return {
    success: true,
    request,
    message: "Semester drop cancelled.",
  };
}

export type DropAllSemestersTarget = {
  semester_id: string;
  semester_name?: string;
  origin_class_id: string;
  origin_membership_id?: string;
  /** When known from preview, used to reject amount above due before RPC. */
  final_amount_due?: number;
};

/**
 * Preflight absolute amount against settleable semester dues only.
 * Omit / undefined dues for NO_SPP targets — those paths ignore amount in SQL.
 * Do not pass `0` as a stand-in for “no SPP”.
 */
function amountExceedsAnySemesterDue(
  requiredAmount: number | null | undefined,
  dues: Array<number | null | undefined>
): MutationFailure | null {
  if (requiredAmount == null || requiredAmount <= 0) {
    return null;
  }
  const knownDues = dues.filter(
    (due): due is number =>
      typeof due === "number" && Number.isFinite(due) && due >= 0
  );
  if (knownDues.length === 0) {
    return null;
  }
  const minDue = Math.min(...knownDues);
  if (requiredAmount <= minDue) {
    return null;
  }
  return {
    success: false,
    error: "Please fix the errors below.",
    fieldErrors: {
      required_amount: [
        `Amount cannot exceed the amount due (${minDue}).`,
      ],
    },
  };
}

export type DropAllSemestersResult =
  | {
      success: true;
      completedCount: number;
      message: string;
    }
  | (MutationFailure & {
      completedCount?: number;
      failedSemesterId?: string | null;
    });

/**
 * Drop every listed semester immediately with the same restriction.
 * Atomic: one RPC; any failure rolls back all drops.
 */
export async function dropAllSemestersForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_id: string;
    targets: DropAllSemestersTarget[];
    restriction_mode?: string;
    required_percent?: number | null;
    required_amount?: number | null;
    notes?: string | null;
  }
): Promise<DropAllSemestersResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_DROP_SEMESTER
  );
  if (unauthorized) {
    return { success: false, error: unauthorized, completedCount: 0 };
  }

  if (!input.targets.length) {
    return {
      success: false,
      error: "No semesters available to drop.",
      completedCount: 0,
    };
  }

  for (const target of input.targets) {
    const scope = await assertAssignedTeacherForClassMutation(
      adminClient,
      actor,
      target.origin_class_id
    );
    if (!scope.ok) {
      return {
        success: false,
        error: scope.error,
        completedCount: 0,
        failedSemesterId: target.semester_id,
      };
    }
  }

  const parsed = createSemesterDropSchema.safeParse({
    student_id: input.student_id,
    class_id: input.targets[0].origin_class_id,
    restriction_mode:
      input.restriction_mode ?? SEMESTER_DROP_RESTRICTION_MODES.PERCENT,
    required_percent: input.required_percent,
    required_amount: input.required_amount,
    require_immediate: true,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      completedCount: 0,
    };
  }

  const amountDueError = amountExceedsAnySemesterDue(
    parsed.data.required_amount,
    input.targets.map((target) => target.final_amount_due)
  );
  if (amountDueError) {
    return { ...amountDueError, completedCount: 0 };
  }

  const { data, error } =
    await semesterDropRequestRepository.createImmediateSemesterDropsBatch(
      adminClient,
      {
        student_id: input.student_id,
        class_ids: input.targets.map((target) => target.origin_class_id),
        restriction_mode: parsed.data.restriction_mode,
        required_percent: parsed.data.required_percent,
        required_amount: parsed.data.required_amount,
        requested_by: actorUserId,
        notes:
          input.notes ??
          `Drop all semesters from console (${input.targets.length}).`,
      }
    );

  if (error) {
    const message = error.message ?? "";
    const amountError = mapAmountDueFieldError(message);
    if (amountError) {
      return { ...amountError, completedCount: 0 };
    }
    if (isNoSppDropFallbackMessage(message) && input.targets.length === 1) {
      const target = input.targets[0];
      let membershipId = target.origin_membership_id;
      if (!membershipId) {
        const membershipResult =
          await studentClassRepository.findStudentClassByUserAndClass(
            adminClient,
            input.student_id,
            target.origin_class_id
          );
        membershipId = membershipResult.data?.id;
      }
      if (!membershipId) {
        return {
          success: false,
          error: "Student is not a member of this class.",
          completedCount: 0,
        };
      }
      const single = await leaveClassWithoutSppDrop(
        adminClient,
        actor,
        membershipId,
        target.origin_class_id,
        input.student_id
      );
      if (!single.success) {
        return { ...single, completedCount: 0 };
      }
      return {
        success: true,
        completedCount: 1,
        message: "Dropped 1 semester immediately.",
      };
    }
    return {
      success: false,
      error: message || "Unable to drop semesters.",
      completedCount: 0,
    };
  }

  const completedCount = data?.completedCount ?? 0;
  if (!data || completedCount < 1) {
    return {
      success: false,
      error: "Unable to drop semesters.",
      completedCount: 0,
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "semester_drop_requests",
    record_id: null,
    metadata: {
      note: "Atomic drop-all semesters completed.",
      student_id: input.student_id,
      completed_count: completedCount,
      class_ids: input.targets.map((target) => target.origin_class_id),
      source: "drop_student_console",
    },
  });

  return {
    success: true,
    completedCount,
    message:
      completedCount === 1
        ? "Dropped 1 semester immediately."
        : `Dropped ${completedCount} semesters immediately.`,
  };
}

/**
 * Immediate drops for inactivate — atomic batch when multiple semesters.
 */
export async function createImmediateSemesterDropsBatchForInactivate(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_id: string;
    targets: Array<{
      class_id: string;
      semester_id?: string;
      final_amount_due?: number;
    }>;
    restriction_mode?: string;
    required_percent?: number | null;
    required_amount?: number | null;
    notes?: string | null;
  }
): Promise<DropAllSemestersResult> {
  if (!input.targets.length) {
    return { success: true, completedCount: 0, message: "No semesters to drop." };
  }

  const parsed = createSemesterDropSchema.safeParse({
    student_id: input.student_id,
    class_id: input.targets[0].class_id,
    restriction_mode:
      input.restriction_mode ?? SEMESTER_DROP_RESTRICTION_MODES.NONE,
    required_percent: input.required_percent,
    required_amount: input.required_amount,
    require_immediate: true,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      completedCount: 0,
    };
  }

  const amountDueError = amountExceedsAnySemesterDue(
    parsed.data.required_amount,
    input.targets.map((target) => target.final_amount_due)
  );
  if (amountDueError) {
    return { ...amountDueError, completedCount: 0 };
  }

  const { data, error } =
    await semesterDropRequestRepository.createImmediateSemesterDropsBatch(
      adminClient,
      {
        student_id: input.student_id,
        class_ids: input.targets.map((target) => target.class_id),
        restriction_mode: parsed.data.restriction_mode,
        required_percent: parsed.data.required_percent,
        required_amount: parsed.data.required_amount,
        requested_by: actorUserId,
        notes: input.notes ?? "Drop from student inactivate.",
      }
    );

  if (error) {
    const message = error.message ?? "";
    const amountError = mapAmountDueFieldError(message);
    if (amountError) {
      return { ...amountError, completedCount: 0 };
    }
    if (isNoSppDropFallbackMessage(message) && input.targets.length === 1) {
      const membershipResult =
        await studentClassRepository.findStudentClassByUserAndClass(
          adminClient,
          input.student_id,
          input.targets[0].class_id
        );
      const membershipId = membershipResult.data?.id;
      if (!membershipId) {
        return {
          success: false,
          error: "Student is not a member of this class.",
          completedCount: 0,
        };
      }
      const single = await leaveClassWithoutSppDrop(
        adminClient,
        actor,
        membershipId,
        input.targets[0].class_id,
        input.student_id
      );
      if (!single.success) {
        return { ...single, completedCount: 0 };
      }
      return {
        success: true,
        completedCount: 1,
        message: "Dropped 1 semester immediately.",
      };
    }
    return {
      success: false,
      error: message || "Unable to drop semesters for inactivate.",
      completedCount: 0,
    };
  }

  const completedCount = data?.completedCount ?? 0;
  if (!data || completedCount < input.targets.length) {
    return {
      success: false,
      error: "Unable to drop all required semesters.",
      completedCount: 0,
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "semester_drop_requests",
    record_id: null,
    metadata: {
      note: "Atomic inactivate semester drops completed.",
      student_id: input.student_id,
      completed_count: completedCount,
      source: "inactivate",
    },
  });

  return {
    success: true,
    completedCount,
    message:
      completedCount === 1
        ? "Dropped 1 semester immediately."
        : `Dropped ${completedCount} semesters immediately.`,
  };
}

export async function studentHasPendingSemesterDrop(
  adminClient: Supabase,
  studentId: string,
  semesterId: string
): Promise<boolean> {
  const { data, error } =
    await semesterDropRequestRepository.findPendingDropByStudentAndSemester(
      adminClient,
      studentId,
      semesterId
    );
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export async function reactivateSemesterAfterRejoin(
  adminClient: Supabase,
  studentUserId: string,
  semesterId: string,
  knownStudentProfileId?: string
): Promise<void> {
  let studentProfileId = knownStudentProfileId;
  if (!studentProfileId) {
    const profileResult =
      await studentProfileRepository.findStudentProfileByUserId(
        adminClient,
        studentUserId
      );
    studentProfileId = profileResult.data?.id;
  }
  if (!studentProfileId) {
    return;
  }
  await studentSemesterRepository.updateEnrollmentStatus(
    adminClient,
    studentProfileId,
    semesterId,
    STUDENT_SEMESTER_STATUSES.ACTIVE
  );
}

/** Batch rejoin: one UPDATE for all students re-entering the semester. */
export async function reactivateSemestersAfterRejoin(
  adminClient: Supabase,
  studentProfileIds: string[],
  semesterId: string
): Promise<void> {
  const { error } =
    await studentSemesterRepository.updateEnrollmentStatusForProfiles(
      adminClient,
      studentProfileIds,
      semesterId,
      STUDENT_SEMESTER_STATUSES.ACTIVE
    );
  if (error) {
    throw new Error(error.message);
  }
}
