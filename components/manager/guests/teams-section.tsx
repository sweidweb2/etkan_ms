"use client";

import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { format } from "date-fns";
import {
  CalendarIcon,
  PencilIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import {
  GuestRecordsTable,
  UNASSIGNED_GROUP,
  type GuestMoveTarget,
} from "@/components/manager/guests/guest-records-table";
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
  moveUp,
  moveDown,
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
  moveUp?: GuestMoveTarget;
  moveDown?: GuestMoveTarget;
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
      <CardHeader className="items-center border-b bg-muted/40 py-3">
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
          <span className="truncate">{team.name}</span>
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
              TEAM_STATUS_BADGE_CLASSES[team.status]
            )}
          >
            {TEAM_STATUS_LABELS[team.status]}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <UsersIcon className="size-3.5" />
            {team.guests.length} guest{team.guests.length === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <CalendarIcon className="size-3.5" />
            {team.expected_start_date
              ? format(new Date(team.expected_start_date), "MMM d, yyyy")
              : "No expected start date"}
          </span>
        </CardTitle>
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
          "overflow-x-auto rounded-b-xl p-0 transition-colors",
          isDropTarget && "bg-primary/5 ring-2 ring-inset ring-primary/40"
        )}
      >
        <GuestRecordsTable
          guests={team.guests}
          showDragColumn={canDrag}
          canDrag={canDrag}
          disabled={dragDisabled}
          emptyState="Drag a guest here to add them to this team."
          showEmailAndSchool={false}
          showHeader={false}
          moveUp={moveUp}
          moveDown={moveDown}
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
  /** Block drag sources while a move is saving to avoid lost writes. */
  dragDisabled?: boolean;
  disabled: boolean;
  onEdit: (team: ManagerTeamRow) => void;
  onDelete: (team: ManagerTeamRow) => void;
  /** `targetGroup` is a team id or `UNASSIGNED_GROUP` (back to the guest list). */
  onMoveGuest: (guest: ManagerGuestRow, targetGroup: string) => void;
  onViewNotes: (guest: ManagerGuestRow) => void;
  onEditGuest: (guest: ManagerGuestRow) => void;
};

export function TeamsSection({
  teams,
  canDrag,
  dragDisabled = false,
  disabled,
  onEdit,
  onDelete,
  onMoveGuest,
  onViewNotes,
  onEditGuest,
}: TeamsSectionProps) {
  function getMoveTargets(index: number) {
    if (!canDrag) {
      return { moveUp: undefined, moveDown: undefined };
    }

    const previousTeam = teams[index - 1];
    const nextTeam = teams[index + 1];

    const moveUp: GuestMoveTarget = previousTeam
      ? {
          label: `Move to ${previousTeam.name}`,
          onMove: (guest) => onMoveGuest(guest, previousTeam.id),
        }
      : {
          label: "Move back to guest list",
          onMove: (guest) => onMoveGuest(guest, UNASSIGNED_GROUP),
        };

    const moveDown: GuestMoveTarget | undefined = nextTeam
      ? {
          label: `Move to ${nextTeam.name}`,
          onMove: (guest) => onMoveGuest(guest, nextTeam.id),
        }
      : undefined;

    return { moveUp, moveDown };
  }

  return (
    <section className="flex w-full flex-col gap-4" aria-label="Teams">
      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No teams yet. Create one to start grouping guests.
        </div>
      ) : (
        <div className="flex w-full flex-col gap-4">
          {teams.map((team, index) => (
            <TeamCard
              key={team.id}
              team={team}
              canDrag={canDrag}
              dragDisabled={dragDisabled}
              disabled={disabled}
              {...getMoveTargets(index)}
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
