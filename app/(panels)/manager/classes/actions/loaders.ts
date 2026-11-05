"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getClassCreateDialogDataForManager,
  listActiveStudentDiffFromClass,
  listAvailableStudentsForClass,
  listClassesPageForManager,
  listClassTeacherOptionsForManager,
  listClassTransferOptionsForManager,
  listSameSemesterClassesForCopy,
} from "@/services/classes/class.service";
import { listSemestersForManager } from "@/services/classes/semester.service";
import { listSubjectsForManager } from "@/services/classes/subject.service";
import {
  listStudentsWithoutInProgressClassForManager,
} from "@/services/students/student.service";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherSelectOption,
  ManagerClassTeacherOption,
} from "@/types/manager-class-detail";
import type {
  ManagerClassesListData,
  ManagerClassesListQuery,
} from "@/types/manager-class-list";
import type {
  ManagerStudentRow,
  ManagerStudentWithoutActiveClassRow,
} from "@/types/manager-student";

export async function loadClassesPageAction(
  query: ManagerClassesListQuery
): Promise<ManagerClassesListData | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listClassesPageForManager(adminClient, actor.userId, query);
  } catch {
    return null;
  }
}

export async function loadAvailableStudentsForClassAction(
  classId: string
): Promise<ManagerStudentRow[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listAvailableStudentsForClass(
      adminClient,
      actor.userId,
      classId
    );
  } catch {
    return [];
  }
}

export async function loadSameSemesterClassesForCopyAction(
  targetClassId: string
): Promise<Array<{ id: string; name: string; status: string }>> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listSameSemesterClassesForCopy(
      adminClient,
      actor.userId,
      targetClassId
    );
  } catch {
    return [];
  }
}

export async function loadActiveStudentDiffFromClassAction(
  targetClassId: string,
  sourceClassId: string
): Promise<ManagerStudentRow[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listActiveStudentDiffFromClass(
      adminClient,
      actor.userId,
      targetClassId,
      sourceClassId
    );
  } catch {
    return [];
  }
}

export async function loadTransferClassOptionsAction(
  excludeClassId: string
): Promise<Array<{ id: string; name: string }>> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listClassTransferOptionsForManager(
      adminClient,
      actor.userId,
      excludeClassId
    );
  } catch {
    return [];
  }
}

export async function loadClassTeacherOptionsAction(
  classId: string
): Promise<ManagerClassTeacherOption[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listClassTeacherOptionsForManager(
      adminClient,
      actor.userId,
      classId
    );
  } catch {
    return [];
  }
}

export async function loadClassEditOptionsAction(): Promise<{
  subjects: Array<{ id: string; name: string; nb_sessions: number }>;
  semesters: Array<{ id: string; name: string }>;
}> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return { subjects: [], semesters: [] };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    const [subjects, semesters] = await Promise.all([
      listSubjectsForManager(adminClient, actor.userId),
      listSemestersForManager(adminClient, actor.userId),
    ]);
    return {
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        nb_sessions: subject.nb_sessions,
      })),
      semesters: semesters.map((semester) => ({
        id: semester.id,
        name: semester.name,
      })),
    };
  } catch {
    return { subjects: [], semesters: [] };
  }
}

export async function loadClassCreateDialogDataAction(): Promise<{
  subjects: ManagerClassSubjectOption[];
  semesters: ManagerClassSemesterOption[];
  teachers: ManagerClassTeacherSelectOption[];
}> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return { subjects: [], semesters: [], teachers: [] };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await getClassCreateDialogDataForManager(adminClient, actor.userId);
  } catch {
    return { subjects: [], semesters: [], teachers: [] };
  }
}

export async function loadStudentsWithoutActiveClassAction(): Promise<
  ManagerStudentWithoutActiveClassRow[]
> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listStudentsWithoutInProgressClassForManager(
      adminClient,
      actor.userId,
      PERMISSIONS.CLASSES_VIEW
    );
  } catch {
    return [];
  }
}
