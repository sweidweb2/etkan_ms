"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  getManagerClassDetailRoute,
  getStudentClassDetailRoute,
} from "@/lib/constants/routes";
import { parseSetTeamLeaderFormData } from "@/lib/validators/manager/set-team-leader";
import {
  parseAddStudentsToClassFormData,
} from "@/lib/validators/manager/add-student-to-class";
import {
  parseCopyStudentsFromClassFormData,
} from "@/lib/validators/manager/copy-students-from-class";
import {
  parseRemoveStudentFromClassFormData,
} from "@/lib/validators/manager/remove-student-from-class";
import {
  parseTransferStudentBetweenClassesFormData,
} from "@/lib/validators/manager/transfer-student-between-classes";
import {
  addStudentsToClassForManager,
  copyStudentsFromClassForManager,
  transferStudentBetweenClassesForManager,
  removeStudentFromClassForManager,
} from "@/services/classes/class.service";
import { setStudentTeamLeaderForStaff } from "@/services/classes/class-team-leader.service";
import type {
  AddStudentToClassActionState,
  TransferStudentBetweenClassesActionState,
  RemoveStudentFromClassActionState,
  SetTeamLeaderActionState,
} from "@/types/manager-class-detail";

export async function addStudentToClassAction(
  _prevState: AddStudentToClassActionState,
  formData: FormData
): Promise<AddStudentToClassActionState> {
  return runManagerAction({
    formData,
    parse: parseAddStudentsToClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      addStudentsToClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      students: result.students,
      student: result.students[0],
      studentGrades: result.studentGrades,
      studentGrade: result.studentGrades[0],
      classRow: result.classRow,
      autoAssignedPhase: result.autoAssignedPhase,
      optionalPaymentPhases: result.optionalPaymentPhases,
    }),
  });
}

export async function copyStudentsFromClassAction(
  _prevState: AddStudentToClassActionState,
  formData: FormData
): Promise<AddStudentToClassActionState> {
  return runManagerAction({
    formData,
    parse: parseCopyStudentsFromClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      copyStudentsFromClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      students: result.students,
      student: result.students[0],
      studentGrades: result.studentGrades,
      studentGrade: result.studentGrades[0],
      classRow: result.classRow,
      autoAssignedPhase: result.autoAssignedPhase,
      optionalPaymentPhases: result.optionalPaymentPhases,
    }),
  });
}

export async function removeStudentFromClassAction(
  _prevState: RemoveStudentFromClassActionState,
  formData: FormData
): Promise<RemoveStudentFromClassActionState> {
  return runManagerAction({
    formData,
    parse: parseRemoveStudentFromClassFormData,
    mutate: ({ adminClient, actor, data }) =>
      removeStudentFromClassForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      removedStudentId: result.removedStudentId,
    }),
  });
}

export async function setStudentTeamLeaderAction(
  _prevState: SetTeamLeaderActionState,
  formData: FormData
): Promise<SetTeamLeaderActionState> {
  return runManagerAction({
    formData,
    parse: parseSetTeamLeaderFormData,
    mutate: ({ adminClient, actor, data }) =>
      setStudentTeamLeaderForStaff(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => {
      revalidatePath(getStudentClassDetailRoute(data.class_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      studentClassId: result.studentClassId,
      isTeamLeader: result.isTeamLeader,
    }),
  });
}

export async function transferStudentBetweenClassesAction(
  _prevState: TransferStudentBetweenClassesActionState,
  formData: FormData
): Promise<TransferStudentBetweenClassesActionState> {
  return runManagerAction({
    formData,
    parse: parseTransferStudentBetweenClassesFormData,
    mutate: ({ adminClient, actor, data }) =>
      transferStudentBetweenClassesForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      revalidatePath(getManagerClassDetailRoute(result.from_class_id));
      revalidatePath(getManagerClassDetailRoute(result.to_class_id));
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      warning: result.warning,
      student: result.student,
      from_class_id: result.from_class_id,
      to_class_id: result.to_class_id,
    }),
  });
}
