"use client";

import Link from "next/link";
import { ChevronRightIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { pickSeededTintClassName } from "@/lib/utils/seeded-tint";
import type { ManagerSemesterRow } from "@/types/manager-phase";

type PhaseCardProps = {
  phase: ManagerSemesterRow;
  onEdit?: (phase: ManagerSemesterRow) => void;
};

export function PhaseCard({ phase, onEdit }: PhaseCardProps) {
  const href = getManagerSemesterDetailRoute(phase.id);

  return (
    <Card className="group relative flex h-full flex-row items-center gap-4 overflow-hidden p-4 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/30 hover:shadow-[0_6px_20px_-8px_rgb(0_0_0/0.18)]">
      <Link
        href={href}
        aria-label={`Open semester ${phase.name}`}
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        prefetch={false}
      />

      <div
        className={cn(
          "pointer-events-none relative z-10 flex h-14 w-16 shrink-0 items-center justify-center rounded-lg ring-1 ring-current/20 ring-inset",
          pickSeededTintClassName(phase.id)
        )}
      >
        <span className="font-mono text-lg font-semibold leading-none tabular-nums tracking-wider">
          {phase.semester_code}
        </span>
      </div>

      <h3
        className="pointer-events-none relative z-10 line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-snug text-balance transition-colors group-hover:text-primary"
        title={phase.name}
      >
        {phase.name}
      </h3>

      <div className="relative z-10 flex shrink-0 items-center gap-1">
        {onEdit ? (
          <Can permission={PERMISSIONS.SEMESTERS_UPDATE}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Edit semester ${phase.name}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit(phase);
              }}
            >
              <PencilIcon className="size-4" />
            </Button>
          </Can>
        ) : null}
        <ChevronRightIcon
          aria-hidden
          className="pointer-events-none size-4 text-muted-foreground transition-[transform,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    </Card>
  );
}
