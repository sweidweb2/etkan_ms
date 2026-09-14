import "server-only";

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

type ServiceFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

type ManagerActionContext<TData> = {
  adminClient: AdminClient;
  actor: AuditActor;
  data: TData;
};

/**
 * Shared manager server-action flow:
 * audit actor → parse FormData → service mutate → optional revalidate → map success.
 */
export async function runManagerAction<
  TData,
  TResult extends { success: true },
  TState,
>(options: {
  formData: FormData;
  parse: (formData: FormData) => ParseFormResult<TData>;
  mutate: (
    ctx: ManagerActionContext<TData>
  ) => Promise<TResult | ServiceFailure>;
  revalidate?: (result: TResult, data: TData) => void | Promise<void>;
  mapSuccess: (result: TResult, data: TData) => TState;
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
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  await options.revalidate?.(result, parsed.data);
  return options.mapSuccess(result, parsed.data);
}

/**
 * Same orchestration when input is already resolved (e.g. delete by id).
 */
export async function runManagerMutation<
  TData,
  TResult extends { success: true },
  TState,
>(options: {
  data: TData;
  mutate: (
    ctx: ManagerActionContext<TData>
  ) => Promise<TResult | ServiceFailure>;
  revalidate?: (result: TResult, data: TData) => void | Promise<void>;
  mapSuccess: (result: TResult, data: TData) => TState;
}): Promise<TState | ActionFailure> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await options.mutate({
    adminClient,
    actor,
    data: options.data,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  await options.revalidate?.(result, options.data);
  return options.mapSuccess(result, options.data);
}
