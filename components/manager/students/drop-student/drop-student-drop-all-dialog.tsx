"use client";

import { useRef, useState } from "react";
import { dropAllSemestersAction } from "@/app/manager/students/actions";
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
import type { DropAllSemestersActionState } from "@/types/manager-drop-student-console";

const initialState: DropAllSemestersActionState = {};

type DropStudentDropAllDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  semesterCount: number;
  onCompleted: () => void;
};

export function DropStudentDropAllDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  semesterCount,
  onCompleted,
}: DropStudentDropAllDialogProps) {
  const valueInputRef = useRef<HTMLInputElement>(null);
  const formResetKey = open ? studentId : "closed";
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
      action: dropAllSemestersAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: () => {
        onCompleted();
        onOpenChange(false);
      },
    });

  function handleSubmit() {
    if (isPending) return;
    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("restriction_mode", restrictionMode);
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
          <DialogTitle>Drop all semesters</DialogTitle>
          <DialogDescription>
            Immediately drop {studentName} from {semesterCount} semester
            {semesterCount === 1 ? "" : "s"} with the same restriction. Stops on
            the first failure.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="drop-all-mode">Restriction</Label>
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
              <SelectTrigger id="drop-all-mode">
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
            <Label htmlFor="drop-all-value">
              {restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
                ? "Required amount"
                : "Required percent"}
            </Label>
            <Input
              key={formResetKey}
              id="drop-all-value"
              ref={valueInputRef}
              type="number"
              min={0}
              step={
                restrictionMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
                  ? "0.01"
                  : "1"
              }
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Drop all now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
