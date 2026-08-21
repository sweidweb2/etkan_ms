"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerPeopleLists } from "@/lib/cache/manager-list-cache";
import {
  getManagerGuestDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseConnectGuestRegistrationUserFormData } from "@/lib/validators/manager/connect-guest-registration-user";
import { parseCreateStudentFromGuestFormData } from "@/lib/validators/manager/create-student-from-guest";
import { parseChangeGuestStatusFormData } from "@/lib/validators/manager/change-guest-status";
import { parseCreateGuestFormData } from "@/lib/validators/manager/create-guest";
import { parseRecordGuestStatusesFormData } from "@/lib/validators/manager/record-guest-statuses";
import { parseRemoveGuestStatusFormData } from "@/lib/validators/manager/remove-guest-status";
import { parseSetGuestProfileStatusFormData } from "@/lib/validators/manager/set-guest-profile-status";
import { parseUpdateGuestFormData } from "@/lib/validators/manager/update-guest";
import {
  parseRemoveTempRegistrationDocumentFormData,
  parseSubmitGuestRegistrationStaffFormData,
  parseTempUploadRegistrationDocumentFormData,
} from "@/lib/validators/public/registration";
import {
  createGuestForManager,
  deleteGuestForManager,
  removeGuestStatusForManager,
  setGuestProfileStatusForManager,
  setGuestStatusForManager,
  setGuestStatusesForManager,
  updateGuestForManager,
} from "@/services/guests/guest.service";
import {
  cancelGuestRegistrationApplicationForManager,
  connectGuestRegistrationUserForManager,
  deleteGuestRegistrationApplicationForManager,
  listUsersForGuestRegistrationLink,
  openGuestRegistrationInviteForManager,
  removeTempGuestRegistrationDocumentForManager,
  stopGuestRegistrationInviteForManager,
  submitGuestRegistrationForManager,
  tempUploadGuestRegistrationDocumentForManager,
} from "@/services/guests/guest-registration.service";
import { createStudentFromGuestRegistrationForManager } from "@/services/guests/guest-create-student.service";
import type {
  CancelGuestRegistrationApplicationActionState,
  ChangeGuestStatusActionState,
  ConnectGuestRegistrationUserActionState,
  CreateGuestActionState,
  DeleteGuestActionState,
  DeleteGuestRegistrationApplicationActionState,
  OpenGuestRegistrationInviteActionState,
  RecordGuestStatusesActionState,
  RemoveGuestStatusActionState,
  SetGuestProfileStatusActionState,
  StopGuestRegistrationInviteActionState,
  SubmitGuestRegistrationStaffActionState,
  UpdateGuestActionState,
  CreateStudentFromGuestActionState,
  GuestRegistrationLinkUserOption,
} from "@/types/manager-guest";
import type {
  RemoveTempRegistrationDocumentActionState,
  TempUploadRegistrationDocumentActionState,
} from "@/types/public-registration";

export async function createGuestAction(
  _prevState: CreateGuestActionState,
  formData: FormData
): Promise<CreateGuestActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateGuestFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createGuestForManager(
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
    };
  }

  revalidatePath(ROUTES.MANAGER_GUESTS);
  return {
    success: true,
    message: result.message,
    guest: result.guest,
  };
}

export async function updateGuestAction(
  _prevState: UpdateGuestActionState,
  formData: FormData
): Promise<UpdateGuestActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateGuestFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateGuestForManager(
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
    };
  }

  revalidatePath(ROUTES.MANAGER_GUESTS);
  revalidatePath(getManagerGuestDetailRoute(result.guest.id));
  return {
    success: true,
    message: result.message,
    guest: result.guest,
  };
}

export async function deleteGuestAction(
  _prevState: DeleteGuestActionState,
  formData: FormData
): Promise<DeleteGuestActionState> {
  const actor = await getSessionAuditActor();
  const guestId = String(formData.get("id") ?? "").trim();

  if (!guestId) {
    return {
      success: false,
      error: "Guest not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteGuestForManager(
    adminClient,
    actor.userId,
    actor,
    guestId
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(ROUTES.MANAGER_GUESTS);
  redirect(appendQueryParam(ROUTES.MANAGER_GUESTS, "toast", "guest_deleted"));
}

export async function changeGuestStatusAction(
  _prevState: ChangeGuestStatusActionState,
  formData: FormData
): Promise<ChangeGuestStatusActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseChangeGuestStatusFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await setGuestStatusForManager(
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
    };
  }

  revalidatePath(ROUTES.MANAGER_GUESTS);
  return {
    success: true,
    message: result.message,
    guest: result.guest,
    statusEvents: result.statusEvents,
  };
}

export async function recordGuestStatusesAction(
  _prevState: RecordGuestStatusesActionState,
  formData: FormData
): Promise<RecordGuestStatusesActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseRecordGuestStatusesFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await setGuestStatusesForManager(
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
    };
  }

  revalidatePath(ROUTES.MANAGER_GUESTS);
  return {
    success: true,
    message: result.message,
    guest: result.guest,
    statusEvents: result.statusEvents,
  };
}

export async function setGuestProfileStatusAction(
  _prevState: SetGuestProfileStatusActionState,
  formData: FormData
): Promise<SetGuestProfileStatusActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSetGuestProfileStatusFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await setGuestProfileStatusForManager(
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
    };
  }

  revalidatePath(ROUTES.MANAGER_GUESTS);
  return {
    success: true,
    message: result.message,
    guest: result.guest,
  };
}

export async function removeGuestStatusAction(
  _prevState: RemoveGuestStatusActionState,
  formData: FormData
): Promise<RemoveGuestStatusActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseRemoveGuestStatusFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await removeGuestStatusForManager(
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
    };
  }

  revalidatePath(ROUTES.MANAGER_GUESTS);
  return {
    success: true,
    message: result.message,
    guest: result.guest,
    statusEvents: result.statusEvents,
    removedStatus: result.removedStatus,
  };
}

export async function openGuestRegistrationInviteAction(
  _prevState: OpenGuestRegistrationInviteActionState,
  formData: FormData
): Promise<OpenGuestRegistrationInviteActionState> {
  const actor = await getSessionAuditActor();
  const guestId = String(formData.get("guest_id") ?? "").trim();
  const rotate = String(formData.get("rotate") ?? "") === "true";

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await openGuestRegistrationInviteForManager(
    adminClient,
    actor.userId,
    actor,
    guestId,
    { rotate }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: result.message,
    invite: result.invite,
  };
}

export async function stopGuestRegistrationInviteAction(
  _prevState: StopGuestRegistrationInviteActionState,
  formData: FormData
): Promise<StopGuestRegistrationInviteActionState> {
  const actor = await getSessionAuditActor();
  const guestId = String(formData.get("guest_id") ?? "").trim();

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await stopGuestRegistrationInviteForManager(
    adminClient,
    actor.userId,
    actor,
    guestId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: result.message,
    invite: result.invite,
  };
}

export async function submitGuestRegistrationStaffAction(
  _prevState: SubmitGuestRegistrationStaffActionState,
  formData: FormData
): Promise<SubmitGuestRegistrationStaffActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSubmitGuestRegistrationStaffFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const { guest_id: guestId, ...input } = parsed.data;
  const adminClient = createSupabaseAdminClient();
  const result = await submitGuestRegistrationForManager(
    adminClient,
    actor.userId,
    actor,
    guestId,
    input
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(getManagerGuestDetailRoute(guestId));
  revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
  return {
    success: true,
    message: result.message,
  };
}

export async function tempUploadGuestRegistrationDocumentAction(
  formData: FormData
): Promise<TempUploadRegistrationDocumentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseTempUploadRegistrationDocumentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await tempUploadGuestRegistrationDocumentForManager(
    adminClient,
    actor.userId,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  return {
    success: true,
    message: result.message,
    document: result.document,
  };
}

export async function removeTempGuestRegistrationDocumentAction(
  formData: FormData
): Promise<RemoveTempRegistrationDocumentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseRemoveTempRegistrationDocumentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await removeTempGuestRegistrationDocumentForManager(
    adminClient,
    actor.userId,
    parsed.data
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: result.message,
  };
}

export async function cancelGuestRegistrationApplicationAction(
  _prevState: CancelGuestRegistrationApplicationActionState,
  formData: FormData
): Promise<CancelGuestRegistrationApplicationActionState> {
  const actor = await getSessionAuditActor();
  const guestId = String(formData.get("guest_id") ?? "").trim();

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await cancelGuestRegistrationApplicationForManager(
    adminClient,
    actor.userId,
    actor,
    guestId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(getManagerGuestDetailRoute(guestId));
  revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
  return {
    success: true,
    message: result.message,
  };
}

export async function deleteGuestRegistrationApplicationAction(
  _prevState: DeleteGuestRegistrationApplicationActionState,
  formData: FormData
): Promise<DeleteGuestRegistrationApplicationActionState> {
  const actor = await getSessionAuditActor();
  const guestId = String(formData.get("guest_id") ?? "").trim();

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteGuestRegistrationApplicationForManager(
    adminClient,
    actor.userId,
    actor,
    guestId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(getManagerGuestDetailRoute(guestId));
  revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
  return {
    success: true,
    message: result.message,
  };
}

export async function connectGuestRegistrationUserAction(
  _prevState: ConnectGuestRegistrationUserActionState,
  formData: FormData
): Promise<ConnectGuestRegistrationUserActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseConnectGuestRegistrationUserFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await connectGuestRegistrationUserForManager(
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
    };
  }

  return {
    success: true,
    message: result.message,
    application: result.application,
  };
}

export async function createStudentFromGuestAction(
  _prevState: CreateStudentFromGuestActionState,
  formData: FormData
): Promise<CreateStudentFromGuestActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateStudentFromGuestFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createStudentFromGuestRegistrationForManager(
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
    };
  }

  revalidatePath(getManagerGuestDetailRoute(parsed.data.guest_id));
  revalidatePath(ROUTES.MANAGER_GUESTS);
  revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
  revalidateManagerPeopleLists();

  return {
    success: true,
    message: result.message,
    application: result.application,
  };
}

export async function listGuestRegistrationLinkUsersAction(): Promise<{
  users: GuestRegistrationLinkUserOption[];
  error?: string;
}> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  try {
    const users = await listUsersForGuestRegistrationLink(
      adminClient,
      actor.userId
    );
    return { users };
  } catch (error) {
    return {
      users: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load users. Please try again.",
    };
  }
}
