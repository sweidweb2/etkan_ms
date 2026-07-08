import { cn } from "@/lib/utils";

export function AnalyticsChartPlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-[14rem] w-full rounded-lg bg-muted/20",
        className
      )}
    />
  );
}
