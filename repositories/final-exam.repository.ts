import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const FINAL_EXAM_COLUMNS =
  "id, class_id, title, description, due_date, max_grade, created_at";

const STUDENT_FINAL_EXAM_GRADE_COLUMNS =
  "id, final_exam_id, student_id, status, submitted_at, grade, notes, graded_at, created_at";

export type FinalExamRecord = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_grade: number | null;
  created_at: string;
};

export type StudentFinalExamGradeRecord = {
  id: string;
  final_exam_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
  grade: number | null;
  notes: string | null;
  graded_at: string | null;
  created_at: string;
};

export type CreateFinalExamInput = {
  class_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_grade?: number | null;
};

export type UpdateFinalExamInput = {
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_grade?: number | null;
};

export type UpdateStudentFinalExamGradeInput = {
  status: string;
  grade?: number | null;
  notes?: string | null;
  submitted_at?: string | null;
  graded_at?: string | null;
};

export async function findFinalExamByClassId(client: Supabase, classId: string) {
  return client
    .from("final_exam")
    .select(FINAL_EXAM_COLUMNS)
    .eq("class_id", classId)
    .maybeSingle();
}

export async function listFinalExamsByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [] as FinalExamRecord[], error: null };
  }

  return client
    .from("final_exam")
    .select(FINAL_EXAM_COLUMNS)
    .in("class_id", classIds);
}

export async function findFinalExamById(client: Supabase, id: string) {
  return client
    .from("final_exam")
    .select(FINAL_EXAM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createFinalExam(
  client: Supabase,
  input: CreateFinalExamInput
) {
  return client
    .from("final_exam")
    .insert({
      class_id: input.class_id,
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      max_grade: input.max_grade ?? null,
    })
    .select(FINAL_EXAM_COLUMNS)
    .single();
}

export async function updateFinalExam(
  client: Supabase,
  id: string,
  input: UpdateFinalExamInput
) {
  return client
    .from("final_exam")
    .update({
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      max_grade: input.max_grade ?? null,
    })
    .eq("id", id)
    .select(FINAL_EXAM_COLUMNS)
    .single();
}

export async function listStudentFinalExamGradesByFinalExamId(
  client: Supabase,
  finalExamId: string
) {
  return client
    .from("student_finalexam_grade")
    .select(STUDENT_FINAL_EXAM_GRADE_COLUMNS)
    .eq("final_exam_id", finalExamId)
    .order("created_at", { ascending: true });
}

export async function listStudentFinalExamGradesByStudentAndFinalExamIds(
  client: Supabase,
  studentId: string,
  finalExamIds: string[]
) {
  if (!studentId || finalExamIds.length === 0) {
    return { data: [] as StudentFinalExamGradeRecord[], error: null };
  }

  return client
    .from("student_finalexam_grade")
    .select(STUDENT_FINAL_EXAM_GRADE_COLUMNS)
    .eq("student_id", studentId)
    .in("final_exam_id", finalExamIds);
}

export async function listStudentFinalExamGradeIdsByStudentId(
  client: Supabase,
  studentId: string
) {
  return client
    .from("student_finalexam_grade")
    .select("id")
    .eq("student_id", studentId);
}

export async function findStudentFinalExamGradeById(
  client: Supabase,
  id: string
) {
  return client
    .from("student_finalexam_grade")
    .select(STUDENT_FINAL_EXAM_GRADE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function updateStudentFinalExamGrade(
  client: Supabase,
  id: string,
  input: UpdateStudentFinalExamGradeInput
) {
  return client
    .from("student_finalexam_grade")
    .update({
      status: input.status,
      grade: input.grade ?? null,
      notes: input.notes ?? null,
      submitted_at: input.submitted_at ?? null,
      graded_at: input.graded_at ?? null,
    })
    .eq("id", id)
    .select(STUDENT_FINAL_EXAM_GRADE_COLUMNS)
    .single();
}

export type CreateStudentFinalExamGradeInput = {
  final_exam_id: string;
  student_id: string;
  status?: string;
  submitted_at?: string | null;
  grade?: number | null;
  notes?: string | null;
  graded_at?: string | null;
};

export async function createStudentFinalExamGrades(
  client: Supabase,
  rows: Array<{ final_exam_id: string; student_id: string; status?: string }>
) {
  if (rows.length === 0) {
    return { data: [] as StudentFinalExamGradeRecord[], error: null };
  }

  return client
    .from("student_finalexam_grade")
    .insert(
      rows.map((row) => ({
        final_exam_id: row.final_exam_id,
        student_id: row.student_id,
        status: row.status ?? "pending",
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      }))
    )
    .select(STUDENT_FINAL_EXAM_GRADE_COLUMNS);
}

export async function createStudentFinalExamGrade(
  client: Supabase,
  input: CreateStudentFinalExamGradeInput
) {
  return client
    .from("student_finalexam_grade")
    .insert({
      final_exam_id: input.final_exam_id,
      student_id: input.student_id,
      status: input.status ?? "pending",
      submitted_at: input.submitted_at ?? null,
      grade: input.grade ?? null,
      notes: input.notes ?? null,
      graded_at: input.graded_at ?? null,
    })
    .select(STUDENT_FINAL_EXAM_GRADE_COLUMNS)
    .single();
}

export async function deleteFinalExamById(client: Supabase, id: string) {
  return client.from("final_exam").delete().eq("id", id);
}
