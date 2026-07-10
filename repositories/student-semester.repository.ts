import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const ENROLLMENT_COLUMNS =
  "id, student_profile_id, semester_id, status, created_at";

export type StudentSemesterRecord = {
  id: string;
  student_profile_id: string;
  semester_id: string;
  status: string;
  created_at: string;
};

export type CreateStudentSemesterInput = {
  student_profile_id: string;
  semester_id: string;
  status: string;
};

export async function listEnrollmentsBySemesterId(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("student_semester")
    .select(ENROLLMENT_COLUMNS)
    .eq("semester_id", semesterId)
    .order("created_at", { ascending: false });
}

export async function listEnrolledStudentProfileIds(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("student_semester")
    .select("student_profile_id")
    .eq("semester_id", semesterId);
}

export async function findEnrollmentByStudentAndSemester(
  client: Supabase,
  studentProfileId: string,
  semesterId: string
) {
  return client
    .from("student_semester")
    .select(ENROLLMENT_COLUMNS)
    .eq("student_profile_id", studentProfileId)
    .eq("semester_id", semesterId)
    .maybeSingle();
}

export async function createStudentSemesterEnrollment(
  client: Supabase,
  input: CreateStudentSemesterInput
) {
  return client
    .from("student_semester")
    .insert({
      student_profile_id: input.student_profile_id,
      semester_id: input.semester_id,
      status: input.status,
    })
    .select(ENROLLMENT_COLUMNS)
    .single();
}

export async function listAllStudentSemesterEnrollments(client: Supabase) {
  return client
    .from("student_semester")
    .select(ENROLLMENT_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function listEnrollmentsByStudentProfileId(
  client: Supabase,
  studentProfileId: string
) {
  return client
    .from("student_semester")
    .select(ENROLLMENT_COLUMNS)
    .eq("student_profile_id", studentProfileId)
    .order("created_at", { ascending: false });
}
