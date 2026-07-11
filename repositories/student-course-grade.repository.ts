import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const STUDENT_COURSE_GRADE_COLUMNS =
  "id, user_id, class_id, task_json_grade_weights, task_weight, task_total_grade, final_exam_grade, final_exam_weight, type, created_at";

export type StudentCourseGradeRecord = {
  id: string;
  user_id: string;
  class_id: string;
  task_json_grade_weights: Json | null;
  group_grades_json: Json | null;
  attendee_grades_json: Json | null;
  task_weight: number | null;
  task_total_grade: number | null;
  final_exam_grade: number | null;
  final_exam_weight: number | null;
  type: string | null;
  created_at: string | null;
};

export type UpsertStudentCourseGradeInput = {
  user_id: string;
  class_id: string;
  task_json_grade_weights?: Json | null;
  task_weight: number;
  task_total_grade: number;
  final_exam_grade: number;
  final_exam_weight: number;
  type: string;
};

export async function listStudentCourseGradesByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("student_course_grade")
    .select(STUDENT_COURSE_GRADE_COLUMNS)
    .eq("class_id", classId);
}

export async function findStudentCourseGradeByClassAndUser(
  client: Supabase,
  classId: string,
  userId: string
) {
  return client
    .from("student_course_grade")
    .select(STUDENT_COURSE_GRADE_COLUMNS)
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();
}

export async function saveStudentCourseGrade(
  client: Supabase,
  input: UpsertStudentCourseGradeInput
) {
  const existing = await findStudentCourseGradeByClassAndUser(
    client,
    input.class_id,
    input.user_id
  );

  if (existing.error) {
    return { data: null, error: existing.error };
  }

  const payload = {
    task_json_grade_weights: input.task_json_grade_weights ?? null,
    task_weight: input.task_weight,
    task_total_grade: input.task_total_grade,
    final_exam_grade: input.final_exam_grade,
    final_exam_weight: input.final_exam_weight,
    type: input.type,
  };

  if (existing.data) {
    return client
      .from("student_course_grade")
      .update(payload)
      .eq("id", existing.data.id)
      .select(STUDENT_COURSE_GRADE_COLUMNS)
      .single();
  }

  return client
    .from("student_course_grade")
    .insert({
      user_id: input.user_id,
      class_id: input.class_id,
      ...payload,
    })
    .select(STUDENT_COURSE_GRADE_COLUMNS)
    .single();
}

export async function deleteStudentCourseGradeByClassAndUser(
  client: Supabase,
  classId: string,
  userId: string
) {
  return client
    .from("student_course_grade")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", userId);
}
