import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttendeeStatusValue } from "@/lib/constants/manager-attendee-status";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const ATTENDEE_COLUMNS =
  "id, session_id, student_id, status, note, created_at";

export type AttendeeRecord = {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendeeStatusValue;
  note: string | null;
  created_at: string;
};

export type CreateAttendeeInput = {
  session_id: string;
  student_id: string;
  status?: AttendeeStatusValue;
  note?: string | null;
};

export type UpdateAttendeeInput = {
  status: AttendeeStatusValue;
  note?: string | null;
};

export async function listAttendeesBySessionIds(
  client: Supabase,
  sessionIds: string[]
) {
  if (sessionIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("attendee")
    .select("session_id, student_id, status")
    .in("session_id", sessionIds);
}

export async function listAttendeesBySessionIdsAndStudentId(
  client: Supabase,
  sessionIds: string[],
  studentId: string
) {
  if (sessionIds.length === 0 || !studentId) {
    return { data: [], error: null };
  }

  return client
    .from("attendee")
    .select("session_id, student_id, status")
    .eq("student_id", studentId)
    .in("session_id", sessionIds);
}

export async function listAttendeesBySessionId(
  client: Supabase,
  sessionId: string
) {
  return client
    .from("attendee")
    .select(ATTENDEE_COLUMNS)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
}

export async function listAttendeeIdsByStudentId(
  client: Supabase,
  studentId: string
) {
  return client.from("attendee").select("id").eq("student_id", studentId);
}

export async function findAttendeeById(client: Supabase, id: string) {
  return client
    .from("attendee")
    .select(ATTENDEE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function seedLateJoinAttendees(
  client: Supabase,
  classId: string,
  studentUserId: string
) {
  return client.rpc("seed_late_join_attendees", {
    p_class_id: classId,
    p_student_id: studentUserId,
  });
}

export async function seedLateJoinAttendeesForStudents(
  client: Supabase,
  classId: string,
  studentUserIds: string[]
) {
  if (studentUserIds.length === 0) {
    return { data: 0, error: null };
  }

  return client.rpc("seed_late_join_attendees_for_students", {
    p_class_id: classId,
    p_student_ids: studentUserIds,
  });
}

export async function ensureSessionAttendeesForMembers(
  client: Supabase,
  sessionId: string,
  classId: string
) {
  return client.rpc("ensure_session_attendees_for_members", {
    p_session_id: sessionId,
    p_class_id: classId,
  });
}

export async function createAttendees(
  client: Supabase,
  rows: CreateAttendeeInput[]
) {
  if (rows.length === 0) {
    return { data: [] as AttendeeRecord[], error: null };
  }

  return client
    .from("attendee")
    .insert(
      rows.map((row) => ({
        session_id: row.session_id,
        student_id: row.student_id,
        status: row.status ?? "present",
        note: row.note ?? null,
      }))
    )
    .select(ATTENDEE_COLUMNS);
}

export async function updateAttendee(
  client: Supabase,
  id: string,
  input: UpdateAttendeeInput
) {
  return client
    .from("attendee")
    .update({
      status: input.status,
      note: input.note ?? null,
    })
    .eq("id", id)
    .select(ATTENDEE_COLUMNS)
    .single();
}
