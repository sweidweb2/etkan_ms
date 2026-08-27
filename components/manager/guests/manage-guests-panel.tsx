"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BanIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  PauseCircleIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { Can } from "@/components/auth/can";
import { AddGuestDialog } from "@/components/manager/guests/add-guest-dialog";
import { EditGuestDialog } from "@/components/manager/guests/edit-guest-dialog";
import { ViewGuestNotesDialog } from "@/components/manager/guests/view-guest-notes-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  GUEST_CURRENT_STATUS_BADGE_CLASSES,
  GUEST_CURRENT_STATUS_LABELS,
  GUEST_CURRENT_STATUS_VALUES,
  GUEST_EDUCATION_LEVEL_LABELS,
  GUEST_INTERESTED_SERVICE_LABELS,
  GUEST_INTERESTED_SERVICE_VALUES,
  type GuestCurrentStatus,
} from "@/lib/constants/guest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerGuestDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerGuestRow } from "@/types/manager-guest";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  name: 28,
  school: 20,
} as const;

const FILTER_ALL = "all";

const GUEST_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

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

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function uniqueGuestsById(rows: ManagerGuestRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}

function matchesSearch(guest: ManagerGuestRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    guest.full_name,
    guest.phone ?? "",
    guest.school_or_university ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

const STATUS_ICONS = {
  scheduled: CalendarClockIcon,
  pending: PauseCircleIcon,
  cancelled: XCircleIcon,
  rejected: BanIcon,
  finished: CheckCircle2Icon,
} as const;

function StatusBadge({ status }: { status: GuestCurrentStatus }) {
  const Icon = STATUS_ICONS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        GUEST_CURRENT_STATUS_BADGE_CLASSES[status]
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {GUEST_CURRENT_STATUS_LABELS[status]}
    </span>
  );
}

type ManageGuestsPanelProps = {
  initialGuests: ManagerGuestRow[];
};

export function ManageGuestsPanel({ initialGuests }: ManageGuestsPanelProps) {
  const [guests, setGuests] = useState(() => uniqueGuestsById(initialGuests));
  const [prevGuests, setPrevGuests] = useState(initialGuests);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [serviceFilter, setServiceFilter] = useState(FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notesGuest, setNotesGuest] = useState<ManagerGuestRow | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<ManagerGuestRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (initialGuests !== prevGuests) {
    setPrevGuests(initialGuests);
    setGuests(uniqueGuestsById(initialGuests));
  }

  const guestsById = useMemo(() => uniqueGuestsById(guests), [guests]);

  const stats = useMemo(() => {
    return {
      total: guestsById.length,
      scheduled: guestsById.filter((row) => row.status === "scheduled").length,
      finished: guestsById.filter((row) => row.status === "finished").length,
      cancelled: guestsById.filter((row) => row.status === "cancelled").length,
    };
  }, [guestsById]);

  const filteredGuests = useMemo(() => {
    return guestsById.filter((guest) => {
      if (!matchesSearch(guest, searchQuery)) {
        return false;
      }
      if (statusFilter !== FILTER_ALL && guest.status !== statusFilter) {
        return false;
      }
      if (
        serviceFilter !== FILTER_ALL &&
        guest.interested_service !== serviceFilter
      ) {
        return false;
      }
      return true;
    });
  }, [guestsById, searchQuery, statusFilter, serviceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filteredGuests.slice(pageStart, pageStart + pageSize);
  const pageNumbers = getPageNumbers(safePage, totalPages);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Guests</h1>
            <p className="text-sm text-muted-foreground">
              Pre-user intake cards before registration and team handoff.
            </p>
          </div>
          <Can permission={PERMISSIONS.GUESTS_CREATE}>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create guest
            </Button>
          </Can>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UserStatCard
            label="Total"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Scheduled"
            value={stats.scheduled}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Finished"
            value={stats.finished}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Cancelled"
            value={stats.cancelled}
            accentClassName="border-l-amber-500"
          />
        </div>

        <Card>
          <CardHeader className="gap-4 border-b">
            <CardTitle className="text-base">Guest list</CardTitle>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid w-full gap-1.5 sm:w-56">
                <Label htmlFor="guest-filter-search">Search</Label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="guest-filter-search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Name or phone"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="grid w-full gap-1.5 sm:w-44">
                <Label htmlFor="guest-filter-status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="guest-filter-status"
                    className="w-full"
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
                    {GUEST_CURRENT_STATUS_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {GUEST_CURRENT_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid w-full gap-1.5 sm:w-44">
                <Label htmlFor="guest-filter-service">Service</Label>
                <Select
                  value={serviceFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setServiceFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="guest-filter-service"
                    className="w-full"
                  >
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All services</SelectItem>
                    {GUEST_INTERESTED_SERVICE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {GUEST_INTERESTED_SERVICE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[64rem] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Age</th>
                    <th className="px-4 py-3 font-medium">School / uni</th>
                    <th className="px-4 py-3 font-medium">Education</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {guestsById.length === 0 ? (
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                            <p>
                              No guests yet. Create the first intake card to
                              start follow-up.
                            </p>
                            <Can permission={PERMISSIONS.GUESTS_CREATE}>
                              <Button
                                type="button"
                                onClick={() => setIsAddOpen(true)}
                              >
                                <PlusIcon data-icon="inline-start" />
                                Create guest
                              </Button>
                            </Can>
                          </div>
                        ) : (
                          "No guests match these filters."
                        )}
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((guest) => (
                      <tr
                        key={guest.id}
                        className={cn(GUEST_ROW_CLASS, "relative")}
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link
                            prefetch={false}
                            href={getManagerGuestDetailRoute(guest.id)}
                            className="after:absolute after:inset-0"
                            aria-label={`View details for ${guest.full_name}`}
                          >
                            <TruncatedCell
                              value={guest.full_name}
                              maxLength={COLUMN_LIMITS.name}
                            />
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {guest.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3">{guest.age ?? "—"}</td>
                        <td className="px-4 py-3">
                          <TruncatedCell
                            value={guest.school_or_university ?? "—"}
                            maxLength={COLUMN_LIMITS.school}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {guest.education_level
                            ? GUEST_EDUCATION_LEVEL_LABELS[guest.education_level]
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {guest.interested_service
                            ? GUEST_INTERESTED_SERVICE_LABELS[
                                guest.interested_service
                              ]
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={guest.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {format(new Date(guest.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="relative z-10 px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View notes for ${guest.full_name}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setNotesGuest(guest);
                                setIsNotesOpen(true);
                              }}
                            >
                              <MessageSquareIcon />
                            </Button>
                            <Can permission={PERMISSIONS.GUESTS_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${guest.full_name}`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setEditGuest(guest);
                                  setIsEditOpen(true);
                                }}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {filteredGuests.length} guest
                  {filteredGuests.length === 1 ? "" : "s"}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (!value) return;
                    setPageSize(
                      Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]
                    );
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[4.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  <ChevronLeftIcon />
                </Button>
                {pageNumbers.map((page, index) =>
                  page === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      variant={page === safePage ? "default" : "outline"}
                      size="icon-sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <AddGuestDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onGuestCreated={(guest) => {
            setGuests((current) => {
              if (current.some((row) => row.id === guest.id)) {
                return current;
              }

              return [guest, ...current];
            });
            setCurrentPage(1);
          }}
        />

        <ViewGuestNotesDialog
          open={isNotesOpen}
          onOpenChange={(open) => {
            setIsNotesOpen(open);
            if (!open) {
              setNotesGuest(null);
            }
          }}
          guest={notesGuest}
        />

        {editGuest ? (
          <EditGuestDialog
            open={isEditOpen}
            onOpenChange={(open) => {
              setIsEditOpen(open);
              if (!open) {
                setEditGuest(null);
              }
            }}
            guest={editGuest}
            onGuestUpdated={(guest) => {
              setGuests((current) =>
                current.map((row) => (row.id === guest.id ? guest : row))
              );
              setEditGuest(guest);
            }}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
