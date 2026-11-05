import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import { SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT } from "@/lib/manager/accounting/constants";
import { toManagerSemesterDropRow } from "@/lib/manager/accounting/semester-drop-mapper";
import { isNoSppDropFallbackMessage } from "@/lib/manager/accounting/semester-drop-messages";
import {
  cancelSemesterDropSchema,
  createSemesterDropSchema,
} from "@/lib/validators/manager/create-semester-drop";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as classRepository from "@/repositories/class.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  onStudentLeftClass,
} from "@/services/accounting/accounting-sync.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { ManagerSemesterDropRequestRow } from "@/types/manager-semester-drop";
import type { MutationFailure, Supabase } from "@/services/classes/class-shared";
import { withPaymentSync } from "@/services/classes/class-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";

export type CreateSemesterDropResult =
  | {
      success: true;
      request: ManagerSemesterDropRequestRow | null;
      completedImmediately: boolean;
      removedFromClass: boolean;
      message: string;
      warning?: string;
    }
  | MutationFailure;

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
  const { data: deleted, error: deleteError } =
    await studentClassRepository.deleteStudentClassMembership(
      adminClient,
      membershipId,
      classId
    );

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }
  if (!deleted) {
    return { success: false, error: "Student is not a member of this class." };
  }

  const sync = await withPaymentSync(
    adminClient,
    actor,
    {
      studentId,
      classId,
      operation: "drop_semester_leave_sync",
    },
    () => onStudentLeftClass(adminClient, { studentId, classId }, actor)
  );
  const warning = sync.warning;

  const classResult = await classRepository.findClassById(adminClient, classId);
  const semesterId = classResult.data?.semester_id ?? null;
  if (semesterId) {
    const profileResult =
      await studentProfileRepository.findStudentProfileByUserId(
        adminClient,
        studentId
      );
    if (profileResult.data?.id) {
      await studentSemesterRepository.updateEnrollmentStatus(
        adminClient,
        profileResult.data.id,
        semesterId,
        STUDENT_SEMESTER_STATUSES.WITHDRAWN
      );
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "info",
    table_name: "student_class",
    record_id: membershipId,
    metadata: {
      note: "Semester drop with no SPP; membership removed immediately.",
      class_id: classId,
      student_id: studentId,
    },
  });

  return {
    success: true,
    request: null,
    completedImmediately: true,
    removedFromClass: true,
    message: "Student dropped from class (no payment phase assignment).",
    warning,
  };
}

export async function createSemesterDropForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_id: string;
    class_id: string;
    membership_id?: string;
    required_percent?: number;
  }
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
      required_percent:
        input.required_percent ?? SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { data, error } = await timer.step("rpc", () =>
      semesterDropRequestRepository.createSemesterDropRequest(adminClient, {
        student_id: parsed.data.student_id,
        class_id: parsed.data.class_id,
        required_percent: parsed.data.required_percent,
        requested_by: actorUserId,
      })
    );

    if (error) {
      const message = error.message ?? "";
      if (isNoSppDropFallbackMessage(message)) {
        let membershipId = parsed.data.membership_id;
        if (!membershipId) {
          const membershipResult =
            await studentClassRepository.findStudentClassByUserAndClass(
              adminClient,
              parsed.data.student_id,
              parsed.data.class_id
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
          parsed.data.class_id,
          parsed.data.student_id
        );
      }
      return { success: false, error: message || "Unable to create drop request." };
    }

    if (!data?.request && !data?.completedImmediately) {
      return { success: false, error: "Unable to create drop request." };
    }

    const request = data.request
      ? toManagerSemesterDropRow(data.request)
      : null;

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
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
        },
      })
    );

    return {
      success: true,
      request,
      completedImmediately: data.completedImmediately,
      removedFromClass: data.completedImmediately,
      message: data.completedImmediately
        ? "Semester drop completed. Student left the class."
        : "Semester drop pending until the required payment is met.",
    };
  } finally {
    timer.end();
  }
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
