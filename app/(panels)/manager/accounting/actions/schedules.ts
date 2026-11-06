"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  parseCreateStudentPaymentScheduleFormData,
} from "@/lib/validators/manager/create-student-payment-schedule";
import {
  parseDeleteStudentPaymentScheduleFormData,
} from "@/lib/validators/manager/delete-student-payment-schedule";
import {
  parseUpdateStudentPaymentScheduleFormData,
} from "@/lib/validators/manager/update-student-payment-schedule";
import {
  createStudentPaymentScheduleForManager,
  deleteStudentPaymentScheduleForManager,
  updateStudentPaymentScheduleForManager,
} from "@/services/accounting/student-payment-schedule.service";
import type {
  CreateStudentPaymentScheduleActionState,
  DeleteStudentPaymentScheduleActionState,
  UpdateStudentPaymentScheduleActionState,
} from "@/types/manager-student-payment-schedule";
import {
  revalidateAccountingSppDetail,
} from "./revalidate";

export async function createStudentPaymentScheduleAction(
  _prevState: CreateStudentPaymentScheduleActionState,
  formData: FormData
): Promise<CreateStudentPaymentScheduleActionState> {
  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");

  return runManagerAction({
    formData,
    parse: parseCreateStudentPaymentScheduleFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStudentPaymentScheduleForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      if (paymentPhaseId) {
        revalidateAccountingSppDetail(
          paymentPhaseId,
          result.student_payment_phase_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      schedule: result.schedule,
    }),
  });
}

export async function updateStudentPaymentScheduleAction(
  _prevState: UpdateStudentPaymentScheduleActionState,
  formData: FormData
): Promise<UpdateStudentPaymentScheduleActionState> {
  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");

  return runManagerAction({
    formData,
    parse: parseUpdateStudentPaymentScheduleFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentPaymentScheduleForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      if (paymentPhaseId) {
        revalidateAccountingSppDetail(
          paymentPhaseId,
          result.student_payment_phase_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      schedule: result.schedule,
    }),
  });
}

export async function deleteStudentPaymentScheduleAction(
  _prevState: DeleteStudentPaymentScheduleActionState,
  formData: FormData
): Promise<DeleteStudentPaymentScheduleActionState> {
  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");

  return runManagerAction({
    formData,
    parse: parseDeleteStudentPaymentScheduleFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteStudentPaymentScheduleForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      if (paymentPhaseId) {
        revalidateAccountingSppDetail(
          paymentPhaseId,
          result.student_payment_phase_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      student_payment_phase_id: result.student_payment_phase_id,
    }),
  });
}
