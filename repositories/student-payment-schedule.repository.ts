import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SCHEDULE_COLUMNS =
  "id, student_payment_phase_id, due_date, amount, label, status, notes, created_at, updated_at";

export type StudentPaymentScheduleRecord = {
  id: string;
  student_payment_phase_id: string;
  due_date: string;
  amount: number;
  label: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSchedulesBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_payment_schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("student_payment_phase_id", sppId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function findScheduleById(client: Supabase, id: string) {
  return client
    .from("student_payment_schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export type CreateStudentPaymentScheduleRpcResult = {
  schedule: StudentPaymentScheduleRecord | null;
  studentPaymentPhaseId: string;
};

export type UpdateStudentPaymentScheduleRpcResult = {
  schedule: StudentPaymentScheduleRecord | null;
  previous: StudentPaymentScheduleRecord | null;
  studentPaymentPhaseId: string;
};

export type DeleteStudentPaymentScheduleRpcResult = {
  deleted: StudentPaymentScheduleRecord | null;
  studentPaymentPhaseId: string;
};

function asNumber(input: unknown) {
  return typeof input === "number" ? input : input == null ? 0 : Number(input);
}

function asScheduleRecord(value: unknown): StudentPaymentScheduleRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    student_payment_phase_id:
      typeof row.student_payment_phase_id === "string"
        ? row.student_payment_phase_id
        : "",
    due_date: typeof row.due_date === "string" ? row.due_date : "",
    amount: asNumber(row.amount),
    label: typeof row.label === "string" ? row.label : "",
    status: typeof row.status === "string" ? row.status : "",
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

export async function createStudentPaymentScheduleWithRpc(
  client: Supabase,
  input: {
    student_payment_phase_id: string;
    due_date: string;
    amount: number;
    label: string;
    status: string;
    notes: string | null;
    created_by: string | null;
  }
) {
  const { data, error } = await client.rpc("create_student_payment_schedule", {
    p_student_payment_phase_id: input.student_payment_phase_id,
    p_due_date: input.due_date,
    p_amount: input.amount,
    p_label: input.label,
    p_status: input.status,
    p_notes: input.notes,
    p_created_by: input.created_by,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        schedule: null,
        studentPaymentPhaseId: "",
      } satisfies CreateStudentPaymentScheduleRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      schedule: asScheduleRecord(row.schedule),
      studentPaymentPhaseId:
        typeof row.studentPaymentPhaseId === "string"
          ? row.studentPaymentPhaseId
          : "",
    } satisfies CreateStudentPaymentScheduleRpcResult,
    error: null,
  };
}

export async function updateStudentPaymentScheduleWithRpc(
  client: Supabase,
  input: {
    id: string;
    student_payment_phase_id: string;
    due_date: string;
    amount: number;
    label: string;
    status: string;
    notes: string | null;
  }
) {
  const { data, error } = await client.rpc("update_student_payment_schedule", {
    p_id: input.id,
    p_student_payment_phase_id: input.student_payment_phase_id,
    p_due_date: input.due_date,
    p_amount: input.amount,
    p_label: input.label,
    p_status: input.status,
    p_notes: input.notes,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        schedule: null,
        previous: null,
        studentPaymentPhaseId: "",
      } satisfies UpdateStudentPaymentScheduleRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      schedule: asScheduleRecord(row.schedule),
      previous: asScheduleRecord(row.previous),
      studentPaymentPhaseId:
        typeof row.studentPaymentPhaseId === "string"
          ? row.studentPaymentPhaseId
          : "",
    } satisfies UpdateStudentPaymentScheduleRpcResult,
    error: null,
  };
}

export async function deleteStudentPaymentScheduleWithRpc(
  client: Supabase,
  id: string,
  studentPaymentPhaseId?: string
) {
  const { data, error } = await client.rpc("delete_student_payment_schedule", {
    p_id: id,
    ...(studentPaymentPhaseId
      ? { p_student_payment_phase_id: studentPaymentPhaseId }
      : {}),
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        deleted: null,
        studentPaymentPhaseId: "",
      } satisfies DeleteStudentPaymentScheduleRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      deleted: asScheduleRecord(row.deleted),
      studentPaymentPhaseId:
        typeof row.studentPaymentPhaseId === "string"
          ? row.studentPaymentPhaseId
          : "",
    } satisfies DeleteStudentPaymentScheduleRpcResult,
    error: null,
  };
}
