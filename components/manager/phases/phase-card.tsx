"use client";

import Link from "next/link";
import { format } from "date-fns";
import { EyeIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import type { ManagerSemesterRow } from "@/types/manager-phase";

type PhaseCardProps = {
  phase: ManagerSemesterRow;
  onEdit?: (phase: ManagerSemesterRow) => void;
};

export function PhaseCard({ phase, onEdit }: PhaseCardProps) {
  const href = getManagerSemesterDetailRoute(phase.id);
  const createdLabel = phase.created_at
    ? format(new Date(phase.created_at), "MMM d, yyyy")
    : null;

  return (
    <TooltipProvider>
      <Card className="group relative gap-0 overflow-hidden py-0 transition-colors duration-150 hover:border-primary/40 hover:bg-muted/40">
        <Link
          href={href}
          aria-label={`View semester ${phase.name}`}
          className="absolute inset-0 z-0 rounded-xl"
          prefetch={false}
        />
        <div className="relative z-10 flex items-center gap-3 px-3 py-2.5 pointer-events-none">
          <div className="min-w-0 flex-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <h3 className="truncate text-sm font-semibold leading-none transition-colors group-hover:text-primary" />
                }
              >
                {phase.name}
              </TooltipTrigger>
              <TooltipContent>{phase.name}</TooltipContent>
            </Tooltip>
            {createdLabel ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Created {createdLabel}
              </p>
            ) : null}
          </div>

          <span
            className="shrink-0 rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs font-medium tabular-nums tracking-wider text-foreground"
            title="Semester code"
          >
            {phase.semester_code}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            {onEdit ? (
              <Can permission={PERMISSIONS.SEMESTERS_UPDATE}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="relative z-10 size-7 bg-background pointer-events-auto hover:border-primary/40 hover:bg-background hover:text-primary"
                  aria-label={`Edit semester ${phase.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onEdit(phase);
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </Can>
            ) : null}
            <Button
              variant="outline"
              size="icon-sm"
              className="relative z-10 size-7 bg-background pointer-events-auto hover:border-primary/40 hover:bg-background hover:text-primary"
              aria-label={`View semester ${phase.name}`}
              nativeButton={false}
              render={<Link href={href} prefetch={false} />}
            >
              <EyeIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
