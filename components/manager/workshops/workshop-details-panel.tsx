"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { deleteWorkshopAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { EditWorkshopDialog } from "@/components/manager/workshops/edit-workshop-dialog";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  DeleteWorkshopActionState,
  ManagerWorkshopRow,
} from "@/types/manager-workshop";

type WorkshopDetailsPanelProps = {
  workshop: ManagerWorkshopRow;
  paymentCount: number;
};

const initialDeleteState: DeleteWorkshopActionState = {};

const WORKSHOP_HAS_PAYMENTS_DELETE_ERROR =
  "Remove workshop payments before deleting this workshop.";

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function formatMoney(value: number | null) {
  if (value == null) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return format(new Date(value), "MMM d, yyyy");
}

export function WorkshopDetailsPanel({
  workshop: initialWorkshop,
  paymentCount,
}: WorkshopDetailsPanelProps) {
  const router = useRouter();
  const [workshop, setWorkshop] = useState(initialWorkshop);
  const [prevWorkshop, setPrevWorkshop] = useState(initialWorkshop);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteWorkshopAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );

  useActionStateToast(deleteState, isDeleteActionPending);

  if (initialWorkshop !== prevWorkshop) {
    setPrevWorkshop(initialWorkshop);
    setWorkshop(initialWorkshop);
  }

  const hasPayments = paymentCount > 0;
  const deleteBlockedReason = hasPayments
    ? WORKSHOP_HAS_PAYMENTS_DELETE_ERROR
    : undefined;

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("workshop_id", workshop.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_WORKSHOPS}>
              Manage workshops
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{workshop.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EditWorkshopDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        workshop={workshop}
        onWorkshopUpdated={(updated) => {
          setWorkshop(updated);
          router.refresh();
        }}
      />

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete workshop</DialogTitle>
            <DialogDescription>
              This permanently deletes {workshop.name}, including instructors
              and documents. Payments must be removed first. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeleteActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleteActionPending}
            >
              {isDeleteActionPending ? (
                <>
                  <InlineSpinner />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <CardTitle className="text-xl">{workshop.name}</CardTitle>
            <WorkshopStatusBadge status={workshop.status} className="w-fit" />
          </div>
          <CardAction className="flex items-center gap-2 self-center">
            <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </Can>
            <Can permission={PERMISSIONS.WORKSHOPS_DELETE}>
              <Button
                type="button"
                variant="destructive"
                disabled={hasPayments || isDeleteActionPending}
                title={deleteBlockedReason}
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          {hasPayments ? (
            <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {WORKSHOP_HAS_PAYMENTS_DELETE_ERROR} ({paymentCount} payment
              {paymentCount === 1 ? "" : "s"}).
            </p>
          ) : null}
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Subject" value={workshop.subject} />
            <DetailField
              label="Target audience"
              value={workshop.target_audience}
            />
            <DetailField
              label="Delivery place"
              value={workshop.delivery_place}
            />
            <DetailField
              label="Participants"
              value={
                workshop.nb_participants == null
                  ? null
                  : String(workshop.nb_participants)
              }
            />
            <DetailField
              label="Sessions"
              value={
                workshop.number_of_sessions == null
                  ? null
                  : String(workshop.number_of_sessions)
              }
            />
            <DetailField label="Price" value={formatMoney(workshop.price)} />
            <DetailField
              label="Start date"
              value={formatDate(workshop.start_date)}
            />
            <DetailField
              label="End date"
              value={formatDate(workshop.end_date)}
            />
            <DetailField
              label="Created"
              value={format(
                new Date(workshop.created_at),
                "MMM d, yyyy 'at' h:mm a"
              )}
            />
          </dl>
          {workshop.proposal_notes ? (
            <div className="mt-4 flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Proposal notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {workshop.proposal_notes}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
