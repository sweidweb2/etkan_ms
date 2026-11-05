"use client";

import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { format } from "date-fns";
import {
  CalendarIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { GuestRecordsTable } from "@/components/manager/guests/guest-records-table";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TEAM_STATUS_BADGE_CLASSES,
  TEAM_STATUS_LABELS,
} from "@/lib/constants/team";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type { ManagerGuestRow } from "@/types/manager-guest";
import type { ManagerTeamRow } from "@/types/manager-team";

function TeamCard({
  team,
  canDrag,
  dragDisabled,
  disabled,
  onEdit,
  onDelete,
  onViewNotes,
  onEditGuest,
}: {
  team: ManagerTeamRow;
  canDrag: boolean;
  dragDisabled: boolean;
  /** Only gates the team's own edit/delete buttons — dragging stays live. */
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewNotes: (guest: ManagerGuestRow) => void;
  onEditGuest: (guest: ManagerGuestRow) => void;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: team.id,
    accept: "guest",
    collisionPriority: CollisionPriority.High,
  });

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b bg-muted/40 py-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="truncate">{team.name}</span>
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
              TEAM_STATUS_BADGE_CLASSES[team.status]
            )}
          >
            {TEAM_STATUS_LABELS[team.status]}
          </span>
        </CardTitle>
        <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {team.guests.length} guest{team.guests.length === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="size-3.5" />
            {team.expected_start_date
              ? format(new Date(team.expected_start_date), "MMM d, yyyy")
              : "No expected start date"}
          </span>
        </p>
        <CardAction>
          <div className="flex items-center gap-1">
            <Can permission={PERMISSIONS.TEAMS_UPDATE}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${team.name}`}
                disabled={disabled}
                onClick={onEdit}
              >
                <PencilIcon />
              </Button>
            </Can>
            <Can permission={PERMISSIONS.TEAMS_DELETE}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${team.name}`}
                disabled={disabled}
                onClick={onDelete}
              >
                <Trash2Icon />
              </Button>
            </Can>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent
        ref={ref}
        className={cn(
          "min-h-24 overflow-x-auto rounded-b-xl p-0 transition-colors",
          isDropTarget && "bg-primary/5 ring-2 ring-inset ring-primary/40"
        )}
      >
        <GuestRecordsTable
          guests={team.guests}
          showDragColumn={canDrag}
          canDrag={canDrag}
          disabled={dragDisabled}
          emptyState="Drag a guest here to add them to this team."
          onViewNotes={onViewNotes}
          onEditGuest={onEditGuest}
        />
      </CardContent>
    </Card>
  );
}

type TeamsSectionProps = {
  teams: ManagerTeamRow[];
  canDrag: boolean;
  /** A move is being persisted; the UI already shows its result. */
  isSaving: boolean;
  /** Block drag sources while a move is saving to avoid lost writes. */
  dragDisabled?: boolean;
  disabled: boolean;
  onCreate: () => void;
  onEdit: (team: ManagerTeamRow) => void;
  onDelete: (team: ManagerTeamRow) => void;
  onViewNotes: (guest: ManagerGuestRow) => void;
  onEditGuest: (guest: ManagerGuestRow) => void;
};

export function TeamsSection({
  teams,
  canDrag,
  isSaving,
  dragDisabled = false,
  disabled,
  onCreate,
  onEdit,
  onDelete,
  onViewNotes,
  onEditGuest,
}: TeamsSectionProps) {
  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            Teams
            {isSaving ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <InlineSpinner />
                Saving
              </span>
            ) : null}
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag a guest from the list above into a team. Guests in a team are
            hidden from the list.
          </p>
        </div>
        <Can permission={PERMISSIONS.TEAMS_CREATE}>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onCreate}
          >
            <PlusIcon data-icon="inline-start" />
            Create team
          </Button>
        </Can>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No teams yet. Create one to start grouping guests.
        </div>
      ) : (
        <div className="flex w-full flex-col gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canDrag={canDrag}
              dragDisabled={dragDisabled}
              disabled={disabled}
              onEdit={() => onEdit(team)}
              onDelete={() => onDelete(team)}
              onViewNotes={onViewNotes}
              onEditGuest={onEditGuest}
            />
          ))}
        </div>
      )}
    </section>
  );
}
