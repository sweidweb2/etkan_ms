"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  CalendarDaysIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  createInstructorScheduleSlotAction,
  deleteInstructorScheduleSlotAction,
  updateInstructorScheduleSlotAction,
} from "@/app/manager/instructor-schedules/actions";
import { loadWorkshopScheduleSlotsAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { EditInstructorScheduleSlotDialog } from "@/components/manager/instructor-schedules/edit-instructor-schedule-slot-dialog";
import { AddWorkshopScheduleSlotDialog } from "@/components/manager/workshops/add-workshop-schedule-slot-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  dayOfWeekFromIsoDate,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  getInstructorScheduleSlotDisplayColor,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS,
  type CreateInstructorScheduleSlotInput,
  type UpdateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  CreateInstructorScheduleSlotActionState,
  ManagerInstructorScheduleSession,
  UpdateInstructorScheduleSlotActionState,
} from "@/types/manager-instructor-schedule";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const TEMP_SLOT_ID_PREFIX = "__temp_workshop_slot_";

type WorkshopScheduleSlotsSectionProps = {
  workshopId: string;
  workshopName: string;
  mutationsLocked?: boolean;
};

function formatAnchorDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function makeTempId(): string {
  return `${TEMP_SLOT_ID_PREFIX}${crypto.randomUUID()}`;
}

function toCreateFormData(values: CreateInstructorScheduleSlotInput): FormData {
  const formData = new FormData();
  formData.set("entity_type", values.entity_type);
  formData.set("record_id", values.record_id);
  formData.set("name", values.name);
  formData.set("slot_date", values.slot_date);
  formData.set("start_time", values.start_time);
  formData.set("end_time", values.end_time);
  return formData;
}

function toUpdateFormData(values: UpdateInstructorScheduleSlotInput): FormData {
  const formData = new FormData();
  formData.set("id", values.id);
  formData.set("entity_type", values.entity_type);
  formData.set("record_id", values.record_id);
  formData.set("name", values.name);
  formData.set("type", values.type);
  formData.set("slot_date", values.slot_date);
  formData.set("start_time", values.start_time);
  formData.set("end_time", values.end_time);
  return formData;
}

function sessionFromCreateInput(
  values: CreateInstructorScheduleSlotInput,
  id: string,
  workshopId: string
): ManagerInstructorScheduleSession {
  return {
    id,
    entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
    recordId: workshopId,
    name: values.name,
    type: values.type,
    slotDate: values.slot_date,
    dayOfWeek: dayOfWeekFromIsoDate(values.slot_date),
    startTime: values.start_time,
    endTime: values.end_time,
    color: getInstructorScheduleSlotDisplayColor({
      entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      recordId: workshopId,
    }),
    sourceWorkshopId: null,
    sourceSlotId: null,
  };
}

export function WorkshopScheduleSlotsSection({
  workshopId,
  workshopName,
  mutationsLocked = false,
}: WorkshopScheduleSlotsSectionProps) {
  const [slots, setSlots] = useState<ManagerInstructorScheduleSession[]>([]);
  const [selectedSession, setSelectedSession] =
    useState<ManagerInstructorScheduleSession | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ManagerInstructorScheduleSession | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    (open) => {
      if (!open) {
        setDeleteTarget(null);
      }
    }
  );

  useEffect(() => {
    let cancelled = false;
    void loadWorkshopScheduleSlotsAction(workshopId).then((rows) => {
      if (!cancelled) {
        setSlots(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  async function handleCreate(values: CreateInstructorScheduleSlotInput) {
    const tempId = makeTempId();
    const optimistic = sessionFromCreateInput(values, tempId, workshopId);
    setSlots((prev) => [...prev, optimistic]);

    const result: CreateInstructorScheduleSlotActionState =
      await createInstructorScheduleSlotAction({}, toCreateFormData(values));

    if (!result.success) {
      setSlots((prev) => prev.filter((slot) => slot.id !== tempId));
      showErrorToast(result.error ?? "Unable to create slot.");
      return;
    }

    if (result.session) {
      setSlots((prev) =>
        prev.map((slot) => (slot.id === tempId ? result.session! : slot))
      );
    }

    showSuccessToast(result.message ?? "Slot created.");
  }

  async function handleUpdate(values: UpdateInstructorScheduleSlotInput) {
    const previous = slots.find((slot) => slot.id === values.id);
    if (!previous) {
      showErrorToast("Unable to update slot.");
      return;
    }

    const optimistic: ManagerInstructorScheduleSession = {
      ...previous,
      name: values.name,
      type: values.type,
      dayOfWeek: dayOfWeekFromIsoDate(values.slot_date),
      startTime: values.start_time,
      endTime: values.end_time,
    };

    setSlots((prev) =>
      prev.map((slot) => (slot.id === values.id ? optimistic : slot))
    );
    setSelectedSession(optimistic);

    const result: UpdateInstructorScheduleSlotActionState =
      await updateInstructorScheduleSlotAction({}, toUpdateFormData(values));

    if (!result.success) {
      setSlots((prev) =>
        prev.map((slot) => (slot.id === values.id ? previous : slot))
      );
      setSelectedSession(previous);
      showErrorToast(result.error ?? "Unable to update slot.");
      return;
    }

    if (result.session) {
      setSlots((prev) =>
        prev.map((slot) => (slot.id === values.id ? result.session! : slot))
      );
      setSelectedSession(result.session);
    }

    showSuccessToast(result.message ?? "Slot updated.");
  }

  function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const removed = deleteTarget;
    setDeleteTarget(null);
    setIsEditOpen(false);
    setSelectedSession(null);
    setSlots((prev) => prev.filter((slot) => slot.id !== removed.id));

    startDeleteTransition(() => {
      void (async () => {
        const formData = new FormData();
        formData.set("id", removed.id);
        const result = await deleteInstructorScheduleSlotAction({}, formData);

        if (!result.success) {
          setSlots((prev) => [...prev, removed]);
          showErrorToast(result.error ?? "Unable to delete slot.");
          return;
        }

        showSuccessToast(result.message ?? "Slot deleted.");
      })();
    });
  }

  return (
    <>
      <AddWorkshopScheduleSlotDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        workshopId={workshopId}
        workshopName={workshopName}
        nextSessionNumber={slots.length + 1}
        onCreate={handleCreate}
      />

      <EditInstructorScheduleSlotDialog
        open={isEditOpen}
        onOpenChange={(next) => {
          setIsEditOpen(next);
          if (!next && !deleteTarget) {
            setSelectedSession(null);
          }
        }}
        session={selectedSession}
        entityLabel={workshopName}
        onUpdate={handleUpdate}
        onDeleteRequest={(session) => {
          setDeleteTarget(session);
        }}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeletePending}
        >
          <DialogHeader>
            <DialogTitle>Delete schedule slot</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              {deleteTarget
                ? `${deleteTarget.name} (every ${WEEKDAY_LABELS[deleteTarget.dayOfWeek] ?? "week"})`
                : "this weekly slot"}
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletePending}
              onClick={() => handleDeleteOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletePending}
              onClick={handleConfirmDelete}
            >
              {isDeletePending ? (
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

      <ClassTabCollapsibleSection
        title="Schedule slots"
        description={
          slots.length === 0
            ? "No weekly slots yet"
            : `${slots.length} weekly slot${slots.length === 1 ? "" : "s"}`
        }
        storageKey={`workshop-details-schedule-slots-v2:${workshopId}`}
        defaultOpen
        action={
          <div className="flex items-center gap-2">
            {!mutationsLocked ? (
              <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE}>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <PlusIcon data-icon="inline-start" />
                  Add slot
                </Button>
              </Can>
            ) : null}
            <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW}>
              <Link
                href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                <CalendarDaysIcon data-icon="inline-start" />
                Open calendar
              </Link>
            </Can>
          </div>
        }
      >
        <div className="px-3 py-4 sm:px-4">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No schedule slots for this workshop yet. Add a weekly slot here or
              from the instructor schedules calendar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Weekday</th>
                    <th className="pb-2 pr-3 font-medium">Time</th>
                    <th className="pb-2 pr-3 font-medium">Color</th>
                    <th className="pb-2 pr-3 font-medium">Anchor date</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr
                      key={slot.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-3 pr-3 align-top font-medium text-foreground">
                        {slot.name}
                      </td>
                      <td className="py-3 pr-3 align-top text-foreground">
                        {INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[slot.type]}
                      </td>
                      <td className="py-3 pr-3 align-top text-muted-foreground">
                        {WEEKDAY_LABELS[slot.dayOfWeek] ?? "—"}
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums text-muted-foreground">
                        {slot.startTime}–{slot.endTime}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15"
                            style={{ backgroundColor: slot.color }}
                            aria-hidden
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {slot.color}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-top text-muted-foreground">
                        {formatAnchorDate(slot.slotDate)}
                      </td>
                      <td className="py-3 align-top">
                        {!mutationsLocked ? (
                          <div className="flex items-center justify-end gap-1">
                            <Can
                              permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_UPDATE}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${slot.name}`}
                                onClick={() => {
                                  setSelectedSession(slot);
                                  setIsEditOpen(true);
                                }}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                            <Can
                              permission={
                                PERMISSIONS.INSTRUCTOR_SCHEDULES_DELETE
                              }
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${slot.name}`}
                                onClick={() => setDeleteTarget(slot)}
                              >
                                <Trash2Icon />
                              </Button>
                            </Can>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ClassTabCollapsibleSection>
    </>
  );
}
