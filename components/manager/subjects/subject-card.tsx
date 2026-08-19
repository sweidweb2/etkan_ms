"use client";

import Link from "next/link";
import { useState } from "react";
import { EyeIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type SubjectCardProps = {
  subject: ManagerSubjectRow;
};

export function SubjectCard({ subject: initialSubject }: SubjectCardProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [prevSubject, setPrevSubject] = useState(initialSubject);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (initialSubject !== prevSubject) {
    setPrevSubject(initialSubject);
    setSubject(initialSubject);
  }

  const detailHref = getManagerSubjectDetailRoute(subject.id);

  const handleSubjectUpdated = (updated: ManagerSubjectRow) => {
    setSubject(updated);
  };

  return (
    <TooltipProvider>
      {isEditOpen ? (
        <EditSubjectDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          subject={subject}
          onSubjectUpdated={handleSubjectUpdated}
        />
      ) : null}
      <Card className="group relative gap-0 overflow-hidden py-0 transition-colors duration-150 hover:border-primary/40 hover:bg-muted/40">
        <Link
          href={detailHref}
          aria-label={`View ${subject.name}`}
          className="absolute inset-0 z-0 rounded-xl"
        />
        <div className="relative z-10 flex items-center gap-2 px-3 py-2.5 pointer-events-none">
          <Tooltip>
            <TooltipTrigger
              render={
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-none transition-colors group-hover:text-primary" />
              }
            >
              {subject.name}
            </TooltipTrigger>
            <TooltipContent>{subject.name}</TooltipContent>
          </Tooltip>
          <div className="flex shrink-0 items-center gap-1">
            <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="relative z-10 size-7 bg-background pointer-events-auto hover:border-primary/40 hover:bg-background hover:text-primary"
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
              className="relative z-10 size-7 bg-background pointer-events-auto hover:border-primary/40 hover:bg-background hover:text-primary"
              aria-label={`View ${subject.name}`}
              nativeButton={false}
              render={<Link href={detailHref} />}
            >
              <EyeIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
