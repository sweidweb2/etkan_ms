"use client";

import { useMemo, useState } from "react";
import {
  FolderPlusIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AddSubjectDialog } from "@/components/manager/subjects/add-subject-dialog";
import { AssignSubjectsToStageDialog } from "@/components/manager/subjects/assign-subjects-to-stage-dialog";
import { CreateStageDialog } from "@/components/manager/subjects/create-stage-dialog";
import { SubjectsKanbanBoard } from "@/components/manager/subjects/subjects-kanban-board";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { prependUniqueById } from "@/lib/utils/prepend-unique-by-id";
import type { ManagerStageRow } from "@/types/manager-stage";
import type { ManagerSubjectRow } from "@/types/manager-subject";

function matchesSearch(subject: ManagerSubjectRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    subject.name,
    subject.syllabus_link ?? "",
    subject.reference_link ?? "",
    subject.handout_link ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function compareStages(left: ManagerStageRow, right: ManagerStageRow) {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }
  return left.name.localeCompare(right.name);
}

type ManageSubjectsPanelProps = {
  initialSubjects: ManagerSubjectRow[];
  initialStages: ManagerStageRow[];
};

export function ManageSubjectsPanel({
  initialSubjects,
  initialStages,
}: ManageSubjectsPanelProps) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [prevSubjects, setPrevSubjects] = useState(initialSubjects);
  const [stages, setStages] = useState(() =>
    [...initialStages].sort(compareStages)
  );
  const [prevStages, setPrevStages] = useState(initialStages);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const permissions = usePermissions();
  const canUpdateSubjects = hasPermissionInSet(
    permissions,
    PERMISSIONS.SUBJECTS_UPDATE
  );
  const canReorderColumns = hasPermissionInSet(
    permissions,
    PERMISSIONS.SUBJECTS_STAGES_UPDATE
  );

  if (initialSubjects !== prevSubjects) {
    setPrevSubjects(initialSubjects);
    setSubjects(initialSubjects);
  }

  if (initialStages !== prevStages) {
    setPrevStages(initialStages);
    setStages([...initialStages].sort(compareStages));
  }

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => matchesSearch(subject, searchQuery));
  }, [subjects, searchQuery]);

  const sortingEnabled = searchQuery.trim().length === 0;

  const handleSubjectCreated = (subject: ManagerSubjectRow) => {
    setSubjects((current) => prependUniqueById(current, subject));
  };

  const handleStageCreated = (stage: ManagerStageRow) => {
    setStages((current) =>
      [...current.filter((row) => row.id !== stage.id), stage].sort(
        compareStages
      )
    );
  };

  const handleSubjectsStageChange = (
    subjectIds: string[],
    stageId: string | null
  ) => {
    const idSet = new Set(subjectIds);
    setSubjects((current) => {
      const maxSort = current.reduce((max, subject) => {
        if ((subject.stage_id ?? null) !== stageId) {
          return max;
        }
        return Math.max(max, subject.sort_order);
      }, -1);

      let cursor = maxSort + 1;
      return current.map((subject) => {
        if (!idSet.has(subject.id)) {
          return subject;
        }
        const next = {
          ...subject,
          stage_id: stageId,
          sort_order: cursor,
        };
        cursor += 1;
        return next;
      });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Manage subjects" />
      <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
        <Can permission={PERMISSIONS.SUBJECTS_STAGES_CREATE}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateStageOpen(true)}
          >
            <LayersIcon data-icon="inline-start" />
            Create stage
          </Button>
        </Can>
        <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAssignOpen(true)}
            disabled={stages.length === 0}
            title={
              stages.length === 0
                ? "Create a stage first"
                : "Add subjects to a stage"
            }
          >
            <FolderPlusIcon data-icon="inline-start" />
            Add to stage
          </Button>
        </Can>
        <Can permission={PERMISSIONS.SUBJECTS_CREATE}>
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add subject
          </Button>
        </Can>
      </div>

      <AddSubjectDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubjectCreated={handleSubjectCreated}
      />
      <CreateStageDialog
        open={isCreateStageOpen}
        onOpenChange={setIsCreateStageOpen}
        onStageCreated={handleStageCreated}
      />
      <AssignSubjectsToStageDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        stages={stages}
        subjects={subjects}
        onAssigned={handleSubjectsStageChange}
      />

      <div className="flex flex-col gap-4">
        <div className="relative w-full @lg/panel:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search subject name or links…"
            className="pl-8"
            aria-label="Search subjects"
          />
        </div>
        {!sortingEnabled ? (
          <p className="text-xs text-muted-foreground">
            Clear search to drag columns and reorder cards.
          </p>
        ) : null}

        <SubjectsKanbanBoard
          subjects={filteredSubjects}
          stages={stages}
          canDragCards={canUpdateSubjects}
          canReorderColumns={canReorderColumns}
          sortingEnabled={sortingEnabled}
          onSubjectsChange={setSubjects}
          onStagesChange={setStages}
          onRequestCreateStage={() => setIsCreateStageOpen(true)}
        />
      </div>
    </div>
  );
}
