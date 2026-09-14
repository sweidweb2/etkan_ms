import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import {
  assertClassGradesUnlockedForManager,
  fetchClassStudentRowForManager,
  listClassStudentsForManager,
} from "@/services/classes/class.service";
import {
  buildFinalExamStudentGradesFromContext,
  buildStudentClassTabDetail,
  listStudentClassAcademicBundlesUnchecked,
  loadClassGradeContext,
  mapFinalExamForStudentBundle,
  mapPendingGradeRow,
  mapStoredGradeRow,
  mapStudentFinalExamGradeForBundle,
  type Supabase,
} from "@/services/classes/student-course-grade-shared";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  ManagerStudentClassAcademicBundle,
  ManagerStudentClassTabDetail,
} from "@/types/manager-student-class-detail";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";

export type ComputedStudentGradeSheetBundle = {
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
};

export async function getStudentClassGradeDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  studentProfileId: string
): Promise<{
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
} | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const student = students.find(
    (row) => row.student_profile_id === studentProfileId
  );

  if (!student) {
    return null;
  }

  const attendeeStatusBySessionId =
    context.attendeeStatusMapsByUserId.get(student.user_id) ??
    new Map<string, string>();

  const stored = context.storedGradesByUserId.get(student.user_id);
  const gradeRow = stored
    ? mapStoredGradeRow(student, stored)
    : mapPendingGradeRow(student, context);

  return {
    student,
    gradeRow,
    detail: buildStudentClassTabDetail(
      context,
      student.user_id,
      attendeeStatusBySessionId
    ),
    classTasks: context.classTasks,
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
  };
}

export async function getStudentClassAcademicDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  userId: string
): Promise<{
  detail: ManagerStudentClassTabDetail;
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
}> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  const enrollmentResult = await studentClassRepository.findStudentClassByUserAndClass(
    adminClient,
    userId,
    classId
  );

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  if (!enrollmentResult.data) {
    throw new Error("Student is not a member of this class.");
  }

  const [context, profilesResult] = await Promise.all([
    loadClassGradeContext(adminClient, classId),
    studentProfileRepository.listStudentProfilesByUserIds(adminClient, [userId]),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const attendeeStatusBySessionId =
    context.attendeeStatusMapsByUserId.get(userId) ??
    new Map<string, string>();
  const fullName =
    (profilesResult.data ?? []).find((row) => row.user_id === userId)
      ?.full_name ?? "Unknown student";
  const examGradeRecord =
    context.finalExamGradesByUserId.get(userId) ?? null;

  return {
    detail: buildStudentClassTabDetail(
      context,
      userId,
      attendeeStatusBySessionId
    ),
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
    studentFinalExamGrade: examGradeRecord
      ? mapStudentFinalExamGradeForBundle(examGradeRecord, fullName)
      : null,
  };
}

export async function listStudentClassAcademicBundlesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  studentUserId: string,
  joinedClasses: ManagerStudentClassRow[]
): Promise<ManagerStudentClassAcademicBundle[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_VIEW);
  return listStudentClassAcademicBundlesUnchecked(
    adminClient,
    studentUserId,
    joinedClasses
  );
}

/** Student panel: own academic bundles (read-only), keyed by session user. */
export async function listStudentClassAcademicBundlesForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  joinedClasses: ManagerStudentClassRow[]
): Promise<ManagerStudentClassAcademicBundle[]> {
  const userId = await assertStudentSelfAccess(adminClient, actorUserId);
  return listStudentClassAcademicBundlesUnchecked(
    adminClient,
    userId,
    joinedClasses
  );
}

export async function listComputedStudentGradeSheetBundlesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  classRow: ManagerClassRow;
  bundles: ComputedStudentGradeSheetBundle[];
}> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.GRADES_EXPORT_CERTIFICATES
  );

  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const mappedFinalExam = context.finalExam
    ? mapFinalExamForStudentBundle(context.finalExam)
    : null;

  const bundles = students.flatMap((student) => {
    const stored = context.storedGradesByUserId.get(student.user_id);

    if (!stored) {
      return [];
    }

    const attendeeStatusBySessionId =
      context.attendeeStatusMapsByUserId.get(student.user_id) ??
      new Map<string, string>();

    return [
      {
        student,
        gradeRow: mapStoredGradeRow(student, stored),
        detail: buildStudentClassTabDetail(
          context,
          student.user_id,
          attendeeStatusBySessionId
        ),
        classTasks: context.classTasks,
        finalExam: mappedFinalExam,
      },
    ];
  });

  bundles.sort((left, right) =>
    left.student.full_name.localeCompare(right.student.full_name)
  );

  return {
    classRow: guard.classRow,
    bundles,
  };
}

export async function listClassStudentGradesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  rows: ManagerClassStudentGradeRow[];
  tasks: ManagerClassTaskForGradesRow[];
}> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const rows = students.map((student) => {
    const stored = context.storedGradesByUserId.get(student.user_id);
    if (stored) {
      return mapStoredGradeRow(student, stored);
    }

    return mapPendingGradeRow(student, context);
  });

  return {
    rows,
    tasks: context.classTasks,
  };
}

export async function loadClassGradesPageData(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  classRow: ManagerClassRow;
  rows: ManagerClassStudentGradeRow[];
  tasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
  finalExamStudentGrades: ManagerStudentFinalExamGradeRow[];
}> {
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const rows = students.map((student) => {
    const stored = context.storedGradesByUserId.get(student.user_id);
    if (stored) {
      return mapStoredGradeRow(student, stored);
    }

    return mapPendingGradeRow(student, context);
  });

  return {
    classRow: guard.classRow,
    rows,
    tasks: context.classTasks,
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
    finalExamStudentGrades: buildFinalExamStudentGradesFromContext(
      context,
      students
    ),
  };
}

export async function loadClassStudentGradeDetailPageData(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  studentProfileId: string
): Promise<{
  classRow: ManagerClassRow;
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
} | null> {
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const profileResult = await studentProfileRepository.findStudentProfileById(
    adminClient,
    studentProfileId
  );

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (!profileResult.data) {
    return null;
  }

  const [student, context] = await Promise.all([
    fetchClassStudentRowForManager(
      adminClient,
      classId,
      profileResult.data.user_id
    ),
    loadClassGradeContext(adminClient, classId),
  ]);

  if (!student) {
    return null;
  }

  const attendeeStatusBySessionId =
    context.attendeeStatusMapsByUserId.get(student.user_id) ??
    new Map<string, string>();

  const stored = context.storedGradesByUserId.get(student.user_id);
  const gradeRow = stored
    ? mapStoredGradeRow(student, stored)
    : mapPendingGradeRow(student, context);

  return {
    classRow: guard.classRow,
    student,
    gradeRow,
    detail: buildStudentClassTabDetail(
      context,
      student.user_id,
      attendeeStatusBySessionId
    ),
    classTasks: context.classTasks,
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
  };
}
