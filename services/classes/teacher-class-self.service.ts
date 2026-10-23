import { PERMISSIONS } from "@/lib/constants/permissions";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import type { SubjectRecord } from "@/repositories/subject.repository";
import {
  UNAUTHORIZED_MESSAGE,
  assertPermission,
  assertTeacherSelfAccess,
} from "@/services/auth/authorization.service";
import {
  isUuid,
  mapClassDetailRecordsToRows,
  mapClassDetailToRow,
  mapSessionRecord,
  type Supabase,
} from "@/services/classes/class-shared";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  TeacherClassDetail,
  TeacherSubjectRow,
} from "@/types/teacher-class";

/** True when the teacher has a `class_teacher` row for the class. */
export async function findTeacherClassAssignment(
  adminClient: Supabase,
  teacherId: string,
  classId: string
): Promise<boolean> {
  const { data, error } =
    await classTeacherRepository.findClassTeacherByTeacherAndClass(
      adminClient,
      teacherId,
      classId
    );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

/**
 * Ensures the actor is a teacher panel user and assigned to the class.
 * Throws `Unauthorized.` when missing, not a teacher, or not assigned.
 */
export async function assertTeacherAssignedToClass(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<string> {
  const teacherId = await assertTeacherSelfAccess(adminClient, actorUserId);

  if (!isUuid(classId)) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  const assigned = await findTeacherClassAssignment(
    adminClient,
    teacherId,
    classId
  );
  if (!assigned) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  return teacherId;
}

/** Classes the teacher is assigned to via `class_teacher`. */
export async function listMyClassesForTeacher(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  const teacherId = await assertTeacherSelfAccess(adminClient, actorUserId);

  const assignmentsResult =
    await classTeacherRepository.listClassTeachersByTeacherId(
      adminClient,
      teacherId
    );

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const classIds = [
    ...new Set((assignmentsResult.data ?? []).map((row) => row.class_id)),
  ];
  if (classIds.length === 0) {
    return [];
  }

  const classesResult = await classRepository.listClassDetailsByIds(
    adminClient,
    classIds
  );

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  return mapClassDetailRecordsToRows(
    adminClient,
    (classesResult.data ?? []) as ClassDetailRecord[]
  );
}

async function listStudentsForAssignedClass(
  adminClient: Supabase,
  classId: string
): Promise<ManagerClassStudentRow[]> {
  const { data: enrollments, error } =
    await studentClassRepository.listStudentClassesByClassId(
      adminClient,
      classId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!enrollments?.length) {
    return [];
  }

  const userIds = enrollments.map((row) => row.user_id);

  const [profilesResult, studentProfilesResult, emailResult] =
    await Promise.all([
      profileRepository.listProfilesByIds(adminClient, userIds),
      studentProfileRepository.listStudentProfileDetailsByUserIds(
        adminClient,
        userIds
      ),
      authRepository.listAuthEmailsByIds(adminClient, userIds),
    ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }
  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }
  if (emailResult.error) {
    throw new Error(emailResult.error.message);
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row])
  );
  const studentProfileByUserId = new Map(
    (studentProfilesResult.data ?? []).map((row) => [row.user_id, row])
  );
  const emailById = emailResult.data;
  const rows: ManagerClassStudentRow[] = [];

  for (const enrollment of enrollments) {
    const studentProfile = studentProfileByUserId.get(enrollment.user_id);
    const profile = profileById.get(enrollment.user_id);

    if (!studentProfile || !profile) {
      continue;
    }

    rows.push({
      id: enrollment.id,
      student_profile_id: studentProfile.id,
      user_id: enrollment.user_id,
      full_name: studentProfile.full_name,
      username: profile.username,
      email: emailById.get(enrollment.user_id) ?? "",
      phone: studentProfile.phone,
      joined_at: enrollment.joined_at ?? "",
    });
  }

  rows.sort((left, right) =>
    left.full_name.localeCompare(right.full_name, undefined, {
      sensitivity: "base",
    })
  );

  return rows;
}

/** Roster for a class the teacher is assigned to. */
export async function listMyClassStudentsForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassStudentRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  await assertTeacherAssignedToClass(adminClient, actorUserId, classId);
  return listStudentsForAssignedClass(adminClient, classId);
}

/** Sessions for a class the teacher is assigned to (view only). */
export async function listMyClassSessionsForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassSessionRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);
  await assertTeacherAssignedToClass(adminClient, actorUserId, classId);

  const { data, error } = await sessionRepository.listSessionsByClassId(
    adminClient,
    classId
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SessionRecord[])
    .map(mapSessionRecord)
    .sort((left, right) => left.nb_order - right.nb_order);
}

/**
 * Read-only class detail (summary + sessions + students) for an assigned class.
 * Throws when not assigned; returns null when the class row is missing.
 */
export async function getMyClassDetailForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<TeacherClassDetail | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);
  await assertTeacherAssignedToClass(adminClient, actorUserId, classId);

  const classResult = await classRepository.findClassDetailById(
    adminClient,
    classId
  );

  if (classResult.error) {
    throw new Error(classResult.error.message);
  }

  if (!classResult.data) {
    return null;
  }

  const [classRow, sessionsResult, students] = await Promise.all([
    mapClassDetailToRow(adminClient, classResult.data as ClassDetailRecord),
    sessionRepository.listSessionsByClassId(adminClient, classId),
    listStudentsForAssignedClass(adminClient, classId),
  ]);

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  const sessions = ((sessionsResult.data ?? []) as SessionRecord[])
    .map(mapSessionRecord)
    .sort((left, right) => left.nb_order - right.nb_order);

  return { classRow, sessions, students };
}

/** Distinct subjects from classes the teacher is assigned to. */
export async function listMySubjectsForTeacher(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<TeacherSubjectRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SUBJECTS_VIEW);
  const teacherId = await assertTeacherSelfAccess(adminClient, actorUserId);

  const assignmentsResult =
    await classTeacherRepository.listClassTeachersByTeacherId(
      adminClient,
      teacherId
    );

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const classIds = [
    ...new Set((assignmentsResult.data ?? []).map((row) => row.class_id)),
  ];
  if (classIds.length === 0) {
    return [];
  }

  const classesResult = await classRepository.listClassDetailsByIds(
    adminClient,
    classIds
  );

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const classIdsBySubjectId = new Map<string, string[]>();
  for (const classRow of (classesResult.data ?? []) as ClassDetailRecord[]) {
    const subjectId = classRow.subject_id;
    if (!subjectId) {
      continue;
    }
    const existing = classIdsBySubjectId.get(subjectId) ?? [];
    existing.push(classRow.id);
    classIdsBySubjectId.set(subjectId, existing);
  }

  const subjectIds = [...classIdsBySubjectId.keys()];
  if (subjectIds.length === 0) {
    return [];
  }

  const subjectsResult = await subjectRepository.listSubjectsByIds(
    adminClient,
    subjectIds
  );

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }

  return ((subjectsResult.data ?? []) as SubjectRecord[]).map((subject) => {
    const taughtClassIds = classIdsBySubjectId.get(subject.id) ?? [];
    return {
      id: subject.id,
      name: subject.name,
      syllabus_link: subject.syllabus_link,
      reference_link: subject.reference_link,
      handout_link: subject.handout_link,
      nb_sessions: subject.nb_sessions,
      taught_class_ids: taughtClassIds,
      taught_class_count: taughtClassIds.length,
    };
  });
}
