import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const PAYMENT_PHASE_COLUMNS =
  "id, name, semester_id, semester_code, amount, upfront_amount, duration_months, start_date, end_date, status, created_at, updated_at";

const PAYMENT_PHASE_LIST_SELECT = `${PAYMENT_PHASE_COLUMNS}, semesters ( id, name, semester_code )`;

export type PaymentPhaseRecord = {
  id: string;
  name: string;
  semester_id: string;
  semester_code: string;
  amount: number;
  upfront_amount: number;
  duration_months: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PaymentPhaseListRecord = PaymentPhaseRecord & {
  semesters: {
    id: string;
    name: string;
    semester_code: string;
  } | null;
};

export type CreatePaymentPhaseRecordInput = {
  name: string;
  semester_id: string;
  semester_code: string;
  amount: number;
  upfront_amount: number;
  duration_months: number;
  start_date: string;
  end_date: string;
  status: string;
};

export async function listPaymentPhases(client: Supabase) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_LIST_SELECT)
    .order("created_at", { ascending: false });
}

export async function findPaymentPhaseById(client: Supabase, id: string) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_LIST_SELECT)
    .eq("id", id)
    .maybeSingle();
}

export async function listPaymentPhaseNamesByIds(
  client: Supabase,
  ids: string[]
) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client.from("payment_phases").select("id, name").in("id", ids);
}

export async function listPaymentPhaseAmountsByIds(
  client: Supabase,
  ids: string[]
) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("payment_phases")
    .select("id, name, amount, duration_months, status")
    .in("id", ids);
}

export async function findOpenedPaymentPhaseBySemesterId(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_COLUMNS)
    .eq("semester_id", semesterId)
    .eq("status", "opened")
    .maybeSingle();
}

export async function findLatestClosedPaymentPhaseBySemesterId(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_COLUMNS)
    .eq("semester_id", semesterId)
    .eq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** Prefer opened phase for a semester; else latest closed. Never returns cancelled. */
export async function findCurrentSyncPhaseBySemesterId(
  client: Supabase,
  semesterId: string
) {
  const opened = await findOpenedPaymentPhaseBySemesterId(client, semesterId);
  if (opened.error) {
    return opened;
  }
  if (opened.data) {
    return opened;
  }
  return findLatestClosedPaymentPhaseBySemesterId(client, semesterId);
}

export async function listOpenedPaymentPhases(client: Supabase) {
  return client
    .from("payment_phases")
    .select(PAYMENT_PHASE_LIST_SELECT)
    .eq("status", "opened")
    .order("created_at", { ascending: false });
}

export async function listOpenedPaymentPhaseSemesterIds(client: Supabase) {
  return client
    .from("payment_phases")
    .select("semester_id")
    .eq("status", "opened");
}

export async function createPaymentPhase(
  client: Supabase,
  input: CreatePaymentPhaseRecordInput
) {
  return client
    .from("payment_phases")
    .insert({
      name: input.name,
      semester_id: input.semester_id,
      semester_code: input.semester_code,
      amount: input.amount,
      upfront_amount: input.upfront_amount,
      duration_months: input.duration_months,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status,
    })
    .select(PAYMENT_PHASE_COLUMNS)
    .single();
}

export type UpdatePaymentPhaseRecordInput = {
  name: string;
  amount: number;
  upfront_amount: number;
  duration_months: number;
  start_date: string;
  end_date: string;
};

export async function updatePaymentPhase(
  client: Supabase,
  id: string,
  input: UpdatePaymentPhaseRecordInput
) {
  return client
    .from("payment_phases")
    .update({
      name: input.name,
      amount: input.amount,
      upfront_amount: input.upfront_amount,
      duration_months: input.duration_months,
      start_date: input.start_date,
      end_date: input.end_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PAYMENT_PHASE_LIST_SELECT)
    .single();
}

export async function updatePaymentPhaseStatus(
  client: Supabase,
  id: string,
  status: string
) {
  return client
    .from("payment_phases")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PAYMENT_PHASE_LIST_SELECT)
    .single();
}

export async function findSyncTargetPhaseForClass(
  client: Supabase,
  classId: string
) {
  return client.rpc("find_sync_target_phase_for_class", {
    p_class_id: classId,
  });
}

export type BillingClassSummary = { id: string; name: string };

export type CreatePaymentPhaseWithSppsRpcResult = {
  phase: PaymentPhaseRecord | null;
  semester: { id: string; name: string; semester_code: string } | null;
  sppCount: number;
  billingClass: BillingClassSummary | null;
};

export type CancelPaymentPhaseRpcResult = {
  phase: PaymentPhaseRecord | null;
  previousStatus: string;
  semester: { id: string; name: string; semester_code: string } | null;
  sppActiveCount: number;
  sppPaidCount: number;
  billingClass: BillingClassSummary | null;
};

function asNumber(input: unknown) {
  return typeof input === "number" ? input : input == null ? 0 : Number(input);
}

function asPhaseRecord(value: unknown): PaymentPhaseRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : "",
    semester_id: typeof row.semester_id === "string" ? row.semester_id : "",
    semester_code:
      typeof row.semester_code === "string" ? row.semester_code : "",
    amount: asNumber(row.amount),
    upfront_amount: asNumber(row.upfront_amount),
    duration_months: asNumber(row.duration_months),
    start_date: typeof row.start_date === "string" ? row.start_date : "",
    end_date: typeof row.end_date === "string" ? row.end_date : "",
    status: typeof row.status === "string" ? row.status : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

function asSemesterSummary(
  value: unknown
): { id: string; name: string; semester_code: string } | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") {
    return null;
  }
  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : "",
    semester_code:
      typeof row.semester_code === "string" ? row.semester_code : "",
  };
}

function asBillingClass(value: unknown): BillingClassSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }
  return { id: row.id, name: row.name };
}

export async function createPaymentPhaseWithSpps(
  client: Supabase,
  input: {
    name: string;
    semester_id: string;
    amount: number;
    upfront_amount: number;
    duration_months: number;
    start_date: string;
    end_date: string;
  }
) {
  const { data, error } = await client.rpc("create_payment_phase_with_spps", {
    p_name: input.name,
    p_semester_id: input.semester_id,
    p_amount: input.amount,
    p_upfront_amount: input.upfront_amount,
    p_duration_months: input.duration_months,
    p_start_date: input.start_date,
    p_end_date: input.end_date,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        phase: null,
        semester: null,
        sppCount: 0,
        billingClass: null,
      } satisfies CreatePaymentPhaseWithSppsRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      phase: asPhaseRecord(row.phase),
      semester: asSemesterSummary(row.semester),
      sppCount:
        typeof row.sppCount === "number"
          ? row.sppCount
          : Number(row.sppCount) || 0,
      billingClass: asBillingClass(row.billingClass),
    } satisfies CreatePaymentPhaseWithSppsRpcResult,
    error: null,
  };
}

export async function cancelPaymentPhase(client: Supabase, phaseId: string) {
  const { data, error } = await client.rpc("cancel_payment_phase", {
    p_payment_phase_id: phaseId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        phase: null,
        previousStatus: "",
        semester: null,
        sppActiveCount: 0,
        sppPaidCount: 0,
        billingClass: null,
      } satisfies CancelPaymentPhaseRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      phase: asPhaseRecord(row.phase),
      previousStatus:
        typeof row.previousStatus === "string" ? row.previousStatus : "",
      semester: asSemesterSummary(row.semester),
      sppActiveCount:
        typeof row.sppActiveCount === "number"
          ? row.sppActiveCount
          : Number(row.sppActiveCount) || 0,
      sppPaidCount:
        typeof row.sppPaidCount === "number"
          ? row.sppPaidCount
          : Number(row.sppPaidCount) || 0,
      billingClass: asBillingClass(row.billingClass),
    } satisfies CancelPaymentPhaseRpcResult,
    error: null,
  };
}
