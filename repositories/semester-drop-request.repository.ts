import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const DROP_COLUMNS =
  "id, student_id, semester_id, class_id, payment_phase_id, spp_id, status, required_percent, required_amount, phase_amount_snapshot, requested_at, deadline_at, completed_at, refund_owed, refund_status, refunded_amount, requested_by, notes, created_at, updated_at";

export type SemesterDropRequestRecord = {
  id: string;
  student_id: string;
  semester_id: string;
  class_id: string;
  payment_phase_id: string | null;
  spp_id: string | null;
  status: string;
  required_percent: number;
  required_amount: number;
  phase_amount_snapshot: number;
  requested_at: string;
  deadline_at: string;
  completed_at: string | null;
  refund_owed: number;
  refund_status: string;
  refunded_amount: number;
  requested_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function asNumber(input: unknown) {
  return typeof input === "number" ? input : input == null ? 0 : Number(input);
}

export function mapSemesterDropRequestRecord(
  value: unknown
): SemesterDropRequestRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") {
    return null;
  }
  return {
    id: row.id,
    student_id: typeof row.student_id === "string" ? row.student_id : "",
    semester_id: typeof row.semester_id === "string" ? row.semester_id : "",
    class_id: typeof row.class_id === "string" ? row.class_id : "",
    payment_phase_id:
      typeof row.payment_phase_id === "string" ? row.payment_phase_id : null,
    spp_id: typeof row.spp_id === "string" ? row.spp_id : null,
    status: typeof row.status === "string" ? row.status : "pending",
    required_percent: asNumber(row.required_percent),
    required_amount: asNumber(row.required_amount),
    phase_amount_snapshot: asNumber(row.phase_amount_snapshot),
    requested_at: typeof row.requested_at === "string" ? row.requested_at : "",
    deadline_at: typeof row.deadline_at === "string" ? row.deadline_at : "",
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
    refund_owed: asNumber(row.refund_owed),
    refund_status:
      typeof row.refund_status === "string" ? row.refund_status : "none",
    refunded_amount: asNumber(row.refunded_amount),
    requested_by:
      typeof row.requested_by === "string" ? row.requested_by : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

export async function listPendingDropsByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("semester_drop_requests")
    .select(DROP_COLUMNS)
    .eq("class_id", classId)
    .eq("status", "pending");
}

export async function listPendingDropsByStudentIds(
  client: Supabase,
  studentIds: string[]
) {
  if (studentIds.length === 0) {
    return { data: [], error: null };
  }
  return client
    .from("semester_drop_requests")
    .select(DROP_COLUMNS)
    .in("student_id", studentIds)
    .eq("status", "pending");
}

export async function findPendingDropByStudentAndSemester(
  client: Supabase,
  studentId: string,
  semesterId: string
) {
  return client
    .from("semester_drop_requests")
    .select(DROP_COLUMNS)
    .eq("student_id", studentId)
    .eq("semester_id", semesterId)
    .eq("status", "pending")
    .maybeSingle();
}

export async function listNeedRefundDropRequests(client: Supabase) {
  return client
    .from("semester_drop_requests")
    .select(DROP_COLUMNS)
    .eq("status", "completed")
    .eq("refund_status", "owed")
    .gt("refund_owed", 0)
    .order("completed_at", { ascending: false });
}

export async function listDropRequestsBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [], error: null };
  }
  return client
    .from("semester_drop_requests")
    .select(DROP_COLUMNS)
    .in("spp_id", sppIds)
    .in("status", ["pending", "completed"]);
}

export async function findCompletedDropBySppId(
  client: Supabase,
  sppId: string
) {
  return client
    .from("semester_drop_requests")
    .select(DROP_COLUMNS)
    .eq("spp_id", sppId)
    .eq("status", "completed")
    .maybeSingle();
}

export async function findDropRequestById(client: Supabase, id: string) {
  return client
    .from("semester_drop_requests")
    .select(DROP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createSemesterDropRequest(
  client: Supabase,
  input: {
    student_id: string;
    class_id: string;
    required_percent: number;
    requested_by: string | null;
    notes?: string | null;
  }
) {
  const { data, error } = await client.rpc("create_semester_drop_request", {
    p_student_id: input.student_id,
    p_class_id: input.class_id,
    p_required_percent: input.required_percent,
    p_requested_by: input.requested_by,
    p_notes: input.notes ?? null,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return { data: null, error: null };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      request: mapSemesterDropRequestRecord(row.request),
      completedImmediately: row.completedImmediately === true,
      spp: row.spp ?? null,
    },
    error: null,
  };
}

export async function cancelSemesterDropRequest(
  client: Supabase,
  requestId: string
) {
  const { data, error } = await client.rpc("cancel_semester_drop_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return { data: null, error: null };
  }

  const row = data as Record<string, unknown>;
  return {
    data: { request: mapSemesterDropRequestRecord(row.request) },
    error: null,
  };
}
