"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { ROUTES } from "@/lib/constants/routes";
import { parseUpdateSubjectLinksFormData } from "@/lib/validators/teacher/update-subject-links";
import { updateSubjectLinksForTeacher } from "@/services/classes/teacher-subject.service";
import type { UpdateSubjectLinksActionState } from "@/types/teacher-subject";

export async function updateSubjectLinksAction(
  _prevState: UpdateSubjectLinksActionState,
  formData: FormData
): Promise<UpdateSubjectLinksActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSubjectLinksFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSubjectLinksForTeacher(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.TEACHER_SUBJECTS);
      revalidatePath(ROUTES.TEACHER_CLASSES);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      subject: result.subject,
    }),
  });
}
