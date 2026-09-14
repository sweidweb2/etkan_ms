import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DetailFieldProps = {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  className?: string;
  valueClassName?: string;
  /** Use monospace for ids, cron expressions, migration names, etc. */
  mono?: boolean;
};

/** Shared dt/dd row for manager detail panels. */
export function DetailField({
  label,
  value,
  children,
  className,
  valueClassName,
  mono = false,
}: DetailFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm text-foreground",
          mono && "font-mono text-xs",
          valueClassName
        )}
      >
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}
