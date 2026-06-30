import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type InlineSpinnerProps = {
  className?: string;
};

export function InlineSpinner({ className }: InlineSpinnerProps) {
  return (
    <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />
  );
}
