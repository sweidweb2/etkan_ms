"use client";

import { useState } from "react";
import { CalendarDaysIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import {
  GRID_CARD_ACTION_BUTTON_CLASS_NAME,
  GridCardBody,
  GridCardFooter,
  GridCardViewButton,
} from "@/components/manager/shared/grid-card";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import { FrostedGlassCard } from "@/components/ui/frosted-glass-card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type SubjectCardProps = {
  subject: ManagerSubjectRow;
  /** When false, the card body is not a link (kanban drag surface). */
  linkToDetail?: boolean;
  className?: string;
};

export function SubjectCard({
  subject: initialSubject,
  linkToDetail = true,
  className,
}: SubjectCardProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [prevSubject, setPrevSubject] = useState(initialSubject);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (initialSubject !== prevSubject) {
    setPrevSubject(initialSubject);
    setSubject(initialSubject);
  }

  const detailHref = getManagerSubjectDetailRoute(subject.id);
  const sessionLabel = subject.nb_sessions === 1 ? "session" : "sessions";

  const handleSubjectUpdated = (updated: ManagerSubjectRow) => {
    setSubject(updated);
  };

  return (
    <>
      {isEditOpen ? (
        <EditSubjectDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          subject={subject}
          onSubjectUpdated={handleSubjectUpdated}
        />
      ) : null}
      <FrostedGlassCard
        href={linkToDetail ? detailHref : undefined}
        hrefAriaLabel={linkToDetail ? `View ${subject.name}` : undefined}
        className={className}
      >
        <GridCardBody title={subject.name} />
        <GridCardFooter
          meta={
            <>
              <CalendarDaysIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                <span className="font-medium text-foreground tabular-nums">
                  {subject.nb_sessions}
                </span>{" "}
                {sessionLabel}
              </span>
            </>
          }
          actions={
            <>
              <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className={GRID_CARD_ACTION_BUTTON_CLASS_NAME}
                  aria-label={`Edit ${subject.name}`}
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
                  href={detailHref}
                  label={`View ${subject.name}`}
                />
              </span>
            </>
          }
        />
      </FrostedGlassCard>
    </>
  );
}
