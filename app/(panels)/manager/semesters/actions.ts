"use server";

import {
  runManagerAction,
} from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseAssignSemestersToTeamFormData } from "@/lib/validators/manager/assign-semesters-to-team";
import { parseCreateSemesterFormData } from "@/lib/validators/manager/create-semester";
import { parseCreateSemesterTeamFormData } from "@/lib/validators/manager/create-semester-team";
import { parseReorderSemesterTeamsFormData } from "@/lib/validators/manager/reorder-semester-teams";
import { parseSaveSemesterBoardFormData } from "@/lib/validators/manager/save-semester-board";
import { parseUpdateSemesterFormData } from "@/lib/validators/manager/update-semester";
import {
  createSemesterForManager,
  updateSemesterForManager,
} from "@/services/classes/semester.service";
import {
  assignSemestersToTeamForManager,
  createSemesterTeamForManager,
  reorderSemesterTeamsForManager,
  saveSemesterBoardForManager,
} from "@/services/classes/semester-team.service";
import type {
  CreateSemesterActionState,
  UpdateSemesterActionState,
} from "@/types/manager-semester";
import type {
  AssignSemestersToTeamActionState,
  CreateSemesterTeamActionState,
  ReorderSemesterTeamsActionState,
  SaveSemesterBoardActionState,
} from "@/types/manager-semester-team";

export async function createSemesterAction(
  _prevState: CreateSemesterActionState,
  formData: FormData
): Promise<CreateSemesterActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateSemesterFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createSemesterForManager(
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

  revalidatePath(ROUTES.MANAGER_SEMESTERS);

  return {
    success: true,
    message: result.message,
    semester: result.semester,
  };
}

export async function updateSemesterAction(
  _prevState: UpdateSemesterActionState,
  formData: FormData
): Promise<UpdateSemesterActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateSemesterFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSemesterForManager(
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

  revalidatePath(ROUTES.MANAGER_SEMESTERS);

  return {
    success: true,
    message: result.message,
    semester: result.semester,
  };
}

export async function createSemesterTeamAction(
  _prevState: CreateSemesterTeamActionState,
  formData: FormData
): Promise<CreateSemesterTeamActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateSemesterTeamFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSemesterTeamForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SEMESTERS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      team: result.team,
    }),
  });
}

export async function assignSemestersToTeamAction(
  _prevState: AssignSemestersToTeamActionState,
  formData: FormData
): Promise<AssignSemestersToTeamActionState> {
  return runManagerAction({
    formData,
    parse: parseAssignSemestersToTeamFormData,
    mutate: ({ adminClient, actor, data }) =>
      assignSemestersToTeamForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SEMESTERS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      semesters: result.semesters,
      semesterIds: result.semesters.map((semester) => semester.id),
      teamId: result.teamId,
    }),
  });
}

export async function reorderSemesterTeamsAction(
  _prevState: ReorderSemesterTeamsActionState,
  formData: FormData
): Promise<ReorderSemesterTeamsActionState> {
  return runManagerAction({
    formData,
    parse: parseReorderSemesterTeamsFormData,
    mutate: ({ adminClient, actor, data }) =>
      reorderSemesterTeamsForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SEMESTERS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      teams: result.teams,
    }),
  });
}

export async function saveSemesterBoardAction(
  _prevState: SaveSemesterBoardActionState,
  formData: FormData
): Promise<SaveSemesterBoardActionState> {
  return runManagerAction({
    formData,
    parse: parseSaveSemesterBoardFormData,
    mutate: ({ adminClient, actor, data }) =>
      saveSemesterBoardForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_SEMESTERS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}
