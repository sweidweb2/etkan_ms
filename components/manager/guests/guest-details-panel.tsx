"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { deleteGuestAction } from "@/app/manager/guests/actions";
import { Can } from "@/components/auth/can";
import { EditGuestDialog } from "@/components/manager/guests/edit-guest-dialog";
import { GuestRegistrationSection } from "@/components/manager/guests/guest-registration-section";
import { GuestStatusHistory } from "@/components/manager/guests/guest-status-history";
import { GuestStatusStepper } from "@/components/manager/guests/guest-status-stepper";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PendingFlowChecklist } from "@/components/loaders/pending-flow-checklist";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useStagedPendingProgress } from "@/hooks/use-staged-pending-progress";
import {
  GUEST_EDUCATION_LEVEL_LABELS,
  GUEST_INTERESTED_SERVICE_LABELS,
  GUEST_CURRENT_STATUS_LABELS,
} from "@/lib/constants/guest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  DeleteGuestActionState,
  ManagerGuestRegistrationApplicationSummary,
  ManagerGuestRegistrationInvite,
  ManagerGuestRow,
  ManagerGuestStatusEventRow,
} from "@/types/manager-guest";

const initialDeleteState: DeleteGuestActionState = {};

const DELETE_GUEST_FLOW_STEPS = [
  {
    id: "documents",
    label: "Removing uploaded registration documents…",
  },
  {
    id: "registration",
    label: "Deleting registration form and invite…",
  },
  {
    id: "statuses",
    label: "Deleting status history…",
  },
  {
    id: "guest",
    label: "Deleting guest profile…",
  },
] as const;

type GuestDetailsPanelProps = {
  guest: ManagerGuestRow;
  statusEvents: ManagerGuestStatusEventRow[];
  registrationInvite: ManagerGuestRegistrationInvite | null;
  registrationApplication: ManagerGuestRegistrationApplicationSummary | null;
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-foreground">
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

export function GuestDetailsPanel({
  guest: initialGuest,
  statusEvents: initialStatusEvents,
  registrationInvite,
  registrationApplication,
}: GuestDetailsPanelProps) {
  const router = useRouter();
  const [guest, setGuest] = useState(initialGuest);
  const [statusEvents, setStatusEvents] = useState(initialStatusEvents);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteGuestAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );
  const deleteFlowActiveIndex = useStagedPendingProgress(
    isDeleteActionPending,
    DELETE_GUEST_FLOW_STEPS.length
  );

  useActionStateToast(deleteState, isDeleteActionPending);

  if (initialGuest.id !== guest.id || initialGuest.updated_at !== guest.updated_at) {
    setGuest(initialGuest);
  }

  const initialEventsFingerprint = initialStatusEvents
    .map((event) => `${event.id}:${event.status}`)
    .join("|");
  const [syncedEventsFingerprint, setSyncedEventsFingerprint] = useState(
    initialEventsFingerprint
  );
  if (initialEventsFingerprint !== syncedEventsFingerprint) {
    setStatusEvents(initialStatusEvents);
    setSyncedEventsFingerprint(initialEventsFingerprint);
  }

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("id", guest.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_GUESTS}>Guests</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{guest.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EditGuestDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        guest={guest}
        onGuestUpdated={() => router.refresh()}
      />

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete guest</DialogTitle>
            <DialogDescription>
              {isDeleteActionPending
                ? "Please wait while this guest and related records are removed."
                : `This will permanently delete "${guest.full_name}" and everything linked to this guest. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {isDeleteActionPending ? (
            <PendingFlowChecklist
              steps={DELETE_GUEST_FLOW_STEPS}
              activeIndex={deleteFlowActiveIndex}
            />
          ) : (
            <ul className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <li>Guest profile</li>
              <li>
                Status history
                {statusEvents.length > 0
                  ? ` (${statusEvents.length} ${statusEvents.length === 1 ? "record" : "records"})`
                  : " (none)"}
              </li>
              <li>
                Registration invite
                {registrationInvite ? "" : " (none)"}
              </li>
              <li>
                Registration form
                {registrationApplication ? "" : " (none)"}
              </li>
              <li>Uploaded registration documents (if any)</li>
            </ul>
          )}
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
                  Deleting
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GuestStatusStepper
        guest={guest}
        statusEvents={statusEvents}
        onStatusChanged={(updated, nextEvents) => {
          setGuest(updated);
          if (nextEvents) {
            const fingerprint = nextEvents
              .map((event) => `${event.id}:${event.status}`)
              .join("|");
            setStatusEvents(nextEvents);
            setSyncedEventsFingerprint(fingerprint);
          }
          router.refresh();
        }}
      />

      {guest.status === "finished" ? (
        <p className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Finished means this guest is routed for manual team handoff. The
          system does not auto-create users, student profiles, or enrollments.
        </p>
      ) : null}

      <GuestStatusHistory events={statusEvents} />

      <GuestRegistrationSection
        guest={guest}
        invite={registrationInvite}
        application={registrationApplication}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{guest.full_name}</CardTitle>
          <CardAction className="flex items-center gap-2 self-center">
            <Can permission={PERMISSIONS.GUESTS_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </Can>
            <Can permission={PERMISSIONS.GUESTS_DELETE}>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleteActionPending}
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="py-5">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Phone" value={guest.phone} />
            <DetailField label="Age" value={String(guest.age)} />
            <DetailField
              label="Status"
              value={GUEST_CURRENT_STATUS_LABELS[guest.status]}
            />
            <DetailField
              label="School / university"
              value={guest.school_or_university ?? undefined}
            />
            <DetailField
              label="Education level"
              value={GUEST_EDUCATION_LEVEL_LABELS[guest.education_level]}
            />
            <DetailField
              label="Interested service"
              value={
                GUEST_INTERESTED_SERVICE_LABELS[guest.interested_service]
              }
            />
            <DetailField
              label="Created"
              value={format(new Date(guest.created_at), "MMM d, yyyy HH:mm")}
            />
            <DetailField
              label="Updated"
              value={format(new Date(guest.updated_at), "MMM d, yyyy HH:mm")}
            />
            <DetailField
              label="Notes"
              value={guest.notes ?? undefined}
              className="sm:col-span-2 lg:col-span-3"
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
