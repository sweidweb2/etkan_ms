"use client";

import type { ReactNode } from "react";
import { Feedback } from "@dnd-kit/dom";
import { useDraggable } from "@dnd-kit/react";
import { format } from "date-fns";
import {
  BanIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  GripVerticalIcon,
  MessageSquareIcon,
  PauseCircleIcon,
  PencilIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatGuestReferredFrom,
  GUEST_CURRENT_STATUS_BADGE_CLASSES,
  GUEST_CURRENT_STATUS_LABELS,
  GUEST_EDUCATION_LEVEL_LABELS,
  GUEST_INTERESTED_SERVICE_LABELS,
  type GuestCurrentStatus,
} from "@/lib/constants/guest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerGuestDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerGuestRow } from "@/types/manager-guest";

/** Droppable id for the main guests table, i.e. "not in any team". */
export const UNASSIGNED_GROUP = "unassigned-guests";

const COLUMN_LIMITS = {
  name: 28,
  school: 20,
  referred: 18,
} as const;

const CLOSED_STATUSES: readonly GuestCurrentStatus[] = [
  "rejected",
  "cancelled",
  "finished",
];

export function isClosedStatus(status: GuestCurrentStatus) {
  return CLOSED_STATUSES.includes(status);
}

const GUEST_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

/**
 * Drag a detached clone instead of the row itself. A move re-parents the `<tr>`
 * between two tables, and letting dnd-kit relocate the live node races React's
 * reconciliation ("removeChild ... not a child of this node").
 */
const CLONE_FEEDBACK = [Feedback.configure({ feedback: "clone" })];

const STATUS_ICONS = {
  scheduled: CalendarClockIcon,
  pending: PauseCircleIcon,
  cancelled: XCircleIcon,
  rejected: BanIcon,
  finished: CheckCircle2Icon,
} as const;

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

function GuestRecordRow({
  guest,
  showDragColumn,
  draggable,
  disabled,
  onViewNotes,
  onEditGuest,
}: {
  guest: ManagerGuestRow;
  showDragColumn: boolean;
  draggable: boolean;
  disabled: boolean;
  onViewNotes: (guest: ManagerGuestRow) => void;
  onEditGuest: (guest: ManagerGuestRow) => void;
}) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: guest.id,
    type: "guest",
    disabled: disabled || !draggable,
    plugins: CLONE_FEEDBACK,
  });

  return (
    <tr
      ref={ref}
      className={cn(
        GUEST_ROW_CLASS,
        "relative",
        isDragging && "opacity-40"
      )}
    >
      {showDragColumn ? (
        <td className="relative z-10 px-2 py-3">
          {draggable ? (
            <button
              type="button"
              ref={handleRef}
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-grab hover:bg-muted active:cursor-grabbing"
              )}
              aria-label={`Move ${guest.full_name} between the guest list and teams`}
              disabled={disabled}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          ) : null}
        </td>
      ) : null}

      <td className="px-4 py-3 font-medium">
        <Link
          prefetch={false}
          href={getManagerGuestDetailRoute(guest.id)}
          className="after:absolute after:inset-0"
          aria-label={`View details for ${guest.full_name}`}
        >
          <TruncatedCell value={guest.full_name} maxLength={COLUMN_LIMITS.name} />
        </Link>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{guest.phone ?? "—"}</td>
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
          ? GUEST_INTERESTED_SERVICE_LABELS[guest.interested_service]
          : "—"}
      </td>
      <td className="px-4 py-3">
        <TruncatedCell
          value={
            formatGuestReferredFrom(
              guest.referred_from,
              guest.referred_from_other
            ) ?? "—"
          }
          maxLength={COLUMN_LIMITS.referred}
        />
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
              onViewNotes(guest);
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
                onEditGuest(guest);
              }}
            >
              <PencilIcon />
            </Button>
          </Can>
        </div>
      </td>
    </tr>
  );
}

type GuestRecordsTableProps = {
  guests: ManagerGuestRow[];
  showDragColumn: boolean;
  canDrag: boolean;
  disabled: boolean;
  emptyState: ReactNode;
  onViewNotes: (guest: ManagerGuestRow) => void;
  onEditGuest: (guest: ManagerGuestRow) => void;
};

/**
 * The guest record table. Shared by the main guests list and every team box so a
 * dragged row keeps the same columns, links, and action buttons.
 */
export function GuestRecordsTable({
  guests,
  showDragColumn,
  canDrag,
  disabled,
  emptyState,
  onViewNotes,
  onEditGuest,
}: GuestRecordsTableProps) {
  const columnCount = showDragColumn ? 11 : 10;

  return (
    <table className="w-full min-w-[64rem] text-left text-sm">
      <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          {showDragColumn ? (
            <th className="w-10 px-2 py-3 font-medium">
              <span className="sr-only">Drag</span>
            </th>
          ) : null}
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Phone</th>
          <th className="px-4 py-3 font-medium">Age</th>
          <th className="px-4 py-3 font-medium">School / uni</th>
          <th className="px-4 py-3 font-medium">Education</th>
          <th className="px-4 py-3 font-medium">Service</th>
          <th className="px-4 py-3 font-medium">Referred from</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Created</th>
          <th className="px-4 py-3 font-medium">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {guests.length === 0 ? (
          <tr>
            <td
              colSpan={columnCount}
              className="px-4 py-10 text-center text-muted-foreground"
            >
              {emptyState}
            </td>
          </tr>
        ) : (
          guests.map((guest) => (
            <GuestRecordRow
              key={guest.id}
              guest={guest}
              showDragColumn={showDragColumn}
              draggable={canDrag}
              disabled={disabled}
              onViewNotes={onViewNotes}
              onEditGuest={onEditGuest}
            />
          ))
        )}
      </tbody>
    </table>
  );
}
