"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditPhaseDialog } from "@/components/manager/phases/edit-phase-dialog";
import { SemesterClassesSection } from "@/components/manager/phases/semester-classes-section";
import { SemesterStatusBadge } from "@/components/manager/phases/semester-status-badge";
import { SemesterStudentsSection } from "@/components/manager/phases/semester-students-section";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";
import { ROUTES } from "@/lib/constants/routes";

type SemesterDetailsPanelProps = {
  semester: ManagerSemesterRow;
  initialStudents: ManagerStudentSemesterRow[];
  initialAvailableStudents: ManagerStudentRow[];
  initialClasses: ManagerSemesterClassRow[];
  initialAvailableClasses: ManagerSemesterClassRow[];
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null | ReactNode;
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
  semester: initialSemester,
  initialStudents,
  initialAvailableStudents,
  initialClasses,
  initialAvailableClasses,
}: SemesterDetailsPanelProps) {
  const router = useRouter();
  const [semester, setSemester] = useState<ManagerSemesterRow>(initialSemester);
  const [prevSemester, setPrevSemester] =
    useState<ManagerSemesterRow>(initialSemester);
  const [editOpen, setEditOpen] = useState(false);
  const [exportedAt, setExportedAt] = useState<Date | null>(null);

  if (initialSemester !== prevSemester) {
    setPrevSemester(initialSemester);
    setSemester(initialSemester);
  }

  const createdText = useMemo(
    () => format(new Date(semester.created_at), "MMM d, yyyy 'at' h:mm a"),
    [semester.created_at]
  );

  return (
    <div className="flex flex-col gap-6" data-print-root="semester-details">
      <Breadcrumb className="print:hidden">
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

      {exportedAt ? (
        <p className="hidden text-sm text-muted-foreground print:block">
          Exported {format(exportedAt, "MMM d, yyyy 'at' h:mm a")}
        </p>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/50 py-3">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <CardTitle className="text-xl">{semester.name}</CardTitle>
            <SemesterStatusBadge status={semester.status} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() => setEditOpen(true)}
          >
            <PencilIcon className="size-4" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Number of courses" value={semester.nb_courses} />
            <DetailField label="Amount" value={`$${semester.amount}`} />
            <DetailField
              label="Status"
              value={<SemesterStatusBadge status={semester.status} />}
            />
            <DetailField label="Created" value={createdText} />
          </dl>
        </CardContent>
      </Card>

      <SemesterStudentsSection
        semesterId={semester.id}
        semesterName={semester.name}
        initialStudents={initialStudents}
        initialAvailableStudents={initialAvailableStudents}
        onStudentsChanged={() => router.refresh()}
      />

      <SemesterClassesSection
        semesterId={semester.id}
        semesterName={semester.name}
        initialClasses={initialClasses}
        initialAvailableClasses={initialAvailableClasses}
        onExportPdf={() => setExportedAt(new Date())}
        onClassesChanged={() => router.refresh()}
      />

      <EditPhaseDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        semester={semester}
        onSemesterUpdated={(updated) => {
          setSemester(updated);
          router.refresh();
        }}
      />
    </div>
  );
}
