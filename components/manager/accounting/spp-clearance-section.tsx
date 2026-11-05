"use client";

import { useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { deleteSppClearanceAction } from "@/app/manager/accounting/actions";
import { Can } from "@/components/auth/can";
import { UpsertSppClearanceDialog } from "@/components/manager/accounting/upsert-spp-clearance-dialog";
import { SppCurrentBadge } from "@/components/manager/accounting/spp-current-badge";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { STUDENT_PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import type { StudentPaymentPhaseStatus } from "@/lib/manager/accounting/constants";
import type { ManagerSppClearanceDto } from "@/types/manager-spp-clearance";
import type { DeleteSppClearanceActionState } from "@/types/manager-spp-clearance";
import { format } from "date-fns";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

const initialDeleteState: DeleteSppClearanceActionState = {};

type SppClearanceSectionProps = {
  sppId: string;
  paymentPhaseId: string;
  sppStatus: StudentPaymentPhaseStatus;
  initialClearance: ManagerSppClearanceDto | null;
  onClearanceChange?: (clearance: ManagerSppClearanceDto | null) => void;
};

export function SppClearanceSection({
  sppId,
  paymentPhaseId,
  sppStatus,
  initialClearance,
  onClearanceChange,
}: SppClearanceSectionProps) {
  const [clearance, setClearance] = useState(initialClearance);
  const [prevInitialClearance, setPrevInitialClearance] =
    useState(initialClearance);
  if (initialClearance !== prevInitialClearance) {
    setPrevInitialClearance(initialClearance);
    setClearance(initialClearance);
  }

  function updateClearance(next: ManagerSppClearanceDto | null) {
    setClearance(next);
    onClearanceChange?.(next);
  }

  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeleteActionPending] = useActionState(
    deleteSppClearanceAction,
    initialDeleteState
  );
  const isDeletePending = isDeleteActionPending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    setIsDeleteOpen
  );

  useActionStateToast(deleteState, isDeletePending);
  useActionStateSuccess(deleteState, isDeletePending, () => {
    updateClearance(null);
    setIsDeleteOpen(false);
  });

  const locked =
    sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.PAID ||
    sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED;

  function handleConfirmDelete() {
    if (!clearance) {
      return;
    }
    const formData = new FormData();
    formData.set("id", clearance.id);
    formData.set("student_payment_phase_id", sppId);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <>
      <UpsertSppClearanceDialog
        open={isUpsertOpen}
        onOpenChange={setIsUpsertOpen}
        sppId={sppId}
        paymentPhaseId={paymentPhaseId}
        clearance={clearance}
        onSaved={updateClearance}
      />

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeletePending}
        >
          <DialogHeader>
            <DialogTitle>Remove Month paid marker</DialogTitle>
            <DialogDescription>
              Remove the theoretical Month paid overlay for this student?
              Balances are unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? <InlineSpinner /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Month paid marker</CardTitle>
          <CardAction className="flex flex-wrap items-center gap-2">
            <SppCurrentBadge clearance={clearance} />
            {!locked && !clearance ? (
              <Can permission={PERMISSIONS.ACCOUNTING_CLEARANCES_CREATE}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsUpsertOpen(true)}
                >
                  <PlusIcon />
                  Set Month paid
                </Button>
              </Can>
            ) : null}
            {!locked && clearance ? (
              <Can permission={PERMISSIONS.ACCOUNTING_CLEARANCES_UPDATE}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsUpsertOpen(true)}
                >
                  <PencilIcon />
                  Edit
                </Button>
              </Can>
            ) : null}
            {clearance ? (
              <Can permission={PERMISSIONS.ACCOUNTING_CLEARANCES_DELETE}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2Icon />
                  Remove
                </Button>
              </Can>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {locked ? (
            <p>
              {sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.PAID
                ? "Paid assignments cannot receive a Month paid marker."
                : "Cancelled assignments cannot receive a Month paid marker."}
            </p>
          ) : clearance ? (
            <dl className="grid gap-2 @lg/panel:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide">Duration</dt>
                <dd className="text-foreground">
                  {clearance.duration_days} day
                  {clearance.duration_days === 1 ? "" : "s"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Expires</dt>
                <dd className="text-foreground">
                  {format(new Date(clearance.expires_at), "MMM d, yyyy HH:mm")}
                </dd>
              </div>
              <div className="@lg/panel:col-span-2">
                <dt className="text-xs uppercase tracking-wide">Notes</dt>
                <dd className="text-foreground">
                  {clearance.notes?.trim() ? clearance.notes : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p>
              No Month paid marker. This overlay is theoretical and does not
              change balances.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
