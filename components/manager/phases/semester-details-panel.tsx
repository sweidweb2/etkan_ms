"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { Can } from "@/components/auth/can";
import { EditPhaseDialog } from "@/components/manager/phases/edit-phase-dialog";
import { SemesterClassesSection } from "@/components/manager/phases/semester-classes-section";
import { SemesterStatusBadge } from "@/components/manager/phases/semester-status-badge";
import { SemesterStudentsSection } from "@/components/manager/phases/semester-students-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";

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
  const [semester, setSemester] = useState<ManagerSemesterRow>(initialSemester);
  const [prevSemester, setPrevSemester] =
    useState<ManagerSemesterRow>(initialSemester);
  const [students, setStudents] = useState(initialStudents);
  const [prevStudents, setPrevStudents] = useState(initialStudents);
  const [availableStudents, setAvailableStudents] = useState(
    initialAvailableStudents
  );
  const [prevAvailableStudents, setPrevAvailableStudents] = useState(
    initialAvailableStudents
  );
  const [classes, setClasses] = useState(initialClasses);
  const [prevClasses, setPrevClasses] = useState(initialClasses);
  const [availableClasses, setAvailableClasses] = useState(
    initialAvailableClasses
  );
  const [prevAvailableClasses, setPrevAvailableClasses] = useState(
    initialAvailableClasses
  );
  const [editOpen, setEditOpen] = useState(false);
  const [exportedAt, setExportedAt] = useState<Date | null>(null);

  if (initialSemester !== prevSemester) {
    setPrevSemester(initialSemester);
    setSemester(initialSemester);
  }

  if (initialStudents !== prevStudents) {
    setPrevStudents(initialStudents);
    setStudents(initialStudents);
  }

  if (initialAvailableStudents !== prevAvailableStudents) {
    setPrevAvailableStudents(initialAvailableStudents);
    setAvailableStudents(initialAvailableStudents);
  }

  if (initialClasses !== prevClasses) {
    setPrevClasses(initialClasses);
    setClasses(initialClasses);
  }

  if (initialAvailableClasses !== prevAvailableClasses) {
    setPrevAvailableClasses(initialAvailableClasses);
    setAvailableClasses(initialAvailableClasses);
  }

  const createdText = useMemo(
    () => format(new Date(semester.created_at), "MMM d, yyyy 'at' h:mm a"),
    [semester.created_at]
  );

  const startDateText = useMemo(
    () =>
      semester.start_date
        ? format(new Date(`${semester.start_date}T00:00:00`), "MMM d, yyyy")
        : null,
    [semester.start_date]
  );

  return (
    <div className="flex flex-col gap-6" data-print-root="semester-details">
      <Breadcrumb className="print:hidden">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_SEMESTERS}>
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
          <Can permission={PERMISSIONS.SEMESTERS_UPDATE}>
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
          </Can>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Semester code" value={semester.semester_code} />
            <DetailField label="Number of courses" value={semester.nb_courses} />
            <DetailField label="Amount" value={`$${semester.amount}`} />
            <DetailField label="Start date" value={startDateText} />
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
        initialStudents={students}
        initialAvailableStudents={availableStudents}
        onStudentsChanged={(enrollment, studentProfileId) => {
          setStudents((current) =>
            current.some((row) => row.id === enrollment.id)
              ? current.map((row) =>
                  row.id === enrollment.id ? enrollment : row
                )
              : [...current, enrollment]
          );
          if (studentProfileId) {
            setAvailableStudents((current) =>
              current.filter(
                (row) => row.student_profile_id !== studentProfileId
              )
            );
          }
        }}
      />

      <SemesterClassesSection
        semesterId={semester.id}
        semesterName={semester.name}
        initialClasses={classes}
        initialAvailableClasses={availableClasses}
        onExportPdf={() => setExportedAt(new Date())}
        onClassesChanged={(classRow, connectedClassId, semesterUpdate) => {
          setClasses((current) =>
            current.some((row) => row.id === classRow.id)
              ? current.map((row) => (row.id === classRow.id ? classRow : row))
              : [...current, classRow]
          );
          if (connectedClassId) {
            setAvailableClasses((current) =>
              current.filter((row) => row.id !== connectedClassId)
            );
          }
          if (semesterUpdate) {
            setSemester(semesterUpdate);
          }
        }}
      />

      <EditPhaseDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        semester={semester}
        onSemesterUpdated={(updated) => {
          setSemester(updated);
        }}
      />
    </div>
  );
}
