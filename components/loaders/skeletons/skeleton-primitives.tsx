import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ClassNameProps = {
  className?: string;
};

/** Page title + optional subtitle placeholders. */
export function SkeletonPageHeader({ className }: ClassNameProps) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** Filter / toolbar row (pills, select, action button). */
export function SkeletonFilterBar({ className }: ClassNameProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 @lg/panel:flex-row @lg/panel:flex-wrap @lg/panel:items-center @lg/panel:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-9 w-28 shrink-0 self-start @lg/panel:self-auto" />
    </div>
  );
}

/** Compact stat / KPI strip. */
export function SkeletonStatRow({
  count = 4,
  className,
}: ClassNameProps & { count?: number }) {
  return (
    <div
      className={cn(
        "grid gap-3 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2 rounded-xl border p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

type SkeletonTableProps = ClassNameProps & {
  rows?: number;
  columns?: number;
};

/** Bordered table placeholder for list pages. */
export function SkeletonTable({
  rows = 6,
  columns = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border", className)}>
      <div className="flex flex-wrap gap-6 border-b bg-muted/40 px-4 py-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex flex-wrap items-center gap-6 px-4 py-3"
          >
            {Array.from({ length: columns }, (_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn("h-4", colIndex === 0 ? "w-32" : "w-20")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type SkeletonCardGridProps = ClassNameProps & {
  count?: number;
};

/** Card grid for gallery / workshop-style lists. */
export function SkeletonCardGrid({
  count = 6,
  className,
}: SkeletonCardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-3",
        className
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** FullCalendar / week grid placeholder. */
export function SkeletonCalendar({ className }: ClassNameProps) {
  return (
    <div className={cn("space-y-3 rounded-xl border p-3", className)}>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Detail page: sidebar meta + main body blocks. */
export function SkeletonDetailSections({ className }: ClassNameProps) {
  return (
    <div
      className={cn(
        "grid gap-6 @2xl/panel:grid-cols-[minmax(0,280px)_minmax(0,1fr)]",
        className
      )}
    >
      <div className="space-y-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-4 h-9 w-full" />
      </div>
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/** Form-ish settings / compose block. */
export function SkeletonFormPanel({ className }: ClassNameProps) {
  return (
    <div className={cn("max-w-xl space-y-4 rounded-xl border p-6", className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}
