"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDaysIcon, EyeIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import { GradientGlassCover } from "@/components/ui/gradient-glass-card";
import { pickClassCardGradientKey } from "@/lib/constants/class-card-gradients";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type SubjectCardProps = {
  subject: ManagerSubjectRow;
};

const ACTION_BUTTON_CLASS_NAME =
  "relative z-10 size-7 bg-background pointer-events-auto hover:border-primary/40 hover:bg-background hover:text-primary";

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
      <article
        className={cn(
          "group/gradient-glass relative flex w-full flex-col overflow-hidden rounded-2xl",
          "border border-foreground/10 bg-card text-card-foreground",
          "shadow-[0_16px_36px_-24px_rgb(42_42_82/0.45)]",
          "transition-[transform,box-shadow] duration-300 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-20px_rgb(42_42_82/0.4)]",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        )}
      >
        <Link
          href={detailHref}
          aria-label={`View ${subject.name}`}
          className="absolute inset-0 z-0 rounded-2xl"
          prefetch={false}
        />

        <GradientGlassCover
          cardGradient={pickClassCardGradientKey(subject.id)}
          glassLabel={subject.name}
          glassLabelLines={2}
          className="pointer-events-none aspect-square"
          glassClassName="h-auto min-h-11 w-[min(100%,11rem)] px-2.5 py-2"
          glassLabelClassName="text-sm leading-snug"
        />

        <div className="pointer-events-none relative z-10 flex items-center justify-between gap-1.5 border-t border-foreground/10 px-2.5 py-2">
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
      </article>
    </>
  );
}
