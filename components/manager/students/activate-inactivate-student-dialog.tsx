"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
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
  const router = useRouter();
  const isActivate = currentStatus !== STUDENT_STATUSES.ACTIVE;
  const [removeFromClasses, setRemoveFromClasses] = useState(false);
  const [removeOpenSpps, setRemoveOpenSpps] = useState(false);
  const [preview, setPreview] =
    useState<StudentStatusSideEffectsPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    changeStudentStatusAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending || isPreviewPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, (next) => {
    if (next.status) {
      onCompleted?.(next.status);
    }
    onOpenChange(false);
    router.refresh();
  });

  useEffect(() => {
    if (!open) {
      setRemoveFromClasses(false);
      setRemoveOpenSpps(false);
      setPreview(null);
      setPreviewError(null);
      return;
    }

    if (isActivate) {
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

  const classFieldError = state.fieldErrors?.remove_from_classes?.[0];
  const sppFieldError = state.fieldErrors?.remove_open_spps?.[0];

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
              : `Inactivate ${displayName}. Optionally leave eligible classes and delete payment-free open SPPs.`}
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

              {preview && !isPreviewPending ? (
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
              (!isActivate && (isPreviewPending || Boolean(previewError)))
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
