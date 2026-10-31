"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ClipboardListIcon, EyeIcon, SearchIcon } from "lucide-react";
import { updateRegistrationStatusAction } from "@/app/(panels)/manager/registrations/actions";
import { usePermissions } from "@/components/auth/permissions-provider";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  REGISTRATION_APPLICATION_STATUS_LABELS,
  REGISTRATION_APPLICATION_STATUS_VALUES,
  REGISTRATION_PREFERRED_PROGRAM_LABELS,
  type RegistrationApplicationStatus,
} from "@/lib/constants/public-registration";
import {
  getManagerGuestDetailRoute,
  getManagerRegistrationDetailRoute,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  ManagerRegistrationApplicationRow,
  UpdateRegistrationStatusActionState,
} from "@/types/public-registration";

const STATUS_ALL = "all";
const initialStatusState: UpdateRegistrationStatusActionState = {};

type ManageRegistrationsPanelProps = {
  initialApplications: ManagerRegistrationApplicationRow[];
};

function statusClassName(status: RegistrationApplicationStatus) {
  if (status === "accepted") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "applied") {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  if (status === "missing") {
    return "bg-orange-500/15 text-orange-800 dark:text-orange-300";
  }
  if (status === "rejected") {
    return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
  }
  return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
}

export function ManageRegistrationsPanel({
  initialApplications,
}: ManageRegistrationsPanelProps) {
  const permissions = usePermissions();
  const [applications, setApplications] = useState(initialApplications);
  const [prevApplications, setPrevApplications] = useState(initialApplications);
  const canUpdateStatus = hasPermissionInSet(
    permissions,
    PERMISSIONS.REGISTRATIONS_UPDATE_STATUS
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{
    id: string;
    status: RegistrationApplicationStatus;
  } | null>(null);
  const [statusState, statusAction, isStatusPending] = useActionState(
    updateRegistrationStatusAction,
    initialStatusState
  );
  const [isStatusTransitionPending, startStatusTransition] = useTransition();
  const isStatusBusy = isStatusPending || isStatusTransitionPending;

  useActionStateToast(statusState, isStatusBusy);
  useActionStateSuccess(statusState, isStatusBusy, () => {
    if (pendingStatus) {
      setApplications((current) =>
        current.map((row) =>
          row.id === pendingStatus.id
            ? { ...row, status: pendingStatus.status }
            : row
        )
      );
      setPendingStatus(null);
    }
    setUpdatingId(null);
  });

  if (initialApplications !== prevApplications) {
    setPrevApplications(initialApplications);
    setApplications(initialApplications);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((row) => {
      if (statusFilter !== STATUS_ALL && row.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [row.full_name, row.email, row.phone, row.city]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [applications, search, statusFilter]);

  function changeStatus(
    row: ManagerRegistrationApplicationRow,
    nextStatus: RegistrationApplicationStatus
  ) {
    if (!canUpdateStatus || nextStatus === row.status) return;
    setUpdatingId(row.id);
    setPendingStatus({ id: row.id, status: nextStatus });
    const formData = new FormData();
    formData.set("id", row.id);
    formData.set("status", nextStatus);
    startStatusTransition(() => {
      statusAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public student registration applications awaiting review.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? STATUS_ALL)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
            {REGISTRATION_APPLICATION_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {REGISTRATION_APPLICATION_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          size="sm"
          icon={applications.length === 0 ? ClipboardListIcon : SearchIcon}
          title={
            applications.length === 0
              ? "No applications yet"
              : "No applications match your filters"
          }
          description={
            applications.length === 0
              ? "Registration applications will appear here."
              : "Try a different search or status filter."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const rowBusy = isStatusBusy && updatingId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {format(new Date(row.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{row.full_name}</span>
                          {row.guest_id ? (
                            <Link
                              href={getManagerGuestDetailRoute(row.guest_id)}
                              className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            >
                              Guest
                            </Link>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">
                        {REGISTRATION_PREFERRED_PROGRAM_LABELS[
                          row.preferred_program
                        ] ?? row.preferred_program}
                      </td>
                      <td className="px-4 py-3">
                        {canUpdateStatus ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.status}
                              onValueChange={(value) => {
                                if (value) {
                                  changeStatus(
                                    row,
                                    value as RegistrationApplicationStatus
                                  );
                                }
                              }}
                              disabled={rowBusy}
                            >
                              <SelectTrigger className="h-8 w-[8.5rem]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {REGISTRATION_APPLICATION_STATUS_VALUES.map(
                                  (value) => (
                                    <SelectItem key={value} value={value}>
                                      {
                                        REGISTRATION_APPLICATION_STATUS_LABELS[
                                          value
                                        ]
                                      }
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            {rowBusy ? <InlineSpinner /> : null}
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              statusClassName(row.status)
                            )}
                          >
                            {REGISTRATION_APPLICATION_STATUS_LABELS[row.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={getManagerRegistrationDetailRoute(row.id)}
                          prefetch={false}
                          aria-label={`View ${row.full_name}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                        >
                          <EyeIcon className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
