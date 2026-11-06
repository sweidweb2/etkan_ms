"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  parseCreateFinalExamFormData,
} from "@/lib/validators/manager/create-final-exam";
import {
  parseEditStudentFinalExamGradeFormData,
} from "@/lib/validators/manager/edit-student-finalexam-grade";
import {
  parseUpdateFinalExamFormData,
} from "@/lib/validators/manager/update-final-exam";
import {
  createFinalExamForManager,
  updateFinalExamForManager,
  updateStudentFinalExamGradeForManager,
} from "@/services/classes/class.service";
import type {
  CreateFinalExamActionState,
  UpdateFinalExamActionState,
  UpdateStudentFinalExamGradeActionState,
} from "@/types/manager-class-detail";

export async function createFinalExamAction(
  _prevState: CreateFinalExamActionState,
  formData: FormData
): Promise<CreateFinalExamActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateFinalExamFormData,
    mutate: ({ adminClient, actor, data }) =>
      createFinalExamForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      finalExam: result.finalExam,
      studentGrades: result.studentGrades,
    }),
  });
}

export async function updateFinalExamAction(
  _prevState: UpdateFinalExamActionState,
  formData: FormData
): Promise<UpdateFinalExamActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateFinalExamFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateFinalExamForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      finalExam: result.finalExam,
    }),
  });
}

export async function updateStudentFinalExamGradeAction(
  _prevState: UpdateStudentFinalExamGradeActionState,
  formData: FormData
): Promise<UpdateStudentFinalExamGradeActionState> {
  return runManagerAction({
    formData,
    parse: parseEditStudentFinalExamGradeFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentFinalExamGradeForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      studentGrade: result.studentGrade,
    }),
  });
}
