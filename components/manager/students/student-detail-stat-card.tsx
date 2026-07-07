import { cn } from "@/lib/utils";

type StudentDetailStatCardProps = {
  label: string;
  value: number | string;
  accentClassName: string;
};

export function StudentDetailStatCard({
  label,
  value,
  accentClassName,
}: StudentDetailStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card py-4 pl-4 pr-5 ring-1 ring-foreground/10 border-l-4",
        accentClassName
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}
