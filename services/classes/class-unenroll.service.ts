import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { removeStudentFromClassSchema } from "@/lib/validators/manager/remove-student-from-class";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  coalesceWarning,
  warnSoftFailure,
} from "@/lib/ops/soft-success";
import * as classRepository from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { onStudentLeftClass } from "@/services/accounting/accounting-sync.service";
import {
  withPaymentSync,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";

export type RemoveStudentFromClassResult =
  | {
      success: true;
      removedStudentId: string;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function removeStudentFromClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
  }
): Promise<RemoveStudentFromClassResult> {
  const timer = createNavStepTimer("removeStudentFromClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_REMOVE_STUDENT
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

    const parsed = removeStudentFromClassSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const classResult = await classRepository.findClassById(
      adminClient,
      parsed.data.class_id
    );
    if (classResult.error) {
      return { success: false, error: classResult.error.message };
    }
    if (!classResult.data) {
      return { success: false, error: "Class not found." };
    }

    const { data: existingMembership, error: membershipLookupError } =
      await studentClassRepository.findStudentClassById(
        adminClient,
        parsed.data.id
      );
    if (membershipLookupError) {
      return { success: false, error: membershipLookupError.message };
    }
    const studentUserId = existingMembership?.user_id;
    if (!studentUserId || existingMembership.class_id !== parsed.data.class_id) {
      return { success: false, error: "Enrollment not found." };
    }

    const semesterId = classResult.data.semester_id;
    const unpaidSppIdsToMaybeDelete: string[] = [];

    if (semesterId) {
      const openedPhasesResult =
        await paymentPhaseRepository.listOpenedPaymentPhasesBySemesterId(
          adminClient,
          semesterId
        );
      if (openedPhasesResult.error) {
        return { success: false, error: openedPhasesResult.error.message };
      }
      let phases = openedPhasesResult.data ?? [];
      if (phases.length === 0) {
        const syncPhase =
          await paymentPhaseRepository.findCurrentSyncPhaseBySemesterId(
            adminClient,
            semesterId
          );
        if (syncPhase.error) {
          return { success: false, error: syncPhase.error.message };
        }
        if (syncPhase.data) {
          phases = [syncPhase.data];
        }
      }

      for (const phase of phases) {
        const sppResult =
          await studentPaymentPhaseRepository.findSppByStudentAndPhase(
            adminClient,
            studentUserId,
            phase.id
          );
        if (sppResult.error) {
          return { success: false, error: sppResult.error.message };
        }
        if (!sppResult.data?.id) {
          continue;
        }
        const paymentsResult =
          await studentPaymentRepository.listPaymentSppIdsBySppIds(
            adminClient,
            [sppResult.data.id]
          );
        if (paymentsResult.error) {
          return { success: false, error: paymentsResult.error.message };
        }
        if ((paymentsResult.data ?? []).length > 0) {
          return {
            success: false,
            error:
              "Cannot remove: this student has payments on the semester SPP. Use Drop semester instead.",
          };
        }
        unpaidSppIdsToMaybeDelete.push(sppResult.data.id);
      }

      const pendingDrop =
        await semesterDropRequestRepository.findPendingDropByStudentAndSemester(
          adminClient,
          studentUserId,
          semesterId
        );
      if (pendingDrop.error) {
        return { success: false, error: pendingDrop.error.message };
      }
      if (pendingDrop.data) {
        return {
          success: false,
          error:
            "Cannot remove while a semester drop is pending. Finish or cancel the drop first.",
        };
      }
    }

    const { data: deleted, error: deleteError } = await timer.step(
      "delete",
      () =>
        studentClassRepository.deleteStudentClassMembership(
          adminClient,
          parsed.data.id,
          parsed.data.class_id
        )
    );

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    if (!deleted) {
      return { success: false, error: "Enrollment not found." };
    }

    const sync = await withPaymentSync(
      adminClient,
      actor,
      {
        studentId: deleted.user_id,
        classId: parsed.data.class_id,
        operation: "enrollment_leave_sync",
      },
      () =>
        onStudentLeftClass(
          adminClient,
          { studentId: deleted.user_id, classId: parsed.data.class_id },
          actor
        ),
      { timer }
    );

    let deletedSpp = false;
    let warning = sync.warning;
    if (semesterId && unpaidSppIdsToMaybeDelete.length > 0) {
      const semesterClassesResult =
        await classRepository.listClassesBySemesterId(adminClient, semesterId);
      if (semesterClassesResult.error) {
        warning = coalesceWarning(
          warning,
          warnSoftFailure(
            "removeStudentFromClass.listSemesterClasses",
            semesterClassesResult.error,
            "Student removed, but unpaid semester billing cleanup could not run.",
            {
              classId: parsed.data.class_id,
              studentId: deleted.user_id,
            },
            {
              userMessage:
                "Student removed, but unpaid semester billing cleanup could not run.",
            }
          )
        );
      } else {
        const semesterClassIds = (semesterClassesResult.data ?? []).map(
          (row) => row.id
        );
        const remainingMemberships =
          semesterClassIds.length === 0
            ? { data: [], error: null }
            : await studentClassRepository.listMemberUserIdsByClassIds(
                adminClient,
                semesterClassIds
              );
        if (remainingMemberships.error) {
          warning = coalesceWarning(
            warning,
            warnSoftFailure(
              "removeStudentFromClass.remainingMemberships",
              remainingMemberships.error,
              "Student removed, but unpaid semester billing cleanup could not run.",
              {
                classId: parsed.data.class_id,
                studentId: deleted.user_id,
              },
              {
                userMessage:
                  "Student removed, but unpaid semester billing cleanup could not run.",
              }
            )
          );
        } else {
          const stillInSemester = (remainingMemberships.data ?? []).some(
            (row) => row.user_id === deleted.user_id
          );
          if (!stillInSemester) {
            let deletedAnySpp = false;
            for (const sppId of unpaidSppIdsToMaybeDelete) {
              const sppDelete =
                await studentPaymentPhaseRepository.deleteStudentPaymentPhaseWithRecalc(
                  adminClient,
                  sppId
                );
              if (sppDelete.error) {
                warning = coalesceWarning(
                  warning,
                  warnSoftFailure(
                    "removeStudentFromClass.deleteSpp",
                    sppDelete.error,
                    "Student removed, but unpaid semester SPP could not be deleted.",
                    {
                      classId: parsed.data.class_id,
                      studentId: deleted.user_id,
                      sppId,
                    },
                    {
                      userMessage:
                        "Student removed, but unpaid semester SPP could not be deleted.",
                    }
                  )
                );
              } else {
                deletedAnySpp = true;
              }
            }
            deletedSpp = deletedAnySpp;
          }
        }
      }
    }

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "delete",
        severity: "info",
        table_name: "student_class",
        record_id: deleted.id,
        old_data: {
          class_id: parsed.data.class_id,
          user_id: deleted.user_id,
        },
        new_data: null,
        metadata: {
          note: deletedSpp
            ? "Student removed from class; unpaid semester SPP deleted (last class)."
            : "Student removed from class (binary membership).",
          class_id: parsed.data.class_id,
          student_id: deleted.user_id,
          deleted_spp: deletedSpp,
        },
      })
    );

    return {
      success: true,
      removedStudentId: deleted.id,
      message: deletedSpp
        ? "Student removed from class and unpaid semester SPP deleted."
        : "Student removed from class.",
      warning,
    };
  } finally {
    timer.end();
  }
}
