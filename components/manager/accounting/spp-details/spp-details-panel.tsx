"use client";

import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { PaymentScheduleSection } from "@/components/manager/accounting/payment-schedule-section";
import { SppAdjustmentSection } from "@/components/manager/accounting/spp-details/spp-adjustment-section";
import { SppDetailsBlockedBanner } from "@/components/manager/accounting/spp-details/spp-details-blocked-banner";
import { SppDetailsDialogs } from "@/components/manager/accounting/spp-details/spp-details-dialogs";
import { SppDetailsHeader } from "@/components/manager/accounting/spp-details/spp-details-header";
import {
  TAB_TRIGGER_CLASS,
  type SppDetailsPanelProps,
} from "@/components/manager/accounting/spp-details/spp-details-helpers";
import { SppDetailsStats } from "@/components/manager/accounting/spp-details/spp-details-stats";
import { SppFormInvitesSection } from "@/components/manager/accounting/spp-details/spp-form-invites-section";
import { SppFormsSection } from "@/components/manager/accounting/spp-details/spp-forms-section";
import { SppPaymentsSection } from "@/components/manager/accounting/spp-details/spp-payments-section";
import { useSppDetailsState } from "@/components/manager/accounting/spp-details/use-spp-details-state";
import { SppClearanceSection } from "@/components/manager/accounting/spp-clearance-section";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isPaymentScheduleEditable } from "@/lib/manager/accounting/schedule-editable";

export function SppDetailsPanel({
  spp: initialSpp,
  initialPayments,
  initialSchedules,
  initialAdjustment,
  initialImportableAdjustments,
  initialForms,
  initialInvites,
}: SppDetailsPanelProps) {
  const state = useSppDetailsState({
    spp: initialSpp,
    initialPayments,
    initialAdjustment,
    initialImportableAdjustments,
    initialForms,
    initialInvites,
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <SppDetailsHeader
          spp={state.spp}
          hasPayments={state.hasPayments}
          sppDeleteBlockedReason={state.sppDeleteBlockedReason}
          isDeleteSppActionPending={state.isDeleteSppActionPending}
          onDeleteSppOpen={() => state.setIsDeleteSppOpen(true)}
        />

        <SppDetailsBlockedBanner spp={state.spp} />

        <SppDetailsDialogs
          spp={state.spp}
          adjustment={state.adjustment}
          importableAdjustments={state.importableAdjustments}
          hasPayments={state.hasPayments}
          isCreatePaymentOpen={state.isCreatePaymentOpen}
          onCreatePaymentOpenChange={state.setIsCreatePaymentOpen}
          editingPayment={state.editingPayment}
          onEditingPaymentOpenChange={state.handleEditingPaymentOpenChange}
          deletingPayment={state.deletingPayment}
          alsoDeleteClearance={state.alsoDeleteClearance}
          onAlsoDeleteClearanceChange={state.setAlsoDeleteClearance}
          onDeletePaymentOpenChange={state.handleDeletePaymentOpenChange}
          isDeletePaymentActionPending={state.isDeletePaymentActionPending}
          onConfirmDeletePayment={state.handleConfirmDeletePayment}
          isCreateAdjustmentOpen={state.isCreateAdjustmentOpen}
          onCreateAdjustmentOpenChange={state.setIsCreateAdjustmentOpen}
          isImportAdjustmentOpen={state.isImportAdjustmentOpen}
          onImportAdjustmentOpenChange={state.setIsImportAdjustmentOpen}
          isEditAdjustmentOpen={state.isEditAdjustmentOpen}
          onEditAdjustmentOpenChange={state.setIsEditAdjustmentOpen}
          isDeleteAdjustmentOpen={state.isDeleteAdjustmentOpen}
          onDeleteAdjustmentOpenChange={state.handleDeleteAdjustmentOpenChange}
          isDeleteAdjustmentActionPending={
            state.isDeleteAdjustmentActionPending
          }
          onConfirmDeleteAdjustment={state.handleConfirmDeleteAdjustment}
          isDeleteSppOpen={state.isDeleteSppOpen}
          onDeleteSppOpenChange={state.handleDeleteSppOpenChange}
          isDeleteSppActionPending={state.isDeleteSppActionPending}
          onConfirmDeleteSpp={state.handleConfirmDeleteSpp}
          isFormDialogOpen={state.isFormDialogOpen}
          editingForm={state.editingForm}
          onFormDialogOpenChange={state.handleFormDialogOpenChange}
          deletingForm={state.deletingForm}
          onDeleteFormOpenChange={state.handleDeleteFormOpenChange}
          isDeleteFormActionPending={state.isDeleteFormActionPending}
          onConfirmDeleteForm={state.handleConfirmDeleteForm}
          deletingInvite={state.deletingInvite}
          onDeleteInviteOpenChange={state.handleDeleteInviteOpenChange}
          isDeleteInviteActionPending={state.isDeleteInviteActionPending}
          onConfirmDeleteInvite={state.handleConfirmDeleteInvite}
          onPaymentCreated={state.handlePaymentCreated}
          onPaymentUpdated={state.handlePaymentUpdated}
          onAdjustmentCreated={state.handleAdjustmentCreated}
          onAdjustmentUpdated={state.handleAdjustmentUpdated}
          onFormSaved={state.handleFormSaved}
        />

        <SppDetailsStats spp={state.spp} />

        <TabsPrimitive defaultValue="payment" className="flex flex-col gap-6">
          <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 @lg/panel:w-fit @lg/panel:self-center">
            <TabsTriggerPrimitive value="payment" className={TAB_TRIGGER_CLASS}>
              Payment
            </TabsTriggerPrimitive>
            <TabsTriggerPrimitive
              value="financial-aid"
              className={TAB_TRIGGER_CLASS}
            >
              Financial aid
            </TabsTriggerPrimitive>
          </TabsListPrimitive>

          <TabsContentsPrimitive>
            <TabsContentPrimitive value="payment" className="outline-none">
              <div className="flex flex-col gap-6">
                <SppPaymentsSection
                  spp={state.spp}
                  payments={state.payments}
                  onRecordPayment={() => state.setIsCreatePaymentOpen(true)}
                  onEditPayment={state.setEditingPayment}
                  onDeletePayment={state.setDeletingPayment}
                />

                <PaymentScheduleSection
                  sppId={state.spp.id}
                  paymentPhaseId={state.spp.payment_phase_id}
                  remainingAmount={state.spp.remaining_amount}
                  totalPaid={state.spp.total_paid}
                  isScheduleEditable={isPaymentScheduleEditable({
                    spp_status: state.spp.status,
                    payment_phase_status: state.spp.payment_phase_status,
                    drop_completed: state.spp.drop_completed,
                  })}
                  initialSchedules={initialSchedules}
                />

                <SppClearanceSection
                  key={state.spp.current_clearance?.id ?? "no-clearance"}
                  sppId={state.spp.id}
                  paymentPhaseId={state.spp.payment_phase_id}
                  sppStatus={state.spp.status}
                  initialClearance={state.spp.current_clearance}
                  onClearanceChange={(clearance) => {
                    state.setSpp((current) => ({
                      ...current,
                      current_clearance: clearance,
                    }));
                  }}
                />
              </div>
            </TabsContentPrimitive>

            <TabsContentPrimitive
              value="financial-aid"
              className="outline-none"
            >
              <div className="flex flex-col gap-6">
                <SppAdjustmentSection
                  spp={state.spp}
                  adjustment={state.adjustment}
                  importableCount={state.importableAdjustments.length}
                  onCreate={() => state.setIsCreateAdjustmentOpen(true)}
                  onImport={() => state.setIsImportAdjustmentOpen(true)}
                  onEdit={() => state.setIsEditAdjustmentOpen(true)}
                  onDelete={() => state.setIsDeleteAdjustmentOpen(true)}
                />

                <SppFormInvitesSection
                  spp={state.spp}
                  invites={state.invites}
                  isInviteActionPending={state.isInviteActionPending}
                  onGenerateInvite={state.handleGenerateInvite}
                  onCopyInviteUrl={state.handleCopyInviteUrl}
                  onOpenWhatsApp={state.handleOpenWhatsApp}
                  onDeleteInvite={state.setDeletingInvite}
                />

                <SppFormsSection
                  spp={state.spp}
                  forms={state.forms}
                  onCreate={state.handleOpenCreateForm}
                  onEdit={state.handleOpenEditForm}
                  onDelete={state.setDeletingForm}
                />
              </div>
            </TabsContentPrimitive>
          </TabsContentsPrimitive>
        </TabsPrimitive>
      </div>
    </TooltipProvider>
  );
}
