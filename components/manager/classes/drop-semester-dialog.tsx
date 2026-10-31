"use client";

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
  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: createSemesterDropAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (next) => {
        onCompleted({
          removedMembershipId: next.removedStudentMembershipId,
          pendingRequestId: next.requestId,
        });
        onOpenChange(false);
        router.refresh();
      },
    });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Drop semester</DialogTitle>
            <DialogDescription>
              Mark {student?.full_name ?? "this student"} as dropping from{" "}
              {className}. They stay on the roster as pending until the required
              share of the phase amount is paid (default 50%).
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="student_id" value={student?.user_id ?? ""} />
          <input type="hidden" name="class_id" value={classId} />
          <input
            type="hidden"
            name="membership_id"
            value={student?.id ?? ""}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="required_percent">Required percent</Label>
            <Input
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

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !student}>
              {isPending ? <InlineSpinner /> : null}
              Drop semester
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
