"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDaysIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { deleteWorkshopAction } from "@/app/manager/workshops/actions";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { EditWorkshopDialog } from "@/components/manager/workshops/edit-workshop-dialog";
import { WorkshopDocumentsSection } from "@/components/manager/workshops/workshop-documents-section";
import { WorkshopInstructorsSection } from "@/components/manager/workshops/workshop-instructors-section";
import { WorkshopPaymentsSection } from "@/components/manager/workshops/workshop-payments-section";
import { WorkshopScheduleSlotsSection } from "@/components/manager/workshops/workshop-schedule-slots-section";
import { WorkshopSessionsSection } from "@/components/manager/workshops/workshop-sessions-section";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import { WorkshopStatusStepper } from "@/components/manager/workshops/workshop-status-stepper";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { MANAGER_WORKSHOP_STATUS_LABELS, WORKSHOP_OFFERING_TYPE_LABELS } from "@/lib/constants/manager-workshop-display";
import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type { ManagerInstructorScheduleSession } from "@/types/manager-instructor-schedule";
import type {
  DeleteWorkshopActionState,
  ManagerWorkshopDocumentRow,
  ManagerWorkshopInstructorCandidate,
  ManagerWorkshopInstructorRow,
  ManagerWorkshopPaymentRow,
  ManagerWorkshopPaymentSummary,
  ManagerWorkshopRow,
  ManagerWorkshopSessionRow,
} from "@/types/manager-workshop";

type WorkshopDetailsTabValue =
  | "schedule"
  | "instructors"
  | "documents"
  | "payments";

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 sm:px-5",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

type WorkshopDetailsPanelProps = {
  workshop: ManagerWorkshopRow;
  paymentCount: number;
  payments: ManagerWorkshopPaymentRow[];
  paymentSummary: ManagerWorkshopPaymentSummary;
  instructors: ManagerWorkshopInstructorRow[];
  instructorCandidates: ManagerWorkshopInstructorCandidate[];
  documents: ManagerWorkshopDocumentRow[];
  scheduleSlots: ManagerInstructorScheduleSession[];
  sessions: ManagerWorkshopSessionRow[];
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
  payments,
  paymentSummary,
  instructors,
  instructorCandidates,
  documents,
  scheduleSlots,
  sessions,
}: WorkshopDetailsPanelProps) {
  const router = useRouter();
  const permissions = usePermissions();
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

  const canViewWorkshop = hasPermissionInSet(
    permissions,
    PERMISSIONS.WORKSHOPS_VIEW
  );
  const canViewSchedule = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );
  const canViewPayments = hasPermissionInSet(
    permissions,
    PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW
  );
  const availableTabs = useMemo(() => {
    const tabs: WorkshopDetailsTabValue[] = [];
    if (canViewSchedule) {
      tabs.push("schedule");
    }
    if (canViewWorkshop) {
      tabs.push("instructors", "documents");
    }
    if (canViewPayments) {
      tabs.push("payments");
    }
    return tabs;
  }, [canViewPayments, canViewSchedule, canViewWorkshop]);
  const [activeTab, setActiveTab] =
    useState<WorkshopDetailsTabValue>("schedule");
  const resolvedTab = availableTabs.includes(activeTab)
    ? activeTab
    : (availableTabs[0] ?? "schedule");

  const hasPayments = paymentCount > 0;
  const deleteBlockedReason = hasPayments
    ? WORKSHOP_HAS_PAYMENTS_DELETE_ERROR
    : undefined;
  const contentMutationsLocked =
    workshop.status === WORKSHOP_STATUSES.COMPLETED ||
    workshop.status === WORKSHOP_STATUSES.CANCELLED;

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("workshop_id", workshop.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb className="min-w-0">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Workshop actions"
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW}>
              <DropdownMenuItem asChild>
                <Link href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES}>
                  <CalendarDaysIcon />
                  Open calendar
                </Link>
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.WORKSHOPS_DELETE}>
              <DropdownMenuItem
                disabled={hasPayments || isDeleteActionPending}
                title={deleteBlockedReason}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => {
                  if (hasPayments || isDeleteActionPending) {
                    return;
                  }
                  setIsDeleteOpen(true);
                }}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

      <Can permission={PERMISSIONS.WORKSHOPS_VIEW}>
        <ClassTabCollapsibleSection
          title="Details"
          description={MANAGER_WORKSHOP_STATUS_LABELS[workshop.status]}
          storageKey={`workshop-details-info-v2:${workshop.id}`}
          defaultOpen
        >
          <div className="px-3 py-4 sm:px-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {workshop.name}
              </h2>
              <WorkshopStatusBadge status={workshop.status} className="w-fit" />
            </div>
            {hasPayments ? (
              <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                {WORKSHOP_HAS_PAYMENTS_DELETE_ERROR} ({paymentCount} payment
                {paymentCount === 1 ? "" : "s"}).
              </p>
            ) : null}
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField
                label="Type"
                value={WORKSHOP_OFFERING_TYPE_LABELS[workshop.type]}
              />
              <DetailField label="Phone" value={workshop.phone} />
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
                    ? "0"
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
          </div>
        </ClassTabCollapsibleSection>
      </Can>

      <Can permission={PERMISSIONS.WORKSHOPS_VIEW}>
        <WorkshopStatusStepper
          workshop={workshop}
          onStatusChanged={(updated) => {
            setWorkshop(updated);
            router.refresh();
          }}
        />
      </Can>

      <Can permission={PERMISSIONS.WORKSHOPS_VIEW}>
        <WorkshopSessionsSection
          workshopId={workshop.id}
          sessions={sessions}
          mutationsLocked={contentMutationsLocked}
        />
      </Can>

      {availableTabs.length > 0 ? (
        <TabsPrimitive
          value={resolvedTab}
          onValueChange={(value) =>
            setActiveTab(value as WorkshopDetailsTabValue)
          }
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-center">
            <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:w-fit">
              {canViewSchedule ? (
                <TabsTriggerPrimitive
                  value="schedule"
                  className={TAB_TRIGGER_CLASS}
                >
                  Schedule
                </TabsTriggerPrimitive>
              ) : null}
              {canViewWorkshop ? (
                <>
                  <TabsTriggerPrimitive
                    value="instructors"
                    className={TAB_TRIGGER_CLASS}
                  >
                    Instructors
                  </TabsTriggerPrimitive>
                  <TabsTriggerPrimitive
                    value="documents"
                    className={TAB_TRIGGER_CLASS}
                  >
                    Documents
                  </TabsTriggerPrimitive>
                </>
              ) : null}
              {canViewPayments ? (
                <TabsTriggerPrimitive
                  value="payments"
                  className={TAB_TRIGGER_CLASS}
                >
                  Payments
                </TabsTriggerPrimitive>
              ) : null}
            </TabsListPrimitive>
          </div>

          <TabsContentsPrimitive>
            {canViewSchedule ? (
              <TabsContentPrimitive value="schedule" className="outline-none">
                <WorkshopScheduleSlotsSection
                  workshopId={workshop.id}
                  workshopName={workshop.name}
                  scheduleSlots={scheduleSlots}
                  mutationsLocked={contentMutationsLocked}
                />
              </TabsContentPrimitive>
            ) : null}
            {canViewWorkshop ? (
              <TabsContentPrimitive value="instructors" className="outline-none">
                <WorkshopInstructorsSection
                  workshopId={workshop.id}
                  instructors={instructors}
                  candidates={instructorCandidates}
                  mutationsLocked={contentMutationsLocked}
                />
              </TabsContentPrimitive>
            ) : null}
            {canViewWorkshop ? (
              <TabsContentPrimitive value="documents" className="outline-none">
                <WorkshopDocumentsSection
                  workshopId={workshop.id}
                  documents={documents}
                  mutationsLocked={contentMutationsLocked}
                />
              </TabsContentPrimitive>
            ) : null}
            {canViewPayments ? (
              <TabsContentPrimitive value="payments" className="outline-none">
                <WorkshopPaymentsSection
                  workshopId={workshop.id}
                  payments={payments}
                  summary={paymentSummary}
                  mutationsLocked={contentMutationsLocked}
                />
              </TabsContentPrimitive>
            ) : null}
          </TabsContentsPrimitive>
        </TabsPrimitive>
      ) : null}
    </div>
  );
}
