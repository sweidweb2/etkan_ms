import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldErrorProps = {
  children: ReactNode;
  className?: string;
};

export function FieldError({ children, className }: FieldErrorProps) {
  return (
    <p
      data-slot="field-error"
      className={cn(
        "text-[11px] font-normal leading-tight text-destructive",
        className
      )}
    >
      {children}
    </p>
  );
}
