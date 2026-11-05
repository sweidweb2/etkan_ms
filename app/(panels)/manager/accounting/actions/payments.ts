"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  parseCreateStudentPaymentFormData,
} from "@/lib/validators/manager/create-student-payment";
import {
  parseDeleteStudentPaymentFormData,
} from "@/lib/validators/manager/delete-student-payment";
import {
  parseUpdateStudentPaymentFormData,
} from "@/lib/validators/manager/update-student-payment";
import {
  createStudentPaymentForManager,
  deleteStudentPaymentForManager,
  updateStudentPaymentForManager,
} from "@/services/accounting/student-payment.service";
import type {
  CreateStudentPaymentActionState,
  DeleteStudentPaymentActionState,
  UpdateStudentPaymentActionState,
} from "@/types/manager-student-payment";
import {
  revalidateAccountingSppDetail,
} from "./revalidate";

export async function createStudentPaymentAction(
  _prevState: CreateStudentPaymentActionState,
  formData: FormData
): Promise<CreateStudentPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateStudentPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStudentPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.payment.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      payment: result.payment,
      spp: result.spp,
    }),
  });
}

export async function updateStudentPaymentAction(
  _prevState: UpdateStudentPaymentActionState,
  formData: FormData
): Promise<UpdateStudentPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateStudentPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.payment.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      payment: result.payment,
      spp: result.spp,
    }),
  });
}

export async function deleteStudentPaymentAction(
  _prevState: DeleteStudentPaymentActionState,
  formData: FormData
): Promise<DeleteStudentPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteStudentPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteStudentPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
      spp: result.spp,
    }),
  });
}
