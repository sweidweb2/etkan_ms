import "server-only";

import { WORKSHOP_PAYMENT_TYPES } from "@/lib/constants/manager-workshop-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  createWorkshopPaymentSchema,
  deleteWorkshopPaymentSchema,
  getWorkshopPaymentRemainingCap,
  isWorkshopFullyPaid,
  updateWorkshopPaymentSchema,
  WORKSHOP_PAYMENT_FULLY_PAID_MESSAGE,
} from "@/lib/validators/manager/workshop-payment";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as transactionRepository from "@/repositories/transaction.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  buildWorkshopPaymentTransactionInput,
  contentLockErrorForWorkshopStatus,
  creditExceedsRemainingError,
  mapWorkshopPaymentRecord,
  resolveWorkshopPaidNet,
  type DeleteWorkshopPaymentResult,
  type Supabase,
  type WorkshopPaymentMutationResult,
} from "@/services/workshops/workshop-shared";

export async function createWorkshopPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopPaymentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWorkshopPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.workshop_id
  );

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to create payment.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const paid = await resolveWorkshopPaidNet(
    adminClient,
    dataInput.workshop_id
  );
  if (paid.error) {
    return {
      success: false,
      error: paid.error || "Unable to create payment.",
    };
  }

  if (isWorkshopFullyPaid(workshopResult.data.price, paid.paidNet)) {
    return { success: false, error: WORKSHOP_PAYMENT_FULLY_PAID_MESSAGE };
  }

  if (dataInput.type === WORKSHOP_PAYMENT_TYPES.CREDIT) {
    const remainingCap = getWorkshopPaymentRemainingCap(
      workshopResult.data.price,
      paid.paidNet
    );
    const overRemaining = creditExceedsRemainingError(
      dataInput.amount,
      remainingCap
    );
    if (overRemaining) {
      return overRemaining;
    }
  }

  const { data, error } = await workshopPaymentRepository.createWorkshopPayment(
    adminClient,
    {
      workshop_id: dataInput.workshop_id,
      amount: dataInput.amount,
      type: dataInput.type,
      payment_date: dataInput.payment_date,
      payment_method: dataInput.payment_method,
      notes: dataInput.notes,
      created_by: actorUserId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to create payment.",
    };
  }

  const txInput = buildWorkshopPaymentTransactionInput(
    {
      amount: dataInput.amount,
      type: dataInput.type,
      payment_date: dataInput.payment_date,
      payment_method: dataInput.payment_method ?? null,
      notes: dataInput.notes ?? null,
    },
    workshopResult.data.name,
    actor
  );

  const { data: createdTx, error: txError } =
    await transactionRepository.createTransaction(adminClient, txInput);

  if (txError || !createdTx) {
    await workshopPaymentRepository.deleteWorkshopPaymentById(
      adminClient,
      data.id
    );
    return {
      success: false,
      error:
        txError?.message ||
        "Unable to record the linked financial transaction.",
    };
  }

  const { data: linkedPayment, error: linkError } =
    await workshopPaymentRepository.updateWorkshopPaymentTransactionId(
      adminClient,
      data.id,
      createdTx.id
    );

  if (linkError || !linkedPayment) {
    await transactionRepository.deleteTransaction(adminClient, createdTx.id);
    await workshopPaymentRepository.deleteWorkshopPaymentById(
      adminClient,
      data.id
    );
    return {
      success: false,
      error:
        linkError?.message ||
        "Unable to link the financial transaction to this payment.",
    };
  }

  const payment = mapWorkshopPaymentRecord(linkedPayment);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_payments",
    record_id: payment.id,
    new_data: {
      workshop_id: payment.workshop_id,
      amount: payment.amount,
      type: payment.type,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
    },
    metadata: { note: "Workshop payment created." },
  });

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "transactions",
    record_id: createdTx.id,
    new_data: {
      transaction_date: createdTx.transaction_date,
      type: createdTx.type,
      amount: Number(createdTx.amount),
      description: createdTx.description,
      category: createdTx.category,
      payment_method: createdTx.payment_method,
    },
    metadata: {
      note: "Synced from workshop payment.",
      workshop_payment_id: payment.id,
    },
  });

  return {
    success: true,
    payment,
    message:
      payment.type === WORKSHOP_PAYMENT_TYPES.CREDIT
        ? "Credit recorded."
        : "Debit recorded.",
  };
}

export async function updateWorkshopPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopPaymentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopPaymentRepository.findWorkshopPaymentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to update payment.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Payment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Payment not found." };
  }

  const workshopForUpdate = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopForUpdate.error) {
    return {
      success: false,
      error: workshopForUpdate.error.message || "Unable to update payment.",
    };
  }
  if (!workshopForUpdate.data) {
    return { success: false, error: "Workshop not found." };
  }
  const updateLocked = contentLockErrorForWorkshopStatus(
    workshopForUpdate.data.status
  );
  if (updateLocked) {
    return { success: false, error: updateLocked };
  }

  if (dataInput.type === WORKSHOP_PAYMENT_TYPES.CREDIT) {
    const paid = await resolveWorkshopPaidNet(
      adminClient,
      existing.data.workshop_id
    );
    if (paid.error) {
      return {
        success: false,
        error: paid.error || "Unable to update payment.",
      };
    }
    const netWithoutCurrent =
      paid.paidNet -
      (existing.data.type === WORKSHOP_PAYMENT_TYPES.CREDIT
        ? Number(existing.data.amount)
        : -Number(existing.data.amount));
    const remainingCap = getWorkshopPaymentRemainingCap(
      workshopForUpdate.data.price,
      netWithoutCurrent
    );
    const overRemaining = creditExceedsRemainingError(
      dataInput.amount,
      remainingCap
    );
    if (overRemaining) {
      return overRemaining;
    }
  }

  const previous = mapWorkshopPaymentRecord(existing.data);

  const { data, error } =
    await workshopPaymentRepository.updateWorkshopPaymentById(
      adminClient,
      dataInput.id,
      {
        amount: dataInput.amount,
        type: dataInput.type,
        payment_date: dataInput.payment_date,
        payment_method: dataInput.payment_method,
        notes: dataInput.notes,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to update payment.",
    };
  }

  let payment = mapWorkshopPaymentRecord(data);
  const txInput = buildWorkshopPaymentTransactionInput(
    {
      amount: dataInput.amount,
      type: dataInput.type,
      payment_date: dataInput.payment_date,
      payment_method: dataInput.payment_method ?? null,
      notes: dataInput.notes ?? null,
    },
    workshopForUpdate.data.name,
    actor
  );

  const revertPayment = async () => {
    await workshopPaymentRepository.updateWorkshopPaymentById(
      adminClient,
      previous.id,
      {
        amount: previous.amount,
        type: previous.type,
        payment_date: previous.payment_date,
        payment_method: previous.payment_method,
        notes: previous.notes,
      }
    );
  };

  let linkedTransactionId = previous.transaction_id;
  let syncedExistingTx = false;

  if (linkedTransactionId) {
    const existingTx = await transactionRepository.findTransactionById(
      adminClient,
      linkedTransactionId
    );
    if (existingTx.error) {
      await revertPayment();
      return {
        success: false,
        error: existingTx.error.message || "Unable to update payment.",
      };
    }
    if (existingTx.data) {
      const { error: txUpdateError } =
        await transactionRepository.updateTransaction(
          adminClient,
          linkedTransactionId,
          txInput
        );
      if (txUpdateError) {
        await revertPayment();
        return {
          success: false,
          error:
            txUpdateError.message ||
            "Unable to update the linked financial transaction.",
        };
      }
      syncedExistingTx = true;
    } else {
      linkedTransactionId = null;
    }
  }

  if (!syncedExistingTx) {
    const { data: createdTx, error: txCreateError } =
      await transactionRepository.createTransaction(adminClient, txInput);
    if (txCreateError || !createdTx) {
      await revertPayment();
      return {
        success: false,
        error:
          txCreateError?.message ||
          "Unable to record the linked financial transaction.",
      };
    }
    const { data: relinked, error: linkError } =
      await workshopPaymentRepository.updateWorkshopPaymentTransactionId(
        adminClient,
        payment.id,
        createdTx.id
      );
    if (linkError || !relinked) {
      await transactionRepository.deleteTransaction(adminClient, createdTx.id);
      await revertPayment();
      return {
        success: false,
        error:
          linkError?.message ||
          "Unable to link the financial transaction to this payment.",
      };
    }
    payment = mapWorkshopPaymentRecord(relinked);
    linkedTransactionId = createdTx.id;

    await recordManagerAuditLog(adminClient, actor, {
      action: "insert",
      severity: "info",
      table_name: "transactions",
      record_id: createdTx.id,
      new_data: {
        transaction_date: createdTx.transaction_date,
        type: createdTx.type,
        amount: Number(createdTx.amount),
        description: createdTx.description,
        category: createdTx.category,
        payment_method: createdTx.payment_method,
      },
      metadata: {
        note: "Synced from workshop payment.",
        workshop_payment_id: payment.id,
      },
    });
  } else if (linkedTransactionId) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "transactions",
      record_id: linkedTransactionId,
      new_data: {
        transaction_date: txInput.transaction_date,
        type: txInput.type,
        amount: txInput.amount,
        description: txInput.description,
        category: txInput.category,
        payment_method: txInput.payment_method,
      },
      metadata: {
        note: "Synced from workshop payment update.",
        workshop_payment_id: payment.id,
      },
    });
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_payments",
    record_id: payment.id,
    old_data: {
      amount: previous.amount,
      type: previous.type,
      payment_date: previous.payment_date,
      payment_method: previous.payment_method,
      notes: previous.notes,
      transaction_id: previous.transaction_id,
    },
    new_data: {
      amount: payment.amount,
      type: payment.type,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      notes: payment.notes,
      transaction_id: payment.transaction_id,
    },
    metadata: { note: "Workshop payment updated." },
  });

  return {
    success: true,
    payment,
    message: "Payment updated.",
  };
}

export async function deleteWorkshopPaymentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteWorkshopPaymentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_PAYMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteWorkshopPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopPaymentRepository.findWorkshopPaymentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to delete payment.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Payment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Payment not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to delete payment.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopPaymentRecord(existing.data);

  if (previous.transaction_id) {
    const { error: txDeleteError } =
      await transactionRepository.deleteTransaction(
        adminClient,
        previous.transaction_id
      );
    if (txDeleteError) {
      return {
        success: false,
        error:
          txDeleteError.message ||
          "Unable to delete the linked financial transaction.",
      };
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "delete",
      severity: "warning",
      table_name: "transactions",
      record_id: previous.transaction_id,
      old_data: {
        id: previous.transaction_id,
      },
      metadata: {
        note: "Deleted with workshop payment.",
        workshop_payment_id: previous.id,
      },
    });
  }

  const { error } = await workshopPaymentRepository.deleteWorkshopPaymentById(
    adminClient,
    dataInput.id
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete payment.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_payments",
    record_id: dataInput.id,
    old_data: {
      workshop_id: previous.workshop_id,
      amount: previous.amount,
      type: previous.type,
      payment_date: previous.payment_date,
      payment_method: previous.payment_method,
      transaction_id: previous.transaction_id,
    },
    metadata: { note: "Workshop payment deleted." },
  });

  return {
    success: true,
    message: "Payment deleted.",
  };
}
