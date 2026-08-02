"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { removeWorkshopInstructorAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { AddWorkshopInstructorDialog } from "@/components/manager/workshops/add-workshop-instructor-dialog";
import { EditWorkshopInstructorDialog } from "@/components/manager/workshops/edit-workshop-instructor-dialog";
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
import {
  WORKSHOP_INSTRUCTOR_ROLE_LABELS,
  WORKSHOP_WAGE_TYPE_LABELS,
} from "@/lib/constants/manager-workshop-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  ManagerWorkshopInstructorCandidate,
  ManagerWorkshopInstructorRow,
  RemoveWorkshopInstructorActionState,
} from "@/types/manager-workshop";

const initialRemoveState: RemoveWorkshopInstructorActionState = {};

type WorkshopInstructorsSectionProps = {
  workshopId: string;
  instructors: ManagerWorkshopInstructorRow[];
  candidates: ManagerWorkshopInstructorCandidate[];
};

function formatWageAmount(
  amount: number | null,
  wageType: ManagerWorkshopInstructorRow["wage_type"]
) {
  if (amount == null) {
    return "—";
  }
  if (wageType === "percentage") {
    return `${amount}%`;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function WorkshopInstructorsSection({
  workshopId,
  instructors,
  candidates,
}: WorkshopInstructorsSectionProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] =
    useState<ManagerWorkshopInstructorRow | null>(null);
  const [removingInstructor, setRemovingInstructor] =
    useState<ManagerWorkshopInstructorRow | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [removeState, removeAction, isRemovePending] = useActionState(
    removeWorkshopInstructorAction,
    initialRemoveState
  );
  const isRemoveActionPending = isRemovePending || isTransitionPending;
  const handleRemoveOpenChange = usePendingAwareOpenChange(
    isRemoveActionPending,
    (open) => {
      if (!open) {
        setRemovingInstructor(null);
      }
    }
  );

  useActionStateToast(removeState, isRemoveActionPending);
  useActionStateSuccess(removeState, isRemoveActionPending, () => {
    setRemovingInstructor(null);
    router.refresh();
  });

  function handleConfirmRemove() {
    if (!removingInstructor) {
      return;
    }
    const formData = new FormData();
    formData.set("id", removingInstructor.id);
    formData.set("workshop_id", workshopId);
    startTransition(() => {
      removeAction(formData);
    });
  }

  return (
    <>
      <AddWorkshopInstructorDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        workshopId={workshopId}
        candidates={candidates}
        onAdded={() => router.refresh()}
      />

      <EditWorkshopInstructorDialog
        open={Boolean(editingInstructor)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingInstructor(null);
          }
        }}
        instructor={editingInstructor}
        onUpdated={() => router.refresh()}
      />

      <Dialog
        open={Boolean(removingInstructor)}
        onOpenChange={handleRemoveOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isRemoveActionPending}
        >
          <DialogHeader>
            <DialogTitle>Remove instructor</DialogTitle>
            <DialogDescription>
              Remove{" "}
              {removingInstructor?.username?.trim()
                ? removingInstructor.username
                : "this instructor"}{" "}
              from this workshop? This does not delete their user account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRemoveOpenChange(false)}
              disabled={isRemoveActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={isRemoveActionPending}
            >
              {isRemoveActionPending ? <InlineSpinner /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-lg">Instructors</CardTitle>
          <CardAction>
            <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
              <Button type="button" onClick={() => setIsAddOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add instructor
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          {instructors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No instructors assigned yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Instructor</th>
                    <th className="pb-2 pr-3 font-medium">Role</th>
                    <th className="pb-2 pr-3 font-medium">Wage</th>
                    <th className="pb-2 pr-3 font-medium">Notes</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map((instructor) => (
                    <tr
                      key={instructor.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-3 pr-3 align-top font-medium text-foreground">
                        {instructor.username?.trim()
                          ? instructor.username
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 align-top text-foreground">
                        {WORKSHOP_INSTRUCTOR_ROLE_LABELS[instructor.role]}
                      </td>
                      <td className="py-3 pr-3 align-top text-foreground">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {WORKSHOP_WAGE_TYPE_LABELS[instructor.wage_type]}
                          </span>
                          <span className="text-muted-foreground">
                            {formatWageAmount(
                              instructor.wage_amount,
                              instructor.wage_type
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-top text-muted-foreground">
                        {instructor.notes?.trim() ? instructor.notes : "—"}
                      </td>
                      <td className="py-3 align-top">
                        <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${instructor.username ?? "instructor"}`}
                              onClick={() => setEditingInstructor(instructor)}
                            >
                              <PencilIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${instructor.username ?? "instructor"}`}
                              onClick={() => setRemovingInstructor(instructor)}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
