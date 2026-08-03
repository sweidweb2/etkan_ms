"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  ListOrderedIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { deleteWorkshopSessionAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { AddWorkshopSessionDialog } from "@/components/manager/workshops/add-workshop-session-dialog";
import { EditWorkshopSessionDialog } from "@/components/manager/workshops/edit-workshop-session-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WORKSHOP_SESSION_STATUS_BADGE_CLASSES,
  WORKSHOP_SESSION_STATUS_LABELS,
  WORKSHOP_SESSION_STATUS_VALUES,
  WORKSHOP_SESSION_STATUSES,
  type WorkshopSessionStatus,
} from "@/lib/constants/manager-workshop-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  DeleteWorkshopSessionActionState,
  ManagerWorkshopSessionRow,
} from "@/types/manager-workshop";

const PAGE_SIZE = 10;
const STATUS_ALL = "all";

type StatusFilter = typeof STATUS_ALL | WorkshopSessionStatus;

const initialDeleteState: DeleteWorkshopSessionActionState = {};

type WorkshopSessionsSectionProps = {
  workshopId: string;
  sessions: ManagerWorkshopSessionRow[];
};

function formatDate(value: string) {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function average(values: number[]): string {
  if (values.length === 0) {
    return "—";
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return (sum / values.length).toFixed(1);
}

function IconStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function WorkshopSessionsSection({
  workshopId,
  sessions,
}: WorkshopSessionsSectionProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSession, setEditingSession] =
    useState<ManagerWorkshopSessionRow | null>(null);
  const [viewingSession, setViewingSession] =
    useState<ManagerWorkshopSessionRow | null>(null);
  const [deletingSession, setDeletingSession] =
    useState<ManagerWorkshopSessionRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_ALL);
  const [page, setPage] = useState(1);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteWorkshopSessionAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    (open) => {
      if (!open) {
        setDeletingSession(null);
      }
    }
  );

  useActionStateToast(deleteState, isDeleteActionPending);
  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    setDeletingSession(null);
    router.refresh();
  });

  const stats = useMemo(() => {
    const planned = sessions.filter(
      (session) => session.status === WORKSHOP_SESSION_STATUSES.PLANNED
    ).length;
    const done = sessions.filter(
      (session) => session.status === WORKSHOP_SESSION_STATUSES.DONE
    ).length;
    const totalHours = sessions.reduce(
      (total, session) => total + session.nb_hours,
      0
    );
    const participantsEvals = sessions
      .map((session) => session.participants_eval)
      .filter((value): value is number => value != null);
    const sessionEvals = sessions
      .map((session) => session.session_eval)
      .filter((value): value is number => value != null);

    return {
      total: sessions.length,
      planned,
      done,
      totalHours: Math.round(totalHours * 100) / 100,
      avgParticipants: average(participantsEvals),
      avgSession: average(sessionEvals),
    };
  }, [sessions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions.filter((session) => {
      if (statusFilter !== STATUS_ALL && session.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        session.topic,
        session.notes ?? "",
        session.suggestions ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sessions, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleConfirmDelete() {
    if (!deletingSession) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deletingSession.id);
    formData.set("workshop_id", workshopId);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <>
      <AddWorkshopSessionDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        workshopId={workshopId}
        onCreated={() => router.refresh()}
      />

      <EditWorkshopSessionDialog
        open={Boolean(editingSession)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSession(null);
          }
        }}
        session={editingSession}
        onUpdated={() => router.refresh()}
      />

      <Dialog
        open={Boolean(viewingSession)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSession(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewingSession
                ? `Session #${viewingSession.nb_order}`
                : "Session details"}
            </DialogTitle>
            <DialogDescription>
              {viewingSession
                ? `${formatDate(viewingSession.session_date)} · ${formatTime(viewingSession.start_time)}–${formatTime(viewingSession.end_time)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {viewingSession ? (
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Topic
                </p>
                <p className="mt-1">{viewingSession.topic}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-1">
                    {WORKSHOP_SESSION_STATUS_LABELS[viewingSession.status]}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Hours
                  </p>
                  <p className="mt-1 tabular-nums">{viewingSession.nb_hours}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Participants eval
                  </p>
                  <p className="mt-1 tabular-nums">
                    {viewingSession.participants_eval ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Session eval
                  </p>
                  <p className="mt-1 tabular-nums">
                    {viewingSession.session_eval ?? "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {viewingSession.notes?.trim() ? viewingSession.notes : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Suggestions
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {viewingSession.suggestions?.trim()
                    ? viewingSession.suggestions
                    : "—"}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingSession)}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete session</DialogTitle>
            <DialogDescription>
              Permanently delete session #{deletingSession?.nb_order} (
              {deletingSession?.topic})? This cannot be undone.
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
              {isDeleteActionPending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClassTabCollapsibleSection
        title="Sessions"
        description={
          sessions.length === 0
            ? "No sessions yet"
            : `${sessions.length} session${sessions.length === 1 ? "" : "s"}`
        }
        storageKey={`workshop-details-sessions:${workshopId}`}
        action={
          <Can permission={PERMISSIONS.WORKSHOPS_SESSIONS_CREATE}>
            <Button type="button" size="sm" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add session
            </Button>
          </Can>
        }
      >
        <div className="flex flex-col gap-4 px-3 py-4 sm:px-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <IconStat
              icon={ListOrderedIcon}
              label="Total sessions"
              value={stats.total}
            />
            <IconStat
              icon={Clock3Icon}
              label="Planned"
              value={stats.planned}
            />
            <IconStat icon={CheckCircle2Icon} label="Done" value={stats.done} />
            <IconStat
              icon={Clock3Icon}
              label="Total hours"
              value={stats.totalHours}
            />
            <IconStat
              icon={UsersIcon}
              label="Avg participants eval"
              value={stats.avgParticipants}
            />
            <IconStat
              icon={StarIcon}
              label="Avg session eval"
              value={stats.avgSession}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search topic, notes…"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter((value as StatusFilter) ?? STATUS_ALL);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
                {WORKSHOP_SESSION_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {WORKSHOP_SESSION_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pageItems.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              {sessions.length === 0
                ? "No sessions recorded yet."
                : "No sessions match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Hours</th>
                    <th className="px-3 py-2 font-medium">Topic</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Evals</th>
                    <th className="px-3 py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageItems.map((session) => (
                    <tr key={session.id} className="bg-card">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {session.nb_order}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDate(session.session_date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {formatTime(session.start_time)}–
                        {formatTime(session.end_time)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {session.nb_hours}
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2 font-medium">
                        {session.topic}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                            WORKSHOP_SESSION_STATUS_BADGE_CLASSES[session.status]
                          )}
                        >
                          {WORKSHOP_SESSION_STATUS_LABELS[session.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {session.participants_eval ?? "—"}/
                        {session.session_eval ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View details for session ${session.nb_order}`}
                            onClick={() => setViewingSession(session)}
                          >
                            <MessageSquareIcon className="size-4" />
                          </Button>
                          <Can permission={PERMISSIONS.WORKSHOPS_SESSIONS_UPDATE}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit session ${session.nb_order}`}
                              onClick={() => setEditingSession(session)}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                          </Can>
                          <Can permission={PERMISSIONS.WORKSHOPS_SESSIONS_DELETE}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete session ${session.nb_order}`}
                              onClick={() => setDeletingSession(session)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Next
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </ClassTabCollapsibleSection>
    </>
  );
}
