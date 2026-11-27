"use client";

import { useEffect, useRef, useState } from "react";
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
import type { CreateSemesterDropActionState } from "@/types/manager-semester-drop";

const initialState: CreateSemesterDropActionState = {};

type DropStudentDropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  membershipId: string;
  semesterName: string;
  onCompleted: () => void;
};

export function DropStudentDropDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  classId,
  className,
  membershipId,
  semesterName,
  onCompleted,
}: DropStudentDropDialogProps) {
  const valueInputRef = useRef<HTMLInputElement>(null);
  const [restrictionMode, setRestrictionMode] =
    useState<SemesterDropRestrictionMode>(
      SEMESTER_DROP_RESTRICTION_MODES.PERCENT
    );

  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: createSemesterDropAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: () => {
        onCompleted();
        onOpenChange(false);
      },
    });

  useEffect(() => {
    if (!open) return;
    setRestrictionMode(SEMESTER_DROP_RESTRICTION_MODES.PERCENT);
    if (valueInputRef.current) valueInputRef.current.value = "";
  }, [open, studentId, classId]);

  function handleSubmit() {
    if (isPending) return;
    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("class_id", classId);
    formData.set("membership_id", membershipId);
    formData.set("restriction_mode", restrictionMode);
    formData.set("audit_source", "drop_student_console");
    const raw = valueInputRef.current?.value?.trim() ?? "";
    if (restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
      formData.set("required_percent", raw);
    } else if (restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
      formData.set("required_amount", raw);
    }
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Drop · {semesterName}</DialogTitle>
          <DialogDescription>
            Drop {studentName} from {semesterName} via {className}. Empty or 0 =
            no restriction (immediate, keep payments, no refund).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="drop-console-mode">Restriction</Label>
            <Select
              value={restrictionMode}
              onValueChange={(value) => {
                if (
                  value === SEMESTER_DROP_RESTRICTION_MODES.PERCENT ||
                  value === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
                ) {
                  setRestrictionMode(value);
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger id="drop-console-mode">
                <SelectValue />
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
          <div className="grid gap-1.5">
            <Label htmlFor="drop-console-value">
              {restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
                ? "Required amount"
                : "Required percent"}
            </Label>
            <Input
              id="drop-console-value"
              ref={valueInputRef}
              type="number"
              min={0}
              step={restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT ? "0.01" : "1"}
              placeholder="Empty or 0 = no restriction"
              disabled={isPending}
            />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Drop semester
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
