"use client";

import { useEffect, useRef } from "react";
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
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT } from "@/lib/manager/accounting/constants";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

type DropSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  completedImmediately?: boolean;
  removedStudentMembershipId?: string;
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
  const percentInputRef = useRef<HTMLInputElement>(null);
  const submittedMembershipIdRef = useRef<string | null>(null);

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
            pendingRequestId: next.requestId,
          });
        }
        onOpenChange(false);
        router.refresh();
      },
    });

  useEffect(() => {
    if (open && percentInputRef.current) {
      percentInputRef.current.value = String(
        SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT
      );
    }
  }, [open, student?.id]);

  function handleSubmit() {
    if (!student || isPending) {
      return;
    }
    submittedMembershipIdRef.current = student.id;
    const formData = new FormData();
    formData.set("student_id", student.user_id);
    formData.set("class_id", classId);
    formData.set("membership_id", student.id);
    formData.set(
      "required_percent",
      percentInputRef.current?.value?.trim() ||
        String(SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT)
    );
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Drop semester</DialogTitle>
          <DialogDescription>
            Mark {student?.full_name ?? "this student"} as dropping from{" "}
            {className}. They stay on the roster as pending until the required
            share of the phase amount is paid (default 50%).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="required_percent">Required percent</Label>
            <Input
              ref={percentInputRef}
              id="required_percent"
              name="required_percent"
              type="number"
              min={1}
              max={100}
              step={1}
              defaultValue={SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT}
              disabled={isPending}
              required
            />
            {state.fieldErrors?.required_percent?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.required_percent[0]}
              </p>
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
