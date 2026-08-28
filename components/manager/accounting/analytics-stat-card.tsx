import type { LucideIcon } from "lucide-react";

type AnalyticsStatCardProps = {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName?: string;
};

export function AnalyticsStatCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
  valueClassName,
}: AnalyticsStatCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border px-4 py-3">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${iconClassName}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 tabular-nums ${valueClassName ?? "text-xl font-semibold"}`}
        >
          {value}
        </p>
        {description ? (
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
