import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const PAYMENT_COLUMNS =
  "id, student_payment_phase_id, payment_date, amount, payment_method, received_by, received_by_management, receipt_number, notes, created_at, updated_at";

export type StudentPaymentRecord = {
  id: string;
  student_payment_phase_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  received_by: string;
  received_by_management: boolean;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateStudentPaymentRecordInput = {
  student_payment_phase_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  received_by: string;
  received_by_management: boolean;
  receipt_number: string | null;
  notes: string | null;
};

export type UpdateStudentPaymentRecordInput = {
  payment_date: string;
  amount: number;
  payment_method: string;
  received_by: string;
  received_by_management: boolean;
  receipt_number: string | null;
  notes: string | null;
};

export async function listPaymentAmountsBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payments")
    .select("student_payment_phase_id, amount")
    .in("student_payment_phase_id", sppIds);
}

export async function listPaymentsBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_payments")
    .select(PAYMENT_COLUMNS)
    .eq("student_payment_phase_id", sppId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function listPaymentIdsBySppIds(client: Supabase, sppIds: string[]) {
  if (sppIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payments")
    .select("id")
    .in("student_payment_phase_id", sppIds);
}

export async function listPaymentSppIdsBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [] as { student_payment_phase_id: string }[], error: null };
  }

  return client
    .from("student_payments")
    .select("student_payment_phase_id")
    .in("student_payment_phase_id", sppIds);
}

export async function listAllPayments(client: Supabase) {
  return client
    .from("student_payments")
    .select(PAYMENT_COLUMNS)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
}

/** All-time SPP payment total. PostgREST aggregates are disabled on this API. */
export async function sumAllPaymentAmounts(client: Supabase) {
  const { data, error } = await client.from("student_payments").select("amount");

  if (error) {
    return { data: 0, error };
  }

  const total = (data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.amount) || 0),
    0
  );

  return { data: total, error: null };
}

/** Dates only — used to discover months that have payment activity. */
export async function listAllPaymentDates(client: Supabase) {
  return client.from("student_payments").select("payment_date");
}

/** Inclusive `from`, exclusive `to` on `payment_date` (ISO date strings). */
export async function listPaymentsBetween(
  client: Supabase,
  fromInclusive: string,
  toExclusive: string
) {
  return client
    .from("student_payments")
    .select(PAYMENT_COLUMNS)
    .gte("payment_date", fromInclusive)
    .lt("payment_date", toExclusive)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
}

/** Slim rows for analytics chart totals (no joins). */
export async function listPaymentAmountsBetween(
  client: Supabase,
  fromInclusive: string,
  toExclusive: string
) {
  return client
    .from("student_payments")
    .select("payment_date, amount")
    .gte("payment_date", fromInclusive)
    .lt("payment_date", toExclusive);
}

export async function findPaymentDateBounds(client: Supabase) {
  const aggregate = await client
    .from("student_payments")
    .select("min_date:payment_date.min(), max_date:payment_date.max()")
    .maybeSingle();

  if (!aggregate.error && aggregate.data) {
    const row = aggregate.data as unknown as {
      min_date?: string | null;
      max_date?: string | null;
    };
    return {
      data: {
        min: row.min_date ?? null,
        max: row.max_date ?? null,
      },
      error: null,
    };
  }

  const [minResult, maxResult] = await Promise.all([
    client
      .from("student_payments")
      .select("payment_date")
      .order("payment_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    client
      .from("student_payments")
      .select("payment_date")
      .order("payment_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (minResult.error) {
    return { data: null, error: minResult.error };
  }
  if (maxResult.error) {
    return { data: null, error: maxResult.error };
  }

  return {
    data: {
      min: minResult.data?.payment_date ?? null,
      max: maxResult.data?.payment_date ?? null,
    },
    error: null,
  };
}

export async function findPaymentById(client: Supabase, id: string) {
  return client
    .from("student_payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createStudentPayment(
  client: Supabase,
  input: CreateStudentPaymentRecordInput
) {
  return client
    .from("student_payments")
    .insert({
      student_payment_phase_id: input.student_payment_phase_id,
      payment_date: input.payment_date,
      amount: input.amount,
      payment_method: input.payment_method,
      received_by: input.received_by,
      received_by_management: input.received_by_management,
      receipt_number: input.receipt_number,
      notes: input.notes,
    })
    .select(PAYMENT_COLUMNS)
    .single();
}

export async function updateStudentPayment(
  client: Supabase,
  id: string,
  input: UpdateStudentPaymentRecordInput
) {
  return client
    .from("student_payments")
    .update({
      payment_date: input.payment_date,
      amount: input.amount,
      payment_method: input.payment_method,
      received_by: input.received_by,
      received_by_management: input.received_by_management,
      receipt_number: input.receipt_number,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PAYMENT_COLUMNS)
    .single();
}

export async function deleteStudentPayment(client: Supabase, id: string) {
  return client.from("student_payments").delete().eq("id", id);
}

export type CreateStudentPaymentRpcResult = {
  payment: StudentPaymentRecord | null;
  paymentPhaseId: string;
};

export type UpdateStudentPaymentRpcResult = {
  payment: StudentPaymentRecord | null;
  previous: StudentPaymentRecord | null;
  paymentPhaseId: string;
};

export type DeleteStudentPaymentRpcResult = {
  deleted: StudentPaymentRecord | null;
  studentPaymentPhaseId: string;
  paymentPhaseId: string;
};

function asNumber(input: unknown) {
  return typeof input === "number" ? input : input == null ? 0 : Number(input);
}

function asPaymentRecord(value: unknown): StudentPaymentRecord | null {
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
    payment_date: typeof row.payment_date === "string" ? row.payment_date : "",
    amount: asNumber(row.amount),
    payment_method:
      typeof row.payment_method === "string" ? row.payment_method : "",
    received_by: typeof row.received_by === "string" ? row.received_by : "",
    received_by_management: row.received_by_management === true,
    receipt_number:
      typeof row.receipt_number === "string" ? row.receipt_number : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

export async function createStudentPaymentWithRecalc(
  client: Supabase,
  input: {
    student_payment_phase_id: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    received_by: string;
    received_by_management: boolean;
    notes: string | null;
  }
) {
  const { data, error } = await client.rpc("create_student_payment", {
    p_student_payment_phase_id: input.student_payment_phase_id,
    p_payment_date: input.payment_date,
    p_amount: input.amount,
    p_payment_method: input.payment_method,
    p_received_by: input.received_by,
    p_received_by_management: input.received_by_management,
    p_notes: input.notes,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: { payment: null, paymentPhaseId: "" } satisfies CreateStudentPaymentRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      payment: asPaymentRecord(row.payment),
      paymentPhaseId:
        typeof row.paymentPhaseId === "string" ? row.paymentPhaseId : "",
    } satisfies CreateStudentPaymentRpcResult,
    error: null,
  };
}

export async function updateStudentPaymentWithRecalc(
  client: Supabase,
  input: {
    id: string;
    student_payment_phase_id: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    received_by: string;
    received_by_management: boolean;
    notes: string | null;
  }
) {
  const { data, error } = await client.rpc("update_student_payment", {
    p_id: input.id,
    p_student_payment_phase_id: input.student_payment_phase_id,
    p_payment_date: input.payment_date,
    p_amount: input.amount,
    p_payment_method: input.payment_method,
    p_received_by: input.received_by,
    p_received_by_management: input.received_by_management,
    p_notes: input.notes,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        payment: null,
        previous: null,
        paymentPhaseId: "",
      } satisfies UpdateStudentPaymentRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      payment: asPaymentRecord(row.payment),
      previous: asPaymentRecord(row.previous),
      paymentPhaseId:
        typeof row.paymentPhaseId === "string" ? row.paymentPhaseId : "",
    } satisfies UpdateStudentPaymentRpcResult,
    error: null,
  };
}

export async function deleteStudentPaymentWithRecalc(
  client: Supabase,
  id: string,
  studentPaymentPhaseId?: string
) {
  const { data, error } = await client.rpc("delete_student_payment", {
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
        paymentPhaseId: "",
      } satisfies DeleteStudentPaymentRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      deleted: asPaymentRecord(row.deleted),
      studentPaymentPhaseId:
        typeof row.studentPaymentPhaseId === "string"
          ? row.studentPaymentPhaseId
          : "",
      paymentPhaseId:
        typeof row.paymentPhaseId === "string" ? row.paymentPhaseId : "",
    } satisfies DeleteStudentPaymentRpcResult,
    error: null,
  };
}
