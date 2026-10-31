import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getUnauthorizedError,
  hasPermission,
} from "@/services/auth/authorization.service";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import {
  addStudentToClassSchema,
  addStudentsToClassSchema,
} from "@/lib/validators/manager/add-student-to-class";
import { copyStudentsFromClassSchema } from "@/lib/validators/manager/copy-students-from-class";
import { removeStudentFromClassSchema } from "@/lib/validators/manager/remove-student-from-class";
import { transferStudentBetweenClassesSchema } from "@/lib/validators/manager/transfer-student-between-classes";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import type { StudentFinalExamGradeRecord } from "@/repositories/final-exam.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  onStudentJoinedClass,
  onStudentLeftClass,
  onStudentsJoinedClass,
  type StudentJoinSyncItem,
} from "@/services/accounting/accounting-sync.service";
import {
  seedLateJoinAttendeesForStudent,
  seedLateJoinAttendeesForStudents,
  seedLateJoinStudentTasksForStudent,
  seedLateJoinStudentTasksForStudents,
} from "@/services/classes/session.service";
import type {
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentRow } from "@/types/manager-student";
import {
  PAYMENT_SYNC_FAILURE_WARNING,
  mapClassDetailRecordToRow,
  mapStudentFinalExamGradeRecord,
  recordPaymentSyncFailure,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";
import {
  assertAssignedTeacherForClassIds,
  assertAssignedTeacherForClassMutation,
} from "@/services/classes/teacher-class-scope.service";

export type AddStudentToClassResult =
  | {
      success: true;
      student: ManagerClassStudentRow;
      studentGrade?: ManagerStudentFinalExamGradeRow;
      classRow: ManagerClassRow;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function addStudentToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileId: string;
  },
  options?: {
    /** Only transfer uses this — normal enroll always syncs payment. */
    skipPaymentSync?: boolean;
  }
): Promise<AddStudentToClassResult> {
  const timer = createNavStepTimer("addStudentToClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_ADD_STUDENT
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

    const parsed = addStudentToClassSchema.safeParse({
      studentProfileId: input.studentProfileId,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const [
      classResult,
      studentProfileResult,
      enrollmentResult,
      teacherResult,
      sessionResult,
    ] = await timer.step("lookups", () =>
      Promise.all([
        classRepository.findClassDetailById(adminClient, input.class_id),
        studentProfileRepository.findStudentProfileById(
          adminClient,
          parsed.data.studentProfileId
        ),
        studentClassRepository.countStudentClassesByClassId(
          adminClient,
          input.class_id
        ),
        classTeacherRepository.countClassTeachersByClassId(
          adminClient,
          input.class_id
        ),
        sessionRepository.listSessionCountsByClassIds(adminClient, [
          input.class_id,
        ]),
      ])
    );

    if (classResult.error) {
      return { success: false, error: classResult.error.message };
    }

    if (!classResult.data) {
      return { success: false, error: "Class not found." };
    }

    const classRecord = classResult.data as ClassDetailRecord;

    if (studentProfileResult.error) {
      return { success: false, error: studentProfileResult.error.message };
    }

    if (!studentProfileResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { studentProfileId: ["Student not found."] },
      };
    }

    if (studentProfileResult.data.status === STUDENT_STATUSES.INACTIVE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          studentProfileId: ["Inactive students cannot be added to a class."],
        },
      };
    }

    if (enrollmentResult.error) {
      return { success: false, error: enrollmentResult.error.message };
    }

    if (teacherResult.error) {
      return { success: false, error: teacherResult.error.message };
    }

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    const studentProfile = studentProfileResult.data;
    const userId = studentProfile.user_id;

    const enrollResult = await timer.step("enroll", () =>
      studentClassRepository.enrollStudentInClass(
        adminClient,
        userId,
        input.class_id
      )
    );

    if (enrollResult.error) {
      return { success: false, error: enrollResult.error.message };
    }

    if (!enrollResult.data) {
      return { success: false, error: "Unable to enroll student." };
    }

    if (!enrollResult.data.ok) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          studentProfileId: ["This student is already enrolled in this class."],
        },
      };
    }

    const data = enrollResult.data.enrollment;

    const [profileResult, authResult] = await Promise.all([
      timer.step("hydrateProfile", () =>
        profileRepository.findProfileById(adminClient, userId)
      ),
      timer.step("hydrateAuth", () =>
        authRepository.getAuthUserById(adminClient, userId)
      ),
    ]);

    if (profileResult.error || !profileResult.data) {
      return {
        success: false,
        error: profileResult.error?.message ?? "Unable to load student profile.",
      };
    }

    const student: ManagerClassStudentRow = {
      id: data.id,
      student_profile_id: studentProfile.id,
      user_id: userId,
      full_name: studentProfile.full_name,
      username: profileResult.data.username,
      email: authResult.data.user?.email ?? "",
      phone: studentProfile.phone,
      joined_at: data.joined_at ?? new Date().toISOString(),
    };

    let studentGrade: ManagerStudentFinalExamGradeRow | undefined;

    const gradeResult = await timer.step("examGrade", () =>
      finalExamRepository.ensureEnrollmentFinalExamGrade(
        adminClient,
        input.class_id,
        userId
      )
    );

    if (gradeResult.error) {
      return {
        success: false,
        error:
          gradeResult.error.message ??
          "Student enrolled, but final exam grade row could not be created.",
      };
    }

    if (gradeResult.data) {
      studentGrade = mapStudentFinalExamGradeRecord(
        gradeResult.data as StudentFinalExamGradeRecord,
        student.full_name
      );
    }

    try {
      await timer.step("attendees", () =>
        seedLateJoinAttendeesForStudent(adminClient, input.class_id, userId)
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student enrolled, but attendance rows could not be created.",
      };
    }

    try {
      await timer.step("tasks", () =>
        seedLateJoinStudentTasksForStudent(
          adminClient,
          input.class_id,
          userId
        )
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student enrolled, but task grade rows could not be created.",
      };
    }

    const classRow = mapClassDetailRecordToRow(classRecord, {
      enrollment_count: (enrollmentResult.count ?? 0) + 1,
      teacher_count: teacherResult.count ?? 0,
      completed_sessions: sessionResult.data?.length ?? 0,
    });

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        table_name: "student_class",
        record_id: student.id,
        new_data: {
          class_id: input.class_id,
          user_id: userId,
        },
      })
    );

    let warning: string | undefined;

    if (!options?.skipPaymentSync) {
      try {
        await timer.step("paymentSync", () =>
          onStudentJoinedClass(
            adminClient,
            { studentId: userId, classId: input.class_id },
            actor
          )
        );
      } catch (syncError) {
        await recordPaymentSyncFailure(adminClient, actor, {
          studentId: userId,
          classId: input.class_id,
          operation: "enroll_join_sync",
          error: syncError,
        });
        warning = PAYMENT_SYNC_FAILURE_WARNING;
      }
    }

    if (classRecord.semester_id) {
      try {
        const { reactivateSemesterAfterRejoin } = await import(
          "@/services/classes/drop-semester.service"
        );
        await reactivateSemesterAfterRejoin(
          adminClient,
          userId,
          classRecord.semester_id
        );
      } catch {
        // Non-fatal: membership already created.
      }
    }

    return {
      success: true,
      student,
      studentGrade,
      classRow,
      message: `${student.full_name} added to class.`,
      warning,
    };
  } finally {
    timer.end();
  }
}


export type AddStudentsToClassResult =
  | {
      success: true;
      students: ManagerClassStudentRow[];
      studentGrades: ManagerStudentFinalExamGradeRow[];
      classRow: ManagerClassRow;
      message: string;
      warning?: string;
      autoAssignedPhase?: { id: string; name: string };
      optionalPaymentPhases?: Array<{ id: string; name: string }>;
    }
  | MutationFailure;

/**
 * Shared enroll pipeline used by Add student and Copy from class.
 * Caller must already authorize the actor.
 */
async function enrollStudentsInClassCore(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileIds: string[];
  },
  timer: ReturnType<typeof createNavStepTimer>
): Promise<AddStudentsToClassResult> {
    const uniqueIds = [...new Set(input.studentProfileIds)];

    const [
      classResult,
      studentProfilesResult,
      enrollmentResult,
      teacherResult,
      sessionResult,
    ] = await timer.step("lookups", () =>
      Promise.all([
        classRepository.findClassDetailById(adminClient, input.class_id),
        studentProfileRepository.listStudentProfilesByIds(adminClient, uniqueIds),
        studentClassRepository.countStudentClassesByClassId(
          adminClient,
          input.class_id
        ),
        classTeacherRepository.countClassTeachersByClassId(
          adminClient,
          input.class_id
        ),
        sessionRepository.listSessionCountsByClassIds(adminClient, [
          input.class_id,
        ]),
      ])
    );

    if (classResult.error) {
      return { success: false, error: classResult.error.message };
    }

    if (!classResult.data) {
      return { success: false, error: "Class not found." };
    }

    if (studentProfilesResult.error) {
      return { success: false, error: studentProfilesResult.error.message };
    }

    if (enrollmentResult.error) {
      return { success: false, error: enrollmentResult.error.message };
    }

    if (teacherResult.error) {
      return { success: false, error: teacherResult.error.message };
    }

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    const classRecord = classResult.data as ClassDetailRecord;
    const profileById = new Map(
      (studentProfilesResult.data ?? []).map((row) => [row.id, row])
    );

    const eligibleUserIds: string[] = [];
    const seenUserIds = new Set<string>();
    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile || profile.status === STUDENT_STATUSES.INACTIVE) {
        continue;
      }
      if (seenUserIds.has(profile.user_id)) {
        continue;
      }
      seenUserIds.add(profile.user_id);
      eligibleUserIds.push(profile.user_id);
    }

    const enrollResult = await timer.step("enroll", () =>
      studentClassRepository.enrollStudentsInClass(
        adminClient,
        input.class_id,
        eligibleUserIds
      )
    );

    if (enrollResult.error || !enrollResult.data) {
      return {
        success: false,
        error: enrollResult.error?.message ?? "Unable to enroll students.",
      };
    }

    const insertedByUserId = new Map(
      enrollResult.data.inserted.map((row) => [row.user_id, row])
    );
    const alreadyEnrolled = new Set(enrollResult.data.already_enrolled);
    const insertedUserIds = enrollResult.data.inserted.map((row) => row.user_id);

    const failures: string[] = [];
    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile) {
        failures.push("Student not found.");
        continue;
      }
      if (profile.status === STUDENT_STATUSES.INACTIVE) {
        failures.push("Inactive students cannot be added to a class.");
        continue;
      }
      if (alreadyEnrolled.has(profile.user_id)) {
        failures.push("This student is already enrolled in this class.");
        continue;
      }
      if (!insertedByUserId.has(profile.user_id)) {
        failures.push("Unable to enroll student.");
      }
    }

    if (insertedUserIds.length === 0) {
      return {
        success: false,
        error: failures[0] ?? "Unable to enroll students.",
        fieldErrors: {
          studentProfileIds: [failures[0] ?? "Unable to enroll students."],
        },
      };
    }

    let gradeResult: Awaited<
      ReturnType<typeof finalExamRepository.ensureEnrollmentFinalExamGrades>
    >;
    let profilesResult: Awaited<
      ReturnType<typeof profileRepository.listProfilesByIds>
    >;
    let emailsResult: Awaited<
      ReturnType<typeof authRepository.listAuthEmailsByIds>
    >;

    try {
      [gradeResult, , , profilesResult, emailsResult] = await timer.step(
        "hydrate",
        () =>
          Promise.all([
            finalExamRepository.ensureEnrollmentFinalExamGrades(
              adminClient,
              input.class_id,
              insertedUserIds
            ),
            seedLateJoinAttendeesForStudents(
              adminClient,
              input.class_id,
              insertedUserIds
            ),
            seedLateJoinStudentTasksForStudents(
              adminClient,
              input.class_id,
              insertedUserIds
            ),
            profileRepository.listProfilesByIds(adminClient, insertedUserIds),
            authRepository.listAuthEmailsByIds(adminClient, insertedUserIds),
          ])
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student enrolled, but attendance or task grade rows could not be created.",
      };
    }

    if (gradeResult.error) {
      return {
        success: false,
        error:
          gradeResult.error.message ??
          "Student enrolled, but final exam grade row could not be created.",
      };
    }

    if (profilesResult.error) {
      return {
        success: false,
        error: profilesResult.error.message ?? "Unable to load student profile.",
      };
    }

    if (emailsResult.error) {
      return {
        success: false,
        error: emailsResult.error.message,
      };
    }

    const usernameByUserId = new Map(
      (profilesResult.data ?? []).map((row) => [row.id, row.username])
    );
    const emailByUserId = emailsResult.data;
    const gradeByStudentId = new Map(
      (gradeResult.data ?? []).map((row) => [row.student_id, row])
    );

    const students: ManagerClassStudentRow[] = [];
    const studentGrades: ManagerStudentFinalExamGradeRow[] = [];

    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile) {
        continue;
      }
      const enrollment = insertedByUserId.get(profile.user_id);
      if (!enrollment) {
        continue;
      }

      const student: ManagerClassStudentRow = {
        id: enrollment.id,
        student_profile_id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        username: usernameByUserId.get(profile.user_id) ?? null,
        email: emailByUserId.get(profile.user_id) ?? "",
        phone: profile.phone,
        joined_at: enrollment.joined_at ?? new Date().toISOString(),
      };
      students.push(student);

      const gradeRecord = gradeByStudentId.get(profile.user_id);
      if (gradeRecord) {
        studentGrades.push(
          mapStudentFinalExamGradeRecord(gradeRecord, student.full_name)
        );
      }
    }

    const classRow = mapClassDetailRecordToRow(classRecord, {
      enrollment_count: (enrollmentResult.count ?? 0) + insertedUserIds.length,
      teacher_count: teacherResult.count ?? 0,
      completed_sessions: sessionResult.data?.length ?? 0,
    });

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        table_name: "student_class",
        record_id: input.class_id,
        metadata: {
          note: "Students enrolled in class (batch).",
          class_id: input.class_id,
          count: students.length,
          enrollments: students.map((student) => ({
            student_class_id: student.id,
            user_id: student.user_id,
            student_profile_id: student.student_profile_id,
          })),
        },
      })
    );

    let warning: string | undefined;
    let joinItems: StudentJoinSyncItem[] = [];

    if (classRecord.semester_id) {
      try {
        const { reactivateSemesterAfterRejoin } = await import(
          "@/services/classes/drop-semester.service"
        );
        await Promise.all(
          insertedUserIds.map((userId) =>
            reactivateSemesterAfterRejoin(
              adminClient,
              userId,
              classRecord.semester_id!
            )
          )
        );
      } catch {
        // Non-fatal: memberships already created.
      }
    }

    try {
      joinItems = await timer.step("paymentSync", () =>
        onStudentsJoinedClass(
          adminClient,
          { classId: input.class_id, studentIds: insertedUserIds },
          actor
        )
      );
      const failedJoins = joinItems.filter((item) => !item.ok);
      if (failedJoins.length > 0) {
        await Promise.all(
          failedJoins.map((item) =>
            recordPaymentSyncFailure(adminClient, actor, {
              studentId: item.studentId,
              classId: input.class_id,
              operation: "enroll_join_sync",
              error: new Error(item.error ?? "Payment sync failed."),
            })
          )
        );
        warning = PAYMENT_SYNC_FAILURE_WARNING;
      }
    } catch (syncError) {
      await Promise.all(
        insertedUserIds.map((studentId) =>
          recordPaymentSyncFailure(adminClient, actor, {
            studentId,
            classId: input.class_id,
            operation: "enroll_join_sync",
            error: syncError,
          })
        )
      );
      warning = PAYMENT_SYNC_FAILURE_WARNING;
    }

    let autoAssignedPhase: { id: string; name: string } | undefined;
    let optionalPaymentPhases: Array<{ id: string; name: string }> | undefined;

    if (
      !warning &&
      students.length === 1 &&
      joinItems.length > 0
    ) {
      const student = students[0];
      const joinItem = joinItems.find(
        (item) => item.ok && item.studentId === student.user_id && item.phase
      );
      const phase = joinItem?.phase;
      if (phase && actorUserId) {
        const canAssignOptional = await hasPermission(
          adminClient,
          actorUserId,
          PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
        );
        if (canAssignOptional) {
          const { data: openedPhases, error: openedError } =
            await paymentPhaseRepository.listOpenedPaymentPhasesBySemesterId(
              adminClient,
              phase.semester_id
            );
          if (!openedError) {
            const others = (openedPhases ?? [])
              .filter((row) => row.id !== phase.id)
              .map((row) => ({ id: row.id, name: row.name }));
            if (others.length > 0) {
              autoAssignedPhase = { id: phase.id, name: phase.name };
              optionalPaymentPhases = others;
            }
          }
        }
      }
    }

    const message =
      failures.length === 0
        ? students.length === 1
          ? `${students[0].full_name} added to class.`
          : `${students.length} students added to class.`
        : `Added ${students.length} of ${uniqueIds.length} students. ${failures.length} could not be added.`;

    return {
      success: true,
      students,
      studentGrades,
      classRow,
      message,
      warning,
      autoAssignedPhase,
      optionalPaymentPhases,
    };
}

export async function addStudentsToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileIds: string[];
  }
): Promise<AddStudentsToClassResult> {
  const timer = createNavStepTimer("addStudentsToClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_ADD_STUDENT
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

    const parsed = addStudentsToClassSchema.safeParse({
      studentProfileIds: input.studentProfileIds,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    return await enrollStudentsInClassCore(
      adminClient,
      actorUserId,
      actor,
      {
        class_id: input.class_id,
        studentProfileIds: parsed.data.studentProfileIds,
      },
      timer
    );
  } finally {
    timer.end();
  }
}

async function resolveActiveStudentDiff(
  adminClient: Supabase,
  targetClassId: string,
  sourceClassId: string
): Promise<
  | { success: true; students: ManagerStudentRow[] }
  | { success: false; error: string }
> {
  if (targetClassId === sourceClassId) {
    return {
      success: false,
      error: "Choose a different class to copy from.",
    };
  }

  const [targetResult, sourceResult] = await Promise.all([
    classRepository.findClassById(adminClient, targetClassId),
    classRepository.findClassById(adminClient, sourceClassId),
  ]);

  if (targetResult.error) {
    return { success: false, error: targetResult.error.message };
  }
  if (sourceResult.error) {
    return { success: false, error: sourceResult.error.message };
  }
  if (!targetResult.data) {
    return { success: false, error: "Class not found." };
  }
  if (!sourceResult.data) {
    return { success: false, error: "Source class not found." };
  }

  const targetSemesterId = targetResult.data.semester_id;
  const sourceSemesterId = sourceResult.data.semester_id;

  if (!targetSemesterId) {
    return {
      success: false,
      error: "This class is not linked to a semester.",
    };
  }

  if (!sourceSemesterId || sourceSemesterId !== targetSemesterId) {
    return {
      success: false,
      error: "Source class must belong to the same semester.",
    };
  }

  const [sourceMembersResult, targetMembersResult] = await Promise.all([
    studentClassRepository.listStudentUserIdsByClassId(
      adminClient,
      sourceClassId
    ),
    studentClassRepository.listStudentUserIdsByClassId(
      adminClient,
      targetClassId
    ),
  ]);

  if (sourceMembersResult.error) {
    return { success: false, error: sourceMembersResult.error.message };
  }
  if (targetMembersResult.error) {
    return { success: false, error: targetMembersResult.error.message };
  }

  const targetUserIds = new Set(
    (targetMembersResult.data ?? []).map((row) => row.user_id)
  );
  const sourceUserIds = [
    ...new Set(
      (sourceMembersResult.data ?? [])
        .map((row) => row.user_id)
        .filter((userId) => !targetUserIds.has(userId))
    ),
  ];

  if (sourceUserIds.length === 0) {
    return { success: true, students: [] };
  }

  const [profilesResult, usernamesResult, emailsResult] = await Promise.all([
    studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      sourceUserIds
    ),
    profileRepository.listProfilesByIds(adminClient, sourceUserIds),
    authRepository.listAuthEmailsByIds(adminClient, sourceUserIds),
  ]);

  if (profilesResult.error) {
    return { success: false, error: profilesResult.error.message };
  }
  if (usernamesResult.error) {
    return { success: false, error: usernamesResult.error.message };
  }
  if (emailsResult.error) {
    return { success: false, error: emailsResult.error.message };
  }

  const usernameById = new Map(
    (usernamesResult.data ?? []).map((row) => [row.id, row.username])
  );
  const emailById = emailsResult.data;

  const students: ManagerStudentRow[] = (profilesResult.data ?? [])
    .filter((row) => row.status !== STUDENT_STATUSES.INACTIVE)
    .map((row) => ({
      user_id: row.user_id,
      student_profile_id: row.id,
      username: usernameById.get(row.user_id) ?? null,
      email: emailById.get(row.user_id) ?? "",
      full_name: row.full_name,
      birth_date: row.birth_date,
      phone: row.phone,
      status: row.status as StudentStatusValue,
      created_at: row.created_at ?? "",
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return { success: true, students };
}

export async function copyStudentsFromClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    source_class_id: string;
    studentProfileIds: string[];
  }
): Promise<AddStudentsToClassResult> {
  const timer = createNavStepTimer("copyStudentsFromClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const scope = await assertAssignedTeacherForClassIds(adminClient, actor, [
      input.class_id,
      input.source_class_id,
    ]);
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }

    const parsed = copyStudentsFromClassSchema.safeParse({
      source_class_id: input.source_class_id,
      studentProfileIds: input.studentProfileIds,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const diffResult = await timer.step("diff", () =>
      resolveActiveStudentDiff(
        adminClient,
        input.class_id,
        parsed.data.source_class_id
      )
    );

    if (!diffResult.success) {
      return { success: false, error: diffResult.error };
    }

    const eligibleIds = new Set(
      diffResult.students.map((student) => student.student_profile_id)
    );
    const selectedIds = [
      ...new Set(
        parsed.data.studentProfileIds.filter((id) => eligibleIds.has(id))
      ),
    ];

    if (selectedIds.length === 0) {
      return {
        success: false,
        error: "Please select at least one student to copy.",
        fieldErrors: {
          studentProfileIds: ["Please select at least one student to copy."],
        },
      };
    }

    return await enrollStudentsInClassCore(
      adminClient,
      actorUserId,
      actor,
      {
        class_id: input.class_id,
        studentProfileIds: selectedIds,
      },
      timer
    );
  } finally {
    timer.end();
  }
}

export { resolveActiveStudentDiff };

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
          note: "Student removed from class (binary membership).",
          class_id: parsed.data.class_id,
          student_id: deleted.user_id,
        },
      })
    );

    let warning: string | undefined;

    try {
      await timer.step("paymentSync", () =>
        onStudentLeftClass(
          adminClient,
          { studentId: deleted.user_id, classId: parsed.data.class_id },
          actor
        )
      );
    } catch (syncError) {
      await recordPaymentSyncFailure(adminClient, actor, {
        studentId: deleted.user_id,
        classId: parsed.data.class_id,
        operation: "enrollment_leave_sync",
        error: syncError,
      });
      warning = PAYMENT_SYNC_FAILURE_WARNING;
    }

    return {
      success: true,
      removedStudentId: deleted.id,
      message: "Student removed from class.",
      warning,
    };
  } finally {
    timer.end();
  }
}

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

    let warning: string | undefined;

    try {
      await timer.step("leaveSync", () =>
        onStudentLeftClass(
          adminClient,
          { studentId: userId, classId: from_class_id },
          actor
        )
      );
    } catch (syncError) {
      await recordPaymentSyncFailure(adminClient, actor, {
        studentId: userId,
        classId: from_class_id,
        operation: "transfer_leave_sync",
        error: syncError,
      });
      warning = PAYMENT_SYNC_FAILURE_WARNING;
    }

    let profileResult: Awaited<
      ReturnType<typeof profileRepository.findProfileById>
    >;
    let authResult: Awaited<
      ReturnType<typeof authRepository.getAuthUserById>
    >;
    let gradeResult: Awaited<
      ReturnType<typeof finalExamRepository.ensureEnrollmentFinalExamGrade>
    >;

    try {
      [profileResult, authResult, gradeResult] = await timer.step(
        "destHydrate",
        () =>
          Promise.all([
            profileRepository.findProfileById(adminClient, userId),
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
          ]).then(([profile, auth, grade]) => [profile, auth, grade] as const)
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student transferred, but destination attendance or task rows could not be created.",
      };
    }

    if (profileResult.error || !profileResult.data) {
      return {
        success: false,
        error: profileResult.error?.message ?? "Unable to load student profile.",
      };
    }

    if (gradeResult.error) {
      return {
        success: false,
        error:
          gradeResult.error.message ??
          "Student transferred, but final exam grade row could not be created.",
      };
    }

    const student: ManagerClassStudentRow = {
      id: destEnrollment.id,
      student_profile_id: studentProfile.id,
      user_id: userId,
      full_name: studentProfile.full_name,
      username: profileResult.data.username,
      email: authResult.data.user?.email ?? "",
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
