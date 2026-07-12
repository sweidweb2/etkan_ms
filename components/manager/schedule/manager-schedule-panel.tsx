"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock3Icon,
  GraduationCapIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { deleteWeeklyScheduleSlotAction } from "@/app/manager/schedule/actions";
import { AddWeeklyScheduleSlotDialog } from "@/components/manager/schedule/add-weekly-schedule-slot-dialog";
import { EditWeeklyScheduleSlotDialog } from "@/components/manager/schedule/edit-weekly-schedule-slot-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import type {
  DeleteWeeklyScheduleSlotActionState,
  ManagerWeeklyScheduleClassOption,
  ManagerWeeklyScheduleSession,
  WeeklyScheduleDay,
} from "@/types/manager-weekly-schedule";
import { cn } from "@/lib/utils";

const initialDeleteState: DeleteWeeklyScheduleSlotActionState = {};

const WEEK_DAYS: WeeklyScheduleDay[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_ACCENT_CLASSES: Record<WeeklyScheduleDay, string> = {
  Sunday: "border-l border-l-4 border-l-lime-500 border-y-border border-r-border bg-lime-500/5",
  Monday: "border-l border-l-4 border-l-sky-500 border-y-border border-r-border bg-sky-500/5",
  Tuesday: "border-l border-l-4 border-l-violet-500 border-y-border border-r-border bg-violet-500/5",
  Wednesday:
    "border-l border-l-4 border-l-emerald-500 border-y-border border-r-border bg-emerald-500/5",
  Thursday: "border-l border-l-4 border-l-amber-500 border-y-border border-r-border bg-amber-500/5",
  Friday: "border-l border-l-4 border-l-rose-500 border-y-border border-r-border bg-rose-500/5",
  Saturday: "border-l border-l-4 border-l-cyan-500 border-y-border border-r-border bg-cyan-500/5",
};

const CALENDAR_START_HOUR = 5;
const CALENDAR_END_HOUR = 24;
const HOUR_ROW_HEIGHT = 80;

type ManagerSchedulePanelProps = {
  initialSessions: ManagerWeeklyScheduleSession[];
  classOptions: ManagerWeeklyScheduleClassOption[];
};

function sortSessionsByTime(
  sessions: ManagerWeeklyScheduleSession[]
): ManagerWeeklyScheduleSession[] {
  return [...sessions].sort((left, right) =>
    left.startTime.localeCompare(right.startTime)
  );
}

function getSessionsByDay(
  sessions: ManagerWeeklyScheduleSession[],
  day: WeeklyScheduleDay
): ManagerWeeklyScheduleSession[] {
  return sortSessionsByTime(sessions.filter((session) => session.day === day));
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function formatHourLabel(hour: number): string {
  if (hour === 24) {
    return "12 AM";
  }

  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${normalizedHour} ${period}`;
}

function getHourSlots(): { hour: number; label: string }[] {
  return Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
    (_, index) => {
      const hour = CALENDAR_START_HOUR + index;

      return {
        hour,
        label: formatHourLabel(hour),
      };
    }
  );
}

function SessionCard({
  session,
  className,
  onOpen,
}: {
  session: ManagerWeeklyScheduleSession;
  className?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open session: ${session.className}`}
      className={cn(
        "flex h-full w-full items-start rounded-xl p-2 text-left shadow-sm transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        DAY_ACCENT_CLASSES[session.day],
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-xs font-semibold leading-tight">
          {session.className}
        </p>
        <p className="truncate text-[11px] text-muted-foreground tabular-nums">
          {session.startTime} - {session.endTime}
        </p>
      </div>
    </button>
  );
}

export function ManagerSchedulePanel({
  initialSessions,
  classOptions,
}: ManagerSchedulePanelProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteWeeklyScheduleSlotAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;

  useActionStateToast(deleteState, isDeleteActionPending);

  const hourSlots = getHourSlots();
  const calendarHeight = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * HOUR_ROW_HEIGHT;
  const [open, setOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<ManagerWeeklyScheduleSession | null>(null);
  const [selectedSession, setSelectedSession] =
    React.useState<ManagerWeeklyScheduleSession | null>(null);

  const sessions = initialSessions;

  const handleScheduleChanged = () => {
    router.refresh();
  };

  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    setDeleteTarget(null);
    setOpen(false);
    setSelectedSession(null);
    handleScheduleChanged();
  });

  function openSession(session: ManagerWeeklyScheduleSession) {
    setSelectedSession(session);
    setOpen(true);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const formData = new FormData();
    formData.set("id", deleteTarget.id);

    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Default weekly calendar from 5 AM to 12 midnight.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Add slot
        </Button>
      </div>

      <AddWeeklyScheduleSlotDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        classOptions={classOptions}
        onSlotCreated={handleScheduleChanged}
      />

      <EditWeeklyScheduleSlotDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        session={selectedSession}
        classOptions={classOptions}
        onSlotUpdated={handleScheduleChanged}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete schedule slot</DialogTitle>
            <DialogDescription>
              This will permanently remove the {deleteTarget?.day} slot for{" "}
              {deleteTarget?.className}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
                  Deleting slot
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle className="flex items-center gap-2">
            <GraduationCapIcon className="size-4" />
            Weekly class timetable
          </CardTitle>
          <CardDescription>
            Manager view of recurring weekly sessions across all active classes.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-2 pb-3">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3Icon className="size-4" />
            <span>Sessions are fitted into their exact weekday and hour range.</span>
          </div>

          <div className="grid gap-4 lg:hidden">
            {WEEK_DAYS.map((day) => {
              const daySessions = getSessionsByDay(sessions, day);

              return (
                <div key={day} className="rounded-xl border">
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <h2 className="font-medium">{day}</h2>
                  </div>
                  <div className="grid gap-3 p-4">
                    {daySessions.length > 0 ? (
                      daySessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onOpen={() => openSession(session)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No classes scheduled.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden w-full lg:block">
            <div className="w-full rounded-xl border bg-card">
              <div
                className="grid border-b bg-muted/40"
                style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}
              >
                <div className="border-r px-4 py-3 text-sm font-medium text-muted-foreground">
                  Time
                </div>
                {WEEK_DAYS.map((day) => (
                  <div
                    key={day}
                    className="border-r px-4 py-3 text-center text-sm font-medium last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div
                className="grid"
                style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}
              >
                <div
                  className="relative border-r bg-muted/10"
                  style={{ height: calendarHeight }}
                >
                  {hourSlots.slice(0, -1).map((slot, index) => (
                    <div
                      key={slot.hour}
                      className="absolute inset-x-0 border-b px-3 pt-2 text-xs font-medium text-muted-foreground tabular-nums"
                      style={{
                        top: index * HOUR_ROW_HEIGHT,
                        height: HOUR_ROW_HEIGHT,
                      }}
                    >
                      {slot.label}
                    </div>
                  ))}
                </div>

                {WEEK_DAYS.map((day) => {
                  const daySessions = getSessionsByDay(sessions, day);

                  return (
                    <div
                      key={day}
                      className="relative border-r last:border-r-0"
                      style={{ height: calendarHeight }}
                    >
                      {hourSlots.slice(0, -1).map((slot, index) => (
                        <div
                          key={`${day}-${slot.hour}`}
                          className="absolute inset-x-0 border-b"
                          style={{
                            top: index * HOUR_ROW_HEIGHT,
                            height: HOUR_ROW_HEIGHT,
                          }}
                        />
                      ))}

                      {daySessions.map((session) => {
                        const startMinutes = timeToMinutes(session.startTime);
                        const endMinutes = timeToMinutes(session.endTime);
                        const top =
                          ((startMinutes - CALENDAR_START_HOUR * 60) / 60) *
                          HOUR_ROW_HEIGHT;
                        const height =
                          ((endMinutes - startMinutes) / 60) * HOUR_ROW_HEIGHT;

                        return (
                          <div
                            key={session.id}
                            className="absolute left-1 right-1"
                            style={{
                              top,
                              height: Math.max(height, 56),
                            }}
                          >
                            <SessionCard
                              session={session}
                              onOpen={() => openSession(session)}
                              className="h-full overflow-hidden"
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setSelectedSession(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedSession ? selectedSession.className : "Session"}
                </DialogTitle>
                <DialogDescription>
                  {selectedSession
                    ? `${selectedSession.day} · ${selectedSession.startTime}-${selectedSession.endTime}`
                    : null}
                </DialogDescription>
              </DialogHeader>

              {selectedSession ? (
                <div className="mt-2 grid gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock3Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="tabular-nums">
                      {selectedSession.startTime} - {selectedSession.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{selectedSession.teacherName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{selectedSession.room}</span>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="mt-1 text-sm font-medium">
                      {selectedSession.subjectName}
                    </p>
                  </div>
                </div>
              ) : null}

              {selectedSession ? (
                <DialogFooter className="sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditOpen(true);
                      }}
                      disabled={isDeleteActionPending}
                    >
                      <PencilIcon data-icon="inline-start" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setDeleteTarget(selectedSession)}
                      disabled={isDeleteActionPending}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              ) : null}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
