import "server-only";

import { after } from "next/server";
import { getSessionAuditActor } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/constants/permissions";
import { logOpsError } from "@/lib/ops/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ParseFormResult } from "@/lib/validators/safe-parse-form-data";
import type { FieldErrors } from "@/types/auth";
import {
  assertPermission,
  assertPermissions,
  hasAnyPermission,
  UNAUTHORIZED_MESSAGE,
} from "@/services/auth/authorization.service";
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
 * Required gate so mutations cannot skip authz.
 * - single key / all-of array: every key required
 * - `{ anyOf }`: at least one key required (e.g. staff OR team-leader)
 */
export type ManagerActionPermission =
  | PermissionKey
  | readonly PermissionKey[]
  | { anyOf: readonly PermissionKey[] };

async function assertManagerActionPermission(
  adminClient: AdminClient,
  userId: string | null,
  permission: ManagerActionPermission
): Promise<void> {
  if (typeof permission === "string") {
    await assertPermission(adminClient, userId, permission);
    return;
  }
  if ("anyOf" in permission) {
    if (!userId) {
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
    const allowed = await hasAnyPermission(
      adminClient,
      userId,
      permission.anyOf
    );
    if (!allowed) {
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
    return;
  }
  await assertPermissions(adminClient, userId, permission);
}

function actionFailureFromError(error: unknown): ActionFailure {
  if (error instanceof Error && error.message === UNAUTHORIZED_MESSAGE) {
    return { success: false, error: UNAUTHORIZED_MESSAGE };
  }
  return {
    success: false,
    error: "Something went wrong. Please try again.",
  };
}

/**
 * Shared manager server-action flow:
 * audit actor → parse FormData → permission assert → service mutate →
 * optional revalidate → map success.
 *
 * `permission` is required. UI `<Can>` is cosmetic only.
 */
export async function runManagerAction<
  TData,
  TMutateResult extends { success: boolean },
  TState,
>(options: {
  formData: FormData;
  /** Required gate — asserted before `mutate` (service asserts may still add scope). */
  permission: ManagerActionPermission;
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
  try {
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
    await assertManagerActionPermission(
      adminClient,
      actor.userId,
      options.permission
    );

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
  } catch (error) {
    logOpsError("runManagerAction", error);
    return actionFailureFromError(error);
  }
}

/**
 * Same orchestration when input is already resolved (e.g. delete by id).
 * `permission` is required.
 */
export async function runManagerMutation<
  TData,
  TMutateResult extends { success: boolean },
  TState,
>(options: {
  data: TData;
  /** Required gate — asserted before `mutate`. */
  permission: ManagerActionPermission;
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
  try {
    const actor = await getSessionAuditActor();
    const adminClient = createSupabaseAdminClient();
    await assertManagerActionPermission(
      adminClient,
      actor.userId,
      options.permission
    );

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
  } catch (error) {
    logOpsError("runManagerMutation", error);
    return actionFailureFromError(error);
  }
}
