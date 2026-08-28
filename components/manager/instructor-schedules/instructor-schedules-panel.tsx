"use client";

import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ListIcon, PlusIcon } from "lucide-react";
import {
  createInstructorScheduleSlotAction,
  deleteInstructorScheduleSlotAction,
  loadInstructorScheduleSlotsForCalendarAction,
  updateInstructorScheduleSlotAction,
} from "@/app/manager/instructor-schedules/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import {
  AddInstructorScheduleSlotDialog,
  type AddInstructorScheduleSlotDefaults,
} from "@/components/manager/instructor-schedules/add-instructor-schedule-slot-dialog";
import { EditInstructorScheduleSlotDialog } from "@/components/manager/instructor-schedules/edit-instructor-schedule-slot-dialog";
import { ScheduleAssistantPrompt } from "@/components/manager/instructor-schedules/schedule-assistant-prompt";
import {
  ScheduleTanks,
  type ScheduleTankDay,
  type ScheduleTankSegment,
} from "@/components/manager/schedule/schedule-tanks";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import {
  isTempScheduleId,
  TEMP_SCHEDULE_ID_PREFIX,
} from "@/lib/manager/instructor-schedule-calendar";
import { SCHEDULE_SLOT_DURATION_LIMITS } from "@/lib/constants/workshop-field-limits";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  dayOfWeekFromIsoDate,
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  getInstructorScheduleSlotDisplayColor,
  getInstructorScheduleSlotStrongColor,
  type CreateInstructorScheduleSlotInput,
  type UpdateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  InstructorScheduleCalendarScope,
  ManagerInstructorScheduleSession,
  ManagerInstructorSchedulesPageData,
  ScheduleEntityType,
} from "@/types/manager-instructor-schedule";

/** Tank range: 08:00 → 19:00. */
const TANK_START_MINUTES = 8 * 60;
const TANK_END_MINUTES = 19 * 60;

const WEEKDAY_SHORT_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type ScheduleEntitySelection = { kind: "instructor"; id: string };

function parseEntityFilterKey(value: string): ScheduleEntitySelection | null {
  if (value.startsWith("instructor:")) {
    return { kind: "instructor", id: value.slice("instructor:".length) };
  }
  return null;
}

function entityFilterKey(selection: ScheduleEntitySelection): string {
  return `${selection.kind}:${selection.id}`;
}

function entityMapKey(entityType: ScheduleEntityType, recordId: string) {
  return `${entityType}:${recordId}`;
}

function calendarScopeFromKeys(
  keys: string[]
): InstructorScheduleCalendarScope {
  const parsed = keys[0] ? parseEntityFilterKey(keys[0]) : null;
  return {
    kind: "instructor",
    recordId: parsed?.id,
  };
}

function calendarScopeKey(scope: InstructorScheduleCalendarScope): string {
  if (scope.kind === "all") {
    return "all";
  }
  return `${scope.kind}:${scope.recordId ?? "*"}`;
}

function filterSessionsForSelection(
  sessions: ManagerInstructorScheduleSession[],
  selectedKeys: string[]
): ManagerInstructorScheduleSession[] {
  const instructorSessions = sessions.filter(
    (session) => session.entityType === ENTITY_SCHEDULE_TYPE_INSTRUCTOR
  );

  const parsed = selectedKeys[0] ? parseEntityFilterKey(selectedKeys[0]) : null;
  if (!parsed) {
    return instructorSessions;
  }

  return instructorSessions.filter((session) => session.recordId === parsed.id);
}

function makeTempId(): string {
  return `${TEMP_SCHEDULE_ID_PREFIX}${crypto.randomUUID()}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const ENTITY_FILTER_ALL = "all";

type InstructorSchedulesPanelProps = {
  data: ManagerInstructorSchedulesPageData;
};

function sessionFromCreateInput(
  values: CreateInstructorScheduleSlotInput,
  id: string,
  options?: { preserveSlotDate?: string; entityType?: ScheduleEntityType }
): ManagerInstructorScheduleSession {
  return {
    id,
    entityType: options?.entityType ?? values.entity_type,
    recordId: values.record_id,
    name: values.name,
    type: values.type,
    slotDate: options?.preserveSlotDate ?? values.slot_date,
    dayOfWeek: dayOfWeekFromIsoDate(values.slot_date),
    startTime: values.start_time,
    endTime: values.end_time,
    color: getInstructorScheduleSlotDisplayColor({
      entityType: options?.entityType ?? values.entity_type,
      recordId: values.record_id,
      sourceWorkshopId: null,
    }),
    sourceWorkshopId: null,
    sourceSlotId: null,
  };
}

function toCreateFormData(values: CreateInstructorScheduleSlotInput): FormData {
  const formData = new FormData();
  formData.set("entity_type", values.entity_type);
  formData.set("record_id", values.record_id);
  formData.set("name", values.name);
  formData.set("type", values.type);
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

export function InstructorSchedulesPanel({
  data,
}: InstructorSchedulesPanelProps) {
  const permissions = usePermissions();
  const canCreate = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE
  );
  const canUpdate = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_UPDATE
  );

  const initialSelectedKeys = data.initialBrowse.recordId
    ? [
        entityFilterKey({
          kind: "instructor",
          id: data.initialBrowse.recordId,
        }),
      ]
    : [];

  const [sessions, setSessions] = React.useState(data.sessions);
  const initialCalendarScope = useMemo<InstructorScheduleCalendarScope>(
    () => ({
      kind: "instructor",
      recordId: data.initialBrowse.recordId ?? undefined,
    }),
    [data.initialBrowse.recordId]
  );
  const loadedScopeKeyRef = useRef(calendarScopeKey(initialCalendarScope));
  /** Empty = all instructors. At most one instructor key selected. */
  const [selectedEntityKeys, setSelectedEntityKeys] = React.useState<string[]>(
    () => initialSelectedKeys
  );
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<ManagerInstructorScheduleSession | null>(null);
  const [selectedSession, setSelectedSession] =
    React.useState<ManagerInstructorScheduleSession | null>(null);
  const pendingTempIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loadedScopeKeyRef.current !== calendarScopeKey(initialCalendarScope)) {
      return;
    }
    setSessions((prev) => {
      const pendingTemps = prev.filter((session) =>
        pendingTempIdsRef.current.has(session.id)
      );
      return [...data.sessions, ...pendingTemps];
    });
  }, [data.sessions, initialCalendarScope]);

  const instructorIds = useMemo(
    () => new Set(data.instructors.map((instructor) => instructor.id)),
    [data.instructors]
  );
  const resolvedEntityKeys = useMemo(() => {
    return selectedEntityKeys.filter((key) => {
      const parsed = parseEntityFilterKey(key);
      return parsed ? instructorIds.has(parsed.id) : false;
    });
  }, [selectedEntityKeys, instructorIds]);

  if (
    resolvedEntityKeys.length !== selectedEntityKeys.length ||
    resolvedEntityKeys.some((key, index) => key !== selectedEntityKeys[index])
  ) {
    setSelectedEntityKeys(resolvedEntityKeys);
  }

  const resolvedEntityKeysJoined = resolvedEntityKeys.join(",");

  useEffect(() => {
    const scope = calendarScopeFromKeys(resolvedEntityKeys);
    const key = calendarScopeKey(scope);
    if (key === loadedScopeKeyRef.current) {
      return;
    }
    loadedScopeKeyRef.current = key;
    let cancelled = false;
    void loadInstructorScheduleSlotsForCalendarAction(scope).then((next) => {
      if (cancelled) {
        return;
      }
      setSessions((prev) => {
        const pendingTemps = prev.filter((session) =>
          pendingTempIdsRef.current.has(session.id)
        );
        return [...next, ...pendingTemps];
      });
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedEntityKeys, resolvedEntityKeysJoined]);
  const entitySelectValue = useMemo(() => {
    if (resolvedEntityKeys.length !== 1) {
      return ENTITY_FILTER_ALL;
    }
    return resolvedEntityKeys[0]!;
  }, [resolvedEntityKeys]);
  const entitySelectLabel = useMemo(() => {
    if (entitySelectValue === ENTITY_FILTER_ALL) {
      return "All instructors";
    }
    const parsed = parseEntityFilterKey(entitySelectValue);
    if (!parsed) {
      return entitySelectValue;
    }
    return (
      data.instructors.find((instructor) => instructor.id === parsed.id)
        ?.username ?? "Unknown"
    );
  }, [entitySelectValue, data.instructors]);
  function handleEntitySelectChange(value: string | null) {
    const next = value ?? ENTITY_FILTER_ALL;
    const nextKeys = next === ENTITY_FILTER_ALL ? [] : [next];
    setSelectedEntityKeys(nextKeys);
  }

  const entityLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const instructor of data.instructors) {
      map.set(
        entityMapKey(ENTITY_SCHEDULE_TYPE_INSTRUCTOR, instructor.id),
        instructor.username?.trim() || "Unknown"
      );
    }
    return map;
  }, [data.instructors]);

  const createPrefill =
    useMemo((): AddInstructorScheduleSlotDefaults | null => {
      if (resolvedEntityKeys.length === 1) {
        const only = parseEntityFilterKey(resolvedEntityKeys[0]!);
        if (only) {
          return { record_id: only.id };
        }
      }
      return null;
    }, [resolvedEntityKeys]);

  const filteredSessions = useMemo(
    () => filterSessionsForSelection(sessions, resolvedEntityKeys),
    [sessions, resolvedEntityKeys]
  );

  const sessionById = useMemo(() => {
    const map = new Map<string, ManagerInstructorScheduleSession>();
    for (const session of filteredSessions) {
      map.set(session.id, session);
    }
    return map;
  }, [filteredSessions]);

  const tankDays = useMemo<ScheduleTankDay[]>(() => {
    const days: ScheduleTankDay[] = WEEKDAY_LABELS.map((label, index) => ({
      key: String(index),
      label,
      shortLabel: WEEKDAY_SHORT_LABELS[index]!,
      segments: [],
    }));

    for (const session of filteredSessions) {
      const day = days[session.dayOfWeek];
      if (!day) {
        continue;
      }

      const entityLabel =
        entityLabelByKey
          .get(entityMapKey(session.entityType, session.recordId))
          ?.trim() || null;

      day.segments.push({
        id: session.id,
        label: session.name,
        sublabel: entityLabel,
        startMinutes: timeToMinutes(session.startTime),
        endMinutes: timeToMinutes(session.endTime),
        color: session.color,
        accentColor: getInstructorScheduleSlotStrongColor(session.color),
        locked: isTempScheduleId(session.id),
        resizable: canUpdate && !session.sourceWorkshopId,
      });
    }

    return days;
  }, [filteredSessions, entityLabelByKey, canUpdate]);

  function handleSegmentSelect(segment: ScheduleTankSegment) {
    const session = sessionById.get(segment.id);
    if (session) {
      openEditSession(session);
    }
  }

  function handleSegmentResize(
    segment: ScheduleTankSegment,
    next: { startMinutes: number; endMinutes: number }
  ) {
    const session = sessionById.get(segment.id);
    if (!session || !canUpdate) {
      return;
    }

    if (isTempScheduleId(session.id)) {
      showInfoToast("Still saving this slot…");
      return;
    }

    if (session.sourceWorkshopId) {
      showErrorToast(
        "This slot is mirrored from a workshop schedule and cannot be resized here."
      );
      return;
    }

    const durationMinutes = next.endMinutes - next.startMinutes;
    if (durationMinutes < SCHEDULE_SLOT_DURATION_LIMITS.minMinutes) {
      showErrorToast(
        `Slot must be at least ${SCHEDULE_SLOT_DURATION_LIMITS.minMinutes} minutes.`
      );
      return;
    }
    if (durationMinutes > SCHEDULE_SLOT_DURATION_LIMITS.maxMinutes) {
      showErrorToast(
        `Slot must be under 24 hours (max ${SCHEDULE_SLOT_DURATION_LIMITS.maxMinutes} minutes).`
      );
      return;
    }

    const startTime = minutesToTime(next.startMinutes);
    const endTime = minutesToTime(next.endMinutes);
    const previous = session;
    const optimistic: ManagerInstructorScheduleSession = {
      ...session,
      startTime,
      endTime,
    };

    setSessions((prev) =>
      prev.map((item) => (item.id === session.id ? optimistic : item))
    );
    if (selectedSession?.id === session.id) {
      setSelectedSession(optimistic);
    }

    void (async () => {
      const result = await updateInstructorScheduleSlotAction(
        {},
        toUpdateFormData({
          id: session.id,
          entity_type: session.entityType,
          record_id: session.recordId,
          name: session.name,
          type: session.type,
          slot_date: session.slotDate,
          start_time: startTime,
          end_time: endTime,
        })
      );

      if (!result.success) {
        setSessions((prev) =>
          prev.map((item) => (item.id === session.id ? previous : item))
        );
        if (selectedSession?.id === session.id) {
          setSelectedSession(previous);
        }
        showErrorToast(result.error ?? "Unable to update slot time.");
        return;
      }

      if (result.session) {
        setSessions((prev) =>
          prev.map((item) => (item.id === session.id ? result.session! : item))
        );
        if (selectedSession?.id === session.id) {
          setSelectedSession(result.session);
        }
      }

      showSuccessToast(result.message ?? "Slot time updated.");
    })();
  }

  const selectedSessionEntityLabel = selectedSession
    ? (entityLabelByKey.get(
        entityMapKey(selectedSession.entityType, selectedSession.recordId)
      ) ?? null)
    : null;

  function trackPendingTemp(tempId: string) {
    pendingTempIdsRef.current.add(tempId);
  }

  function untrackPendingTemp(tempId: string) {
    pendingTempIdsRef.current.delete(tempId);
  }

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    false,
    (nextOpen) => {
      if (!nextOpen) {
        setDeleteTarget(null);
      }
    }
  );

  function openEditSession(session: ManagerInstructorScheduleSession) {
    if (isTempScheduleId(session.id)) {
      showInfoToast("Still saving this slot…");
      return;
    }

    setSelectedSession(session);
    setIsEditOpen(true);
  }

  function openCreate() {
    setIsCreateOpen(true);
  }

  async function handleOptimisticCreate(
    values: CreateInstructorScheduleSlotInput
  ) {
    const tempId = makeTempId();
    const optimistic = sessionFromCreateInput(values, tempId);
    trackPendingTemp(tempId);
    setSessions((prev) => [...prev, optimistic]);

    const result = await createInstructorScheduleSlotAction(
      {},
      toCreateFormData(values)
    );

    if (!result.success || !result.session) {
      untrackPendingTemp(tempId);
      setSessions((prev) => prev.filter((session) => session.id !== tempId));
      showErrorToast(result.error ?? "Unable to create slot.");
      return;
    }

    setSessions((prev) =>
      prev.map((session) => (session.id === tempId ? result.session! : session))
    );
    untrackPendingTemp(tempId);
    showSuccessToast(result.message ?? "Slot created.");
  }

  async function handleOptimisticUpdate(
    values: UpdateInstructorScheduleSlotInput
  ) {
    if (isTempScheduleId(values.id)) {
      showInfoToast("Still saving this slot…");
      return;
    }

    const previous = sessions.find((session) => session.id === values.id);
    if (!previous) {
      showErrorToast("Unable to update slot.");
      return;
    }

    const next = {
      ...sessionFromCreateInput(
        {
          entity_type: previous.entityType,
          record_id: values.record_id,
          name: values.name,
          type: values.type,
          slot_date: values.slot_date,
          start_time: values.start_time,
          end_time: values.end_time,
        },
        values.id,
        {
          preserveSlotDate: previous.slotDate,
          entityType: previous.entityType,
        }
      ),
    };

    setSessions((prev) =>
      prev.map((session) => (session.id === values.id ? next : session))
    );
    if (selectedSession?.id === values.id) {
      setSelectedSession(next);
    }

    const result = await updateInstructorScheduleSlotAction(
      {},
      toUpdateFormData(values)
    );

    if (!result.success) {
      setSessions((prev) =>
        prev.map((session) => (session.id === values.id ? previous : session))
      );
      if (selectedSession?.id === values.id) {
        setSelectedSession(previous);
      }
      showErrorToast(result.error ?? "Unable to update slot.");
      return;
    }

    if (result.session) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === values.id ? result.session! : session
        )
      );
      if (selectedSession?.id === values.id) {
        setSelectedSession(result.session);
      }
    }

    showSuccessToast(result.message ?? "Slot updated.");
  }

  function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (isTempScheduleId(deleteTarget.id)) {
      showInfoToast("Still saving this slot…");
      setDeleteTarget(null);
      return;
    }

    const removed = deleteTarget;
    setDeleteTarget(null);
    setIsEditOpen(false);
    setSelectedSession(null);
    setSessions((prev) => prev.filter((session) => session.id !== removed.id));

    void (async () => {
      const formData = new FormData();
      formData.set("id", removed.id);
      const result = await deleteInstructorScheduleSlotAction({}, formData);

      if (!result.success) {
        setSessions((prev) => [...prev, removed]);
        showErrorToast(result.error ?? "Unable to delete slot.");
        return;
      }

      showSuccessToast(result.message ?? "Slot deleted.");
    })();
  }

  if (data.instructors.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Instructor schedules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Free and busy slots for instructors.
          </p>
        </div>
        <div className="rounded-xl border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No instructors yet. Add one first, then manage schedule slots here.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={ROUTES.MANAGER_INSTRUCTORS}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Manage instructors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Instructor schedules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Weekly free and busy slots for instructors, shown as one tank per
            day from 8 AM to 7 PM. Slots repeat every week until edited or
            deleted
            {canUpdate
              ? ". Click a slot to edit it, or drag its top/bottom edge to change its time"
              : ""}
            .
          </p>
        </div>
        <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_DETAILS_VIEW}>
          <Link
            href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES_DETAILS}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
          >
            <ListIcon data-icon="inline-start" />
            Slot details
          </Link>
        </Can>
      </div>

      <Can permission={PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW}>
        <ScheduleAssistantPrompt />
      </Can>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select
            value={entitySelectValue}
            onValueChange={handleEntitySelectChange}
          >
            <SelectTrigger
              size="sm"
              className="min-w-40 max-w-full sm:min-w-48"
              aria-label="Filter by instructor"
            >
              <SelectValue placeholder="All instructors">
                {entitySelectLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value={ENTITY_FILTER_ALL}>All instructors</SelectItem>
              {data.instructors.map((instructor) => (
                <SelectItem
                  key={instructor.id}
                  value={entityFilterKey({
                    kind: "instructor",
                    id: instructor.id,
                  })}
                >
                  {instructor.username ?? "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE}>
          <Button
            type="button"
            size="sm"
            className="shrink-0 self-start sm:self-auto"
            disabled={!canCreate}
            onClick={() => openCreate()}
          >
            <PlusIcon data-icon="inline-start" />
            Add slot
          </Button>
        </Can>
      </div>

      <AddInstructorScheduleSlotDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={handleOptimisticCreate}
        defaults={createPrefill}
        instructors={data.instructors}
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
        entityLabel={selectedSessionEntityLabel}
        onUpdate={handleOptimisticUpdate}
        onDeleteRequest={(session) => {
          setDeleteTarget(session);
        }}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent className="sm:max-w-md">
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
              onClick={() => handleDeleteOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border bg-card p-3 sm:p-4">
        <ScheduleTanks
          days={tankDays}
          startMinutes={TANK_START_MINUTES}
          endMinutes={TANK_END_MINUTES}
          onSegmentSelect={canUpdate ? handleSegmentSelect : undefined}
          onSegmentResize={canUpdate ? handleSegmentResize : undefined}
        />
      </div>
    </div>
  );
}
