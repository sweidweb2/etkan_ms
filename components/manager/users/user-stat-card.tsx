import { cn } from "@/lib/utils";

type UserStatCardProps = {
  label: string;
  value: number;
  accentClassName: string;
};

export function UserStatCard({
  label,
  value,
  accentClassName,
}: UserStatCardProps) {
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
