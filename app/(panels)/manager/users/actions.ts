"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import { revalidateManagerScheduleInstructors } from "@/lib/cache/instructor-schedule-cache";
import {
  revalidateManagerInstructorsList,
  revalidateManagerPeopleLists,
  revalidateManagerUsersList,
} from "@/lib/cache/manager-list-cache";
import { parseCreateStaffUserFormData } from "@/lib/validators/manager/create-user";
import { parseUpdateManagerUserFormData } from "@/lib/validators/manager/update-user";
import { createStaffUser, updateManagerUser } from "@/services/auth/user.service";
import type {
  CreateStaffUserActionState,
  UpdateManagerUserActionState,
} from "@/types/manager-user";

export async function createStaffUserAction(
  _prevState: CreateStaffUserActionState,
  formData: FormData
): Promise<CreateStaffUserActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateStaffUserFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStaffUser(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateManagerUsersList();
      revalidateManagerInstructorsList();
      revalidateManagerScheduleInstructors();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      user: result.user,
    }),
  });
}

export async function updateUserAction(
  _prevState: UpdateManagerUserActionState,
  formData: FormData
): Promise<UpdateManagerUserActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateManagerUserFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateManagerUser(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateManagerPeopleLists();
      revalidateManagerScheduleInstructors();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      user: result.user,
    }),
  });
}
