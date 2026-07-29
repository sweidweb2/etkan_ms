"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import { updateAttendeeAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { AddSessionTaskDialog } from "@/components/manager/classes/add-session-task-dialog";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getManagerClassSessionTaskDetailRoute } from "@/lib/constants/routes";
import {
  ATTENDEE_STATUSES,
  ATTENDEE_STATUS_VALUES,
  SESSION_ATTENDEE_STATUS_LABELS,
  type AttendeeStatusValue,
} from "@/lib/constants/manager-attendee-status";
import {
  SESSION_ATTENDEE_TABLE_LIMITS,
  SESSION_TASK_TABLE_LIMITS,
} from "@/lib/constants/manager-class-session-detail-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
  STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
} from "@/lib/manager/class-grades-access";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerSessionAttendeeRow,
  ManagerSessionTaskRow,
  SessionDetailsTabValue,
  UpdateAttendeeActionState,
} from "@/types/manager-class-session-detail";

const initialAttendeeState: UpdateAttendeeActionState = {};

const ATTENDEE_STATUS_SELECT_ITEMS = Object.fromEntries(
  ATTENDEE_STATUS_VALUES.map((status) => [
    status,
    SESSION_ATTENDEE_STATUS_LABELS[status],
  ])
) as Record<AttendeeStatusValue, string>;

type SessionDetailsTabsSectionProps = {
  classId: string;
  sessionId: string;
  sessionLabel: string;
  sessionStartsAt: string;
  initialTasks: ManagerSessionTaskRow[];
  initialAttendees: ManagerSessionAttendeeRow[];
  hasComputedGrades?: boolean;
  lockedUserIds?: string[];
};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function formatDateCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy");
}

function formatDateTimeCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

function SessionTasksTable({
  classId,
  sessionId,
  tasks,
}: {
  classId: string;
  sessionId: string;
  tasks: ManagerSessionTaskRow[];
}) {
  const router = useRouter();

  const handleOpenTask = (taskId: string) => {
    router.push(
      getManagerClassSessionTaskDetailRoute(classId, sessionId, taskId)
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Due date</th>
            <th className="px-4 py-3 font-medium">Max grade</th>
            <th className="px-4 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No tasks linked to this session yet.
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr
                key={task.id}
                className="cursor-pointer border-b last:border-b-0 transition-colors duration-150 hover:bg-primary/8 hover:shadow-[inset_3px_0_0_0_var(--primary)] active:bg-primary/12"
                onClick={() => handleOpenTask(task.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenTask(task.id);
                  }
                }}
                tabIndex={0}
                aria-label={`View task ${task.title}`}
              >
                <td className="max-w-[12rem] px-4 py-3">
                  <TruncatedCell
                    value={task.title}
                    maxLength={SESSION_TASK_TABLE_LIMITS.title}
                    className="font-medium"
                  />
                </td>
                <td className="max-w-[16rem] px-4 py-3 text-muted-foreground">
                  <TruncatedCell
                    value={task.description ?? "—"}
                    maxLength={SESSION_TASK_TABLE_LIMITS.description}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateCell(task.due_date)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  {task.max_grade ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateTimeCell(task.created_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SessionAttendeesTable({
  classId,
  sessionId,
  attendees,
  lockedUserIds,
  onAttendeeUpdated,
}: {
  classId: string;
  sessionId: string;
  attendees: ManagerSessionAttendeeRow[];
  lockedUserIds: string[];
  onAttendeeUpdated: (attendee: ManagerSessionAttendeeRow) => void;
}) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateAttendeeAction,
    initialAttendeeState
  );
  const isPending = isActionPending || isTransitionPending;
  const lockedUserIdSet = useMemo(
    () => new Set(lockedUserIds),
    [lockedUserIds]
  );

  useActionStateToast(state, isPending);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.attendee) {
        return;
      }

      onAttendeeUpdated(nextState.attendee);
    },
    (nextState) => Boolean(nextState.success && nextState.attendee)
  );

  const handleStatusChange = (
    attendee: ManagerSessionAttendeeRow,
    status: AttendeeStatusValue
  ) => {
    if (status === attendee.status) {
      return;
    }

    const formData = new FormData();
    formData.set("id", attendee.id);
    formData.set("class_id", classId);
    formData.set("session_id", sessionId);
    formData.set("status", status);
    if (attendee.note) {
      formData.set("note", attendee.note);
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Note</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {attendees.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No attendees recorded for this session yet.
              </td>
            </tr>
          ) : (
            attendees.map((attendee) => (
              <tr
                key={attendee.id}
                className={cn(
                  "border-b last:border-b-0 hover:bg-muted/30",
                  (attendee.status === ATTENDEE_STATUSES.ABSENT ||
                    attendee.status === ATTENDEE_STATUSES.EXCUSED) &&
                    "opacity-60"
                )}
              >
                <td className="max-w-[12rem] px-4 py-3">
                  <TruncatedCell
                    value={attendee.full_name}
                    maxLength={SESSION_ATTENDEE_TABLE_LIMITS.fullName}
                    className="font-medium"
                  />
                </td>
                <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                  <TruncatedCell
                    value={attendee.email}
                    maxLength={SESSION_ATTENDEE_TABLE_LIMITS.email}
                  />
                </td>
                <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                  <TruncatedCell
                    value={attendee.note ?? "—"}
                    maxLength={SESSION_ATTENDEE_TABLE_LIMITS.note}
                  />
                </td>
                <td className="px-4 py-3">
                  <Can
                    permission={PERMISSIONS.ATTENDANCE_UPDATE}
                    fallback={
                      <span>
                        {
                          SESSION_ATTENDEE_STATUS_LABELS[
                            attendee.status as AttendeeStatusValue
                          ]
                        }
                      </span>
                    }
                  >
                    <Select
                      value={attendee.status}
                      items={ATTENDEE_STATUS_SELECT_ITEMS}
                      disabled={
                        isPending || lockedUserIdSet.has(attendee.student_id)
                      }
                      onValueChange={(value) => {
                        if (!value) {
                          return;
                        }

                        handleStatusChange(
                          attendee,
                          value as AttendeeStatusValue
                        );
                      }}
                    >
                      <SelectTrigger
                        className="w-[8.5rem]"
                        aria-label={`Attendance status for ${attendee.full_name}`}
                        title={
                          lockedUserIdSet.has(attendee.student_id)
                            ? STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR
                            : undefined
                        }
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {ATTENDEE_STATUS_VALUES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {SESSION_ATTENDEE_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Can>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateTimeCell(attendee.created_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SessionDetailsTabsSection({
  classId,
  sessionId,
  sessionLabel,
  sessionStartsAt,
  initialTasks,
  initialAttendees,
  hasComputedGrades = false,
  lockedUserIds = [],
}: SessionDetailsTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<SessionDetailsTabValue>("tasks");
  const [tasks, setTasks] = useState(initialTasks);
  const [attendees, setAttendees] = useState(initialAttendees);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const defaultDueDate = useMemo(() => {
    const dueDate = new Date(sessionStartsAt);
    dueDate.setDate(dueDate.getDate() + 2);
    dueDate.setHours(23, 59, 0, 0);

    const offset = dueDate.getTimezoneOffset();
    const local = new Date(dueDate.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }, [sessionStartsAt]);

  return (
    <TooltipProvider>
      <AddSessionTaskDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        classId={classId}
        sessionId={sessionId}
        sessionLabel={sessionLabel}
        defaultDueDate={defaultDueDate}
        onCreateTask={(task) => {
          setTasks((current) => [
            task,
            ...current.filter((row) => row.id !== task.id),
          ]);
        }}
      />

      <Card className="py-0">
        <CardContent className="px-0 pb-0">
          <TabsPrimitive
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as SessionDetailsTabValue)
            }
            className="flex flex-col gap-0"
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b bg-muted/25 px-4 pt-2 pb-3">
              <div aria-hidden="true" />
              <TabsListPrimitive className="inline-flex h-auto items-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8">
                <TabsTriggerPrimitive
                  value="tasks"
                  className={cn(
                    "inline-flex items-center rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200",
                    "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
                    "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  )}
                >
                  Tasks
                </TabsTriggerPrimitive>
                <TabsTriggerPrimitive
                  value="attendee"
                  className={cn(
                    "inline-flex items-center rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200",
                    "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
                    "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  )}
                >
                  Attendee
                </TabsTriggerPrimitive>
              </TabsListPrimitive>
              <div className="flex justify-end">
                {activeTab === "tasks" ? (
                  <Can permission={PERMISSIONS.TASKS_CREATE}>
                    {hasComputedGrades ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={<span className="inline-flex" tabIndex={0} />}
                        >
                          <Button type="button" disabled>
                            <PlusIcon data-icon="inline-start" />
                            Create task
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button type="button" onClick={() => setIsAddOpen(true)}>
                        <PlusIcon data-icon="inline-start" />
                        Create task
                      </Button>
                    )}
                  </Can>
                ) : null}
              </div>
            </div>

            <TabsContentsPrimitive>
              <TabsContentPrimitive value="tasks" className="px-0 py-0">
                <SessionTasksTable
                  classId={classId}
                  sessionId={sessionId}
                  tasks={tasks}
                />
              </TabsContentPrimitive>
              <TabsContentPrimitive value="attendee" className="px-0 py-0">
                <SessionAttendeesTable
                  classId={classId}
                  sessionId={sessionId}
                  attendees={attendees}
                  lockedUserIds={lockedUserIds}
                  onAttendeeUpdated={(attendee) => {
                    setAttendees((current) =>
                      current.map((row) =>
                        row.id === attendee.id ? attendee : row
                      )
                    );
                  }}
                />
              </TabsContentPrimitive>
            </TabsContentsPrimitive>
          </TabsPrimitive>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
