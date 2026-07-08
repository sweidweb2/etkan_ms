"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import { getManagerSemesterPreview } from "@/lib/manager/get-manager-semester-preview";
import { ROUTES } from "@/lib/constants/routes";

type SemesterDetailsPanelProps = {
  semesterId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

export function SemesterDetailsPanel({
  semesterId,
}: SemesterDetailsPanelProps) {
  const [semester, setSemester] = useState<ManagerSemesterRow>(() =>
    getManagerSemesterPreview(semesterId)
  );

  const createdText = useMemo(
    () => format(new Date(semester.created_at), "MMM d, yyyy 'at' h:mm a"),
    [semester.created_at]
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_PHASES}>
              Manage semesters
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{semester.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-xl">{semester.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Number of courses" value={semester.nb_courses} />
            <DetailField label="Amount" value={`$${semester.amount}`} />
            <DetailField label="Created" value={createdText} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

