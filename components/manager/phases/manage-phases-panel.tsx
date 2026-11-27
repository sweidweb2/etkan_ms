"use client";

import { useMemo, useState } from "react";
import { FolderPlusIcon, LayersIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddPhaseDialog } from "@/components/manager/phases/add-phase-dialog";
import { AssignSemestersToTeamDialog } from "@/components/manager/phases/assign-semesters-to-team-dialog";
import { CreateSemesterTeamDialog } from "@/components/manager/phases/create-semester-team-dialog";
import { SemestersKanbanBoard } from "@/components/manager/phases/semesters-kanban-board";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { prependUniqueById } from "@/lib/utils/prepend-unique-by-id";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import type { ManagerSemesterTeamRow } from "@/types/manager-semester-team";

function matchesSearch(semester: ManagerSemesterRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [semester.name, semester.semester_code]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function compareTeams(
  left: ManagerSemesterTeamRow,
  right: ManagerSemesterTeamRow
) {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }
  return left.name.localeCompare(right.name);
}

type ManagePhasesPanelProps = {
  initialSemesters: ManagerSemesterRow[];
  initialTeams: ManagerSemesterTeamRow[];
};

export function ManagePhasesPanel({
  initialSemesters,
  initialTeams,
}: ManagePhasesPanelProps) {
  const [semesters, setSemesters] = useState(initialSemesters);
  const [prevSemesters, setPrevSemesters] = useState(initialSemesters);
  const [teams, setTeams] = useState(() =>
    [...initialTeams].sort(compareTeams)
  );
  const [prevTeams, setPrevTeams] = useState(initialTeams);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const permissions = usePermissions();
  const canUpdateSemesters = hasPermissionInSet(
    permissions,
    PERMISSIONS.SEMESTERS_UPDATE
  );
  const canReorderColumns = hasPermissionInSet(
    permissions,
    PERMISSIONS.SEMESTERS_TEAMS_UPDATE
  );

  if (initialSemesters !== prevSemesters) {
    setPrevSemesters(initialSemesters);
    setSemesters(initialSemesters);
  }

  if (initialTeams !== prevTeams) {
    setPrevTeams(initialTeams);
    setTeams([...initialTeams].sort(compareTeams));
  }

  const filteredSemesters = useMemo(() => {
    return semesters.filter((semester) => matchesSearch(semester, searchQuery));
  }, [semesters, searchQuery]);

  const sortingEnabled = searchQuery.trim().length === 0;

  const handleSemesterCreated = (semester: ManagerSemesterRow) => {
    setSemesters((current) => prependUniqueById(current, semester));
  };

  const handleTeamCreated = (team: ManagerSemesterTeamRow) => {
    setTeams((current) =>
      [...current.filter((row) => row.id !== team.id), team].sort(compareTeams)
    );
  };

  const handleSemestersTeamChange = (assigned: ManagerSemesterRow[]) => {
    const byId = new Map(assigned.map((semester) => [semester.id, semester]));
    setSemesters((current) =>
      current.map((semester) => {
        const next = byId.get(semester.id);
        if (!next) {
          return semester;
        }
        return {
          ...semester,
          team_id: next.team_id,
          sort_order: next.sort_order,
        };
      })
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Manage semesters" />
      <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
        <Can permission={PERMISSIONS.SEMESTERS_TEAMS_CREATE}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateTeamOpen(true)}
          >
            <LayersIcon data-icon="inline-start" />
            Create team
          </Button>
        </Can>
        <Can permission={PERMISSIONS.SEMESTERS_UPDATE}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAssignOpen(true)}
            disabled={teams.length === 0}
            title={
              teams.length === 0
                ? "Create a team first"
                : "Add semesters to a team"
            }
          >
            <FolderPlusIcon data-icon="inline-start" />
            Add to team
          </Button>
        </Can>
        <Can permission={PERMISSIONS.SEMESTERS_CREATE}>
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add semester
          </Button>
        </Can>
      </div>

      <AddPhaseDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSemesterCreated={handleSemesterCreated}
      />
      <CreateSemesterTeamDialog
        open={isCreateTeamOpen}
        onOpenChange={setIsCreateTeamOpen}
        onTeamCreated={handleTeamCreated}
      />
      <AssignSemestersToTeamDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        teams={teams}
        semesters={semesters}
        onAssigned={handleSemestersTeamChange}
      />

      <div className="flex flex-col gap-4">
        <div className="relative w-full @lg/panel:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search semester name or code…"
            className="pl-8"
            aria-label="Search semesters"
          />
        </div>
        {!sortingEnabled ? (
          <p className="text-xs text-muted-foreground">
            Clear search to drag columns and reorder cards.
          </p>
        ) : null}

        <SemestersKanbanBoard
          semesters={filteredSemesters}
          teams={teams}
          canDragCards={canUpdateSemesters}
          canReorderTeams={canReorderColumns}
          sortingEnabled={sortingEnabled}
          onSemestersChange={setSemesters}
          onTeamsChange={setTeams}
          onRequestCreateTeam={() => setIsCreateTeamOpen(true)}
        />
      </div>
    </div>
  );
}
