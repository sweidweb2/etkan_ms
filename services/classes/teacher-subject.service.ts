import { PERMISSIONS } from "@/lib/constants/permissions";
import { updateSubjectLinksSchema } from "@/lib/validators/teacher/update-subject-links";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import {
  UNAUTHORIZED_MESSAGE,
  assertTeacherSelfAccess,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { isUuid, type Supabase } from "@/services/classes/class-shared";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { TeacherSubjectRow } from "@/types/teacher-class";

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type UpdateSubjectLinksForTeacherResult =
  | {
      success: true;
      subject: TeacherSubjectRow;
      message: string;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: FieldErrors;
    };

/**
 * Ensures the teacher is assigned to at least one class of this subject.
 * Returns taught class ids for the subject.
 */
export async function assertTeacherTeachesSubject(
  adminClient: Supabase,
  actorUserId: string | null,
  subjectId: string
): Promise<{ teacherId: string; taughtClassIds: string[] }> {
  const teacherId = await assertTeacherSelfAccess(adminClient, actorUserId);

  if (!isUuid(subjectId)) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

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
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  const classesResult = await classRepository.listClassDetailsByIds(
    adminClient,
    classIds
  );

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const taughtClassIds = ((classesResult.data ?? []) as ClassDetailRecord[])
    .filter((row) => row.subject_id === subjectId)
    .map((row) => row.id);

  if (taughtClassIds.length === 0) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  return { teacherId, taughtClassIds };
}

/** Update only syllabus/reference/handout links on a taught subject. */
export async function updateSubjectLinksForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    syllabus_link?: string;
    reference_link?: string;
    handout_link?: string;
  }
): Promise<UpdateSubjectLinksForTeacherResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateSubjectLinksSchema.safeParse({
    syllabus_link: input.syllabus_link,
    reference_link: input.reference_link,
    handout_link: input.handout_link,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let taughtClassIds: string[];
  try {
    ({ taughtClassIds } = await assertTeacherTeachesSubject(
      adminClient,
      actorUserId,
      input.id
    ));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === UNAUTHORIZED_MESSAGE
    ) {
      return { success: false, error: UNAUTHORIZED_MESSAGE };
    }
    throw error;
  }

  const existingSubject = await subjectRepository.findSubjectById(
    adminClient,
    input.id
  );

  if (existingSubject.error) {
    return { success: false, error: existingSubject.error.message };
  }

  if (!existingSubject.data) {
    return { success: false, error: "Subject not found." };
  }

  const normalizedSyllabus = normalizeOptionalString(
    parsed.data.syllabus_link
  );
  const normalizedReference = normalizeOptionalString(
    parsed.data.reference_link
  );
  const normalizedHandout = normalizeOptionalString(parsed.data.handout_link);

  const { data, error } = await subjectRepository.updateSubjectById(
    adminClient,
    input.id,
    {
      name: existingSubject.data.name,
      nb_sessions: existingSubject.data.nb_sessions,
      syllabus_link: normalizedSyllabus,
      reference_link: normalizedReference,
      handout_link: normalizedHandout,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update subject links.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "subjects",
    record_id: data.id,
    old_data: {
      syllabus_link: existingSubject.data.syllabus_link,
      reference_link: existingSubject.data.reference_link,
      handout_link: existingSubject.data.handout_link,
    },
    new_data: {
      syllabus_link: data.syllabus_link,
      reference_link: data.reference_link,
      handout_link: data.handout_link,
    },
    metadata: { note: "Subject links updated by teacher." },
  });

  return {
    success: true,
    subject: {
      id: data.id,
      name: data.name,
      syllabus_link: data.syllabus_link,
      reference_link: data.reference_link,
      handout_link: data.handout_link,
      nb_sessions: data.nb_sessions,
      taught_class_ids: taughtClassIds,
      taught_class_count: taughtClassIds.length,
    },
    message: "Subject links updated.",
  };
}
