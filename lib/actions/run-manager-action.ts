import "server-only";

import { after } from "next/server";
import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ParseFormResult } from "@/lib/validators/safe-parse-form-data";
import type { FieldErrors } from "@/types/auth";
import type { AuditActor } from "@/services/ops/audit-log.service";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type ActionFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

type ManagerActionContext<TData> = {
  adminClient: AdminClient;
  actor: AuditActor;
  data: TData;
};

type MutateSuccess<TMutateResult extends { success: boolean }> = Extract<
  TMutateResult,
  { success: true }
>;

type MutateFailure<TMutateResult extends { success: boolean }> = Extract<
  TMutateResult,
  { success: false }
>;

/**
 * Shared manager server-action flow:
 * audit actor → parse FormData → service mutate → optional revalidate → map success.
 */
export async function runManagerAction<
  TData,
  TMutateResult extends { success: boolean },
  TState,
>(options: {
  formData: FormData;
  parse: (formData: FormData) => ParseFormResult<TData>;
  mutate: (ctx: ManagerActionContext<TData>) => Promise<TMutateResult>;
  revalidate?: (
    result: MutateSuccess<TMutateResult>,
    data: TData
  ) => void | Promise<void>;
  mapSuccess: (
    result: MutateSuccess<TMutateResult>,
    data: TData
  ) => TState;
}): Promise<TState | ActionFailure> {
  const actor = await getSessionAuditActor();
  const parsed = options.parse(options.formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await options.mutate({
    adminClient,
    actor,
    data: parsed.data,
  });

  if (!result.success) {
    const failure = result as MutateFailure<TMutateResult> & {
      error: string;
      fieldErrors?: FieldErrors;
    };
    return {
      success: false,
      error: failure.error,
      fieldErrors: failure.fieldErrors,
    };
  }

  const success = result as MutateSuccess<TMutateResult>;
  const data = parsed.data;
  const revalidate = options.revalidate;
  if (revalidate) {
    // Keep revalidatePath out of the action response. In production the
    // bundled RSC refresh often does not commit until the next click.
    after(() => {
      void revalidate(success, data);
    });
  }
  return options.mapSuccess(success, data);
}

/**
 * Same orchestration when input is already resolved (e.g. delete by id).
 */
export async function runManagerMutation<
  TData,
  TMutateResult extends { success: boolean },
  TState,
>(options: {
  data: TData;
  mutate: (ctx: ManagerActionContext<TData>) => Promise<TMutateResult>;
  revalidate?: (
    result: MutateSuccess<TMutateResult>,
    data: TData
  ) => void | Promise<void>;
  mapSuccess: (
    result: MutateSuccess<TMutateResult>,
    data: TData
  ) => TState;
}): Promise<TState | ActionFailure> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await options.mutate({
    adminClient,
    actor,
    data: options.data,
  });

  if (!result.success) {
    const failure = result as MutateFailure<TMutateResult> & {
      error: string;
      fieldErrors?: FieldErrors;
    };
    return {
      success: false,
      error: failure.error,
      fieldErrors: failure.fieldErrors,
    };
  }

  const success = result as MutateSuccess<TMutateResult>;
  const data = options.data;
  const revalidate = options.revalidate;
  if (revalidate) {
    after(() => {
      void revalidate(success, data);
    });
  }
  return options.mapSuccess(success, data);
}
