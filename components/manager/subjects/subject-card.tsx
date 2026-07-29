"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import {
  BookOpenIcon,
  CalendarIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GraduationCapIcon,
  LayersIcon,
  Link2Icon,
  PencilIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUBJECT_CARD_LIMITS } from "@/lib/constants/manager-subject-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type SubjectCardProps = {
  subject: ManagerSubjectRow;
};

function TruncatedText({
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
    return <span className={className}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("cursor-default truncate", className)} tabIndex={0} />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function ResourceRow({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (!href) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border/80 px-2 py-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3 shrink-0 opacity-60" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span>—</span>
      </div>
    );
  }

  const { display } = truncateText(href, SUBJECT_CARD_LIMITS.link);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      onClick={(event) => event.stopPropagation()}
      className="relative z-10 flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] transition-colors hover:bg-muted/50 pointer-events-auto"
    >
      <Icon className="size-3 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span className="inline-flex min-w-0 max-w-[5rem] items-center gap-0.5 font-medium text-primary">
        <span className="truncate">{display}</span>
        <ExternalLinkIcon className="size-2.5 shrink-0" />
      </span>
    </a>
  );
}

export function SubjectCard({ subject: initialSubject }: SubjectCardProps) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [prevSubject, setPrevSubject] = useState(initialSubject);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (initialSubject !== prevSubject) {
    setPrevSubject(initialSubject);
    setSubject(initialSubject);
  }

  const detailHref = getManagerSubjectDetailRoute(subject.id);
  const linkCount = [
    subject.syllabus_link,
    subject.reference_link,
    subject.handout_link,
  ].filter(Boolean).length;

  const handleSubjectUpdated = (updated: ManagerSubjectRow) => {
    setSubject(updated);
    router.refresh();
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
      <Card className="group relative flex h-full flex-col overflow-hidden gap-0 py-0 transition-all duration-200 hover:border-sky-400/45 hover:shadow-[0_12px_32px_rgba(14,165,233,0.16)]">
        <Link
          href={detailHref}
          aria-label={`View ${subject.name}`}
          className="absolute inset-0 z-0 rounded-xl"
        />
        <CardHeader className="relative z-10 gap-2 border-b bg-muted/20 px-3 py-2.5 pointer-events-none">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <GraduationCapIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm leading-snug">
                <TruncatedText
                  value={subject.name}
                  maxLength={SUBJECT_CARD_LIMITS.name}
                />
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {linkCount} resource{linkCount === 1 ? "" : "s"} linked
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 flex flex-1 flex-col gap-1.5 px-3 py-2.5 pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
            <LayersIcon className="size-3 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              Classes
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {subject.class_count}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
            <CalendarIcon className="size-3 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              Sessions
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {subject.nb_sessions}
            </span>
          </div>
          <ResourceRow
            label="Syllabus"
            href={subject.syllabus_link}
            icon={FileTextIcon}
          />
          <ResourceRow
            label="Reference"
            href={subject.reference_link}
            icon={Link2Icon}
          />
          <ResourceRow
            label="Handout"
            href={subject.handout_link}
            icon={BookOpenIcon}
          />
        </CardContent>

        <CardFooter className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 pointer-events-none">
          <span className="text-[11px] text-muted-foreground">
            {format(new Date(subject.created_at), "MMM d, yyyy")}
          </span>
          <div className="flex items-center gap-1.5">
            <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
                aria-label={`Edit ${subject.name}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsEditOpen(true);
                }}
              >
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </Can>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
              nativeButton={false}
              render={<Link href={detailHref} />}
            >
              View
            </Button>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
