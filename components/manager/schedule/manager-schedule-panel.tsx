"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import FullCalendar from "@fullcalendar/react";
import type {
  CalendarApi,
  DateSelectInfo,
  DatesSetInfo,
  EventClickInfo,
  EventDragStartInfo,
  EventDropInfo,
  EventInput,
  EventResizeDoneInfo,
} from "@fullcalendar/react";
import themePlugin from "@fullcalendar/react/themes/monarch";
import interactionPlugin from "@fullcalendar/react/interaction";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import listPlugin from "@fullcalendar/react/list";
import {
  CopyIcon,
  GraduationCapIcon,
  MonitorIcon,
  PlusIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import {
  createWeeklyScheduleSlotAction,
  copyWeeklyScheduleSlotsAction,
  deleteWeeklyScheduleSlotAction,
  loadWeeklyScheduleSlotsAction,
  previewCopyLastWeekScheduleAction,
  updateWeeklyScheduleSlotAction,
} from "@/app/manager/schedule/actions";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddWeeklyScheduleSlotDialog } from "@/components/manager/schedule/add-weekly-schedule-slot-dialog";
import { CopyLastWeekScheduleDialog } from "@/components/manager/schedule/copy-last-week-schedule-dialog";
import { EditWeeklyScheduleSlotDialog } from "@/components/manager/schedule/edit-weekly-schedule-slot-dialog";
import { Button } from "@/components/ui/button";
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
import {
  formatDateFromDate,
  formatTimeFromDate,
  getSundayWeekBounds,
  isTempScheduleId,
  TEMP_SCHEDULE_ID_PREFIX,
  weeklyScheduleSessionsToEvents,
  type CreateSlotDefaults,
} from "@/lib/manager/weekly-schedule-calendar";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  getWeeklyScheduleSlotStrongColor,
  WEEKLY_SCHEDULE_SLOT_TYPE_LABELS,
  WEEKLY_SCHEDULE_SLOT_TYPE_VALUES,
  type CreateWeeklyScheduleSlotInput,
  type UpdateWeeklyScheduleSlotInput,
} from "@/lib/validators/manager/weekly-schedule-slot";
import type {
  CopyWeeklySchedulePreview,
  ManagerWeeklyScheduleSession,
  WeeklyScheduleSlotType,
} from "@/types/manager-weekly-schedule";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/monarch/theme.css";
import "@/components/manager/schedule/fullcalendar-dark.css";

const DUP_GHOST_ID_PREFIX = "__dup_ghost_";

function makeTempId(): string {
  return `${TEMP_SCHEDULE_ID_PREFIX}${crypto.randomUUID()}`;
}

type ScheduleTypeFilter = "all" | WeeklyScheduleSlotType;

const TYPE_FILTER_OPTIONS: { value: ScheduleTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...WEEKLY_SCHEDULE_SLOT_TYPE_VALUES.map((type) => ({
    value: type,
    label: WEEKLY_SCHEDULE_SLOT_TYPE_LABELS[type],
  })),
];

const TYPE_STAT_ICONS: Record<WeeklyScheduleSlotType, LucideIcon> = {
  class: GraduationCapIcon,
  workshop: WrenchIcon,
  online: MonitorIcon,
  meeting: UsersIcon,
};

type DragSourceSnapshot = {
  session: ManagerWeeklyScheduleSession;
  start: Date;
  end: Date | null;
};

type ManagerSchedulePanelProps = {
  initialSessions: ManagerWeeklyScheduleSession[];
};

function getSessionFromEventProps(
  event: { extendedProps: Record<string, unknown> }
): ManagerWeeklyScheduleSession | null {
  const session = event.extendedProps.session as
    | ManagerWeeklyScheduleSession
    | undefined;
  return session ?? null;
}

function getSessionFromEvent(
  info: EventClickInfo
): ManagerWeeklyScheduleSession | null {
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
  source: ManagerWeeklyScheduleSession,
  dropStart: Date | null,
  dropEnd: Date | null,
  allDay: boolean
): CreateWeeklyScheduleSlotInput | null {
  if (!dropStart) {
    return null;
  }

  const color = source.color as CreateWeeklyScheduleSlotInput["color"];

  if (allDay) {
    return {
      name: source.name,
      type: source.type,
      slot_date: formatDateFromDate(dropStart),
      start_time: source.startTime,
      end_time: source.endTime,
      color,
    };
  }

  const startTime = formatTimeFromDate(dropStart);
  let endTime = dropEnd
    ? formatTimeFromDate(dropEnd)
    : source.endTime;

  if (endTime <= startTime) {
    endTime = source.endTime;
    if (endTime <= startTime) {
      const next = new Date(dropStart);
      next.setMinutes(next.getMinutes() + 90);
      endTime = formatTimeFromDate(next);
    }
  }

  return {
    name: source.name,
    type: source.type,
    slot_date: formatDateFromDate(dropStart),
    start_time: startTime,
    end_time: endTime,
    color,
  };
}

function buildDuplicateGhostEvent(
  session: ManagerWeeklyScheduleSession,
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
    contrastColor: getWeeklyScheduleSlotStrongColor(color),
    editable: false,
    startEditable: false,
    durationEditable: false,
    classNames: ["fc-schedule-dup-ghost"],
    extendedProps: {
      isDuplicateGhost: true,
    },
  };
}

function formatSlotDateLabel(value: string): string {
  try {
    return format(parseISO(value), "EEE, MMM d, yyyy");
  } catch {
    return value;
  }
}

function sessionFromCreateInput(
  values: CreateWeeklyScheduleSlotInput,
  id: string
): ManagerWeeklyScheduleSession {
  return {
    id,
    name: values.name,
    type: values.type,
    slotDate: values.slot_date,
    startTime: values.start_time,
    endTime: values.end_time,
    color: values.color,
  };
}

function toCreateFormData(values: CreateWeeklyScheduleSlotInput): FormData {
  const formData = new FormData();
  formData.set("name", values.name);
  formData.set("type", values.type);
  formData.set("slot_date", values.slot_date);
  formData.set("start_time", values.start_time);
  formData.set("end_time", values.end_time);
  formData.set("color", values.color);
  return formData;
}

function toUpdateFormData(values: UpdateWeeklyScheduleSlotInput): FormData {
  const formData = new FormData();
  formData.set("id", values.id);
  formData.set("name", values.name);
  formData.set("type", values.type);
  formData.set("slot_date", values.slot_date);
  formData.set("start_time", values.start_time);
  formData.set("end_time", values.end_time);
  formData.set("color", values.color);
  return formData;
}

export function ManagerSchedulePanel({
  initialSessions,
}: ManagerSchedulePanelProps) {
  const router = useRouter();
  const calendarRef = useRef<React.ComponentRef<typeof FullCalendar> | null>(
    null
  );
  const permissions = usePermissions();
  const canCreate = hasPermissionInSet(
    permissions,
    PERMISSIONS.SCHEDULE_CREATE
  );
  const canUpdate = hasPermissionInSet(
    permissions,
    PERMISSIONS.SCHEDULE_UPDATE
  );
  const [, startTransition] = useTransition();

  const [sessions, setSessions] =
    React.useState<ManagerWeeklyScheduleSession[]>(initialSessions);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isCopyOpen, setIsCopyOpen] = React.useState(false);
  const [createDefaults, setCreateDefaults] =
    React.useState<CreateSlotDefaults | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<ManagerWeeklyScheduleSession | null>(null);
  const [selectedSession, setSelectedSession] =
    React.useState<ManagerWeeklyScheduleSession | null>(null);
  const [weekStart, setWeekStart] = React.useState(() =>
    getSundayWeekBounds(formatDateFromDate(new Date())).weekStart
  );
  const [copyPreview, setCopyPreview] =
    React.useState<CopyWeeklySchedulePreview | null>(null);
  const [isLoadingCopyPreview, setIsLoadingCopyPreview] = React.useState(false);
  const [copyPreviewError, setCopyPreviewError] = React.useState<string | null>(
    null
  );
  const [isAltDuplicating, setIsAltDuplicating] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<ScheduleTypeFilter>("all");
  const isAltDupDragRef = useRef(false);
  const dragSourceRef = useRef<DragSourceSnapshot | null>(null);
  const pendingTempIdsRef = useRef<Set<string>>(new Set());
  const ssrWeekStartRef = useRef(weekStart);

  useEffect(() => {
    if (weekStart === ssrWeekStartRef.current) {
      setSessions((prev) => {
        const pendingTemps = prev.filter((session) =>
          pendingTempIdsRef.current.has(session.id)
        );
        return [...initialSessions, ...pendingTemps];
      });
      return;
    }

    let cancelled = false;
    void loadWeeklyScheduleSlotsAction(weekStart).then((next) => {
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
  }, [weekStart, initialSessions]);

  const events = useMemo<EventInput[]>(() => {
    const filtered =
      typeFilter === "all"
        ? sessions
        : sessions.filter((session) => session.type === typeFilter);
    return weeklyScheduleSessionsToEvents(filtered);
  }, [sessions, typeFilter]);

  const weekTypeCounts = useMemo(() => {
    const bounds = getSundayWeekBounds(weekStart);
    const counts: Record<WeeklyScheduleSlotType, number> = {
      class: 0,
      workshop: 0,
      online: 0,
      meeting: 0,
    };

    for (const session of sessions) {
      if (
        session.slotDate < bounds.weekStart ||
        session.slotDate > bounds.weekEnd
      ) {
        continue;
      }
      counts[session.type] += 1;
    }

    return counts;
  }, [sessions, weekStart]);

  function softRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function trackPendingTemp(tempId: string) {
    pendingTempIdsRef.current.add(tempId);
  }

  function untrackPendingTemp(tempId: string) {
    pendingTempIdsRef.current.delete(tempId);
  }

  function ensureCreatedTypeVisible(type: WeeklyScheduleSlotType) {
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
    // Delay so eventDrop (fires after dragStop) can still read the Alt flag.
    window.setTimeout(() => {
      isAltDupDragRef.current = false;
    }, 0);
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Alt" || !canCreate) {
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
  }, [canCreate]);

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    false,
    (nextOpen) => {
      if (!nextOpen) {
        setDeleteTarget(null);
      }
    }
  );

  function openEditSession(session: ManagerWeeklyScheduleSession) {
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

  async function handleOptimisticCreate(values: CreateWeeklyScheduleSlotInput) {
    const tempId = makeTempId();
    const optimistic = sessionFromCreateInput(values, tempId);
    trackPendingTemp(tempId);
    ensureCreatedTypeVisible(values.type);
    setSessions((prev) => [...prev, optimistic]);

    const result = await createWeeklyScheduleSlotAction(
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

  async function handleOptimisticUpdate(values: UpdateWeeklyScheduleSlotInput) {
    if (isTempScheduleId(values.id)) {
      showInfoToast("Still saving this slot…");
      return;
    }

    const previous = sessions.find((session) => session.id === values.id);
    if (!previous) {
      showErrorToast("Unable to update slot.");
      return;
    }

    const next = sessionFromCreateInput(
      {
        name: values.name,
        type: values.type,
        slot_date: values.slot_date,
        start_time: values.start_time,
        end_time: values.end_time,
        color: values.color,
      },
      values.id
    );

    setSessions((prev) =>
      prev.map((session) => (session.id === values.id ? next : session))
    );
    if (selectedSession?.id === values.id) {
      setSelectedSession(next);
    }

    const result = await updateWeeklyScheduleSlotAction(
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

  async function handleOptimisticCopy(preview: CopyWeeklySchedulePreview) {
    const tempIds = preview.willCreate.map(() => makeTempId());
    const optimisticSessions = preview.willCreate.map((item, index) => ({
      id: tempIds[index]!,
      name: item.name,
      type: item.type,
      slotDate: item.slotDate,
      startTime: item.startTime,
      endTime: item.endTime,
      color: item.color,
    }));

    for (const tempId of tempIds) {
      trackPendingTemp(tempId);
    }
    setSessions((prev) => [...prev, ...optimisticSessions]);

    const formData = new FormData();
    formData.set("week_start", preview.weekStart);
    const result = await copyWeeklyScheduleSlotsAction({}, formData);

    if (!result.success) {
      const tempIdSet = new Set(tempIds);
      for (const tempId of tempIds) {
        untrackPendingTemp(tempId);
      }
      setSessions((prev) =>
        prev.filter((session) => !tempIdSet.has(session.id))
      );
      showErrorToast(result.error ?? "Unable to copy last week.");
      return;
    }

    for (const tempId of tempIds) {
      untrackPendingTemp(tempId);
    }
    showSuccessToast(result.message ?? "Last week copied.");
    softRefresh();
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
      const result = await deleteWeeklyScheduleSlotAction({}, formData);

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
    if (!canCreate) {
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

    const snapshot: DragSourceSnapshot = {
      session,
      start: info.event.start,
      end: info.event.end,
    };
    dragSourceRef.current = snapshot;

    if (canCreate && info.jsEvent.altKey) {
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

    // Alt+drag → duplicate at drop target; original stays put.
    if (wantsDuplicate) {
      info.revert();

      if (!canCreate) {
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

    // Plain drag → move and persist new date/time.
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
      endTime = dropEnd
        ? formatTimeFromDate(dropEnd)
        : source.endTime;
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
    const optimistic: ManagerWeeklyScheduleSession = {
      ...source,
      slotDate,
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
    formData.set("name", source.name);
    formData.set("type", source.type);
    formData.set("slot_date", slotDate);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("color", source.color);

    startTransition(() => {
      void (async () => {
        const result = await updateWeeklyScheduleSlotAction({}, formData);
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
          showErrorToast(result.error ?? "Unable to move slot.");
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

    const slotDate = formatDateFromDate(start);
    const startTime = formatTimeFromDate(start);
    const endTime = formatTimeFromDate(end);

    if (endTime <= startTime) {
      info.revert();
      showErrorToast("End time must be after start time.");
      return;
    }

    const previousStart = info.oldEvent.start;
    const previousEnd = info.oldEvent.end;
    const previous = session;
    const optimistic: ManagerWeeklyScheduleSession = {
      ...session,
      slotDate,
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
    formData.set("name", session.name);
    formData.set("type", session.type);
    formData.set("slot_date", slotDate);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("color", session.color);

    startTransition(() => {
      void (async () => {
        const result = await updateWeeklyScheduleSlotAction({}, formData);
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
          showErrorToast(result.error ?? "Unable to update slot time.");
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

  async function handleOpenCopyLastWeek() {
    if (!canCreate) {
      return;
    }

    let anchor = weekStart;
    const api = calendarRef.current?.getApi?.() as CalendarApi | undefined;
    if (api) {
      anchor = getSundayWeekBounds(formatDateFromDate(api.getDate())).weekStart;
      setWeekStart(anchor);
    }

    setIsCopyOpen(true);
    setCopyPreview(null);
    setCopyPreviewError(null);
    setIsLoadingCopyPreview(true);

    try {
      const result = await previewCopyLastWeekScheduleAction(anchor);
      if (!result.success) {
        setCopyPreviewError(result.error);
        return;
      }

      setCopyPreview(result.preview);
    } catch {
      setCopyPreviewError("Unable to load copy preview. Please try again.");
    } finally {
      setIsLoadingCopyPreview(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly schedule
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Date-specific slots across the school calendar. Click a slot to edit
            it
            {canCreate
              ? ", drag to select a range to add one, or hold Alt and drag a slot to duplicate it"
              : ""}
            {canUpdate
              ? ", drag a slot to move it, or drag the top/bottom edge to change duration"
              : ""}
            .
          </p>
        </div>
        <Can permission={PERMISSIONS.SCHEDULE_CREATE}>
          <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleOpenCopyLastWeek();
              }}
            >
              <CopyIcon data-icon="inline-start" />
              Copy last week
            </Button>
            <Button type="button" onClick={() => openCreate(null)}>
              <PlusIcon data-icon="inline-start" />
              Add slot
            </Button>
          </div>
        </Can>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          aria-label="Slot counts for this week"
          className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8"
        >
          {WEEKLY_SCHEDULE_SLOT_TYPE_VALUES.map((type) => {
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
                  {WEEKLY_SCHEDULE_SLOT_TYPE_LABELS[type]}
                </span>
              </div>
            );
          })}
        </div>

        <div
          role="tablist"
          aria-label="Filter by slot type"
          className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8"
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

      <AddWeeklyScheduleSlotDialog
        open={isCreateOpen}
        onOpenChange={(next) => {
          setIsCreateOpen(next);
          if (!next) {
            setCreateDefaults(null);
          }
        }}
        onCreate={handleOptimisticCreate}
        defaults={createDefaults}
      />

      <EditWeeklyScheduleSlotDialog
        open={isEditOpen}
        onOpenChange={(next) => {
          setIsEditOpen(next);
          if (!next && !deleteTarget) {
            setSelectedSession(null);
          }
        }}
        session={selectedSession}
        onUpdate={handleOptimisticUpdate}
        onDeleteRequest={(session) => {
          setDeleteTarget(session);
        }}
      />

      <CopyLastWeekScheduleDialog
        open={isCopyOpen}
        onOpenChange={setIsCopyOpen}
        preview={copyPreview}
        isLoadingPreview={isLoadingCopyPreview}
        previewError={copyPreviewError}
        onCopy={handleOptimisticCopy}
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
                ? `${deleteTarget.name} on ${formatSlotDateLabel(deleteTarget.slotDate)}`
                : "this slot"}
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
          editable={canCreate || canUpdate}
          eventStartEditable={canCreate || canUpdate}
          eventDurationEditable={canUpdate}
          eventResizableFromStart={canUpdate}
          selectable={canCreate}
          selectMirror={canCreate}
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
