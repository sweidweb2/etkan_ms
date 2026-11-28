import { CreateFinancialAdjustmentDialog } from "@/components/manager/accounting/create-financial-adjustment-dialog";
import { CreateStudentPaymentDialog } from "@/components/manager/accounting/create-student-payment-dialog";
import { EditFinancialAdjustmentDialog } from "@/components/manager/accounting/edit-financial-adjustment-dialog";
import { EditStudentPaymentDialog } from "@/components/manager/accounting/edit-student-payment-dialog";
import { ImportFinancialAdjustmentDialog } from "@/components/manager/accounting/import-financial-adjustment-dialog";
import { UpsertFinancialFormDialog } from "@/components/manager/accounting/upsert-financial-form-dialog";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type {
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
  ManagerImportableAdjustmentRow,
} from "@/types/manager-financial-adjustment";
import type {
  ManagerSppDetail,
  ManagerSppFinancialSnapshot,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";

type SppDetailsDialogsProps = {
  spp: ManagerSppDetail;
  adjustment: ManagerFinancialAdjustmentRow | null;
  importableAdjustments: ManagerImportableAdjustmentRow[];
  hasPayments: boolean;
  isCreatePaymentOpen: boolean;
  onCreatePaymentOpenChange: (open: boolean) => void;
  editingPayment: ManagerStudentPaymentRow | null;
  onEditingPaymentOpenChange: (open: boolean) => void;
  deletingPayment: ManagerStudentPaymentRow | null;
  alsoDeleteClearance: boolean;
  onAlsoDeleteClearanceChange: (checked: boolean) => void;
  onDeletePaymentOpenChange: (open: boolean) => void;
  isDeletePaymentActionPending: boolean;
  onConfirmDeletePayment: () => void;
  isCreateAdjustmentOpen: boolean;
  onCreateAdjustmentOpenChange: (open: boolean) => void;
  isImportAdjustmentOpen: boolean;
  onImportAdjustmentOpenChange: (open: boolean) => void;
  isEditAdjustmentOpen: boolean;
  onEditAdjustmentOpenChange: (open: boolean) => void;
  isDeleteAdjustmentOpen: boolean;
  onDeleteAdjustmentOpenChange: (open: boolean) => void;
  isDeleteAdjustmentActionPending: boolean;
  onConfirmDeleteAdjustment: () => void;
  isDeleteSppOpen: boolean;
  onDeleteSppOpenChange: (open: boolean) => void;
  isDeleteSppActionPending: boolean;
  onConfirmDeleteSpp: () => void;
  isFormDialogOpen: boolean;
  editingForm: ManagerFinancialFormRow | null;
  onFormDialogOpenChange: (open: boolean) => void;
  deletingForm: ManagerFinancialFormRow | null;
  onDeleteFormOpenChange: (open: boolean) => void;
  isDeleteFormActionPending: boolean;
  onConfirmDeleteForm: () => void;
  deletingInvite: ManagerFinancialFormInviteRow | null;
  onDeleteInviteOpenChange: (open: boolean) => void;
  isDeleteInviteActionPending: boolean;
  onConfirmDeleteInvite: () => void;
  onPaymentCreated: (
    payment: ManagerStudentPaymentRow,
    snapshot?: ManagerSppFinancialSnapshot
  ) => void;
  onPaymentUpdated: (
    payment: ManagerStudentPaymentRow,
    snapshot?: ManagerSppFinancialSnapshot
  ) => void;
  onAdjustmentCreated: (
    nextAdjustment: ManagerFinancialAdjustmentRow,
    snapshot: ManagerSppFinancialSnapshot
  ) => void;
  onAdjustmentUpdated: (
    nextAdjustment: ManagerFinancialAdjustmentRow,
    snapshot: ManagerSppFinancialSnapshot
  ) => void;
  onFormSaved: (form: ManagerFinancialFormRow) => void;
};

export function SppDetailsDialogs({
  spp,
  adjustment,
  importableAdjustments,
  hasPayments,
  isCreatePaymentOpen,
  onCreatePaymentOpenChange,
  editingPayment,
  onEditingPaymentOpenChange,
  deletingPayment,
  alsoDeleteClearance,
  onAlsoDeleteClearanceChange,
  onDeletePaymentOpenChange,
  isDeletePaymentActionPending,
  onConfirmDeletePayment,
  isCreateAdjustmentOpen,
  onCreateAdjustmentOpenChange,
  isImportAdjustmentOpen,
  onImportAdjustmentOpenChange,
  isEditAdjustmentOpen,
  onEditAdjustmentOpenChange,
  isDeleteAdjustmentOpen,
  onDeleteAdjustmentOpenChange,
  isDeleteAdjustmentActionPending,
  onConfirmDeleteAdjustment,
  isDeleteSppOpen,
  onDeleteSppOpenChange,
  isDeleteSppActionPending,
  onConfirmDeleteSpp,
  isFormDialogOpen,
  editingForm,
  onFormDialogOpenChange,
  deletingForm,
  onDeleteFormOpenChange,
  isDeleteFormActionPending,
  onConfirmDeleteForm,
  deletingInvite,
  onDeleteInviteOpenChange,
  isDeleteInviteActionPending,
  onConfirmDeleteInvite,
  onPaymentCreated,
  onPaymentUpdated,
  onAdjustmentCreated,
  onAdjustmentUpdated,
  onFormSaved,
}: SppDetailsDialogsProps) {
  return (
    <>
      <CreateStudentPaymentDialog
        open={isCreatePaymentOpen}
        onOpenChange={onCreatePaymentOpenChange}
        sppId={spp.id}
        maxAmount={Math.max(spp.remaining_amount, 0)}
        onCreated={onPaymentCreated}
      />

      <EditStudentPaymentDialog
        open={editingPayment !== null}
        onOpenChange={onEditingPaymentOpenChange}
        payment={editingPayment}
        onUpdated={onPaymentUpdated}
      />

      <CreateFinancialAdjustmentDialog
        open={isCreateAdjustmentOpen}
        onOpenChange={onCreateAdjustmentOpenChange}
        sppId={spp.id}
        onCreated={onAdjustmentCreated}
      />

      <ImportFinancialAdjustmentDialog
        open={isImportAdjustmentOpen}
        onOpenChange={onImportAdjustmentOpenChange}
        sppId={spp.id}
        candidates={importableAdjustments}
        onImported={onAdjustmentCreated}
      />

      <EditFinancialAdjustmentDialog
        open={isEditAdjustmentOpen}
        onOpenChange={onEditAdjustmentOpenChange}
        adjustment={adjustment}
        onUpdated={onAdjustmentUpdated}
      />

      <UpsertFinancialFormDialog
        key={editingForm?.id ?? `create-form-${spp.id}`}
        open={isFormDialogOpen}
        onOpenChange={onFormDialogOpenChange}
        sppId={spp.id}
        form={editingForm}
        onSaved={onFormSaved}
      />

      <Dialog
        open={deletingPayment !== null}
        onOpenChange={onDeletePaymentOpenChange}
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
          {spp.current_clearance ? (
            <Can permission={PERMISSIONS.ACCOUNTING_CLEARANCES_DELETE}>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  id="also-delete-clearance"
                  checked={alsoDeleteClearance}
                  onCheckedChange={onAlsoDeleteClearanceChange}
                  disabled={isDeletePaymentActionPending}
                  aria-label="Also remove Month paid marker"
                  className="mt-0.5"
                />
                <span>Also remove the Month paid marker for this student</span>
              </label>
            </Can>
          ) : null}
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onDeletePaymentOpenChange(false)}
              disabled={isDeletePaymentActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDeletePayment}
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
        onOpenChange={onDeleteAdjustmentOpenChange}
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
              onClick={() => onDeleteAdjustmentOpenChange(false)}
              disabled={isDeleteAdjustmentActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDeleteAdjustment}
              disabled={isDeleteAdjustmentActionPending}
            >
              {isDeleteAdjustmentActionPending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteSppOpen} onOpenChange={onDeleteSppOpenChange}>
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
              onClick={() => onDeleteSppOpenChange(false)}
              disabled={isDeleteSppActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDeleteSpp}
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
        onOpenChange={onDeleteFormOpenChange}
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
              onClick={() => onDeleteFormOpenChange(false)}
              disabled={isDeleteFormActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDeleteForm}
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
        onOpenChange={onDeleteInviteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteInviteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete invite link</DialogTitle>
            <DialogDescription>
              Permanently delete this active invite link? Anyone with the link
              will no longer be able to submit a form.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onDeleteInviteOpenChange(false)}
              disabled={isDeleteInviteActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDeleteInvite}
              disabled={isDeleteInviteActionPending}
            >
              {isDeleteInviteActionPending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
