"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import FullCalendar from "@fullcalendar/react";
import type {
  DateSelectInfo,
  DatesSetInfo,
  EventClickInfo,
  EventDragStartInfo,
  EventDropInfo,
  EventInput,
  EventResizeDoneInfo,
} from "@fullcalendar/react";
import type { CalendarApi } from "@fullcalendar/react";
import themePlugin from "@fullcalendar/react/themes/monarch";
import interactionPlugin from "@fullcalendar/react/interaction";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import listPlugin from "@fullcalendar/react/list";
import {
  CircleCheckIcon,
  CircleXIcon,
  ListIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react";
import {
  createInstructorScheduleSlotAction,
  deleteInstructorScheduleSlotAction,
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import {
  formatDateFromDate,
  formatTimeFromDate,
  getSundayWeekBounds,
  instructorScheduleSessionsToEvents,
  isTempScheduleId,
  TEMP_SCHEDULE_ID_PREFIX,
  type CreateSlotDefaults,
} from "@/lib/manager/instructor-schedule-calendar";
import { SCHEDULE_SLOT_DURATION_LIMITS } from "@/lib/constants/workshop-field-limits";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  dayOfWeekFromIsoDate,
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  getInstructorScheduleSlotStrongColor,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS,
  INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES,
  type CreateInstructorScheduleSlotInput,
  type UpdateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  InstructorScheduleSlotType,
  ManagerInstructorScheduleSession,
  ManagerInstructorSchedulesPageData,
  ScheduleEntityType,
} from "@/types/manager-instructor-schedule";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/monarch/theme.css";
import "@/components/manager/schedule/fullcalendar-dark.css";

const DUP_GHOST_ID_PREFIX = "__dup_ghost_";
const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type ScheduleEntitySelection =
  | { kind: "instructor"; id: string }
  | { kind: "workshop"; id: string };

function parseEntityFilterKey(value: string): ScheduleEntitySelection | null {
  if (value.startsWith("instructor:")) {
    return { kind: "instructor", id: value.slice("instructor:".length) };
  }
  if (value.startsWith("workshop:")) {
    return { kind: "workshop", id: value.slice("workshop:".length) };
  }
  return null;
}

function entityFilterKey(selection: ScheduleEntitySelection): string {
  return `${selection.kind}:${selection.id}`;
}

function toggleEntityFilterKey(prev: string[], key: string): string[] {
  if (prev.includes(key)) {
    return prev.filter((item) => item !== key);
  }
  return [...prev, key];
}

function entityMapKey(entityType: ScheduleEntityType, recordId: string) {
  return `${entityType}:${recordId}`;
}

function makeTempId(): string {
  return `${TEMP_SCHEDULE_ID_PREFIX}${crypto.randomUUID()}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function firstFieldError(
  fieldErrors?: Partial<Record<string, string[]>>
): string | undefined {
  if (!fieldErrors) {
    return undefined;
  }
  for (const messages of Object.values(fieldErrors)) {
    const message = messages?.[0];
    if (message) {
      return message;
    }
  }
  return undefined;
}

function actionErrorMessage(
  result: { error?: string; fieldErrors?: Partial<Record<string, string[]>> },
  fallback: string
): string {
  return firstFieldError(result.fieldErrors) ?? result.error ?? fallback;
}

type ScheduleTypeFilter = "all" | InstructorScheduleSlotType;

const TYPE_FILTER_OPTIONS: { value: ScheduleTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES.map((type) => ({
    value: type,
    label: INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[type],
  })),
];

const TYPE_STAT_ICONS: Record<InstructorScheduleSlotType, LucideIcon> = {
  free: CircleCheckIcon,
  busy: CircleXIcon,
};

type DragSourceSnapshot = {
  session: ManagerInstructorScheduleSession;
  start: Date;
  end: Date | null;
};

type InstructorSchedulesPanelProps = {
  data: ManagerInstructorSchedulesPageData;
};

function getSessionFromEventProps(event: {
  extendedProps: Record<string, unknown>;
}): ManagerInstructorScheduleSession | null {
  const session = event.extendedProps.session as
    | ManagerInstructorScheduleSession
    | undefined;
  return session ?? null;
}

function getSessionFromEvent(
  info: EventClickInfo
): ManagerInstructorScheduleSession | null {
  return getSessionFromEventProps(info.event);
}

function buildCreateDefaultsFromDates(
  start: Date,
  end: Date,
  allDay: boolean
): CreateSlotDefaults {
  const slotDate = formatDateFromDate(start);

  if (allDay) {
    return {
      slot_date: slotDate,
      start_time: "09:00",
      end_time: "10:30",
    };
  }

  const startTime = formatTimeFromDate(start);
  let endTime = formatTimeFromDate(end);

  if (endTime <= startTime) {
    const next = new Date(start);
    next.setMinutes(next.getMinutes() + 90);
    endTime = formatTimeFromDate(next);
  }

  return {
    slot_date: slotDate,
    start_time: startTime,
    end_time: endTime,
  };
}

function buildDuplicatePayload(
  source: ManagerInstructorScheduleSession,
  dropStart: Date | null,
  dropEnd: Date | null,
  allDay: boolean
): CreateInstructorScheduleSlotInput | null {
  if (!dropStart) {
    return null;
  }

  if (allDay) {
    return {
      entity_type: source.entityType,
      record_id: source.recordId,
      name: source.name,
      type: source.type,
      slot_date: formatDateFromDate(dropStart),
      start_time: source.startTime,
      end_time: source.endTime,
      color: source.color,
    };
  }

  const startTime = formatTimeFromDate(dropStart);
  let endTime = dropEnd ? formatTimeFromDate(dropEnd) : source.endTime;

  if (endTime <= startTime) {
    endTime = source.endTime;
    if (endTime <= startTime) {
      const next = new Date(dropStart);
      next.setMinutes(next.getMinutes() + 90);
      endTime = formatTimeFromDate(next);
    }
  }

  return {
    entity_type: source.entityType,
    record_id: source.recordId,
    name: source.name,
    type: source.type,
    slot_date: formatDateFromDate(dropStart),
    start_time: startTime,
    end_time: endTime,
    color: source.color,
  };
}

function buildDuplicateGhostEvent(
  session: ManagerInstructorScheduleSession,
  start: Date,
  end: Date | null
): EventInput {
  const color = session.color;
  return {
    id: `${DUP_GHOST_ID_PREFIX}${session.id}`,
    title: session.name,
    start,
    end: end ?? undefined,
    color,
    contrastColor: getInstructorScheduleSlotStrongColor(color),
    editable: false,
    startEditable: false,
    durationEditable: false,
    classNames: ["fc-schedule-dup-ghost"],
    extendedProps: {
      isDuplicateGhost: true,
    },
  };
}

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
    color: values.color,
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
  formData.set("color", values.color);
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
  formData.set("color", values.color);
  return formData;
}

export function InstructorSchedulesPanel({
  data,
}: InstructorSchedulesPanelProps) {
  const calendarRef = useRef<React.ComponentRef<typeof FullCalendar> | null>(
    null
  );
  const permissions = usePermissions();
  const canCreate = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE
  );
  const canUpdate = hasPermissionInSet(
    permissions,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_UPDATE
  );
  const [, startTransition] = useTransition();

  const [sessions, setSessions] = React.useState(data.sessions);
  /** Empty = All entities. Non-empty = union of selected instructor/workshop keys. */
  const [selectedEntityKeys, setSelectedEntityKeys] = React.useState<string[]>(
    []
  );
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [createDefaults, setCreateDefaults] =
    React.useState<CreateSlotDefaults | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<ManagerInstructorScheduleSession | null>(null);
  const [selectedSession, setSelectedSession] =
    React.useState<ManagerInstructorScheduleSession | null>(null);
  const [weekStart, setWeekStart] = React.useState(() =>
    getSundayWeekBounds(formatDateFromDate(new Date())).weekStart
  );
  const [isAltDuplicating, setIsAltDuplicating] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<ScheduleTypeFilter>("all");
  const isAltDupDragRef = useRef(false);
  const dragSourceRef = useRef<DragSourceSnapshot | null>(null);
  const pendingTempIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setSessions((prev) => {
      const pendingTemps = prev.filter((session) =>
        pendingTempIdsRef.current.has(session.id)
      );
      return [...data.sessions, ...pendingTemps];
    });
  }, [data.sessions]);

  const instructorIds = useMemo(
    () => new Set(data.instructors.map((instructor) => instructor.id)),
    [data.instructors]
  );
  const workshopIds = useMemo(
    () => new Set(data.workshops.map((workshop) => workshop.id)),
    [data.workshops]
  );

  const resolvedEntityKeys = useMemo(() => {
    return selectedEntityKeys.filter((key) => {
      const parsed = parseEntityFilterKey(key);
      if (!parsed) {
        return false;
      }
      if (parsed.kind === "instructor") {
        return instructorIds.has(parsed.id);
      }
      return workshopIds.has(parsed.id);
    });
  }, [selectedEntityKeys, instructorIds, workshopIds]);

  if (
    resolvedEntityKeys.length !== selectedEntityKeys.length ||
    resolvedEntityKeys.some((key, index) => key !== selectedEntityKeys[index])
  ) {
    setSelectedEntityKeys(resolvedEntityKeys);
  }

  const isAllEntitiesSelected = resolvedEntityKeys.length === 0;
  const selectedEntityKeySet = useMemo(
    () => new Set(resolvedEntityKeys),
    [resolvedEntityKeys]
  );
  const canCreateOnCalendar = canCreate;

  const eligibleWorkshops = useMemo(
    () => data.workshops.filter((workshop) => workshop.eligible_for_create),
    [data.workshops]
  );

  const entityLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const instructor of data.instructors) {
      map.set(
        entityMapKey(ENTITY_SCHEDULE_TYPE_INSTRUCTOR, instructor.id),
        instructor.username?.trim() || "Unknown"
      );
    }
    for (const workshop of data.workshops) {
      map.set(
        entityMapKey(ENTITY_SCHEDULE_TYPE_WORKSHOP, workshop.id),
        workshop.name
      );
    }
    return map;
  }, [data.instructors, data.workshops]);

  const workshopBoundsById = useMemo(() => {
    const map = new Map<
      string,
      { start_date: string | null; end_date: string | null }
    >();
    for (const workshop of data.workshops) {
      map.set(workshop.id, {
        start_date: workshop.start_date,
        end_date: workshop.end_date,
      });
    }
    return map;
  }, [data.workshops]);

  const createPrefill = useMemo((): AddInstructorScheduleSlotDefaults | null => {
    const fromDates = createDefaults ?? undefined;
    if (resolvedEntityKeys.length === 1) {
      const only = parseEntityFilterKey(resolvedEntityKeys[0]!);
      if (only?.kind === "instructor") {
        return {
          entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
          record_id: only.id,
          ...fromDates,
        };
      }
      if (only?.kind === "workshop") {
        return {
          entity_type: ENTITY_SCHEDULE_TYPE_WORKSHOP,
          record_id: only.id,
          ...fromDates,
        };
      }
    }
    return fromDates
      ? {
          ...fromDates,
        }
      : null;
  }, [createDefaults, resolvedEntityKeys]);

  const filteredSessions = useMemo(() => {
    if (isAllEntitiesSelected) {
      return sessions;
    }
    return sessions.filter((session) =>
      selectedEntityKeySet.has(
        entityFilterKey({
          kind: session.entityType,
          id: session.recordId,
        })
      )
    );
  }, [sessions, isAllEntitiesSelected, selectedEntityKeySet]);

  const events = useMemo<EventInput[]>(() => {
    const filtered =
      typeFilter === "all"
        ? filteredSessions
        : filteredSessions.filter((session) => session.type === typeFilter);
    return instructorScheduleSessionsToEvents(filtered, {
      weekStart,
      includeEntityInTitle: resolvedEntityKeys.length !== 1,
      entityLabelByKey,
      workshopBoundsById,
    });
  }, [
    filteredSessions,
    typeFilter,
    weekStart,
    resolvedEntityKeys.length,
    entityLabelByKey,
    workshopBoundsById,
  ]);

  const weekTypeCounts = useMemo(() => {
    const counts: Record<InstructorScheduleSlotType, number> = {
      free: 0,
      busy: 0,
    };

    for (const session of filteredSessions) {
      counts[session.type] += 1;
    }

    return counts;
  }, [filteredSessions]);

  const selectedSessionEntityLabel = selectedSession
    ? entityLabelByKey.get(
        entityMapKey(selectedSession.entityType, selectedSession.recordId)
      ) ?? null
    : null;

  function trackPendingTemp(tempId: string) {
    pendingTempIdsRef.current.add(tempId);
  }

  function untrackPendingTemp(tempId: string) {
    pendingTempIdsRef.current.delete(tempId);
  }

  function ensureCreatedTypeVisible(type: InstructorScheduleSlotType) {
    if (typeFilter !== "all" && typeFilter !== type) {
      setTypeFilter(type);
    }
  }

  function showDuplicateGhost(snapshot: DragSourceSnapshot) {
    const api = calendarRef.current?.getApi?.() as CalendarApi | undefined;
    if (!api) {
      return;
    }

    const ghostId = `${DUP_GHOST_ID_PREFIX}${snapshot.session.id}`;
    api.getEventById(ghostId)?.remove();
    api.addEvent(
      buildDuplicateGhostEvent(snapshot.session, snapshot.start, snapshot.end)
    );
    isAltDupDragRef.current = true;
    setIsAltDuplicating(true);
  }

  function clearDuplicateGhostVisual() {
    const api = calendarRef.current?.getApi?.() as CalendarApi | undefined;
    if (api) {
      for (const event of api.getEvents()) {
        if (
          event.id.startsWith(DUP_GHOST_ID_PREFIX) ||
          event.extendedProps.isDuplicateGhost
        ) {
          event.remove();
        }
      }
    }
    setIsAltDuplicating(false);
  }

  function clearDuplicateDragState() {
    clearDuplicateGhostVisual();
    dragSourceRef.current = null;
    window.setTimeout(() => {
      isAltDupDragRef.current = false;
    }, 0);
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Alt" || !canCreateOnCalendar) {
        return;
      }
      const snapshot = dragSourceRef.current;
      if (!snapshot || isAltDupDragRef.current) {
        return;
      }
      showDuplicateGhost(snapshot);
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key !== "Alt") {
        return;
      }
      if (!dragSourceRef.current) {
        return;
      }
      isAltDupDragRef.current = false;
      clearDuplicateGhostVisual();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [canCreateOnCalendar]);

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

  function openCreate(defaults?: CreateSlotDefaults | null) {
    setCreateDefaults(defaults ?? null);
    setIsCreateOpen(true);
  }

  async function handleOptimisticCreate(
    values: CreateInstructorScheduleSlotInput
  ) {
    const tempId = makeTempId();
    const optimistic = sessionFromCreateInput(values, tempId);
    trackPendingTemp(tempId);
    ensureCreatedTypeVisible(values.type);
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
          color: values.color,
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
        prev.map((session) =>
          session.id === values.id ? previous : session
        )
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
    setSessions((prev) =>
      prev.filter((session) => session.id !== removed.id)
    );

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

  function handleEventClick(info: EventClickInfo) {
    if (info.event.extendedProps.isDuplicateGhost) {
      return;
    }

    const session = getSessionFromEvent(info);
    if (!session) {
      return;
    }

    info.jsEvent.preventDefault();
    openEditSession(session);
  }

  function handleDateSelect(info: DateSelectInfo) {
    if (!canCreateOnCalendar) {
      info.view.calendar.unselect();
      return;
    }

    openCreate(
      buildCreateDefaultsFromDates(info.start, info.end, info.allDay)
    );
    info.view.calendar.unselect();
  }

  function handleEventDragStart(info: EventDragStartInfo) {
    if (info.event.extendedProps.isDuplicateGhost) {
      return;
    }

    const session = getSessionFromEventProps(info.event);
    if (!session || !info.event.start || isTempScheduleId(session.id)) {
      dragSourceRef.current = null;
      return;
    }

    if (session.sourceWorkshopId) {
      dragSourceRef.current = null;
      return;
    }

    const snapshot: DragSourceSnapshot = {
      session,
      start: info.event.start,
      end: info.event.end,
    };
    dragSourceRef.current = snapshot;

    if (canCreateOnCalendar && info.jsEvent.altKey) {
      showDuplicateGhost(snapshot);
    } else {
      isAltDupDragRef.current = false;
      clearDuplicateGhostVisual();
    }
  }

  function handleEventDragStop() {
    clearDuplicateDragState();
  }

  function handleEventDrop(info: EventDropInfo) {
    const dropStart = info.event.start;
    const dropEnd = info.event.end;
    const allDay = info.event.allDay;
    const wantsDuplicate = info.jsEvent.altKey || isAltDupDragRef.current;
    const source = getSessionFromEventProps(info.oldEvent);
    const previousStart = info.oldEvent.start;
    const previousEnd = info.oldEvent.end;

    clearDuplicateGhostVisual();

    if (!source || isTempScheduleId(source.id)) {
      info.revert();
      return;
    }

    if (source.sourceWorkshopId) {
      info.revert();
      showErrorToast(
        "This slot is mirrored from a workshop schedule and cannot be moved here."
      );
      return;
    }

    if (wantsDuplicate) {
      info.revert();

      if (!canCreateOnCalendar) {
        return;
      }

      const payload = buildDuplicatePayload(
        source,
        dropStart,
        dropEnd,
        allDay
      );
      if (!payload) {
        return;
      }

      void handleOptimisticCreate(payload);
      return;
    }

    if (!canUpdate) {
      info.revert();
      return;
    }

    if (!dropStart) {
      info.revert();
      return;
    }

    const slotDate = formatDateFromDate(dropStart);
    let startTime: string;
    let endTime: string;

    if (allDay) {
      startTime = source.startTime;
      endTime = source.endTime;
    } else {
      startTime = formatTimeFromDate(dropStart);
      endTime = dropEnd ? formatTimeFromDate(dropEnd) : source.endTime;
      if (endTime <= startTime) {
        endTime = source.endTime;
        if (endTime <= startTime) {
          const next = new Date(dropStart);
          next.setMinutes(next.getMinutes() + 90);
          endTime = formatTimeFromDate(next);
        }
      }
    }

    if (endTime <= startTime) {
      info.revert();
      showErrorToast("End time must be after start time.");
      return;
    }

    const previous = source;
    const optimistic: ManagerInstructorScheduleSession = {
      ...source,
      dayOfWeek: dayOfWeekFromIsoDate(slotDate),
      startTime,
      endTime,
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === source.id ? optimistic : session
      )
    );
    if (selectedSession?.id === source.id) {
      setSelectedSession(optimistic);
    }

    const formData = new FormData();
    formData.set("id", source.id);
    formData.set("entity_type", source.entityType);
    formData.set("record_id", source.recordId);
    formData.set("name", source.name);
    formData.set("type", source.type);
    formData.set("slot_date", slotDate);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("color", source.color);

    startTransition(() => {
      void (async () => {
        const result = await updateInstructorScheduleSlotAction({}, formData);
        if (!result.success) {
          setSessions((prev) =>
            prev.map((session) =>
              session.id === source.id ? previous : session
            )
          );
          if (selectedSession?.id === source.id) {
            setSelectedSession(previous);
          }
          if (previousStart) {
            info.event.setDates(previousStart, previousEnd);
          } else {
            info.revert();
          }
          showErrorToast(actionErrorMessage(result, "Unable to move slot."));
          return;
        }

        if (result.session) {
          setSessions((prev) =>
            prev.map((session) =>
              session.id === source.id ? result.session! : session
            )
          );
          if (selectedSession?.id === source.id) {
            setSelectedSession(result.session);
          }
        }

        showSuccessToast(result.message ?? "Slot moved.");
      })();
    });
  }

  function handleEventResize(info: EventResizeDoneInfo) {
    if (!canUpdate || info.event.extendedProps.isDuplicateGhost) {
      info.revert();
      return;
    }

    const session =
      getSessionFromEventProps(info.oldEvent) ??
      getSessionFromEventProps(info.event);
    const start = info.event.start;
    const end = info.event.end;

    if (!session || !start || !end || isTempScheduleId(session.id)) {
      info.revert();
      return;
    }

    if (session.sourceWorkshopId) {
      info.revert();
      showErrorToast(
        "This slot is mirrored from a workshop schedule and cannot be resized here."
      );
      return;
    }

    const slotDate = formatDateFromDate(start);
    const endDate = formatDateFromDate(end);
    const startTime = formatTimeFromDate(start);
    const endTime = formatTimeFromDate(end);

    if (endDate !== slotDate) {
      info.revert();
      showErrorToast("Slots must stay on the same day (cannot cross midnight).");
      return;
    }

    if (endTime <= startTime) {
      info.revert();
      showErrorToast("End time must be after start time.");
      return;
    }

    const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (durationMinutes > SCHEDULE_SLOT_DURATION_LIMITS.maxMinutes) {
      info.revert();
      showErrorToast(
        `Slot must be under 24 hours (max ${SCHEDULE_SLOT_DURATION_LIMITS.maxMinutes} minutes).`
      );
      return;
    }
    if (durationMinutes < SCHEDULE_SLOT_DURATION_LIMITS.minMinutes) {
      info.revert();
      showErrorToast(
        `Slot must be at least ${SCHEDULE_SLOT_DURATION_LIMITS.minMinutes} minutes.`
      );
      return;
    }

    const previousStart = info.oldEvent.start;
    const previousEnd = info.oldEvent.end;
    const previous = session;
    const optimistic: ManagerInstructorScheduleSession = {
      ...session,
      dayOfWeek: dayOfWeekFromIsoDate(slotDate),
      startTime,
      endTime,
    };

    setSessions((prev) =>
      prev.map((item) => (item.id === session.id ? optimistic : item))
    );
    if (selectedSession?.id === session.id) {
      setSelectedSession(optimistic);
    }

    const formData = new FormData();
    formData.set("id", session.id);
    formData.set("entity_type", session.entityType);
    formData.set("record_id", session.recordId);
    formData.set("name", session.name);
    formData.set("type", session.type);
    formData.set("slot_date", slotDate);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("color", session.color);

    startTransition(() => {
      void (async () => {
        const result = await updateInstructorScheduleSlotAction({}, formData);
        if (!result.success) {
          setSessions((prev) =>
            prev.map((item) => (item.id === session.id ? previous : item))
          );
          if (selectedSession?.id === session.id) {
            setSelectedSession(previous);
          }
          if (previousStart) {
            info.event.setDates(previousStart, previousEnd);
          } else {
            info.revert();
          }
          showErrorToast(
            actionErrorMessage(result, "Unable to update slot time.")
          );
          return;
        }

        if (result.session) {
          setSessions((prev) =>
            prev.map((item) =>
              item.id === session.id ? result.session! : item
            )
          );
          if (selectedSession?.id === session.id) {
            setSelectedSession(result.session);
          }
        }

        showSuccessToast(result.message ?? "Slot time updated.");
      })();
    });
  }

  function handleDatesSet(info: DatesSetInfo) {
    const bounds = getSundayWeekBounds(formatDateFromDate(info.start));
    setWeekStart(bounds.weekStart);
  }

  if (data.instructors.length === 0 && data.workshops.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Instructor schedules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Free and busy slots for instructors and workshops.
          </p>
        </div>
        <div className="rounded-xl border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No instructors or workshops yet. Add one first, then manage schedule
            slots here.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={ROUTES.MANAGER_INSTRUCTORS}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Manage instructors
            </Link>
            <Link
              href={ROUTES.MANAGER_WORKSHOPS}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Manage workshops
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
            Weekly free and busy slots for instructors and workshops. Slots
            repeat every week until edited or deleted
            {canCreate
              ? ". Click a slot to edit it, drag to select a range to add one, or hold Alt and drag a slot to duplicate it"
              : ". Click a slot to edit it"}
            {canUpdate
              ? ", drag a slot to change weekday/time, or drag the top/bottom edge to change duration"
              : ""}
            . Workshop slots only appear between the workshop start and end
            dates.
          </p>
        </div>
        <Link
          href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES_DETAILS}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          <ListIcon data-icon="inline-start" />
          Slot details
        </Link>
      </div>

      <Can permission={PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW}>
        <ScheduleAssistantPrompt />
      </Can>

      <div className="flex flex-col gap-2">
        <div
          role="group"
          aria-label="Filter by instructor"
          className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8"
        >
          <button
            type="button"
            aria-pressed={isAllEntitiesSelected}
            onClick={() => setSelectedEntityKeys([])}
            className={cn(
              "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
              "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground",
              isAllEntitiesSelected &&
                "border-border bg-background text-foreground shadow-sm"
            )}
          >
            All
          </button>
          {data.instructors.map((instructor) => {
            const tabKey = entityFilterKey({
              kind: "instructor",
              id: instructor.id,
            });
            const selected = selectedEntityKeySet.has(tabKey);
            return (
              <button
                key={tabKey}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setSelectedEntityKeys((prev) =>
                    toggleEntityFilterKey(prev, tabKey)
                  )
                }
                className={cn(
                  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground",
                  selected &&
                    "border-border bg-background text-foreground shadow-sm"
                )}
              >
                {instructor.username ?? "Unknown"}
              </button>
            );
          })}
        </div>

        {data.workshops.length > 0 ? (
          <div
            role="group"
            aria-label="Filter by workshop"
            className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8"
          >
            {data.workshops.map((workshop) => {
              const tabKey = entityFilterKey({
                kind: "workshop",
                id: workshop.id,
              });
              const selected = selectedEntityKeySet.has(tabKey);
              return (
                <button
                  key={tabKey}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setSelectedEntityKeys((prev) =>
                      toggleEntityFilterKey(prev, tabKey)
                    )
                  }
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                    "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground",
                    selected &&
                      "border-border bg-background text-foreground shadow-sm"
                  )}
                >
                  {workshop.name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:grid sm:grid-cols-3 sm:items-center">
        <div
          aria-label="Slot counts"
          className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:justify-self-start"
        >
          {INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES.map((type) => {
            const Icon = TYPE_STAT_ICONS[type];
            const count = weekTypeCounts[type];
            return (
              <div
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3.5 py-1.5 text-sm text-muted-foreground"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">
                  {count}
                </span>
                <span className="font-medium">
                  {INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[type]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-row flex-wrap items-center justify-center gap-2 sm:justify-self-center">
          <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE}>
            <Button
              type="button"
              size="sm"
              disabled={!canCreate}
              onClick={() => openCreate(null)}
            >
              <PlusIcon data-icon="inline-start" />
              Add slot
            </Button>
          </Can>
        </div>

        <div
          role="tablist"
          aria-label="Filter by slot type"
          className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:justify-self-end"
        >
          {TYPE_FILTER_OPTIONS.map((option) => {
            const selected = typeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTypeFilter(option.value)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground",
                  selected &&
                    "border-border bg-background text-foreground shadow-sm"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <AddInstructorScheduleSlotDialog
        open={isCreateOpen}
        onOpenChange={(next) => {
          setIsCreateOpen(next);
          if (!next) {
            setCreateDefaults(null);
          }
        }}
        onCreate={handleOptimisticCreate}
        defaults={createPrefill}
        instructors={data.instructors}
        eligibleWorkshops={eligibleWorkshops}
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

      <div
        className={cn(
          "fc-schedule-theme min-h-[42rem]",
          isAltDuplicating && "is-alt-duplicating"
        )}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[
            themePlugin,
            interactionPlugin,
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
          ]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay,dayGridMonth,listWeek",
          }}
          firstDay={0}
          height="auto"
          expandRows
          nowIndicator
          weekends
          slotMinTime="05:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          scrollTime="07:00:00"
          allDaySlot={false}
          events={events}
          editable={canCreateOnCalendar || canUpdate}
          eventStartEditable={canCreateOnCalendar || canUpdate}
          eventDurationEditable={canUpdate}
          eventResizableFromStart={canUpdate}
          selectable={canCreateOnCalendar}
          selectMirror={canCreateOnCalendar}
          select={handleDateSelect}
          eventDragStart={handleEventDragStart}
          eventDragStop={handleEventDragStop}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          eventDisplay="block"
        />
      </div>
    </div>
  );
}
