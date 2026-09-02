"use client";

import {
  deleteFinancialAdjustmentAction,
  deleteFinancialFormAction,
  deleteFinancialFormInviteAction,
  deleteStudentPaymentAction,
  deleteStudentPaymentPhaseAction,
  createFinancialFormInviteAction,
} from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import { CreateFinancialAdjustmentDialog } from "@/components/manager/accounting/create-financial-adjustment-dialog";
import { CreateStudentPaymentDialog } from "@/components/manager/accounting/create-student-payment-dialog";
import { ImportFinancialAdjustmentDialog } from "@/components/manager/accounting/import-financial-adjustment-dialog";
import { PaymentScheduleSection } from "@/components/manager/accounting/payment-schedule-section";
import { EditFinancialAdjustmentDialog } from "@/components/manager/accounting/edit-financial-adjustment-dialog";
import { EditStudentPaymentDialog } from "@/components/manager/accounting/edit-student-payment-dialog";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { UpsertFinancialFormDialog } from "@/components/manager/accounting/upsert-financial-form-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingPhaseDetailRoute,
  getManagerClassDetailRoute,
  getManagerSemesterDetailRoute,
  getManagerStudentDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import {
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_METHOD_LABELS,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
  type PaymentMethod,
} from "@/lib/manager/accounting/constants";
import { resolveSppDisplayStatus } from "@/lib/manager/accounting/spp-display-status";
import { isPaymentScheduleEditable } from "@/lib/manager/accounting/schedule-editable";
import { computeSppFinancials } from "@/lib/manager/accounting/spp-financials";
import { deriveSppStatus } from "@/lib/manager/accounting/spp-status";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  appendUniqueById,
  prependUniqueById,
} from "@/lib/utils/prepend-unique-by-id";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  CreateFinancialFormInviteActionState,
  DeleteFinancialAdjustmentActionState,
  DeleteFinancialFormActionState,
  DeleteFinancialFormInviteActionState,
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
  ManagerImportableAdjustmentRow,
} from "@/types/manager-financial-adjustment";
import type {
  DeleteStudentPaymentActionState,
  DeleteStudentPaymentPhaseActionState,
  ManagerSppDetail,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";
import type { ManagerStudentPaymentScheduleRow } from "@/types/manager-student-payment-schedule";
import { CopyIcon, ImportIcon, LinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";

const initialDeletePaymentState: DeleteStudentPaymentActionState = {};
const initialDeleteAdjustmentState: DeleteFinancialAdjustmentActionState = {};
const initialDeleteSppState: DeleteStudentPaymentPhaseActionState = {};
const initialDeleteFormState: DeleteFinancialFormActionState = {};
const initialDeleteInviteState: DeleteFinancialFormInviteActionState = {};
const initialInviteState: CreateFinancialFormInviteActionState = {};
const SPP_HAS_PAYMENTS_DELETE_ERROR =
  "Delete all payments on this SPP first.";

type SppDetailsPanelProps = {
  spp: ManagerSppDetail;
  initialPayments: ManagerStudentPaymentRow[];
  initialSchedules: ManagerStudentPaymentScheduleRow[];
  initialAdjustment: ManagerFinancialAdjustmentRow | null;
  initialImportableAdjustments: ManagerImportableAdjustmentRow[];
  initialForms: ManagerFinancialFormRow[];
  initialInvites: ManagerFinancialFormInviteRow[];
};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function formatAdjustmentValue(
  valueType: FinancialAdjustmentValueType,
  value: number
) {
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return `${value}%`;
  }
  return formatPaymentPhaseMoney(value);
}

function sortPayments(rows: ManagerStudentPaymentRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.payment_date.localeCompare(a.payment_date) ||
      b.created_at.localeCompare(a.created_at)
  );
}

function applySppFinancials(
  spp: ManagerSppDetail,
  adjustment: ManagerFinancialAdjustmentRow | null,
  payments: ManagerStudentPaymentRow[]
): ManagerSppDetail {
  const financials = computeSppFinancials(
    spp.phase_amount,
    adjustment
      ? { value_type: adjustment.value_type, value: adjustment.value }
      : null,
    payments.map((payment) => payment.amount)
  );
  const status = deriveSppStatus(financials, spp.status);

  return {
    ...spp,
    original_amount: financials.original,
    adjustment_amount: financials.adjustmentAmount,
    final_amount_due: financials.finalDue,
    total_paid: financials.totalPaid,
    remaining_amount: financials.remaining,
    has_credit: financials.remaining < 0,
    status,
  };
}

export function SppDetailsPanel({
  spp: initialSpp,
  initialPayments,
  initialSchedules,
  initialAdjustment,
  initialImportableAdjustments,
  initialForms,
  initialInvites,
}: SppDetailsPanelProps) {
  const [spp, setSpp] = useState(initialSpp);
  const [prevSpp, setPrevSpp] = useState(initialSpp);
  const [payments, setPayments] = useState(initialPayments);
  const [prevPayments, setPrevPayments] = useState(initialPayments);
  const [adjustment, setAdjustment] = useState(initialAdjustment);
  const [prevAdjustment, setPrevAdjustment] = useState(initialAdjustment);
  const [importableAdjustments, setImportableAdjustments] = useState(
    initialImportableAdjustments
  );
  const [prevImportableAdjustments, setPrevImportableAdjustments] = useState(
    initialImportableAdjustments
  );
  const [forms, setForms] = useState(initialForms);
  const [prevForms, setPrevForms] = useState(initialForms);
  const [invites, setInvites] = useState(initialInvites);
  const [prevInvites, setPrevInvites] = useState(initialInvites);
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [deletingPayment, setDeletingPayment] =
    useState<ManagerStudentPaymentRow | null>(null);
  const [isCreateAdjustmentOpen, setIsCreateAdjustmentOpen] = useState(false);
  const [isImportAdjustmentOpen, setIsImportAdjustmentOpen] = useState(false);
  const [isEditAdjustmentOpen, setIsEditAdjustmentOpen] = useState(false);
  const [isDeleteAdjustmentOpen, setIsDeleteAdjustmentOpen] = useState(false);
  const [isDeleteSppOpen, setIsDeleteSppOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingForm, setEditingForm] =
    useState<ManagerFinancialFormRow | null>(null);
  const [deletingForm, setDeletingForm] =
    useState<ManagerFinancialFormRow | null>(null);
  const [deletingInvite, setDeletingInvite] =
    useState<ManagerFinancialFormInviteRow | null>(null);
  const [isTransitionPending, startTransition] = useTransition();

  const [deletePaymentState, deletePaymentAction, isDeletePaymentPending] =
    useActionState(deleteStudentPaymentAction, initialDeletePaymentState);
  const [
    deleteAdjustmentState,
    deleteAdjustmentAction,
    isDeleteAdjustmentPending,
  ] = useActionState(
    deleteFinancialAdjustmentAction,
    initialDeleteAdjustmentState
  );
  const [deleteSppState, deleteSppAction, isDeleteSppPending] = useActionState(
    deleteStudentPaymentPhaseAction,
    initialDeleteSppState
  );
  const [deleteFormState, deleteFormAction, isDeleteFormPending] =
    useActionState(deleteFinancialFormAction, initialDeleteFormState);
  const [deleteInviteState, deleteInviteAction, isDeleteInvitePending] =
    useActionState(deleteFinancialFormInviteAction, initialDeleteInviteState);
  const [inviteState, inviteAction, isInvitePending] = useActionState(
    createFinancialFormInviteAction,
    initialInviteState
  );

  const isDeletePaymentActionPending =
    isDeletePaymentPending || isTransitionPending;
  const isDeleteAdjustmentActionPending =
    isDeleteAdjustmentPending || isTransitionPending;
  const isDeleteSppActionPending = isDeleteSppPending || isTransitionPending;
  const isDeleteFormActionPending = isDeleteFormPending || isTransitionPending;
  const isDeleteInviteActionPending =
    isDeleteInvitePending || isTransitionPending;
  const isInviteActionPending = isInvitePending || isTransitionPending;

  const handleDeletePaymentOpenChange = usePendingAwareOpenChange(
    isDeletePaymentActionPending,
    (open) => {
      if (!open) {
        setDeletingPayment(null);
      }
    }
  );

  const handleDeleteAdjustmentOpenChange = usePendingAwareOpenChange(
    isDeleteAdjustmentActionPending,
    setIsDeleteAdjustmentOpen
  );

  const handleDeleteSppOpenChange = usePendingAwareOpenChange(
    isDeleteSppActionPending,
    setIsDeleteSppOpen
  );

  const handleDeleteFormOpenChange = usePendingAwareOpenChange(
    isDeleteFormActionPending,
    (open) => {
      if (!open) {
        setDeletingForm(null);
      }
    }
  );

  const handleDeleteInviteOpenChange = usePendingAwareOpenChange(
    isDeleteInviteActionPending,
    (open) => {
      if (!open) {
        setDeletingInvite(null);
      }
    }
  );

  useActionStateToast(deletePaymentState, isDeletePaymentActionPending);
  useActionStateSuccess(deletePaymentState, isDeletePaymentActionPending, () => {
    const removedId = deletingPayment?.id;
    setDeletingPayment(null);
    if (removedId) {
      const nextPayments = payments.filter((payment) => payment.id !== removedId);
      setPayments(sortPayments(nextPayments));
      setSpp((current) => applySppFinancials(current, adjustment, nextPayments));
    }
  });

  useActionStateToast(deleteAdjustmentState, isDeleteAdjustmentActionPending);
  useActionStateSuccess(
    deleteAdjustmentState,
    isDeleteAdjustmentActionPending,
    () => {
      setIsDeleteAdjustmentOpen(false);
      setAdjustment(null);
      setSpp((current) => applySppFinancials(current, null, payments));
    }
  );

  useActionStateToast(deleteSppState, isDeleteSppActionPending);

  useActionStateToast(deleteFormState, isDeleteFormActionPending);
  useActionStateSuccess(deleteFormState, isDeleteFormActionPending, () => {
    const removedId = deletingForm?.id;
    setDeletingForm(null);
    if (removedId) {
      setForms((current) => current.filter((form) => form.id !== removedId));
    }
  });

  useActionStateToast(deleteInviteState, isDeleteInviteActionPending);
  useActionStateSuccess(deleteInviteState, isDeleteInviteActionPending, () => {
    const removedId = deletingInvite?.id;
    setDeletingInvite(null);
    if (removedId) {
      setInvites((current) =>
        current.filter((invite) => invite.id !== removedId)
      );
    }
  });

  useActionStateToast(inviteState, isInviteActionPending);
  useActionStateSuccess(inviteState, isInviteActionPending, (nextState) => {
    if (nextState.invite?.url) {
      void navigator.clipboard.writeText(nextState.invite.url).then(() => {
        showSuccessToast("Invite link copied to clipboard.");
      });
    }
    if (nextState.invite) {
      setInvites((current) => prependUniqueById(current, nextState.invite!));
    }
  });

  if (initialSpp !== prevSpp) {
    setPrevSpp(initialSpp);
    setSpp(initialSpp);
  }

  if (initialPayments !== prevPayments) {
    setPrevPayments(initialPayments);
    setPayments(initialPayments);
  }

  if (initialAdjustment !== prevAdjustment) {
    setPrevAdjustment(initialAdjustment);
    setAdjustment(initialAdjustment);
  }

  if (initialImportableAdjustments !== prevImportableAdjustments) {
    setPrevImportableAdjustments(initialImportableAdjustments);
    setImportableAdjustments(initialImportableAdjustments);
  }

  if (initialForms !== prevForms) {
    setPrevForms(initialForms);
    setForms(initialForms);
  }

  if (initialInvites !== prevInvites) {
    setPrevInvites(initialInvites);
    setInvites(initialInvites);
  }

  const handlePaymentCreated = (payment: ManagerStudentPaymentRow) => {
    const nextPayments = sortPayments(appendUniqueById(payments, payment));
    setPayments(nextPayments);
    setSpp((current) => applySppFinancials(current, adjustment, nextPayments));
  };

  const handlePaymentUpdated = (payment: ManagerStudentPaymentRow) => {
    const nextPayments = sortPayments(
      payments.map((row) => (row.id === payment.id ? payment : row))
    );
    setPayments(nextPayments);
    setSpp((current) => applySppFinancials(current, adjustment, nextPayments));
  };

  const handleAdjustmentCreated = (nextAdjustment: ManagerFinancialAdjustmentRow) => {
    setAdjustment(nextAdjustment);
    setSpp((current) => applySppFinancials(current, nextAdjustment, payments));
  };

  const handleAdjustmentUpdated = (nextAdjustment: ManagerFinancialAdjustmentRow) => {
    setAdjustment(nextAdjustment);
    setSpp((current) => applySppFinancials(current, nextAdjustment, payments));
  };

  const handleFormSaved = (form: ManagerFinancialFormRow) => {
    setForms((current) => {
      const existingIndex = current.findIndex((row) => row.id === form.id);
      if (existingIndex === -1) {
        return [form, ...current];
      }
      return current.map((row) => (row.id === form.id ? form : row));
    });
  };

  function handleConfirmDeletePayment() {
    if (!deletingPayment) return;
    const formData = new FormData();
    formData.set("id", deletingPayment.id);
    formData.set("student_payment_phase_id", spp.id);
    startTransition(() => {
      deletePaymentAction(formData);
    });
  }

  function handleConfirmDeleteAdjustment() {
    if (!adjustment) return;
    const formData = new FormData();
    formData.set("id", adjustment.id);
    formData.set("student_payment_phase_id", spp.id);
    startTransition(() => {
      deleteAdjustmentAction(formData);
    });
  }

  function handleGenerateInvite() {
    const formData = new FormData();
    formData.set("student_payment_phase_id", spp.id);
    startTransition(() => {
      inviteAction(formData);
    });
  }

  async function handleCopyInviteUrl(url: string) {
    await navigator.clipboard.writeText(url);
    showSuccessToast("Invite link copied to clipboard.");
  }

  function handleOpenWhatsApp(url: string) {
    const text = encodeURIComponent(
      `Please fill your financial form using this link: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function handleOpenCreateForm() {
    setEditingForm(null);
    setIsFormDialogOpen(true);
  }

  function handleOpenEditForm(nextForm: ManagerFinancialFormRow) {
    setEditingForm(nextForm);
    setIsFormDialogOpen(true);
  }

  function handleFormDialogOpenChange(open: boolean) {
    setIsFormDialogOpen(open);
    if (!open) {
      setEditingForm(null);
    }
  }

  function handleConfirmDeleteForm() {
    if (!deletingForm) return;
    const formData = new FormData();
    formData.set("id", deletingForm.id);
    formData.set("student_payment_phase_id", spp.id);
    startTransition(() => {
      deleteFormAction(formData);
    });
  }

  function handleConfirmDeleteInvite() {
    if (!deletingInvite) return;
    const formData = new FormData();
    formData.set("id", deletingInvite.id);
    formData.set("student_payment_phase_id", spp.id);
    startTransition(() => {
      deleteInviteAction(formData);
    });
  }

  function handleConfirmDeleteSpp() {
    if (payments.length > 0) return;
    const formData = new FormData();
    formData.set("id", spp.id);
    startTransition(() => {
      deleteSppAction(formData);
    });
  }

  const hasPayments = payments.length > 0;
  const sppDeleteBlockedReason = hasPayments
    ? SPP_HAS_PAYMENTS_DELETE_ERROR
    : undefined;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={ROUTES.MANAGER_ACCOUNTING}>
                  Accounting
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={getManagerAccountingPhaseDetailRoute(spp.payment_phase_id)}
                >
                  {spp.payment_phase_name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{spp.student_label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Can permission={PERMISSIONS.ACCOUNTING_SPP_DELETE}>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={hasPayments || isDeleteSppActionPending}
              title={sppDeleteBlockedReason}
              onClick={() => setIsDeleteSppOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete SPP
            </Button>
          </Can>
        </div>

        <CreateStudentPaymentDialog
          open={isCreatePaymentOpen}
          onOpenChange={setIsCreatePaymentOpen}
          sppId={spp.id}
          maxAmount={spp.phase_amount}
          onCreated={handlePaymentCreated}
        />

        <EditStudentPaymentDialog
          open={editingPayment !== null}
          onOpenChange={(open) => {
            if (!open) setEditingPayment(null);
          }}
          payment={editingPayment}
          onUpdated={handlePaymentUpdated}
        />

        <CreateFinancialAdjustmentDialog
          open={isCreateAdjustmentOpen}
          onOpenChange={setIsCreateAdjustmentOpen}
          sppId={spp.id}
          onCreated={handleAdjustmentCreated}
        />

        <ImportFinancialAdjustmentDialog
          open={isImportAdjustmentOpen}
          onOpenChange={setIsImportAdjustmentOpen}
          sppId={spp.id}
          candidates={importableAdjustments}
          onImported={handleAdjustmentCreated}
        />

        <EditFinancialAdjustmentDialog
          open={isEditAdjustmentOpen}
          onOpenChange={setIsEditAdjustmentOpen}
          adjustment={adjustment}
          onUpdated={handleAdjustmentUpdated}
        />

        <UpsertFinancialFormDialog
          key={editingForm?.id ?? `create-form-${spp.id}`}
          open={isFormDialogOpen}
          onOpenChange={handleFormDialogOpenChange}
          sppId={spp.id}
          form={editingForm}
          onSaved={handleFormSaved}
        />

        <Dialog
          open={deletingPayment !== null}
          onOpenChange={handleDeletePaymentOpenChange}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeletePaymentActionPending}
          >
            <DialogHeader>
              <DialogTitle>Delete payment</DialogTitle>
              <DialogDescription>
                Delete this payment of{" "}
                {deletingPayment
                  ? formatPaymentPhaseMoney(deletingPayment.amount)
                  : ""}
                ? Balances will recalculate.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeletePaymentOpenChange(false)}
                disabled={isDeletePaymentActionPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeletePayment}
                disabled={isDeletePaymentActionPending}
              >
                {isDeletePaymentActionPending ? <InlineSpinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isDeleteAdjustmentOpen}
          onOpenChange={handleDeleteAdjustmentOpenChange}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeleteAdjustmentActionPending}
          >
            <DialogHeader>
              <DialogTitle>Delete financial adjustment</DialogTitle>
              <DialogDescription>
                Delete this adjustment? Balances will recalculate.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteAdjustmentOpenChange(false)}
                disabled={isDeleteAdjustmentActionPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeleteAdjustment}
                disabled={isDeleteAdjustmentActionPending}
              >
                {isDeleteAdjustmentActionPending ? <InlineSpinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteSppOpen} onOpenChange={handleDeleteSppOpenChange}>
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeleteSppActionPending}
          >
            <DialogHeader>
              <DialogTitle>Delete student payment phase</DialogTitle>
              <DialogDescription>
                Permanently deletes this SPP for {spp.student_label}, including
                any financial adjustment and attached form. Payments must already
                be removed. The parent payment phase balances will recalculate.
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteSppOpenChange(false)}
                disabled={isDeleteSppActionPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeleteSpp}
                disabled={isDeleteSppActionPending || hasPayments}
              >
                {isDeleteSppActionPending ? <InlineSpinner /> : null}
                Delete SPP
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={deletingForm !== null}
          onOpenChange={handleDeleteFormOpenChange}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeleteFormActionPending}
          >
            <DialogHeader>
              <DialogTitle>Delete financial form</DialogTitle>
              <DialogDescription>
                Permanently delete the financial form for{" "}
                {deletingForm?.full_name ?? "this student"}? This cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteFormOpenChange(false)}
                disabled={isDeleteFormActionPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeleteForm}
                disabled={isDeleteFormActionPending}
              >
                {isDeleteFormActionPending ? <InlineSpinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={deletingInvite !== null}
          onOpenChange={handleDeleteInviteOpenChange}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeleteInviteActionPending}
          >
            <DialogHeader>
              <DialogTitle>Delete invite link</DialogTitle>
              <DialogDescription>
                Permanently delete this active invite link? Anyone with the
                link will no longer be able to submit a form.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteInviteOpenChange(false)}
                disabled={isDeleteInviteActionPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeleteInvite}
                disabled={isDeleteInviteActionPending}
              >
                {isDeleteInviteActionPending ? <InlineSpinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>
              {spp.student_profile_id ? (
                <Link
                  href={getManagerStudentDetailRoute(spp.student_profile_id)}
                  className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  {spp.student_label}
                </Link>
              ) : (
                spp.student_label
              )}
            </CardTitle>
            <CardAction className="flex flex-wrap items-center gap-2">
              <SppStatusBadge
                status={resolveSppDisplayStatus(
                  { status: spp.status, totalPaid: spp.total_paid },
                  {
                    upfrontWindowActive: spp.upfront_window_active,
                    upfrontAmount: spp.phase_upfront_amount,
                  }
                )}
              />
              <PaymentPhaseStatusBadge status={spp.payment_phase_status} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={getManagerAccountingPhaseDetailRoute(spp.payment_phase_id)}
                className="inline-flex max-w-[16rem] items-center truncate rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                Phase · {spp.payment_phase_name}
              </Link>
              <Link
                href={getManagerSemesterDetailRoute(spp.semester_id)}
                className="inline-flex max-w-[16rem] items-center truncate rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                Semester · {spp.semester_name}
              </Link>
              {spp.billing_class_id && spp.billing_class_name ? (
                <Link
                  href={getManagerClassDetailRoute(spp.billing_class_id)}
                  className="inline-flex max-w-[16rem] items-center truncate rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  Class · {spp.billing_class_name}
                </Link>
              ) : null}
            </div>
            {spp.payments_blocked ? (
              <p className="text-amber-700 dark:text-amber-300">
                Payments and adjustments are blocked because this phase or
                student assignment is cancelled.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <UserStatCard
            label="Original"
            value={formatPaymentPhaseMoney(spp.original_amount)}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Adjustment"
            value={formatPaymentPhaseMoney(spp.adjustment_amount)}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Due"
            value={formatPaymentPhaseMoney(spp.final_amount_due)}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="Paid"
            value={formatPaymentPhaseMoney(spp.total_paid)}
            accentClassName="border-l-emerald-500"
          />
          <div
            className={cn(
              "rounded-xl bg-card py-4 pl-4 pr-5 ring-1 ring-foreground/10 border-l-4 border-l-rose-500"
            )}
          >
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums">
              {formatPaymentPhaseMoney(spp.remaining_amount)}
              {spp.has_credit ? (
                <span className="inline-flex items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                  Credit
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Payments</CardTitle>
            {!spp.payments_blocked ? (
              <CardAction>
                <Can permission={PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreatePaymentOpen(true)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Record payment
                  </Button>
                </Can>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Received by</th>
                    <th className="px-4 py-3 font-medium">Management</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          {format(
                            new Date(payment.payment_date),
                            "MMM d, yyyy"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatPaymentPhaseMoney(payment.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {
                            PAYMENT_METHOD_LABELS[
                              payment.payment_method as PaymentMethod
                            ]
                          }
                        </td>
                        <td className="max-w-[10rem] px-4 py-3">
                          <TruncatedCell
                            value={payment.received_by}
                            maxLength={24}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {payment.received_by_management ? "Yes" : "No"}
                        </td>
                        <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={payment.notes ?? "—"}
                            maxLength={24}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {!spp.payments_blocked ? (
                              <>
                                <Can
                                  permission={
                                    PERMISSIONS.ACCOUNTING_PAYMENTS_UPDATE
                                  }
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Edit payment"
                                    onClick={() => setEditingPayment(payment)}
                                  >
                                    <PencilIcon />
                                  </Button>
                                </Can>
                                <Can
                                  permission={
                                    PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE
                                  }
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Delete payment"
                                    onClick={() => setDeletingPayment(payment)}
                                  >
                                    <Trash2Icon />
                                  </Button>
                                </Can>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <PaymentScheduleSection
          sppId={spp.id}
          paymentPhaseId={spp.payment_phase_id}
          remainingAmount={spp.remaining_amount}
          totalPaid={spp.total_paid}
          isScheduleEditable={isPaymentScheduleEditable({
            spp_status: spp.status,
            payment_phase_status: spp.payment_phase_status,
          })}
          initialSchedules={initialSchedules}
        />

        <Card>
          <CardHeader>
            <CardTitle>Financial adjustment</CardTitle>
            {!spp.payments_blocked && !adjustment ? (
              <CardAction className="flex flex-wrap gap-2">
                <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_CREATE}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreateAdjustmentOpen(true)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Add adjustment
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={importableAdjustments.length === 0}
                    title={
                      importableAdjustments.length === 0
                        ? "No prior adjustments for this student."
                        : undefined
                    }
                    onClick={() => setIsImportAdjustmentOpen(true)}
                  >
                    <ImportIcon data-icon="inline-start" />
                    Import adjustment
                  </Button>
                </Can>
              </CardAction>
            ) : null}
            {!spp.payments_blocked && adjustment ? (
              <CardAction className="flex flex-wrap gap-2">
                <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditAdjustmentOpen(true)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Button>
                </Can>
                <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsDeleteAdjustmentOpen(true)}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Delete
                  </Button>
                </Can>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {!adjustment ? (
              <p className="text-sm text-muted-foreground">
                No financial adjustment on this student payment phase.
              </p>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">
                    {
                      FINANCIAL_ADJUSTMENT_TYPE_LABELS[
                        adjustment.type as FinancialAdjustmentType
                      ]
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Value type</dt>
                  <dd className="font-medium">
                    {
                      FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS[
                        adjustment.value_type as FinancialAdjustmentValueType
                      ]
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Value</dt>
                  <dd className="font-medium tabular-nums">
                    {formatAdjustmentValue(
                      adjustment.value_type as FinancialAdjustmentValueType,
                      adjustment.value
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Effective date</dt>
                  <dd className="font-medium">
                    {format(
                      new Date(adjustment.effective_date),
                      "MMM d, yyyy"
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Reason</dt>
                  <dd className="font-medium">{adjustment.reason ?? "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial form invites</CardTitle>
            {!spp.payments_blocked ? (
              <CardAction>
                <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateInvite}
                    disabled={isInviteActionPending}
                  >
                    {isInviteActionPending ? (
                      <InlineSpinner />
                    ) : (
                      <LinkIcon data-icon="inline-start" />
                    )}
                    Generate invite link
                  </Button>
                </Can>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              One-shot public links. Each link expires after the first
              submission.
            </p>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invite links yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {invite.is_used ? "Used" : "Active"} ·{" "}
                        {format(new Date(invite.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                      {!invite.is_used ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {invite.url}
                        </p>
                      ) : null}
                    </div>
                    {!invite.is_used && !spp.payments_blocked ? (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCopyInviteUrl(invite.url)}
                        >
                          <CopyIcon data-icon="inline-start" />
                          Copy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenWhatsApp(invite.url)}
                        >
                          WhatsApp
                        </Button>
                        <Can
                          permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label="Delete invite link"
                            onClick={() => setDeletingInvite(invite)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Delete
                          </Button>
                        </Can>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial forms</CardTitle>
            {!spp.payments_blocked ? (
              <CardAction>
                <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenCreateForm}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Add financial form
                  </Button>
                </Can>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No financial forms yet. Forms do not change amounts.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {forms.map((formRow) => (
                  <div
                    key={formRow.id}
                    className="rounded-lg border bg-card px-3 py-3 shadow-sm"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {formRow.full_name}
                      </p>
                      {!spp.payments_blocked ? (
                        <div className="flex shrink-0 gap-1">
                          <Can
                            permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}
                          >
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Edit financial form"
                              onClick={() => handleOpenEditForm(formRow)}
                            >
                              <PencilIcon />
                            </Button>
                          </Can>
                          <Can
                            permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE}
                          >
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Delete financial form"
                              onClick={() => setDeletingForm(formRow)}
                            >
                              <Trash2Icon />
                            </Button>
                          </Can>
                        </div>
                      ) : null}
                    </div>
                    <dl className="grid gap-2 text-xs sm:text-sm">
                      <div>
                        <dt className="text-muted-foreground">Agreed to rules</dt>
                        <dd className="font-medium">
                          {formRow.agreed_to_rules ? "Yes" : "No"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          School / university
                        </dt>
                        <dd className="font-medium">
                          {formRow.school_or_university ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-medium">{formRow.phone ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Submitted</dt>
                        <dd className="font-medium">
                          {format(new Date(formRow.created_at), "MMM d, yyyy")}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
