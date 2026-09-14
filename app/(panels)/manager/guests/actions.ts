"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
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
import { parseAssignGuestToTeamFormData } from "@/lib/validators/manager/assign-guest-to-team";
import { parseCreateTeamFormData } from "@/lib/validators/manager/create-team";
import { parseUpdateTeamFormData } from "@/lib/validators/manager/update-team";
import {
  parseRemoveTempRegistrationDocumentFormData,
  parseSubmitGuestRegistrationStaffFormData,
  parseTempUploadRegistrationDocumentFormData,
} from "@/lib/validators/public/registration";
import {
  createGuestForManager,
  deleteGuestForManager,
  listGuestStatusEventsForManager,
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
import {
  assignGuestToTeamForManager,
  createTeamForManager,
  deleteTeamForManager,
  updateTeamForManager,
} from "@/services/teams/team.service";
import type {
  CancelGuestRegistrationApplicationActionState,
  ChangeGuestStatusActionState,
  ConnectGuestRegistrationUserActionState,
  CreateGuestActionState,
  DeleteGuestActionState,
  DeleteGuestRegistrationApplicationActionState,
  ManagerGuestStatusEventRow,
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
  AssignGuestToTeamActionState,
  CreateTeamActionState,
  DeleteTeamActionState,
  UpdateTeamActionState,
} from "@/types/manager-team";
import type {
  RemoveTempRegistrationDocumentActionState,
  TempUploadRegistrationDocumentActionState,
} from "@/types/public-registration";

export async function createGuestAction(
  _prevState: CreateGuestActionState,
  formData: FormData
): Promise<CreateGuestActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateGuestFormData,
    mutate: ({ adminClient, actor, data }) =>
      createGuestForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      guest: result.guest,
    }),
  });
}

export async function updateGuestAction(
  _prevState: UpdateGuestActionState,
  formData: FormData
): Promise<UpdateGuestActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateGuestFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateGuestForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
      revalidatePath(getManagerGuestDetailRoute(result.guest.id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      guest: result.guest,
    }),
  });
}

export async function deleteGuestAction(
  _prevState: DeleteGuestActionState,
  formData: FormData
): Promise<DeleteGuestActionState> {
  const guestId = String(formData.get("id") ?? "").trim();

  if (!guestId) {
    return {
      success: false,
      error: "Guest not found.",
    };
  }

  return runManagerMutation({
    data: guestId,
    mutate: ({ adminClient, actor, data }) =>
      deleteGuestForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: () => {
      redirect(
        appendQueryParam(ROUTES.MANAGER_GUESTS, "toast", "guest_deleted")
      );
    },
  });
}

export async function changeGuestStatusAction(
  _prevState: ChangeGuestStatusActionState,
  formData: FormData
): Promise<ChangeGuestStatusActionState> {
  return runManagerAction({
    formData,
    parse: parseChangeGuestStatusFormData,
    mutate: ({ adminClient, actor, data }) =>
      setGuestStatusForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      guest: result.guest,
      statusEvents: result.statusEvents,
    }),
  });
}

export async function recordGuestStatusesAction(
  _prevState: RecordGuestStatusesActionState,
  formData: FormData
): Promise<RecordGuestStatusesActionState> {
  return runManagerAction({
    formData,
    parse: parseRecordGuestStatusesFormData,
    mutate: ({ adminClient, actor, data }) =>
      setGuestStatusesForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      guest: result.guest,
      statusEvents: result.statusEvents,
    }),
  });
}

export async function setGuestProfileStatusAction(
  _prevState: SetGuestProfileStatusActionState,
  formData: FormData
): Promise<SetGuestProfileStatusActionState> {
  return runManagerAction({
    formData,
    parse: parseSetGuestProfileStatusFormData,
    mutate: ({ adminClient, actor, data }) =>
      setGuestProfileStatusForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      guest: result.guest,
    }),
  });
}

export async function removeGuestStatusAction(
  _prevState: RemoveGuestStatusActionState,
  formData: FormData
): Promise<RemoveGuestStatusActionState> {
  return runManagerAction({
    formData,
    parse: parseRemoveGuestStatusFormData,
    mutate: ({ adminClient, actor, data }) =>
      removeGuestStatusForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      guest: result.guest,
      statusEvents: result.statusEvents,
      removedStatus: result.removedStatus,
    }),
  });
}

export async function openGuestRegistrationInviteAction(
  _prevState: OpenGuestRegistrationInviteActionState,
  formData: FormData
): Promise<OpenGuestRegistrationInviteActionState> {
  const guestId = String(formData.get("guest_id") ?? "").trim();
  const rotate = String(formData.get("rotate") ?? "") === "true";

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  return runManagerMutation({
    data: { guestId, rotate },
    mutate: ({ adminClient, actor, data }) =>
      openGuestRegistrationInviteForManager(
        adminClient,
        actor.userId,
        actor,
        data.guestId,
        { rotate: data.rotate }
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      invite: result.invite,
    }),
  });
}

export async function stopGuestRegistrationInviteAction(
  _prevState: StopGuestRegistrationInviteActionState,
  formData: FormData
): Promise<StopGuestRegistrationInviteActionState> {
  const guestId = String(formData.get("guest_id") ?? "").trim();

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  return runManagerMutation({
    data: guestId,
    mutate: ({ adminClient, actor, data }) =>
      stopGuestRegistrationInviteForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      invite: result.invite,
    }),
  });
}

export async function submitGuestRegistrationStaffAction(
  _prevState: SubmitGuestRegistrationStaffActionState,
  formData: FormData
): Promise<SubmitGuestRegistrationStaffActionState> {
  return runManagerAction({
    formData,
    parse: parseSubmitGuestRegistrationStaffFormData,
    mutate: ({ adminClient, actor, data }) => {
      const { guest_id: guestId, ...input } = data;
      return submitGuestRegistrationForManager(
        adminClient,
        actor.userId,
        actor,
        guestId,
        input
      );
    },
    revalidate: (_result, data) => {
      revalidatePath(getManagerGuestDetailRoute(data.guest_id));
      revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function tempUploadGuestRegistrationDocumentAction(
  formData: FormData
): Promise<TempUploadRegistrationDocumentActionState> {
  return runManagerAction({
    formData,
    parse: parseTempUploadRegistrationDocumentFormData,
    mutate: ({ adminClient, actor, data }) =>
      tempUploadGuestRegistrationDocumentForManager(
        adminClient,
        actor.userId,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      document: result.document,
    }),
  });
}

export async function removeTempGuestRegistrationDocumentAction(
  formData: FormData
): Promise<RemoveTempRegistrationDocumentActionState> {
  return runManagerAction({
    formData,
    parse: parseRemoveTempRegistrationDocumentFormData,
    mutate: ({ adminClient, actor, data }) =>
      removeTempGuestRegistrationDocumentForManager(
        adminClient,
        actor.userId,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function cancelGuestRegistrationApplicationAction(
  _prevState: CancelGuestRegistrationApplicationActionState,
  formData: FormData
): Promise<CancelGuestRegistrationApplicationActionState> {
  const guestId = String(formData.get("guest_id") ?? "").trim();

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  return runManagerMutation({
    data: guestId,
    mutate: ({ adminClient, actor, data }) =>
      cancelGuestRegistrationApplicationForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (_result, data) => {
      revalidatePath(getManagerGuestDetailRoute(data));
      revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function deleteGuestRegistrationApplicationAction(
  _prevState: DeleteGuestRegistrationApplicationActionState,
  formData: FormData
): Promise<DeleteGuestRegistrationApplicationActionState> {
  const guestId = String(formData.get("guest_id") ?? "").trim();

  if (!guestId) {
    return { success: false, error: "Guest not found." };
  }

  return runManagerMutation({
    data: guestId,
    mutate: ({ adminClient, actor, data }) =>
      deleteGuestRegistrationApplicationForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (_result, data) => {
      revalidatePath(getManagerGuestDetailRoute(data));
      revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function connectGuestRegistrationUserAction(
  _prevState: ConnectGuestRegistrationUserActionState,
  formData: FormData
): Promise<ConnectGuestRegistrationUserActionState> {
  return runManagerAction({
    formData,
    parse: parseConnectGuestRegistrationUserFormData,
    mutate: ({ adminClient, actor, data }) =>
      connectGuestRegistrationUserForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      application: result.application,
    }),
  });
}

export async function createStudentFromGuestAction(
  _prevState: CreateStudentFromGuestActionState,
  formData: FormData
): Promise<CreateStudentFromGuestActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateStudentFromGuestFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStudentFromGuestRegistrationForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (_result, data) => {
      revalidatePath(getManagerGuestDetailRoute(data.guest_id));
      revalidatePath(ROUTES.MANAGER_GUESTS);
      revalidatePath(ROUTES.MANAGER_REGISTRATIONS);
      revalidateManagerPeopleLists();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      application: result.application,
    }),
  });
}

export async function createTeamAction(
  _prevState: CreateTeamActionState,
  formData: FormData
): Promise<CreateTeamActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateTeamFormData,
    mutate: ({ adminClient, actor, data }) =>
      createTeamForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      team: result.team,
    }),
  });
}

export async function updateTeamAction(
  _prevState: UpdateTeamActionState,
  formData: FormData
): Promise<UpdateTeamActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateTeamFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateTeamForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      team: result.team,
    }),
  });
}

export async function deleteTeamAction(
  _prevState: DeleteTeamActionState,
  formData: FormData
): Promise<DeleteTeamActionState> {
  const teamId = String(formData.get("id") ?? "").trim();

  if (!teamId) {
    return { success: false, error: "Team not found." };
  }

  return runManagerMutation({
    data: teamId,
    mutate: ({ adminClient, actor, data }) =>
      deleteTeamForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      teamId: result.teamId,
    }),
  });
}

export async function assignGuestToTeamAction(
  _prevState: AssignGuestToTeamActionState,
  formData: FormData
): Promise<AssignGuestToTeamActionState> {
  return runManagerAction({
    formData,
    parse: parseAssignGuestToTeamFormData,
    mutate: ({ adminClient, actor, data }) =>
      assignGuestToTeamForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_GUESTS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      guestId: result.guestId,
      teamId: result.teamId,
    }),
  });
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

export async function listGuestStatusEventsAction(
  guestId: string
): Promise<
  | { success: true; statusEvents: ManagerGuestStatusEventRow[] }
  | { success: false; error: string }
> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  try {
    const statusEvents = await listGuestStatusEventsForManager(
      adminClient,
      actor.userId,
      guestId
    );
    return { success: true, statusEvents };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load guest statuses. Please try again.",
    };
  }
}
