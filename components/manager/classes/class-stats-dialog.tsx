"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ClassStats = {
  total: number;
  inProgress: number;
  scheduled: number;
  done: number;
  onHold: number;
  studentsWithoutActiveClass: number | null;
};

type ClassStatsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: ClassStats;
};

type CompactStatCardProps = {
  label: string;
  value: number | string;
  accentClassName: string;
};

function CompactStatCard({
  label,
  value,
  accentClassName,
}: CompactStatCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border-l-4 bg-card py-2 pr-2 pl-2.5 ring-1 ring-foreground/10",
        accentClassName
      )}
    >
      <p className="truncate text-xs text-muted-foreground" title={label}>
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function ClassStatsDialog({
  open,
  onOpenChange,
  stats,
}: ClassStatsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Class statistics</DialogTitle>
          <DialogDescription>
            Class counts by status and students without an active class.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <CompactStatCard
            label="Total classes"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <CompactStatCard
            label="In progress"
            value={stats.inProgress}
            accentClassName="border-l-sky-500"
          />
          <CompactStatCard
            label="Scheduled"
            value={stats.scheduled}
            accentClassName="border-l-violet-500"
          />
          <CompactStatCard
            label="Done"
            value={stats.done}
            accentClassName="border-l-emerald-500"
          />
          <CompactStatCard
            label="On hold"
            value={stats.onHold}
            accentClassName="border-l-amber-500"
          />
          <CompactStatCard
            label="No active class"
            value={stats.studentsWithoutActiveClass ?? "…"}
            accentClassName="border-l-rose-500"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
