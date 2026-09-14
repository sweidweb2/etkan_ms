import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DetailFieldProps = {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  className?: string;
  valueClassName?: string;
};

/** Shared dt/dd row for manager detail panels. */
export function DetailField({
  label,
  value,
  children,
  className,
  valueClassName,
}: DetailFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", valueClassName)}>
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}
