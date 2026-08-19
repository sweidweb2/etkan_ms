import {
  STUDENT_SEMESTER_STATUSES,
  type StudentSemesterStatusValue,
} from "@/lib/constants/manager-student-semester-status";
import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { addStudentToSemesterSchema } from "@/lib/validators/manager/add-student-to-semester";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import type { StudentSemesterRecord } from "@/repositories/student-semester.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { listStudentsForManager } from "@/services/students/student.service";
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

async function fetchStudentRowByProfileId(
  adminClient: Supabase,
  studentProfileId: string
): Promise<ManagerStudentRow | null> {
  const { data: studentProfile, error } =
    await studentProfileRepository.findStudentProfileById(
      adminClient,
      studentProfileId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!studentProfile) {
    return null;
  }

  const [profilesResult, emailResult] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, [studentProfile.user_id]),
    authRepository.listAuthEmailsByIds(adminClient, [studentProfile.user_id]),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (emailResult.error) {
    throw new Error(emailResult.error.message);
  }

  const profile = profilesResult.data?.[0];
  if (!profile) {
    return null;
  }

  return {
    user_id: studentProfile.user_id,
    student_profile_id: studentProfile.id,
    username: profile.username,
    email: emailResult.data.get(studentProfile.user_id) ?? "",
    full_name: studentProfile.full_name,
    birth_date: studentProfile.birth_date,
    phone: studentProfile.phone,
    status: mapStudentStatus(studentProfile.status),
    created_at:
      studentProfile.created_at ??
      profile.created_at ??
      new Date(0).toISOString(),
  };
}

export async function listSemesterStudentsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  semesterId: string,
  semesterName: string
): Promise<ManagerStudentSemesterRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_VIEW);

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

  const profileIds = enrollments.map(
    (enrollment) => enrollment.student_profile_id
  );
  const profilesResult =
    await studentProfileRepository.listStudentProfilesByIds(
      adminClient,
      profileIds
    );

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const studentProfiles = profilesResult.data ?? [];
  if (studentProfiles.length === 0) {
    return [];
  }

  const userIds = studentProfiles.map((profile) => profile.user_id);
  const [authProfilesResult, emailsResult] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, userIds),
    authRepository.listAuthEmailsByIds(adminClient, userIds),
  ]);

  if (authProfilesResult.error) {
    throw new Error(authProfilesResult.error.message);
  }
  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }

  const profileByUserId = new Map(
    (authProfilesResult.data ?? []).map((row) => [row.id, row])
  );
  const emailByUserId = emailsResult.data;
  const studentByProfileId = new Map(
    studentProfiles.map((profile) => [profile.id, profile])
  );

  return enrollments.flatMap((enrollment) => {
    const studentProfile = studentByProfileId.get(enrollment.student_profile_id);
    if (!studentProfile) {
      return [];
    }
    const authProfile = profileByUserId.get(studentProfile.user_id);
    if (!authProfile) {
      return [];
    }

    const student: ManagerStudentRow = {
      user_id: studentProfile.user_id,
      student_profile_id: studentProfile.id,
      username: authProfile.username ?? "",
      email: emailByUserId.get(studentProfile.user_id) ?? "",
      full_name: studentProfile.full_name,
      birth_date: studentProfile.birth_date,
      phone: studentProfile.phone,
      status: mapStudentStatus(studentProfile.status),
      created_at:
        studentProfile.created_at ??
        authProfile.created_at ??
        enrollment.created_at ??
        new Date(0).toISOString(),
    };

    return [mapEnrollmentToRow(enrollment, student, semesterName)];
  });
}

export async function listAvailableStudentsForSemester(
  adminClient: Supabase,
  actorUserId: string | null,
  semesterId: string
): Promise<ManagerStudentRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_ADD_STUDENT);

  const [enrolledResult, students] = await Promise.all([
    studentSemesterRepository.listEnrolledStudentProfileIds(
      adminClient,
      semesterId
    ),
    listStudentsForManager(adminClient, actorUserId),
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
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    semester_id: string;
    student_profile_id: string;
    status: string;
  }
): Promise<AddStudentToSemesterResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SEMESTERS_ADD_STUDENT);
  if (unauthorized) {
    return { success: false, error: unauthorized };
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

  const [semesterResult, existing] = await Promise.all([
    semesterRepository.findSemesterById(adminClient, input.semester_id),
    studentSemesterRepository.findEnrollmentByStudentAndSemester(
      adminClient,
      parsed.data.student_profile_id,
      input.semester_id
    ),
  ]);

  if (semesterResult.error) {
    return {
      success: false,
      error: mapAddStudentToSemesterError(semesterResult.error.message),
    };
  }

  if (!semesterResult.data) {
    return { success: false, error: "Semester not found." };
  }

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

  let student: ManagerStudentRow | null;
  try {
    student = await fetchStudentRowByProfileId(
      adminClient,
      parsed.data.student_profile_id
    );
  } catch (loadError) {
    return {
      success: false,
      error:
        loadError instanceof Error ? loadError.message : "Student not found.",
    };
  }

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
