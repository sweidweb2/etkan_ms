"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import { EditClassDialog } from "@/components/manager/classes/edit-class-dialog";
import { ClassAnalyticsSection } from "@/components/manager/classes/class-analytics-section";
import { ClassSessionsSection } from "@/components/manager/classes/class-sessions-section";
import { ClassStudentsSection } from "@/components/manager/classes/class-students-section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getClassSessionCompletionRate,
} from "@/lib/constants/manager-semester-class-progress";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";
import {
  getManagerSemesterDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassDetailsPanelProps = {
  classId: string;
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", className)}>
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

export function ClassDetailsPanel({ classId }: ClassDetailsPanelProps) {
  const [classRow, setClassRow] = useState<ManagerClassRow>(() =>
    getManagerClassPreview(classId)
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  const sessionRate = getClassSessionCompletionRate(classRow);
  const statusLabel =
    CLASS_STATUS_LABELS[classRow.status] ?? classRow.status;
  const statusClassName =
    CLASS_STATUS_BADGE_CLASSES[classRow.status] ??
    "bg-muted text-muted-foreground";

  const createdText = useMemo(
    () => format(new Date(classRow.created_at), "MMM d, yyyy 'at' h:mm a"),
    [classRow.created_at]
  );

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
            <BreadcrumbPage>{classRow.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EditClassDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        classRow={classRow}
        onUpdateClass={setClassRow}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-xl">{classRow.name}</CardTitle>
          <CardAction className="self-center">
            <Button type="button" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit class
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Name" value={classRow.name} />
            <DetailField label="Status">
              <span
                className={cn(
                  "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                  statusClassName
                )}
              >
                {statusLabel}
              </span>
            </DetailField>
            <DetailField label="Subject" value={classRow.subject_name} />
            <DetailField
              label="Subject ID"
              value={classRow.subject_id}
              className="font-mono text-xs"
            />
            <DetailField label="Semester">
              {classRow.semester_id && classRow.semester_name ? (
                <Link
                  href={getManagerSemesterDetailRoute(classRow.semester_id)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {classRow.semester_name}
                </Link>
              ) : (
                "Unlinked"
              )}
            </DetailField>
            <DetailField
              label="Enrollment"
              value={String(classRow.enrollment_count)}
              className="tabular-nums"
            />
            <DetailField
              label="Teachers"
              value={String(classRow.teacher_count)}
              className="tabular-nums"
            />
            <DetailField
              label="Session progress"
              value={`${classRow.completed_sessions}/${classRow.subject_nb_sessions} · ${sessionRate}%`}
              className="tabular-nums"
            />
            <DetailField
              label="Class ID"
              value={classRow.id}
              className="font-mono text-xs"
            />
            <DetailField label="Created" value={createdText} />
          </dl>
        </CardContent>
      </Card>

      <ClassSessionsSection
        classId={classRow.id}
        className={classRow.name}
        onSessionsCountChange={(count) => {
          setClassRow((current) => ({
            ...current,
            subject_nb_sessions: count,
          }));
        }}
      />

      <ClassAnalyticsSection
        classId={classRow.id}
        className={classRow.name}
        enrollmentCount={classRow.enrollment_count}
      />

      <ClassStudentsSection
        classId={classRow.id}
        className={classRow.name}
        onEnrollmentChange={(count) => {
          setClassRow((current) => ({
            ...current,
            enrollment_count: count,
          }));
        }}
      />
    </div>
  );
}
