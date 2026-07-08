type AnalyticsChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function AnalyticsChartCard({
  title,
  description,
  children,
  className,
}: AnalyticsChartCardProps) {
  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="rounded-xl border p-4">{children}</div>
    </div>
  );
}
