import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldLabelProps = {
  htmlFor: string;
  label: string;
  hint: string;
  className?: string;
};

export function FieldLabel({ htmlFor, label, hint, className }: FieldLabelProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5",
        className
      )}
    >
      <Label htmlFor={htmlFor}>{label}</Label>
      <span className="text-xs font-normal text-muted-foreground">{hint}</span>
    </div>
  );
}
