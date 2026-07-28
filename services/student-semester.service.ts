import {
  STUDENT_SEMESTER_STATUSES,
  type StudentSemesterStatusValue,
} from "@/lib/constants/manager-student-semester-status";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { addStudentToSemesterSchema } from "@/lib/validators/manager/add-student-to-semester";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import type { StudentSemesterRecord } from "@/repositories/student-semester.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import { listStudentsForManager } from "@/services/student.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type AddStudentToSemesterSuccess = {
  success: true;
  enrollment: ManagerStudentSemesterRow;
  message: string;
};

export type AddStudentToSemesterFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type AddStudentToSemesterResult =
  | AddStudentToSemesterSuccess
  | AddStudentToSemesterFailure;

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

function mapStudentSemesterStatus(status: string): StudentSemesterStatusValue {
  if (
    status === STUDENT_SEMESTER_STATUSES.PENDING ||
    status === STUDENT_SEMESTER_STATUSES.ACTIVE ||
    status === STUDENT_SEMESTER_STATUSES.INACTIVE ||
    status === STUDENT_SEMESTER_STATUSES.WITHDRAWN
  ) {
    return status;
  }

  return STUDENT_SEMESTER_STATUSES.PENDING;
}

function mapEnrollmentToRow(
  enrollment: StudentSemesterRecord,
  student: ManagerStudentRow,
  semesterName: string
): ManagerStudentSemesterRow {
  return {
    id: enrollment.id,
    student_profile_id: enrollment.student_profile_id,
    user_id: student.user_id,
    full_name: student.full_name,
    email: student.email,
    phone: student.phone,
    semester_id: enrollment.semester_id,
    semester_name: semesterName,
    status: mapStudentSemesterStatus(enrollment.status),
    created_at: enrollment.created_at,
  };
}

function mapAddStudentToSemesterError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "This student is already enrolled in this semester.";
  }

  return "Unable to add student to semester. Please try again.";
}

export async function listSemesterStudentsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  semesterId: string,
  semesterName: string
): Promise<ManagerStudentSemesterRow[]> {
  assertManagerRole(actorRole);

  const { data: enrollments, error } =
    await studentSemesterRepository.listEnrollmentsBySemesterId(
      adminClient,
      semesterId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!enrollments?.length) {
    return [];
  }

  const students = await listStudentsForManager(adminClient, actorRole);
  const studentByProfileId = new Map(
    students.map((student) => [student.student_profile_id, student])
  );

  return enrollments
    .map((enrollment) => {
      const student = studentByProfileId.get(enrollment.student_profile_id);
      if (!student) {
        return null;
      }

      return mapEnrollmentToRow(enrollment, student, semesterName);
    })
    .filter((row): row is ManagerStudentSemesterRow => row !== null);
}

export async function listAvailableStudentsForSemester(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  semesterId: string
): Promise<ManagerStudentRow[]> {
  assertManagerRole(actorRole);

  const [enrolledResult, students] = await Promise.all([
    studentSemesterRepository.listEnrolledStudentProfileIds(
      adminClient,
      semesterId
    ),
    listStudentsForManager(adminClient, actorRole),
  ]);

  if (enrolledResult.error) {
    throw new Error(enrolledResult.error.message);
  }

  const enrolledIds = new Set(
    (enrolledResult.data ?? []).map((row) => row.student_profile_id)
  );

  return students.filter(
    (student) => !enrolledIds.has(student.student_profile_id)
  );
}

export async function addStudentToSemesterForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    semester_id: string;
    student_profile_id: string;
    status: string;
  }
): Promise<AddStudentToSemesterResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = addStudentToSemesterSchema.safeParse({
    student_profile_id: input.student_profile_id,
    status: input.status,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const semesterResult = await semesterRepository.findSemesterById(
    adminClient,
    input.semester_id
  );

  if (semesterResult.error) {
    return {
      success: false,
      error: mapAddStudentToSemesterError(semesterResult.error.message),
    };
  }

  if (!semesterResult.data) {
    return { success: false, error: "Semester not found." };
  }

  const existing = await studentSemesterRepository.findEnrollmentByStudentAndSemester(
    adminClient,
    parsed.data.student_profile_id,
    input.semester_id
  );

  if (existing.error) {
    return {
      success: false,
      error: mapAddStudentToSemesterError(existing.error.message),
    };
  }

  if (existing.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        student_profile_id: ["This student is already enrolled in this semester."],
      },
    };
  }

  const { data, error } =
    await studentSemesterRepository.createStudentSemesterEnrollment(adminClient, {
      student_profile_id: parsed.data.student_profile_id,
      semester_id: input.semester_id,
      status: parsed.data.status,
    });

  if (error || !data) {
    return {
      success: false,
      error: mapAddStudentToSemesterError(error?.message ?? "Unknown error"),
    };
  }

  const students = await listStudentsForManager(adminClient, actorRole);
  const student = students.find(
    (row) => row.student_profile_id === parsed.data.student_profile_id
  );

  if (!student) {
    return { success: false, error: "Student not found." };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_semester",
    record_id: data.id,
    new_data: {
      student_profile_id: data.student_profile_id,
      semester_id: data.semester_id,
      status: data.status,
    },
    metadata: {
      note: "Student added to semester.",
      student_name: student.full_name,
      semester_name: semesterResult.data.name,
    },
  });

  return {
    success: true,
    enrollment: mapEnrollmentToRow(
      data,
      student,
      semesterResult.data.name
    ),
    message: `${student.full_name} added to ${semesterResult.data.name}.`,
  };
}
