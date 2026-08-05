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
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/animate/tabs";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { EditWorkshopDialog } from "@/components/manager/workshops/edit-workshop-dialog";
import { WorkshopDocumentsSection } from "@/components/manager/workshops/workshop-documents-section";
import { WorkshopInstructorsSection } from "@/components/manager/workshops/workshop-instructors-section";
import { WorkshopPaymentsSection } from "@/components/manager/workshops/workshop-payments-section";
import { WorkshopScheduleSlotsSection } from "@/components/manager/workshops/workshop-schedule-slots-section";
import { WorkshopSessionsSection } from "@/components/manager/workshops/workshop-sessions-section";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import { WorkshopStatusStepper } from "@/components/manager/workshops/workshop-status-stepper";
import { ScheduleAssistantPrompt } from "@/components/manager/instructor-schedules/schedule-assistant-prompt";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
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
import { WORKSHOP_OFFERING_TYPE_LABELS } from "@/lib/constants/manager-workshop-display";
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

type WorkshopPageTabValue = "status" | "manage" | "assistant";

type WorkshopDetailsTabValue =
  | "schedule"
  | "sessions"
  | "instructors"
  | "documents"
  | "payments";

const MANAGEMENT_TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 sm:px-5",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

const PAGE_TAB_BODY_CLASS = "flex flex-col gap-4 p-1.5 sm:p-2";
const NESTED_TAB_BODY_CLASS = "outline-none p-1.5 sm:p-2";

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
    <div className="flex min-w-0 items-baseline justify-between gap-2 border-b border-border/60 py-1 last:border-b-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-foreground">
        {value?.trim() ? value : "—"}
      </dd>
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
  const [pageTab, setPageTab] = useState<WorkshopPageTabValue>("status");
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
  const canUseScheduleAssistant = hasPermissionInSet(
    permissions,
    PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW
  );
  const resolvedPageTab =
    pageTab === "assistant" && !canUseScheduleAssistant ? "status" : pageTab;
  const availableTabs = useMemo(() => {
    const tabs: WorkshopDetailsTabValue[] = [];
    if (canViewSchedule) {
      tabs.push("schedule");
    }
    if (canViewWorkshop) {
      tabs.push("sessions", "instructors", "documents");
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

      <Tabs
        value={resolvedPageTab}
        onValueChange={(value) => setPageTab(value as WorkshopPageTabValue)}
        className="gap-4"
      >
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="status" className="px-4">
            Status
          </TabsTrigger>
          <TabsTrigger value="manage" className="px-4">
            Manage
          </TabsTrigger>
          {canUseScheduleAssistant ? (
            <TabsTrigger value="assistant" className="px-4">
              AI assistant
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContents>
          <TabsContent value="status" className={PAGE_TAB_BODY_CLASS}>
            <Can permission={PERMISSIONS.WORKSHOPS_VIEW}>
              <WorkshopStatusStepper
                workshop={workshop}
                onStatusChanged={(updated) => {
                  setWorkshop(updated);
                  router.refresh();
                }}
              />
            </Can>
          </TabsContent>

          <TabsContent value="assistant" className={PAGE_TAB_BODY_CLASS}>
            <Can permission={PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW}>
              <ScheduleAssistantPrompt bare />
            </Can>
          </TabsContent>

          <TabsContent value="manage" className={PAGE_TAB_BODY_CLASS}>
            <Can permission={PERMISSIONS.WORKSHOPS_VIEW}>
              <ClassTabCollapsibleSection
                title={workshop.name}
                description="Workshop overview and details."
                storageKey={`workshop-details-info-v2:${workshop.id}`}
                defaultOpen
                action={
                  <div className="flex items-center gap-2">
                    <WorkshopStatusBadge
                      status={workshop.status}
                      className="w-fit"
                    />
                    <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label="Edit workshop"
                        onClick={() => setIsEditOpen(true)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                    </Can>
                  </div>
                }
              >
                <div className="px-3 py-3 sm:px-4">
                  {hasPayments ? (
                    <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                      {WORKSHOP_HAS_PAYMENTS_DELETE_ERROR} ({paymentCount}{" "}
                      payment
                      {paymentCount === 1 ? "" : "s"}).
                    </p>
                  ) : null}
                  <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                    <dl className="min-w-0">
                      <DetailField
                        label="Type"
                        value={WORKSHOP_OFFERING_TYPE_LABELS[workshop.type]}
                      />
                      <DetailField label="Subject" value={workshop.subject} />
                      <DetailField label="Phone" value={workshop.phone} />
                      <DetailField
                        label="Audience"
                        value={workshop.target_audience}
                      />
                    </dl>
                    <dl className="min-w-0">
                      <DetailField
                        label="Place"
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
                      <DetailField
                        label="Price"
                        value={formatMoney(workshop.price)}
                      />
                    </dl>
                    <dl className="min-w-0 sm:col-span-2 lg:col-span-1">
                      <DetailField
                        label="Start"
                        value={formatDate(workshop.start_date)}
                      />
                      <DetailField
                        label="End"
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
                </div>
              </ClassTabCollapsibleSection>
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
                        className={MANAGEMENT_TAB_TRIGGER_CLASS}
                      >
                        Schedule
                      </TabsTriggerPrimitive>
                    ) : null}
                    {canViewWorkshop ? (
                      <>
                        <TabsTriggerPrimitive
                          value="sessions"
                          className={MANAGEMENT_TAB_TRIGGER_CLASS}
                        >
                          Sessions
                        </TabsTriggerPrimitive>
                        <TabsTriggerPrimitive
                          value="instructors"
                          className={MANAGEMENT_TAB_TRIGGER_CLASS}
                        >
                          Instructors
                        </TabsTriggerPrimitive>
                        <TabsTriggerPrimitive
                          value="documents"
                          className={MANAGEMENT_TAB_TRIGGER_CLASS}
                        >
                          Documents
                        </TabsTriggerPrimitive>
                      </>
                    ) : null}
                    {canViewPayments ? (
                      <TabsTriggerPrimitive
                        value="payments"
                        className={MANAGEMENT_TAB_TRIGGER_CLASS}
                      >
                        Payments
                      </TabsTriggerPrimitive>
                    ) : null}
                  </TabsListPrimitive>
                </div>

                <TabsContentsPrimitive>
                  {canViewSchedule ? (
                    <TabsContentPrimitive
                      value="schedule"
                      className={NESTED_TAB_BODY_CLASS}
                    >
                      <WorkshopScheduleSlotsSection
                        workshopId={workshop.id}
                        workshopName={workshop.name}
                        scheduleSlots={scheduleSlots}
                        mutationsLocked={contentMutationsLocked}
                      />
                    </TabsContentPrimitive>
                  ) : null}
                  {canViewWorkshop ? (
                    <TabsContentPrimitive
                      value="sessions"
                      className={NESTED_TAB_BODY_CLASS}
                    >
                      <WorkshopSessionsSection
                        workshopId={workshop.id}
                        sessions={sessions}
                        mutationsLocked={contentMutationsLocked}
                      />
                    </TabsContentPrimitive>
                  ) : null}
                  {canViewWorkshop ? (
                    <TabsContentPrimitive
                      value="instructors"
                      className={NESTED_TAB_BODY_CLASS}
                    >
                      <WorkshopInstructorsSection
                        workshopId={workshop.id}
                        instructors={instructors}
                        candidates={instructorCandidates}
                        mutationsLocked={contentMutationsLocked}
                      />
                    </TabsContentPrimitive>
                  ) : null}
                  {canViewWorkshop ? (
                    <TabsContentPrimitive
                      value="documents"
                      className={NESTED_TAB_BODY_CLASS}
                    >
                      <WorkshopDocumentsSection
                        workshopId={workshop.id}
                        documents={documents}
                        mutationsLocked={contentMutationsLocked}
                      />
                    </TabsContentPrimitive>
                  ) : null}
                  {canViewPayments ? (
                    <TabsContentPrimitive
                      value="payments"
                      className={NESTED_TAB_BODY_CLASS}
                    >
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
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  );
}
