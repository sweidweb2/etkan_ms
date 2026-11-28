import "server-only";

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

export async function updateEnrollmentStatus(
  client: Supabase,
  studentProfileId: string,
  semesterId: string,
  status: string
) {
  return client
    .from("student_semester")
    .update({ status })
    .eq("student_profile_id", studentProfileId)
    .eq("semester_id", semesterId)
    .select(ENROLLMENT_COLUMNS)
    .maybeSingle();
}

/** Insert or update semester enrollment status (unique on profile+semester). */
export async function upsertEnrollmentStatus(
  client: Supabase,
  studentProfileId: string,
  semesterId: string,
  status: string
) {
  return client
    .from("student_semester")
    .upsert(
      {
        student_profile_id: studentProfileId,
        semester_id: semesterId,
        status,
      },
      { onConflict: "student_profile_id,semester_id" }
    )
    .select(ENROLLMENT_COLUMNS)
    .single();
}

export async function listWithdrawnStudentProfileIdsBySemester(
  client: Supabase,
  semesterId: string,
  studentProfileIds: string[]
) {
  if (studentProfileIds.length === 0) {
    return { data: [] as string[], error: null };
  }

  const { data, error } = await client
    .from("student_semester")
    .select("student_profile_id")
    .eq("semester_id", semesterId)
    .eq("status", "withdrawn")
    .in("student_profile_id", studentProfileIds);

  if (error) {
    return { data: null as string[] | null, error };
  }

  return {
    data: (data ?? []).map((row) => row.student_profile_id),
    error: null,
  };
}

/** One UPDATE for many students in the same semester. */
export async function updateEnrollmentStatusForProfiles(
  client: Supabase,
  studentProfileIds: string[],
  semesterId: string,
  status: string
) {
  if (studentProfileIds.length === 0) {
    return { error: null };
  }

  return client
    .from("student_semester")
    .update({ status })
    .in("student_profile_id", studentProfileIds)
    .eq("semester_id", semesterId);
}
