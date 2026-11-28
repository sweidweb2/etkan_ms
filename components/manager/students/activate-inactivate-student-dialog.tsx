"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  changeStudentStatusAction,
  loadStudentStatusSideEffectsPreviewAction,
} from "@/app/manager/students/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
import {
  SEMESTER_DROP_RESTRICTION_MODES,
  type SemesterDropRestrictionMode,
} from "@/lib/manager/accounting/constants";
import { showErrorToast } from "@/lib/toast";
import type {
  ChangeStudentStatusActionState,
  StudentStatusSideEffectsPreview,
} from "@/types/manager-student";

const initialState: ChangeStudentStatusActionState = {};

type ActivateInactivateStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  displayName: string;
  currentStatus: StudentStatusValue;
  onCompleted?: (status: StudentStatusValue) => void;
};

export function ActivateInactivateStudentDialog({
  open,
  onOpenChange,
  userId,
  displayName,
  currentStatus,
  onCompleted,
}: ActivateInactivateStudentDialogProps) {
  const isActivate = currentStatus !== STUDENT_STATUSES.ACTIVE;
  const [removeFromClasses, setRemoveFromClasses] = useState(false);
  const [removeOpenSpps, setRemoveOpenSpps] = useState(false);
  const [restrictionMode, setRestrictionMode] =
    useState<SemesterDropRestrictionMode>(
      SEMESTER_DROP_RESTRICTION_MODES.PERCENT
    );
  const dropValueRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] =
    useState<StudentStatusSideEffectsPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    changeStudentStatusAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending || isPreviewPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setRemoveFromClasses(false);
      setRemoveOpenSpps(false);
      setRestrictionMode(SEMESTER_DROP_RESTRICTION_MODES.PERCENT);
      setPreview(null);
      setPreviewError(null);
    }
  }

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, (next) => {
    if (next.status) {
      onCompleted?.(next.status);
    }
    onOpenChange(false);
  });

  useEffect(() => {
    if (!open || isActivate) {
      return;
    }

    startPreviewTransition(async () => {
      const result = await loadStudentStatusSideEffectsPreviewAction(userId);
      if (!result.success) {
        setPreview(null);
        setPreviewError(result.error);
        showErrorToast(result.error);
        return;
      }
      setPreviewError(null);
      setPreview(result.preview);
      if (!result.preview.can_remove_open_spps) {
        setRemoveOpenSpps(false);
      }
      if (result.preview.eligible_classes.length === 0) {
        setRemoveFromClasses(false);
      }
      if (dropValueRef.current) {
        dropValueRef.current.value = "";
      }
    });
  }, [open, userId, isActivate]);

  function handleSubmit() {
    const formData = new FormData();
    formData.set("user_id", userId);
    formData.set(
      "target_status",
      isActivate ? STUDENT_STATUSES.ACTIVE : STUDENT_STATUSES.INACTIVE
    );
    formData.set(
      "remove_from_classes",
      !isActivate && removeFromClasses ? "true" : "false"
    );
    formData.set(
      "remove_open_spps",
      !isActivate && removeOpenSpps ? "true" : "false"
    );

    if (!isActivate && preview?.needs_immediate_drop) {
      const rawValue = dropValueRef.current?.value?.trim() ?? "";
      formData.set("drop_restriction_mode", restrictionMode);
      if (restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
        formData.set("drop_required_percent", rawValue);
      } else if (restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
        formData.set("drop_required_amount", rawValue);
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const eligibleClasses = preview?.eligible_classes ?? [];
  const openSpps = preview?.open_spps ?? [];
  const canRemoveOpenSpps = preview?.can_remove_open_spps ?? false;
  const sppBlockedReason = preview?.open_spps_blocked_reason;
  const classToggleEnabled = eligibleClasses.length > 0;
  const sppToggleEnabled = canRemoveOpenSpps;
  const canInactivate = preview?.can_inactivate !== false;
  const inactivateBlockedReason = preview?.inactivate_blocked_reason;
  const needsImmediateDrop = Boolean(preview?.needs_immediate_drop);
  const droppableSemesters = preview?.droppable_semesters ?? [];

  const classFieldError = state.fieldErrors?.remove_from_classes?.[0];
  const sppFieldError = state.fieldErrors?.remove_open_spps?.[0];
  const dropValueError =
    restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
      ? state.fieldErrors?.drop_required_amount?.[0]
      : state.fieldErrors?.drop_required_percent?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {isActivate ? "Activate student" : "Inactivate student"}
          </DialogTitle>
          <DialogDescription>
            {isActivate
              ? `Set ${displayName} back to active. Classes and billing are not changed.`
              : `Inactivate ${displayName}. Optionally leave eligible classes and delete payment-free open SPPs. Paid open SPPs are dropped immediately with the restriction below.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <dl className="grid gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Student
              </dt>
              <dd className="mt-0.5">{displayName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current status
              </dt>
              <dd className="mt-0.5">
                {MANAGER_STUDENT_STATUS_LABELS[currentStatus]}
              </dd>
            </div>
          </dl>

          {!isActivate ? (
            <>
              {isPreviewPending ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <InlineSpinner />
                  Loading class and billing options…
                </p>
              ) : null}

              {previewError ? (
                <p className="text-sm text-destructive">{previewError}</p>
              ) : null}

              {preview && !isPreviewPending && !canInactivate ? (
                <p className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  {inactivateBlockedReason ??
                    "Cannot inactivate while a semester drop is pending."}
                </p>
              ) : null}

              {preview && !isPreviewPending && canInactivate ? (
                <>
                  <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <FieldLabel
                          htmlFor="inactivate-remove-classes"
                          label="Remove from eligible classes"
                          hint="Optional"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Removes membership from scheduled, in-progress, and
                          paused classes. Tasks, grades, and attendance stay.
                        </p>
                      </div>
                      <Switch
                        id="inactivate-remove-classes"
                        checked={removeFromClasses}
                        disabled={isPending || !classToggleEnabled}
                        onCheckedChange={setRemoveFromClasses}
                        aria-label="Remove from eligible classes"
                      />
                    </div>
                    {!classToggleEnabled ? (
                      <p className="text-xs text-muted-foreground">
                        No scheduled, in-progress, or paused class memberships.
                      </p>
                    ) : (
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {eligibleClasses.map((row) => (
                          <li key={row.student_class_id}>
                            {row.class_name} ({row.class_status})
                          </li>
                        ))}
                      </ul>
                    )}
                    {classFieldError ? (
                      <p className="text-sm text-destructive">{classFieldError}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <FieldLabel
                          htmlFor="inactivate-remove-spps"
                          label="Delete open SPPs"
                          hint="Optional"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Deletes SPPs on opened payment phases with no
                          payments. Adjustments cascade with the SPP.
                        </p>
                      </div>
                      <Switch
                        id="inactivate-remove-spps"
                        checked={removeOpenSpps}
                        disabled={isPending || !sppToggleEnabled}
                        onCheckedChange={(checked) => {
                          if (!sppToggleEnabled) return;
                          setRemoveOpenSpps(checked);
                        }}
                        aria-label="Delete open SPPs"
                      />
                    </div>
                    {openSpps.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No SPPs on an opened payment phase.
                      </p>
                    ) : (
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {openSpps.map((spp) => (
                          <li key={spp.spp_id}>
                            {spp.payment_phase_name}
                            {spp.payment_count > 0
                              ? ` · ${spp.payment_count} payment${spp.payment_count === 1 ? "" : "s"}`
                              : " · no payments"}
                          </li>
                        ))}
                      </ul>
                    )}
                    {sppBlockedReason ? (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {sppBlockedReason}
                      </p>
                    ) : null}
                    {sppFieldError ? (
                      <p className="text-sm text-destructive">{sppFieldError}</p>
                    ) : null}
                  </div>

                  {needsImmediateDrop ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          Drop paid semester billing
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          These open SPPs have payments. Inactivate will drop
                          each semester immediately (leave classes, withdraw).
                          Empty or 0 = no restriction (keep payments, no
                          refund). A restriction that is not already paid will
                          block inactivate.
                        </p>
                      </div>
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {droppableSemesters.map((row) => (
                          <li key={row.spp_id}>
                            {row.payment_phase_name} via {row.origin_class_name}{" "}
                            · paid {row.total_paid} / due {row.final_amount_due}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="inactivate-drop-mode">
                          Restriction type
                        </Label>
                        <Select
                          value={restrictionMode}
                          onValueChange={(value) => {
                            if (
                              value === SEMESTER_DROP_RESTRICTION_MODES.PERCENT ||
                              value === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
                            ) {
                              setRestrictionMode(value);
                              if (dropValueRef.current) {
                                dropValueRef.current.value = "";
                              }
                            }
                          }}
                          disabled={isPending}
                        >
                          <SelectTrigger id="inactivate-drop-mode">
                            <SelectValue placeholder="Choose type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value={SEMESTER_DROP_RESTRICTION_MODES.PERCENT}
                            >
                              Percent
                            </SelectItem>
                            <SelectItem
                              value={SEMESTER_DROP_RESTRICTION_MODES.AMOUNT}
                            >
                              Amount
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="inactivate-drop-value">
                          {restrictionMode ===
                          SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
                            ? "Required amount"
                            : "Required percent"}
                        </Label>
                        <Input
                          ref={dropValueRef}
                          id="inactivate-drop-value"
                          type="number"
                          min={0}
                          max={
                            restrictionMode ===
                            SEMESTER_DROP_RESTRICTION_MODES.PERCENT
                              ? 100
                              : undefined
                          }
                          step={
                            restrictionMode ===
                            SEMESTER_DROP_RESTRICTION_MODES.PERCENT
                              ? 1
                              : 0.01
                          }
                          placeholder="Empty or 0 = no restriction"
                          disabled={isPending}
                        />
                        {dropValueError ? (
                          <p className="text-sm text-destructive">
                            {dropValueError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              isPending ||
              (!isActivate &&
                (isPreviewPending ||
                  preview === null ||
                  Boolean(previewError) ||
                  !canInactivate))
            }
            onClick={handleSubmit}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving…
              </>
            ) : isActivate ? (
              "Activate"
            ) : (
              "Inactivate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
