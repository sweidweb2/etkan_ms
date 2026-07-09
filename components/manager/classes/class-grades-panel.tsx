"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";
import {
  getManagerClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";

type ClassGradesPanelProps = {
  classId: string;
};

export function ClassGradesPanel({ classId }: ClassGradesPanelProps) {
  const classRow = getManagerClassPreview(classId);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
              Manage classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassDetailRoute(classId)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Grades</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-xl">Class grades</CardTitle>
          <p className="text-sm text-muted-foreground">
            Grade summaries for {classRow.name}. More views will be added here
            later.
          </p>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Task and session grade summaries coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
