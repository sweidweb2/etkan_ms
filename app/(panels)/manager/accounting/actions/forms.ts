"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  parseDeleteFinancialFormFormData,
} from "@/lib/validators/manager/delete-financial-form";
import {
  parseDeleteFinancialFormInviteFormData,
} from "@/lib/validators/manager/delete-financial-form-invite";
import {
  parseCreateFinancialFormFormData,
  parseCreateFinancialFormInviteFormData,
  parseUpdateFinancialFormFormData,
} from "@/lib/validators/manager/upsert-financial-form";
import {
  createFinancialFormForManager,
  createFinancialFormInviteForManager,
  deleteFinancialFormForManager,
  deleteFinancialFormInviteForManager,
  updateFinancialFormForManager,
} from "@/services/accounting/student-financial-adjustment.service";
import type {
  CreateFinancialFormInviteActionState,
  DeleteFinancialFormActionState,
  DeleteFinancialFormInviteActionState,
  UpsertFinancialFormActionState,
} from "@/types/manager-financial-adjustment";
import {
  revalidateAccountingSppDetail,
} from "./revalidate";

export async function createFinancialFormAction(
  _prevState: UpsertFinancialFormActionState,
  formData: FormData
): Promise<UpsertFinancialFormActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateFinancialFormFormData,
    mutate: ({ adminClient, actor, data }) =>
      createFinancialFormForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      form: result.form,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function updateFinancialFormAction(
  _prevState: UpsertFinancialFormActionState,
  formData: FormData
): Promise<UpsertFinancialFormActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateFinancialFormFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateFinancialFormForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      form: result.form,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function createFinancialFormInviteAction(
  _prevState: CreateFinancialFormInviteActionState,
  formData: FormData
): Promise<CreateFinancialFormInviteActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateFinancialFormInviteFormData,
    mutate: ({ adminClient, actor, data }) =>
      createFinancialFormInviteForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      invite: result.invite,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function deleteFinancialFormInviteAction(
  _prevState: DeleteFinancialFormInviteActionState,
  formData: FormData
): Promise<DeleteFinancialFormInviteActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteFinancialFormInviteFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteFinancialFormInviteForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
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
    }),
  });
}

export async function deleteFinancialFormAction(
  _prevState: DeleteFinancialFormActionState,
  formData: FormData
): Promise<DeleteFinancialFormActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteFinancialFormFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteFinancialFormForManager(adminClient, actor.userId, actor, data),
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
    }),
  });
}
