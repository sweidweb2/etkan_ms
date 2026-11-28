"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSemesterDropAction } from "@/app/manager/classes/actions";
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
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import {
  SEMESTER_DROP_RESTRICTION_MODES,
  type SemesterDropRestrictionMode,
} from "@/lib/manager/accounting/constants";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

type DropSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  completedImmediately?: boolean;
  removedStudentMembershipId?: string;
  removedMembershipIds?: string[];
  membershipId?: string;
  requestId?: string;
};

const initialState: DropSemesterActionState = {};

type DropSemesterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  student: ManagerClassStudentRow | null;
  onCompleted: (result: {
    membershipId: string;
    removedMembershipId?: string;
    removedMembershipIds?: string[];
    pendingRequestId?: string;
  }) => void;
};

export function DropSemesterDialog({
  open,
  onOpenChange,
  classId,
  className,
  student,
  onCompleted,
}: DropSemesterDialogProps) {
  const router = useRouter();
  const valueInputRef = useRef<HTMLInputElement>(null);
  const submittedMembershipIdRef = useRef<string | null>(null);
  const formResetKey = open ? (student?.id ?? "open") : "closed";
  const [restrictionMode, setRestrictionMode] =
    useState<SemesterDropRestrictionMode>(
      SEMESTER_DROP_RESTRICTION_MODES.PERCENT
    );
  const [prevFormResetKey, setPrevFormResetKey] = useState(formResetKey);
  if (formResetKey !== prevFormResetKey) {
    setPrevFormResetKey(formResetKey);
    if (open) {
      setRestrictionMode(SEMESTER_DROP_RESTRICTION_MODES.PERCENT);
    }
  }

  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: createSemesterDropAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (next) => {
        const membershipId =
          next.membershipId ??
          next.removedStudentMembershipId ??
          submittedMembershipIdRef.current ??
          undefined;
        if (membershipId) {
          onCompleted({
            membershipId,
            removedMembershipId: next.removedStudentMembershipId,
            removedMembershipIds: next.removedMembershipIds,
            pendingRequestId: next.requestId,
          });
        }
        onOpenChange(false);
        router.refresh();
      },
    });

  function handleSubmit() {
    if (!student || isPending) {
      return;
    }
    submittedMembershipIdRef.current = student.id;
    const rawValue = valueInputRef.current?.value?.trim() ?? "";
    const formData = new FormData();
    formData.set("student_id", student.user_id);
    formData.set("class_id", classId);
    formData.set("membership_id", student.id);
    formData.set("restriction_mode", restrictionMode);
    if (restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
      formData.set("required_percent", rawValue);
    } else if (restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
      formData.set("required_amount", rawValue);
    }
    formAction(formData);
  }

  const valueLabel =
    restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
      ? "Required amount"
      : "Required percent";
  const valueError =
    restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
      ? state.fieldErrors?.required_amount?.[0]
      : state.fieldErrors?.required_percent?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Drop semester</DialogTitle>
          <DialogDescription>
            Mark {student?.full_name ?? "this student"} as dropping this
            semester (from {className}). When the drop completes, they leave
            every scheduled or in-progress class in the semester. Leave the
            value empty or 0 for no restriction (drop now, keep payments, no
            refund). Otherwise they stay pending until the required percent or
            amount is paid.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="restriction_mode">Restriction type</Label>
            <Select
              value={restrictionMode}
              onValueChange={(value) => {
                if (
                  value === SEMESTER_DROP_RESTRICTION_MODES.PERCENT ||
                  value === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
                ) {
                  setRestrictionMode(value);
                  if (valueInputRef.current) {
                    valueInputRef.current.value = "";
                  }
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger id="restriction_mode">
                <SelectValue placeholder="Choose type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEMESTER_DROP_RESTRICTION_MODES.PERCENT}>
                  Percent
                </SelectItem>
                <SelectItem value={SEMESTER_DROP_RESTRICTION_MODES.AMOUNT}>
                  Amount
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="drop_restriction_value">{valueLabel}</Label>
            <Input
              key={formResetKey}
              ref={valueInputRef}
              id="drop_restriction_value"
              name="drop_restriction_value"
              type="number"
              min={0}
              max={
                restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT
                  ? 100
                  : undefined
              }
              step={
                restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT
                  ? 1
                  : 0.01
              }
              placeholder="Empty or 0 = no restriction"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Empty or 0 drops immediately and keeps existing payments with no
              refund.
            </p>
            {valueError ? (
              <p className="text-sm text-destructive">{valueError}</p>
            ) : null}
          </div>

          {state.error && !state.fieldErrors ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !student}
          >
            {isPending ? <InlineSpinner /> : null}
            Drop semester
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
