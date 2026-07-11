import { LockIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
} from "@/lib/constants/manager-class-display";
import { getClassGradesLockedCopy } from "@/lib/manager/class-grades-access";
import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import { cn } from "@/lib/utils";

type ClassGradesLockedSectionProps = {
  status: ClassStatusValue;
};

export function ClassGradesLockedSection({
  status,
}: ClassGradesLockedSectionProps) {
  const copy = getClassGradesLockedCopy(status);
  const statusClassName =
    MANAGER_CLASS_STATUS_BADGE_CLASSES[status] ??
    "bg-muted text-muted-foreground";

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 py-3">
        <CardTitle className="text-xl">Class grades</CardTitle>
      </CardHeader>
      <CardContent className="py-10">
        <div className="mx-auto flex min-h-48 max-w-lg flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <LockIcon className="size-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium">{copy.title}</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {copy.description}
          </p>
          <span
            className={cn(
              "mt-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusClassName
            )}
          >
            {copy.statusLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
