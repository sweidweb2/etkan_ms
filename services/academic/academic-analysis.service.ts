import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as authRepository from "@/repositories/auth.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import type { ManagerAcademicAnalysisData } from "@/types/manager-academic-analysis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

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

function mapClassStatus(status: string | null): ClassStatusValue {
  if (
    status === CLASS_STATUSES.SCHEDULED ||
    status === CLASS_STATUSES.IN_PROGRESS ||
    status === CLASS_STATUSES.DONE ||
    status === CLASS_STATUSES.PAUSED ||
    status === CLASS_STATUSES.STOPPED
  ) {
    return status;
  }
  return CLASS_STATUSES.SCHEDULED;
}

function buildSessionCountMap(
  rows: Array<{ class_id: string }> | null | undefined
) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  }
  return counts;
}

export async function getAcademicAnalysisForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerAcademicAnalysisData> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.ACADEMIC_ANALYSIS_VIEW
  );

  const [classesResult, studentsResult] = await Promise.all([
    classRepository.listClassDetails(adminClient),
    studentProfileRepository.listStudentProfiles(adminClient),
  ]);

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }
  if (studentsResult.error) {
    throw new Error(studentsResult.error.message);
  }

  const classRecords = (classesResult.data ?? []) as ClassDetailRecord[];
  const studentProfiles = studentsResult.data ?? [];

  const classIds = classRecords.map((record) => record.id);
  const userIds = studentProfiles.map((row) => row.user_id);

  const [sessionResult, profilesResult, emailsResult] = await Promise.all([
    sessionRepository.listSessionCountsByClassIds(adminClient, classIds),
    profileRepository.listProfilesByIds(adminClient, userIds),
    authRepository.listAuthEmailsByIds(adminClient, userIds),
  ]);

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }
  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }
  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }

  const sessionCounts = buildSessionCountMap(sessionResult.data);
  const profileById = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row])
  );
  const emailById = emailsResult.data;

  const classSessionSeries = classRecords
    .map((record) => ({
      classId: record.id,
      className: record.name,
      status: mapClassStatus(record.status),
      actualSessions: sessionCounts.get(record.id) ?? 0,
      plannedSessions: record.subjects?.nb_sessions ?? 0,
    }))
    .sort((a, b) => a.className.localeCompare(b.className));

  let active = 0;
  let inactive = 0;
  const students: ManagerAcademicAnalysisData["students"] = [];

  for (const studentProfile of studentProfiles) {
    const profile = profileById.get(studentProfile.user_id);
    if (!profile) {
      continue;
    }

    const status = mapStudentStatus(studentProfile.status);
    if (status === STUDENT_STATUSES.ACTIVE) {
      active += 1;
    } else if (status === STUDENT_STATUSES.INACTIVE) {
      inactive += 1;
    }

    students.push({
      id: studentProfile.id,
      full_name: studentProfile.full_name,
      username: profile.username,
      email: emailById.get(studentProfile.user_id) ?? "",
      status,
    });
  }

  students.sort((a, b) => a.full_name.localeCompare(b.full_name));

  return {
    classCount: classRecords.length,
    studentCounts: {
      active,
      inactive,
      total: students.length,
    },
    students,
    classSessionSeries,
  };
}
