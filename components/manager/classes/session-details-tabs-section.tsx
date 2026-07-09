"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import { AddSessionTaskDialog } from "@/components/manager/classes/add-session-task-dialog";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getManagerClassSessionAttendeesPreview,
  getManagerClassSessionTasksPreview,
} from "@/lib/constants/manager-class-session-detail-mock";
import { getManagerClassSessionPreview } from "@/lib/manager/get-manager-class-session-preview";
import { getNextSessionTaskId } from "@/lib/manager/get-manager-session-task-preview";
import { appendPreviewSessionTask } from "@/lib/preview/manager-session-tasks-store";
import { getManagerClassSessionTaskDetailRoute } from "@/lib/constants/routes";
import {
  SESSION_ATTENDEE_TABLE_LIMITS,
  SESSION_ATTENDEE_STATUS_LABELS,
  SESSION_TASK_TABLE_LIMITS,
} from "@/lib/constants/manager-class-session-detail-display";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerSessionAttendeeRow,
  ManagerSessionTaskRow,
  SessionDetailsTabValue,
} from "@/types/manager-class-session-detail";

type SessionDetailsTabsSectionProps = {
  classId: string;
  sessionId: string;
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
    router.push(getManagerClassSessionTaskDetailRoute(classId, sessionId, taskId));
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
}: {
  classId: string;
  sessionId: string;
}) {
  const [attendees, setAttendees] = useState<ManagerSessionAttendeeRow[]>(() =>
    getManagerClassSessionAttendeesPreview(classId, sessionId)
  );

  const handleToggleStatus = (
    attendee: ManagerSessionAttendeeRow,
    isPresent: boolean
  ) => {
    setAttendees((current) =>
      current.map((row) =>
        row.id === attendee.id ? { ...row, status: isPresent } : row
      )
    );

    showSuccessToast(
      isPresent
        ? `${attendee.full_name} marked present.`
        : `${attendee.full_name} marked absent.`
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Note</th>
            <th className="px-4 py-3 font-medium text-right">Present</th>
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
                  !attendee.status && "opacity-60"
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
                  <div className="flex items-center justify-end">
                    <Switch
                      checked={attendee.status}
                      onCheckedChange={(checked) =>
                        handleToggleStatus(attendee, checked)
                      }
                      aria-label={
                        attendee.status
                          ? SESSION_ATTENDEE_STATUS_LABELS.present
                          : SESSION_ATTENDEE_STATUS_LABELS.absent
                      }
                    />
                  </div>
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
}: SessionDetailsTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<SessionDetailsTabValue>("tasks");
  const session = getManagerClassSessionPreview(classId, sessionId);
  const sessionLabel = session
    ? `S${session.nb_order} · ${session.topic}`
    : "this session";
  const [tasks, setTasks] = useState<ManagerSessionTaskRow[]>(() =>
    getManagerClassSessionTasksPreview(classId, sessionId)
  );
  const [isAddOpen, setIsAddOpen] = useState(false);

  const nextTaskId = useMemo(
    () => getNextSessionTaskId(sessionId, tasks),
    [sessionId, tasks]
  );

  const defaultDueDate = useMemo(() => {
    if (!session) {
      return undefined;
    }

    const dueDate = new Date(session.starts_at);
    dueDate.setDate(dueDate.getDate() + 2);
    dueDate.setHours(23, 59, 0, 0);

    const offset = dueDate.getTimezoneOffset();
    const local = new Date(dueDate.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }, [session]);

  const handleCreateTask = (task: ManagerSessionTaskRow) => {
    appendPreviewSessionTask(task);
    setTasks((current) => [task, ...current.filter((row) => row.id !== task.id)]);
  };

  return (
    <TooltipProvider>
      <AddSessionTaskDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        sessionId={sessionId}
        sessionLabel={sessionLabel}
        nextTaskId={nextTaskId}
        defaultDueDate={defaultDueDate}
        onCreateTask={handleCreateTask}
      />

      <Card className="py-0">
        <CardContent className="px-0 pb-0">
          <TabsPrimitive
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as SessionDetailsTabValue)}
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
                  <Button type="button" onClick={() => setIsAddOpen(true)}>
                    <PlusIcon data-icon="inline-start" />
                    Create task
                  </Button>
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
                <SessionAttendeesTable classId={classId} sessionId={sessionId} />
              </TabsContentPrimitive>
            </TabsContentsPrimitive>
          </TabsPrimitive>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
