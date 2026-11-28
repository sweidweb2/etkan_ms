import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
} from "@/services/auth/authorization.service";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import {
  CLASS_GRADES_LOCKED_ERROR,
  isClassGradesUnlocked,
} from "@/lib/manager/class-grades-access";
import {
  CLASS_STATUS_VALUES,
} from "@/lib/constants/manager-class-status";
import type {
  ManagerClassesListData,
  ManagerClassesListQuery,
  ManagerClassRow,
  ManagerClassStatusCounts,
} from "@/types/manager-class-list";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherSelectOption,
} from "@/types/manager-class-detail";
import {
  isInvalidUuidError,
  isUuid,
  mapClassDetailRecordsToRows,
  mapClassDetailToRow,
  mapClassDetailToRowWithCounts,
  type Supabase,
} from "@/services/classes/class-shared";

export async function listClassesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const { data, error } = await classRepository.listClassDetails(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return mapClassDetailRecordsToRows(
    adminClient,
    (data ?? []) as ClassDetailRecord[]
  );
}

const CLASSES_LIST_PAGE_SIZE = 6;
const CLASSES_LIST_MAX_PAGE_SIZE = 48;

/**
 * One page of classes for the manager list. Enrollment/teacher/session counts
 * are computed only for the rows on this page.
 */
export async function listClassesPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: ManagerClassesListQuery = {}
): Promise<ManagerClassesListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const pageSize = Math.min(
    CLASSES_LIST_MAX_PAGE_SIZE,
    Math.max(1, query.pageSize ?? CLASSES_LIST_PAGE_SIZE)
  );
  const page = Math.max(1, query.page ?? 1);
  const status = query.status ?? null;
  const semesterId = query.semesterId ?? null;
  const unlinkedSemester = !semesterId && (query.unlinkedSemester ?? false);
  const search = query.search?.trim() ?? "";

  const [pageResult, countsResult] = await Promise.all([
    classRepository.listClassDetailsPage(adminClient, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
      status: status ?? undefined,
      semesterId: semesterId ?? undefined,
      unlinkedSemester,
      search,
    }),
    classRepository.countClassesByStatuses(adminClient, CLASS_STATUS_VALUES),
  ]);

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }
  if (countsResult.error) {
    throw new Error(countsResult.error.message);
  }

  const records = (pageResult.data ?? []) as unknown as ClassDetailRecord[];
  const classes = await mapClassDetailRecordsToRows(adminClient, records);

  const statusCounts = Object.fromEntries(
    CLASS_STATUS_VALUES.map((value) => [
      value,
      countsResult.data?.[value] ?? 0,
    ])
  ) as ManagerClassStatusCounts;

  return {
    classes,
    totalCount: pageResult.count ?? classes.length,
    page,
    pageSize,
    status,
    semesterId,
    unlinkedSemester,
    search,
    statusCounts,
  };
}

/** Semester filter options for the manage-classes panel (no class scan). */
export async function listClassSemesterFilterOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassSemesterOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const { data, error } = await semesterRepository.listSemesters(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((semester) => ({
    id: semester.id,
    name: semester.name,
  }));
}

export type ManagerClassCreateDialogData = {
  subjects: ManagerClassSubjectOption[];
  semesters: ManagerClassSemesterOption[];
  teachers: ManagerClassTeacherSelectOption[];
};

export async function getClassCreateDialogDataForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassCreateDialogData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_CREATE);

  const [subjectsResult, semestersResult, teachersResult] = await Promise.all([
    subjectRepository.listSubjects(adminClient),
    semesterRepository.listSemesters(adminClient),
    profileRepository.listTeacherProfileOptions(adminClient),
  ]);

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }

  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  return {
    subjects: (subjectsResult.data ?? []).map((subject) => ({
      id: subject.id,
      name: subject.name,
      nb_sessions: subject.nb_sessions,
    })),
    semesters: (semestersResult.data ?? []).map((semester) => ({
      id: semester.id,
      name: semester.name,
    })),
    teachers: (teachersResult.data ?? []).map((teacher) => ({
      id: teacher.id,
      full_name: teacher.full_name,
    })),
  };
}

export async function getClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  options?: { includeCounts?: boolean }
): Promise<ManagerClassRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  if (!isUuid(classId)) {
    return null;
  }

  const { data, error } = await classRepository.findClassDetailById(
    adminClient,
    classId
  );

  if (error) {
    if (isInvalidUuidError(error.message)) {
      return null;
    }

    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  // Callers that already load roster/teachers/sessions can derive counts.
  if (options?.includeCounts === false) {
    return mapClassDetailToRowWithCounts(data as ClassDetailRecord, {
      enrollment_count: 0,
      teacher_count: 0,
      completed_sessions: 0,
    });
  }

  return mapClassDetailToRow(adminClient, data as ClassDetailRecord);
}

export async function assertClassGradesUnlockedForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  options?: { classRow?: ManagerClassRow }
): Promise<
  | { ok: true; classRow: ManagerClassRow }
  | { ok: false; error: string }
> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  if (!isUuid(classId)) {
    return { ok: false, error: "Class not found." };
  }

  // Skip the second class detail fetch when the page already loaded the row.
  if (options?.classRow && options.classRow.id === classId) {
    if (!isClassGradesUnlocked(options.classRow.status)) {
      return { ok: false, error: CLASS_GRADES_LOCKED_ERROR };
    }
    return { ok: true, classRow: options.classRow };
  }

  const classResult = await classRepository.findClassDetailById(
    adminClient,
    classId
  );

  if (classResult.error) {
    if (isInvalidUuidError(classResult.error.message)) {
      return { ok: false, error: "Class not found." };
    }

    throw new Error(classResult.error.message);
  }

  if (!classResult.data) {
    return { ok: false, error: "Class not found." };
  }

  // Counts are unused for the lock check; skip the three count round-trips.
  const classRow = mapClassDetailToRowWithCounts(
    classResult.data as ClassDetailRecord,
    {
      enrollment_count: 0,
      teacher_count: 0,
      completed_sessions: 0,
    }
  );

  if (!isClassGradesUnlocked(classRow.status)) {
    return { ok: false, error: CLASS_GRADES_LOCKED_ERROR };
  }

  return { ok: true, classRow };
}
