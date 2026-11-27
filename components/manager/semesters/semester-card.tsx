"use client";

import { useState } from "react";
import { HashIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditSemesterDialog } from "@/components/manager/semesters/edit-semester-dialog";
import {
  GRID_CARD_ACTION_BUTTON_CLASS_NAME,
  GridCardBody,
  GridCardFooter,
  GridCardViewButton,
} from "@/components/manager/shared/grid-card";
import { Button } from "@/components/ui/button";
import { FrostedGlassCard } from "@/components/ui/frosted-glass-card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerSemesterRow } from "@/types/manager-semester";

type SemesterCardProps = {
  semester: ManagerSemesterRow;
  /** When false, the card body is not a link (kanban drag surface). */
  linkToDetail?: boolean;
  className?: string;
};

export function SemesterCard({
  semester: initialSemester,
  linkToDetail = true,
  className,
}: SemesterCardProps) {
  const [semester, setSemester] = useState(initialSemester);
  const [prevSemester, setPrevSemester] = useState(initialSemester);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (initialSemester !== prevSemester) {
    setPrevSemester(initialSemester);
    setSemester(initialSemester);
  }

  const href = getManagerSemesterDetailRoute(semester.id);

  return (
    <>
      {isEditOpen ? (
        <EditSemesterDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          semester={semester}
          onSemesterUpdated={setSemester}
        />
      ) : null}
      <FrostedGlassCard
        href={linkToDetail ? href : undefined}
        hrefAriaLabel={
          linkToDetail ? `View semester ${semester.name}` : undefined
        }
        className={cn(className)}
      >
        <GridCardBody title={semester.name} />
        <GridCardFooter
          meta={
            <>
              <HashIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">Semester code</span>
              <span className="truncate font-mono font-medium tracking-wider text-foreground tabular-nums">
                {semester.semester_code}
              </span>
            </>
          }
          actions={
            <>
              <Can permission={PERMISSIONS.SEMESTERS_UPDATE}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className={GRID_CARD_ACTION_BUTTON_CLASS_NAME}
                  aria-label={`Edit semester ${semester.name}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsEditOpen(true);
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </Can>
              <span
                className="contents"
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <GridCardViewButton
                  href={href}
                  label={`View semester ${semester.name}`}
                />
              </span>
            </>
          }
        />
      </FrostedGlassCard>
    </>
  );
}
