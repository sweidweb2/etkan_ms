type ReportEmptyStateProps = {
  title?: string;
  description?: string;
};

export function ReportEmptyState({
  title = "No rows to display",
  description = "Adjust your filters or select a different report.",
}: ReportEmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
