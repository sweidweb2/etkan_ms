import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { transferStudentBetweenClassesSchema } from "@/lib/validators/manager/transfer-student-between-classes";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  coalesceWarning,
  warnSoftFailure,
} from "@/lib/ops/soft-success";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { onStudentLeftClass } from "@/services/accounting/accounting-sync.service";
import {
  seedLateJoinAttendeesForStudent,
  seedLateJoinStudentTasksForStudent,
} from "@/services/classes/session-seed.service";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import {
  withPaymentSync,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";
import { assertAssignedTeacherForClassIds } from "@/services/classes/teacher-class-scope.service";

export type TransferStudentBetweenClassesResult =
  | {
      success: true;
      student: ManagerClassStudentRow;
      from_class_id: string;
      to_class_id: string;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function transferStudentBetweenClassesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_profile_id: string;
    from_class_id: string;
    to_class_id: string;
  }
): Promise<TransferStudentBetweenClassesResult> {
  const timer = createNavStepTimer("transferStudentBetweenClasses");
  try {
    const [removeUnauthorized, addUnauthorized] = await timer.step("auth", () =>
      Promise.all([
        getUnauthorizedError(
          adminClient,
          actorUserId,
          PERMISSIONS.CLASSES_REMOVE_STUDENT
        ),
        getUnauthorizedError(
          adminClient,
          actorUserId,
          PERMISSIONS.CLASSES_ADD_STUDENT
        ),
      ])
    );
    if (removeUnauthorized) {
      return { success: false, error: removeUnauthorized };
    }
    if (addUnauthorized) {
      return { success: false, error: addUnauthorized };
    }

    const parsed = transferStudentBetweenClassesSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { student_profile_id, from_class_id, to_class_id } = parsed.data;

    const scope = await assertAssignedTeacherForClassIds(adminClient, actor, [
      from_class_id,
      to_class_id,
    ]);
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }

    const [fromClassResult, toClassResult, studentProfileResult] =
      await timer.step("lookups", () =>
        Promise.all([
          classRepository.findClassDetailById(adminClient, from_class_id),
          classRepository.findClassDetailById(adminClient, to_class_id),
          studentProfileRepository.findStudentProfileById(
            adminClient,
            student_profile_id
          ),
        ])
      );

    if (fromClassResult.error) {
      return { success: false, error: fromClassResult.error.message };
    }
    if (!fromClassResult.data) {
      return { success: false, error: "Source class not found." };
    }

    if (toClassResult.error) {
      return { success: false, error: toClassResult.error.message };
    }
    if (!toClassResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { to_class_id: ["Destination class not found."] },
      };
    }

    if (studentProfileResult.error || !studentProfileResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { student_profile_id: ["Student not found."] },
      };
    }

    if (studentProfileResult.data.status === STUDENT_STATUSES.INACTIVE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          student_profile_id: [
            "Inactive students cannot be added to a class.",
          ],
        },
      };
    }

    const studentProfile = studentProfileResult.data;
    const userId = studentProfile.user_id;

    const sourceSemesterId = fromClassResult.data.semester_id;
    if (sourceSemesterId) {
      const { studentHasPendingSemesterDrop } = await import(
        "@/services/classes/drop-semester.service"
      );
      const hasPendingDrop = await studentHasPendingSemesterDrop(
        adminClient,
        userId,
        sourceSemesterId
      );
      if (hasPendingDrop) {
        return {
          success: false,
          error:
            "Cannot transfer while a semester drop is pending for this student.",
        };
      }
    }

    const transferResult = await timer.step("transfer", () =>
      studentClassRepository.transferStudentBetweenClasses(
        adminClient,
        userId,
        from_class_id,
        to_class_id
      )
    );

    if (transferResult.error) {
      return { success: false, error: transferResult.error.message };
    }

    if (!transferResult.data) {
      return { success: false, error: "Unable to transfer student." };
    }

    if (!transferResult.data.ok) {
      if (transferResult.data.code === "not_in_source") {
        return {
          success: false,
          error: "Student is not enrolled in the source class.",
        };
      }
      if (transferResult.data.code === "already_in_dest") {
        return {
          success: false,
          error: "Please fix the errors below.",
          fieldErrors: {
            to_class_id: ["Student is already in the destination class."],
          },
        };
      }
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          to_class_id: [
            "Destination class must be different from the current class.",
          ],
        },
      };
    }

    const destEnrollment = transferResult.data.to;
    const fromEnrollment = transferResult.data.from;

    const leaveSync = await withPaymentSync(
      adminClient,
      actor,
      {
        studentId: userId,
        classId: from_class_id,
        operation: "transfer_leave_sync",
      },
      () =>
        onStudentLeftClass(
          adminClient,
          { studentId: userId, classId: from_class_id },
          actor
        ),
      { timer, stepName: "leaveSync" }
    );
    let warning = leaveSync.warning;

    let studentEmail = "";
    try {
      const [authResult, gradeResult] = await timer.step(
        "destHydrate",
        () =>
          Promise.all([
            authRepository.getAuthUserById(adminClient, userId),
            finalExamRepository.ensureEnrollmentFinalExamGrade(
              adminClient,
              to_class_id,
              userId
            ),
            seedLateJoinAttendeesForStudent(adminClient, to_class_id, userId),
            seedLateJoinStudentTasksForStudent(
              adminClient,
              to_class_id,
              userId
            ),
          ]).then(([auth, grade]) => [auth, grade] as const)
      );
      studentEmail = authResult.data.user?.email ?? "";
      if (gradeResult.error) {
        warning = coalesceWarning(
          warning,
          warnSoftFailure(
            "transferStudent.finalExamGrade",
            gradeResult.error,
            "Student transferred, but final exam grade row could not be created.",
            { toClassId: to_class_id, studentId: userId },
            {
              userMessage:
                "Student transferred, but final exam grade row could not be created.",
            }
          )
        );
      }
    } catch (err) {
      warning = coalesceWarning(
        warning,
        warnSoftFailure(
          "transferStudent.destHydrate",
          err,
          "Student transferred, but destination attendance or task rows could not be created.",
          { fromClassId: from_class_id, toClassId: to_class_id, studentId: userId },
          {
            userMessage:
              "Student transferred, but destination attendance or task rows could not be created.",
          }
        )
      );
      const authFallback = await authRepository.getAuthUserById(
        adminClient,
        userId
      );
      studentEmail = authFallback.data.user?.email ?? "";
    }

    const student: ManagerClassStudentRow = {
      id: destEnrollment.id,
      student_profile_id: studentProfile.id,
      user_id: userId,
      full_name: studentProfile.full_name,
      email: studentEmail,
      phone: studentProfile.phone,
      joined_at: destEnrollment.joined_at ?? new Date().toISOString(),
    };

    await timer.step("audit", () =>
      Promise.all([
        recordManagerAuditLog(adminClient, actor, {
          action: "insert",
          table_name: "student_class",
          record_id: student.id,
          new_data: {
            class_id: to_class_id,
            user_id: userId,
          },
        }),
        recordManagerAuditLog(adminClient, actor, {
          action: "update",
          severity: "info",
          table_name: "student_class",
          record_id: student.id,
          old_data: {
            class_id: from_class_id,
          },
          new_data: {
            class_id: to_class_id,
            from_enrollment_id: fromEnrollment.id,
          },
          metadata: {
            note: "Student transferred between classes without destination payment sync.",
            from_class_id,
            to_class_id,
            student_id: userId,
          },
        }),
      ])
    );

    return {
      success: true,
      student,
      from_class_id,
      to_class_id,
      message: `${student.full_name} transferred. Destination billing was not auto-assigned.`,
      warning,
    };
  } finally {
    timer.end();
  }
}
