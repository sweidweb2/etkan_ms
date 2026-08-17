import { randomBytes } from "crypto";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getGuestRegistrationInviteUrl } from "@/lib/manager/guests/guest-registration-invite-url";
import type { SubmitPublicRegistrationInput } from "@/lib/validators/public/registration";
import * as guestRepository from "@/repositories/guest.repository";
import * as inviteRepository from "@/repositories/guest-registration-invite.repository";
import type { GuestRegistrationInviteRecord } from "@/repositories/guest-registration-invite.repository";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import * as documentRepository from "@/repositories/student-registration-document.repository";
import * as registrationStorage from "@/repositories/registration-storage.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import {
  getUnauthorizedError,
} from "@/services/authorization.service";
import { submitPublicRegistrationApplication } from "@/services/student-registration.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerGuestRegistrationApplicationSummary,
  ManagerGuestRegistrationInvite,
} from "@/types/manager-guest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type GuestRegistrationInvitePrefill = {
  full_name: string;
  phone: string;
  education_level: string;
  organization_name: string | null;
  age: number;
};

export type GuestRegistrationInviteContext =
  | { status: "invalid" }
  | { status: "stopped" }
  | { status: "used" }
  | {
      status: "valid";
      token: string;
      prefill: GuestRegistrationInvitePrefill;
    };

type InviteMutationSuccess = {
  success: true;
  message: string;
  invite: ManagerGuestRegistrationInvite;
};

type InviteMutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type InviteMutationResult = InviteMutationSuccess | InviteMutationFailure;

type SimpleMutationSuccess = {
  success: true;
  message: string;
};

type SimpleMutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type SimpleMutationResult = SimpleMutationSuccess | SimpleMutationFailure;

function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

function mapInviteRecord(
  record: GuestRegistrationInviteRecord
): ManagerGuestRegistrationInvite {
  return {
    id: record.id,
    guest_id: record.guest_id,
    token: record.token,
    application_id: record.application_id,
    created_at: record.created_at,
    used_at: record.used_at,
    cancelled_at: record.cancelled_at,
    public_url: getGuestRegistrationInviteUrl(record.token),
  };
}

function isInviteActiveUnused(invite: GuestRegistrationInviteRecord): boolean {
  return invite.cancelled_at == null && invite.used_at == null;
}

async function loadActiveApplicationSummary(
  adminClient: Supabase,
  guestId: string
): Promise<ManagerGuestRegistrationApplicationSummary | null> {
  const { data, error } =
    await registrationRepository.findActiveApplicationByGuestId(
      adminClient,
      guestId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status,
    created_at: data.created_at,
  };
}

async function resolveGuestApplicationId(
  adminClient: Supabase,
  guestId: string,
  invite: GuestRegistrationInviteRecord | null
): Promise<string | null> {
  let applicationId = invite?.application_id ?? null;
  if (!applicationId) {
    const active = await loadActiveApplicationSummary(adminClient, guestId);
    applicationId = active?.id ?? null;
  }
  return applicationId;
}

export async function getGuestRegistrationInviteBundleForManager(
  adminClient: Supabase,
  guestId: string
): Promise<{
  invite: ManagerGuestRegistrationInvite | null;
  application: ManagerGuestRegistrationApplicationSummary | null;
}> {
  const { data: invite, error } = await inviteRepository.findInviteByGuestId(
    adminClient,
    guestId
  );

  if (error) {
    throw new Error(error.message);
  }

  let application: ManagerGuestRegistrationApplicationSummary | null = null;

  if (invite?.application_id) {
    const appResult =
      await registrationRepository.findStudentRegistrationApplicationById(
        adminClient,
        invite.application_id
      );
    if (appResult.error) {
      throw new Error(appResult.error.message);
    }
    if (appResult.data) {
      application = {
        id: appResult.data.id,
        status: appResult.data.status,
        created_at: appResult.data.created_at,
      };
    }
  }

  if (!application) {
    application = await loadActiveApplicationSummary(adminClient, guestId);
  }

  return {
    invite: invite ? mapInviteRecord(invite) : null,
    application,
  };
}

export async function openGuestRegistrationInviteForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  guestId: string,
  options: { rotate?: boolean } = {}
): Promise<InviteMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_REGISTRATION_MANAGE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const guestResult = await guestRepository.findGuestById(adminClient, guestId);
  if (guestResult.error) {
    return { success: false, error: guestResult.error.message };
  }
  if (!guestResult.data) {
    return { success: false, error: "Guest not found." };
  }

  const activeApp = await loadActiveApplicationSummary(adminClient, guestId);
  if (activeApp) {
    return {
      success: false,
      error:
        "This guest already has an active registration application. Cancel or delete it before opening a new invite.",
    };
  }

  const existingResult = await inviteRepository.findInviteByGuestId(
    adminClient,
    guestId
  );
  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  const existing = existingResult.data;
  const rotateActive =
    Boolean(options.rotate) && Boolean(existing && isInviteActiveUnused(existing));

  if (existing && isInviteActiveUnused(existing) && !options.rotate) {
    return {
      success: true,
      message: "Registration invite is already open.",
      invite: mapInviteRecord(existing),
    };
  }

  const token = generateInviteToken();

  if (!existing) {
    const created = await inviteRepository.createInvite(adminClient, {
      guest_id: guestId,
      token,
      created_by: actor.userId,
    });

    if (created.error || !created.data) {
      return {
        success: false,
        error: created.error?.message ?? "Unable to open registration invite.",
      };
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "insert",
      severity: "info",
      table_name: "guest_registration_invites",
      record_id: created.data.id,
      new_data: { guest_id: guestId },
      metadata: { note: "Guest registration invite opened." },
    });

    return {
      success: true,
      message: "Registration invite opened.",
      invite: mapInviteRecord(created.data),
    };
  }

  const reset = await inviteRepository.updateInvite(adminClient, existing.id, {
    token,
    created_by: actor.userId,
    application_id: null,
    used_at: null,
    cancelled_at: null,
  });

  if (reset.error || !reset.data) {
    return {
      success: false,
      error: reset.error?.message ?? "Unable to reopen registration invite.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "guest_registration_invites",
    record_id: reset.data.id,
    new_data: { guest_id: guestId, token_rotated: true },
    metadata: {
      note: rotateActive
        ? "Guest registration invite link rotated."
        : "Guest registration invite reopened.",
    },
  });

  return {
    success: true,
    message: rotateActive
      ? "New registration invite link generated."
      : "Registration invite reopened.",
    invite: mapInviteRecord(reset.data),
  };
}

export async function stopGuestRegistrationInviteForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  guestId: string
): Promise<InviteMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_REGISTRATION_MANAGE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existingResult = await inviteRepository.findInviteByGuestId(
    adminClient,
    guestId
  );
  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }
  if (!existingResult.data) {
    return { success: false, error: "Registration invite not found." };
  }

  const existing = existingResult.data;
  if (existing.cancelled_at != null) {
    return {
      success: true,
      message: "Registration invite is already stopped.",
      invite: mapInviteRecord(existing),
    };
  }

  const stopped = await inviteRepository.stopInvite(
    adminClient,
    existing.id,
    new Date().toISOString()
  );

  if (stopped.error) {
    return { success: false, error: stopped.error.message };
  }

  const invite = stopped.data ?? {
    ...existing,
    cancelled_at: new Date().toISOString(),
  };

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "guest_registration_invites",
    record_id: invite.id,
    new_data: { guest_id: guestId, cancelled: true },
    metadata: { note: "Guest registration invite stopped." },
  });

  return {
    success: true,
    message: "Registration invite stopped.",
    invite: mapInviteRecord(invite),
  };
}

export async function getGuestRegistrationContextByToken(
  adminClient: Supabase,
  token: string
): Promise<GuestRegistrationInviteContext> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { status: "invalid" };
  }

  const { data: invite, error } = await inviteRepository.findInviteByToken(
    adminClient,
    trimmed
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!invite) {
    return { status: "invalid" };
  }
  if (invite.cancelled_at != null) {
    return { status: "stopped" };
  }
  if (invite.used_at != null) {
    return { status: "used" };
  }

  const guestResult = await guestRepository.findGuestById(
    adminClient,
    invite.guest_id
  );
  if (guestResult.error || !guestResult.data) {
    return { status: "invalid" };
  }

  const guest = guestResult.data;
  return {
    status: "valid",
    token: invite.token,
    prefill: {
      full_name: guest.full_name,
      phone: guest.phone,
      education_level: guest.education_level,
      organization_name: guest.school_or_university,
      age: guest.age,
    },
  };
}

async function finalizeGuestSubmit(
  adminClient: Supabase,
  invite: GuestRegistrationInviteRecord,
  applicationId: string
): Promise<SimpleMutationResult> {
  const marked = await inviteRepository.markInviteUsed(
    adminClient,
    invite.id,
    applicationId,
    new Date().toISOString()
  );

  if (marked.error) {
    await registrationRepository.deleteStudentRegistrationApplicationById(
      adminClient,
      applicationId
    );
    return {
      success: false,
      error: marked.error.message ?? "Unable to finalize guest registration.",
    };
  }

  if (!marked.data) {
    await registrationRepository.deleteStudentRegistrationApplicationById(
      adminClient,
      applicationId
    );
    return {
      success: false,
      error: "This registration invite is no longer available.",
    };
  }

  return {
    success: true,
    message: "Registration was submitted successfully.",
  };
}

async function assertInviteReadyForSubmit(
  adminClient: Supabase,
  invite: GuestRegistrationInviteRecord
): Promise<string | null> {
  if (invite.cancelled_at != null) {
    return "This registration invite has been stopped.";
  }
  if (invite.used_at != null) {
    return "This registration invite has already been used.";
  }

  const activeApp = await loadActiveApplicationSummary(
    adminClient,
    invite.guest_id
  );
  if (activeApp) {
    return "This guest already has an active registration application.";
  }

  return null;
}

export async function submitGuestRegistrationByToken(
  adminClient: Supabase,
  token: string,
  input: SubmitPublicRegistrationInput
): Promise<SimpleMutationResult> {
  const { data: invite, error } = await inviteRepository.findInviteByToken(
    adminClient,
    token.trim()
  );

  if (error) {
    return { success: false, error: error.message };
  }
  if (!invite) {
    return { success: false, error: "Invalid registration invite." };
  }

  const blocked = await assertInviteReadyForSubmit(adminClient, invite);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const submitResult = await submitPublicRegistrationApplication(
    adminClient,
    input,
    { guest_id: invite.guest_id }
  );

  if (!submitResult.success) {
    return {
      success: false,
      error: submitResult.error,
      fieldErrors: submitResult.fieldErrors,
    };
  }

  return finalizeGuestSubmit(adminClient, invite, submitResult.id);
}

export async function submitGuestRegistrationForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  guestId: string,
  input: SubmitPublicRegistrationInput
): Promise<SimpleMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_REGISTRATION_MANAGE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const { data: invite, error } = await inviteRepository.findInviteByGuestId(
    adminClient,
    guestId
  );

  if (error) {
    return { success: false, error: error.message };
  }
  if (!invite) {
    return {
      success: false,
      error: "Open a registration invite before filling the dossier.",
    };
  }

  const blocked = await assertInviteReadyForSubmit(adminClient, invite);
  if (blocked) {
    return { success: false, error: blocked };
  }

  const submitResult = await submitPublicRegistrationApplication(
    adminClient,
    input,
    { guest_id: guestId, skipRateLimit: true }
  );

  if (!submitResult.success) {
    return {
      success: false,
      error: submitResult.error,
      fieldErrors: submitResult.fieldErrors,
    };
  }

  const finalized = await finalizeGuestSubmit(
    adminClient,
    invite,
    submitResult.id
  );

  if (!finalized.success) {
    return finalized;
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_registration_applications",
    record_id: submitResult.id,
    new_data: { guest_id: guestId },
    metadata: { note: "Guest registration submitted by staff." },
  });

  return {
    success: true,
    message: "Guest registration submitted.",
  };
}

export async function cancelGuestRegistrationApplicationForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  guestId: string
): Promise<SimpleMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_REGISTRATION_MANAGE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const { data: invite, error: inviteError } =
    await inviteRepository.findInviteByGuestId(adminClient, guestId);
  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  const applicationId = await resolveGuestApplicationId(
    adminClient,
    guestId,
    invite
  );
  if (!applicationId) {
    return { success: false, error: "No registration application to cancel." };
  }

  const appResult =
    await registrationRepository.findStudentRegistrationApplicationById(
      adminClient,
      applicationId
    );
  if (appResult.error) {
    return { success: false, error: appResult.error.message };
  }
  if (!appResult.data) {
    return { success: false, error: "Registration application not found." };
  }
  if (appResult.data.guest_id !== guestId) {
    return { success: false, error: "Application does not belong to this guest." };
  }
  if (appResult.data.status === "cancelled") {
    return { success: true, message: "Registration application already cancelled." };
  }

  const updated =
    await registrationRepository.updateStudentRegistrationApplicationStatus(
      adminClient,
      applicationId,
      "cancelled"
    );

  if (updated.error) {
    return { success: false, error: updated.error.message };
  }

  if (invite && invite.cancelled_at == null) {
    await inviteRepository.stopInvite(
      adminClient,
      invite.id,
      new Date().toISOString()
    );
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "student_registration_applications",
    record_id: applicationId,
    new_data: { status: "cancelled", guest_id: guestId },
    metadata: { note: "Guest registration application cancelled." },
  });

  return {
    success: true,
    message: "Registration application cancelled.",
  };
}

export async function deleteGuestRegistrationApplicationForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  guestId: string
): Promise<SimpleMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GUESTS_REGISTRATION_MANAGE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const { data: invite, error: inviteError } =
    await inviteRepository.findInviteByGuestId(adminClient, guestId);
  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  const applicationId = await resolveGuestApplicationId(
    adminClient,
    guestId,
    invite
  );

  if (!applicationId) {
    return { success: false, error: "No registration application to delete." };
  }

  const appResult =
    await registrationRepository.findStudentRegistrationApplicationById(
      adminClient,
      applicationId
    );
  if (appResult.error) {
    return { success: false, error: appResult.error.message };
  }
  if (!appResult.data) {
    return { success: false, error: "Registration application not found." };
  }
  if (appResult.data.guest_id !== guestId) {
    return { success: false, error: "Application does not belong to this guest." };
  }

  const docsResult =
    await documentRepository.listStudentRegistrationDocumentsByApplicationId(
      adminClient,
      applicationId
    );
  if (docsResult.error) {
    return { success: false, error: docsResult.error.message };
  }

  const storagePaths = (docsResult.data ?? []).map((doc) => doc.storage_path);
  if (storagePaths.length > 0) {
    const storageResult =
      await registrationStorage.removeRegistrationStorageObjects(
        adminClient,
        storagePaths
      );
    if (storageResult.error) {
      return {
        success: false,
        error:
          storageResult.error.message ||
          "Unable to delete registration documents. Please try again.",
      };
    }
  }

  const deleted =
    await registrationRepository.deleteStudentRegistrationApplicationById(
      adminClient,
      applicationId
    );
  if (deleted.error) {
    return { success: false, error: deleted.error.message };
  }

  if (invite) {
    await inviteRepository.clearInviteApplicationId(adminClient, invite.id);
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_registration_applications",
    record_id: applicationId,
    old_data: { guest_id: guestId },
    metadata: { note: "Guest registration application hard-deleted." },
  });

  return {
    success: true,
    message: "Registration application deleted.",
  };
}
