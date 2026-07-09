"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GraduationCapIcon,
  Link2Icon,
} from "lucide-react";
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
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/80 px-2.5 py-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0 opacity-60" />
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
      className="relative z-10 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-xs transition-colors hover:bg-muted/50 pointer-events-auto"
    >
      <Icon className="size-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span className="inline-flex min-w-0 max-w-[6.5rem] items-center gap-1 font-medium text-primary">
        <span className="truncate">{display}</span>
        <ExternalLinkIcon className="size-3 shrink-0" />
      </span>
    </a>
  );
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const detailHref = getManagerSubjectDetailRoute(subject.id);
  const linkCount = [
    subject.syllabus_link,
    subject.reference_link,
    subject.handout_link,
  ].filter(Boolean).length;

  return (
    <TooltipProvider>
      <Card className="group relative flex h-full flex-col overflow-hidden py-0 transition-all duration-200 hover:border-sky-400/45 hover:shadow-[0_12px_32px_rgba(14,165,233,0.16)]">
        <Link
          href={detailHref}
          aria-label={`View ${subject.name}`}
          className="absolute inset-0 z-0 rounded-xl"
        />
        <CardHeader className="relative z-10 gap-3 border-b bg-muted/20 py-3 pointer-events-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <GraduationCapIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base leading-snug">
                  <TruncatedText
                    value={subject.name}
                    maxLength={SUBJECT_CARD_LIMITS.name}
                  />
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {linkCount} resource{linkCount === 1 ? "" : "s"} linked
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end rounded-lg bg-background px-2.5 py-1.5 ring-1 ring-foreground/10">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Classes
              </span>
              <span className="text-lg font-semibold tabular-nums leading-none">
                {subject.class_count}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 flex flex-1 flex-col gap-2 py-4 pointer-events-none">
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

        <CardFooter className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t bg-muted/20 py-3 pointer-events-none">
          <span className="text-xs text-muted-foreground">
            Created {format(new Date(subject.created_at), "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-auto relative z-10 bg-background"
            nativeButton={false}
            render={<Link href={detailHref} />}
          >
            View
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
