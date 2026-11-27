"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseSendEmailFormData } from "@/lib/validators/manager/send-email";
import {
  sendEmailsForManager,
  listEmailingClassMemberUserIdsForManager,
} from "@/services/communications/email.service";
import {
  findEmailingRecipientByEmailForManager,
  listEmailingRecipientsForBulkForManager,
  listEmailingRecipientsPageForManager,
} from "@/services/communications/emailing-recipients.service";
import type { RoleValue } from "@/lib/constants/roles";
import type {
  ManagerEmailingRecipientsListData,
  ManagerEmailingRecipientsListQuery,
  SendManagerEmailActionState,
} from "@/types/manager-emailing";
import type { ManagerUserRow } from "@/types/manager-user";

export async function sendManagerEmailAction(
  _prevState: SendManagerEmailActionState,
  formData: FormData
): Promise<SendManagerEmailActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSendEmailFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await sendEmailsForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
      sentCount: result.sentCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
    };
  }

  return {
    success: true,
    message: result.message,
    sentCount: result.sentCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
  };
}

/**
 * Server-paged recipients for the emailing table and compose search.
 */
export async function loadEmailingRecipientsPageAction(
  query: ManagerEmailingRecipientsListQuery
): Promise<ManagerEmailingRecipientsListData | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listEmailingRecipientsPageForManager(
      adminClient,
      actor.userId,
      query
    );
  } catch {
    return null;
  }
}

/**
 * Suggestion search for compose/resend recipient pickers (first page only).
 */
export async function searchEmailingRecipientsAction(
  search: string
): Promise<ManagerUserRow[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    const data = await listEmailingRecipientsPageForManager(
      adminClient,
      actor.userId,
      {
        page: 1,
        pageSize: 10,
        search,
      }
    );
    return data.users.filter((user) => Boolean(user.email?.trim()));
  } catch {
    return [];
  }
}

export type LoadEmailingRecipientsByRoleResult = {
  users: ManagerUserRow[];
  truncated: boolean;
  limit: number;
};

/**
 * Bulk role shortcuts for compose/resend — loads matching roster on demand.
 */
export async function loadEmailingRecipientsByRoleAction(
  roles?: RoleValue[]
): Promise<LoadEmailingRecipientsByRoleResult> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return { users: [], truncated: false, limit: 0 };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    const result = await listEmailingRecipientsForBulkForManager(
      adminClient,
      actor.userId,
      roles?.length ? roles : null
    );
    return {
      users: result.users.filter((user) => Boolean(user.email?.trim())),
      truncated: result.truncated,
      limit: result.limit,
    };
  } catch {
    return { users: [], truncated: false, limit: 0 };
  }
}

/**
 * Resolve a typed email to an existing user when possible.
 */
export async function findEmailingRecipientByEmailAction(
  email: string
): Promise<ManagerUserRow | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await findEmailingRecipientByEmailForManager(
      adminClient,
      actor.userId,
      email
    );
  } catch {
    return null;
  }
}

export async function listEmailingClassMemberUserIdsAction(
  classId: string
): Promise<string[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listEmailingClassMemberUserIdsForManager(
      adminClient,
      actor.userId,
      classId
    );
  } catch {
    return [];
  }
}
