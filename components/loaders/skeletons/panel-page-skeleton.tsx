import { TopLoaderPendingBridge } from "@/components/loaders/top-loader-pending-bridge";
import {
  SkeletonCalendar,
  SkeletonCardGrid,
  SkeletonDetailSections,
  SkeletonFilterBar,
  SkeletonFormPanel,
  SkeletonPageHeader,
  SkeletonStatRow,
  SkeletonTable,
} from "@/components/loaders/skeletons/skeleton-primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PanelPageSkeletonProps = {
  className?: string;
};

/**
 * Shared panel loading shell. Always mounts TopLoaderPendingBridge so the
 * global top bar stays honest while this fallback is visible.
 */
function PanelSkeletonShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <TopLoaderPendingBridge />
      {children}
    </div>
  );
}

/** List pages: header + filters + table. */
export function PanelListPageSkeleton({ className }: PanelPageSkeletonProps) {
  return (
    <PanelSkeletonShell className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SkeletonPageHeader />
        <Skeleton className="hidden h-9 w-28 sm:block" />
      </div>
      <SkeletonFilterBar />
      <SkeletonTable />
    </PanelSkeletonShell>
  );
}

/** Card / gallery style lists. */
export function PanelCardsPageSkeleton({ className }: PanelPageSkeletonProps) {
  return (
    <PanelSkeletonShell className={className}>
      <SkeletonPageHeader />
      <SkeletonFilterBar />
      <SkeletonCardGrid />
    </PanelSkeletonShell>
  );
}

/** Detail pages: header + meta/body sections. */
export function PanelDetailPageSkeleton({ className }: PanelPageSkeletonProps) {
  return (
    <PanelSkeletonShell className={className}>
      <SkeletonPageHeader />
      <SkeletonDetailSections />
    </PanelSkeletonShell>
  );
}

/** Calendar / schedule pages. */
export function PanelCalendarPageSkeleton({
  className,
}: PanelPageSkeletonProps) {
  return (
    <PanelSkeletonShell className={className}>
      <SkeletonPageHeader />
      <SkeletonFilterBar />
      <SkeletonCalendar />
    </PanelSkeletonShell>
  );
}

/** Dashboard / analytics: stats + content blocks. */
export function PanelDashboardPageSkeleton({
  className,
}: PanelPageSkeletonProps) {
  return (
    <PanelSkeletonShell className={className}>
      <SkeletonPageHeader />
      <SkeletonStatRow />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </PanelSkeletonShell>
  );
}

/** Settings / compose / form-heavy pages. */
export function PanelFormPageSkeleton({ className }: PanelPageSkeletonProps) {
  return (
    <PanelSkeletonShell className={className}>
      <SkeletonPageHeader />
      <SkeletonFormPanel />
    </PanelSkeletonShell>
  );
}

/** Default when page shape is unknown — prefer a typed template when possible. */
export function PanelPageSkeleton({ className }: PanelPageSkeletonProps) {
  return <PanelListPageSkeleton className={className} />;
}
