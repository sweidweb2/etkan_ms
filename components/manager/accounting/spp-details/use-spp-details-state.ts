"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  createFinancialFormInviteAction,
  deleteFinancialAdjustmentAction,
  deleteFinancialFormAction,
  deleteFinancialFormInviteAction,
  deleteStudentPaymentAction,
  deleteStudentPaymentPhaseAction,
} from "@/app/manager/accounting/actions";
import {
  initialDeleteAdjustmentState,
  initialDeleteFormState,
  initialDeleteInviteState,
  initialDeletePaymentState,
  initialDeleteSppState,
  initialInviteState,
  sortPayments,
  SPP_HAS_PAYMENTS_DELETE_ERROR,
  type SppDetailsPanelProps,
} from "@/components/manager/accounting/spp-details/spp-details-helpers";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { applySppFinancialSnapshot } from "@/lib/manager/accounting/apply-spp-financial-snapshot";
import { showSuccessToast } from "@/lib/toast";
import {
  appendUniqueById,
  prependUniqueById,
} from "@/lib/utils/prepend-unique-by-id";
import type {
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
} from "@/types/manager-financial-adjustment";
import type {
  ManagerSppFinancialSnapshot,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";

export function useSppDetailsState({
  spp: initialSpp,
  initialPayments,
  initialAdjustment,
  initialImportableAdjustments,
  initialForms,
  initialInvites,
}: Omit<SppDetailsPanelProps, "initialSchedules">) {
  const router = useRouter();
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
  const [alsoDeleteClearance, setAlsoDeleteClearance] = useState(false);
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
        setAlsoDeleteClearance(false);
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
  useActionStateSuccess(
    deletePaymentState,
    isDeletePaymentActionPending,
    (nextState) => {
      const removedId = deletingPayment?.id;
      const shouldClearClearance = alsoDeleteClearance;
      setDeletingPayment(null);
      setAlsoDeleteClearance(false);
      if (removedId) {
        setPayments((current) =>
          sortPayments(current.filter((payment) => payment.id !== removedId))
        );
      }
      if (nextState.spp) {
        setSpp((current) => {
          const next = applySppFinancialSnapshot(current, nextState.spp!);
          return shouldClearClearance
            ? { ...next, current_clearance: null }
            : next;
        });
      }
    }
  );

  useActionStateToast(deleteAdjustmentState, isDeleteAdjustmentActionPending);
  useActionStateSuccess(
    deleteAdjustmentState,
    isDeleteAdjustmentActionPending,
    (nextState) => {
      setIsDeleteAdjustmentOpen(false);
      setAdjustment(null);
      if (nextState.spp) {
        setSpp((current) =>
          applySppFinancialSnapshot(current, nextState.spp!)
        );
      }
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

  const handlePaymentCreated = (
    payment: ManagerStudentPaymentRow,
    snapshot?: ManagerSppFinancialSnapshot
  ) => {
    setPayments((current) =>
      sortPayments(appendUniqueById(current, payment))
    );
    if (snapshot) {
      setSpp((current) => applySppFinancialSnapshot(current, snapshot));
      return;
    }
    router.refresh();
  };

  const handlePaymentUpdated = (
    payment: ManagerStudentPaymentRow,
    snapshot?: ManagerSppFinancialSnapshot
  ) => {
    setPayments((current) =>
      sortPayments(current.map((row) => (row.id === payment.id ? payment : row)))
    );
    if (snapshot) {
      setSpp((current) => applySppFinancialSnapshot(current, snapshot));
      return;
    }
    router.refresh();
  };

  const handleAdjustmentCreated = (
    nextAdjustment: ManagerFinancialAdjustmentRow,
    snapshot: ManagerSppFinancialSnapshot
  ) => {
    setAdjustment(nextAdjustment);
    setSpp((current) => applySppFinancialSnapshot(current, snapshot));
  };

  const handleAdjustmentUpdated = (
    nextAdjustment: ManagerFinancialAdjustmentRow,
    snapshot: ManagerSppFinancialSnapshot
  ) => {
    setAdjustment(nextAdjustment);
    setSpp((current) => applySppFinancialSnapshot(current, snapshot));
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
    if (alsoDeleteClearance) {
      formData.set("also_delete_clearance", "true");
    }
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

  function handleEditingPaymentOpenChange(open: boolean) {
    if (!open) setEditingPayment(null);
  }

  const hasPayments = payments.length > 0;
  const sppDeleteBlockedReason = hasPayments
    ? SPP_HAS_PAYMENTS_DELETE_ERROR
    : undefined;

  return {
    spp,
    setSpp,
    payments,
    adjustment,
    importableAdjustments,
    forms,
    invites,
    hasPayments,
    sppDeleteBlockedReason,
    isCreatePaymentOpen,
    setIsCreatePaymentOpen,
    editingPayment,
    setEditingPayment,
    deletingPayment,
    setDeletingPayment,
    alsoDeleteClearance,
    setAlsoDeleteClearance,
    isCreateAdjustmentOpen,
    setIsCreateAdjustmentOpen,
    isImportAdjustmentOpen,
    setIsImportAdjustmentOpen,
    isEditAdjustmentOpen,
    setIsEditAdjustmentOpen,
    isDeleteAdjustmentOpen,
    setIsDeleteAdjustmentOpen,
    isDeleteSppOpen,
    setIsDeleteSppOpen,
    isFormDialogOpen,
    editingForm,
    deletingForm,
    setDeletingForm,
    deletingInvite,
    setDeletingInvite,
    isDeletePaymentActionPending,
    isDeleteAdjustmentActionPending,
    isDeleteSppActionPending,
    isDeleteFormActionPending,
    isDeleteInviteActionPending,
    isInviteActionPending,
    handleDeletePaymentOpenChange,
    handleDeleteAdjustmentOpenChange,
    handleDeleteSppOpenChange,
    handleDeleteFormOpenChange,
    handleDeleteInviteOpenChange,
    handleEditingPaymentOpenChange,
    handleFormDialogOpenChange,
    handlePaymentCreated,
    handlePaymentUpdated,
    handleAdjustmentCreated,
    handleAdjustmentUpdated,
    handleFormSaved,
    handleConfirmDeletePayment,
    handleConfirmDeleteAdjustment,
    handleConfirmDeleteForm,
    handleConfirmDeleteInvite,
    handleConfirmDeleteSpp,
    handleGenerateInvite,
    handleCopyInviteUrl,
    handleOpenWhatsApp,
    handleOpenCreateForm,
    handleOpenEditForm,
  };
}
