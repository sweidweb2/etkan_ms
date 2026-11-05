"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDaysIcon, EyeIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import { FrostedGlassCard } from "@/components/ui/frosted-glass-card";
import { pickClassCardGradientKey } from "@/lib/constants/class-card-gradients";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type SubjectCardProps = {
  subject: ManagerSubjectRow;
};

const ACTION_BUTTON_CLASS_NAME =
  "relative z-10 size-7 pointer-events-auto border-white/50 bg-white/40 backdrop-blur-sm hover:border-primary/40 hover:bg-white/70 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10";

export function SubjectCard({ subject: initialSubject }: SubjectCardProps) {
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
        cardGradient={pickClassCardGradientKey(subject.id)}
        href={detailHref}
        hrefAriaLabel={`View ${subject.name}`}
      >

        <div className="pointer-events-none relative z-10 flex min-h-28 flex-1 items-center justify-center px-4 py-5">
          <h3
            className="line-clamp-2 text-center text-sm font-semibold leading-snug tracking-tight break-words"
            title={subject.name}
          >
            {subject.name}
          </h3>
        </div>

        <div className="pointer-events-none relative z-10 flex items-center justify-between gap-1.5 border-t border-white/40 px-2.5 py-2 dark:border-white/10">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDaysIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              <span className="font-medium text-foreground tabular-nums">
                {subject.nb_sessions}
              </span>{" "}
              {sessionLabel}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className={ACTION_BUTTON_CLASS_NAME}
                aria-label={`Edit ${subject.name}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsEditOpen(true);
                }}
              >
                <PencilIcon className="size-3.5" />
              </Button>
            </Can>
            <Button
              variant="outline"
              size="icon-sm"
              className={ACTION_BUTTON_CLASS_NAME}
              aria-label={`View ${subject.name}`}
              nativeButton={false}
              render={<Link href={detailHref} prefetch={false} />}
            >
              <EyeIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </FrostedGlassCard>
    </>
  );
}
