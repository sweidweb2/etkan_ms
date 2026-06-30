"use client";

import { Oval } from "react-loader-spinner";
import { cn } from "@/lib/utils";

type PageSpinnerProps = {
  label?: string;
  className?: string;
};

export function PageSpinner({ label = "Loading", className }: PageSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Oval
        height={40}
        width={40}
        color="currentColor"
        secondaryColor="var(--muted-foreground)"
        strokeWidth={3}
        ariaLabel={label}
        visible
      />
      {label ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
