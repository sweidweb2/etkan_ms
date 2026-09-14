"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { useMemo, useState } from "react";
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
import { SemesterPaymentPhasesSection } from "@/components/manager/phases/semester-payment-phases-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";
import type { ManagerSemesterPaymentPhaseRow } from "@/types/manager-semester-payment-phase";

type SemesterDetailsPanelProps = {
  semester: ManagerSemesterRow;
  initialClasses: ManagerSemesterClassRow[];
  initialPaymentPhases: ManagerSemesterPaymentPhaseRow[];
};


export function SemesterDetailsPanel({
  semester: initialSemester,
  initialClasses,
  initialPaymentPhases,
}: SemesterDetailsPanelProps) {
  const [semester, setSemester] = useState<ManagerSemesterRow>(initialSemester);
  const [prevSemester, setPrevSemester] =
    useState<ManagerSemesterRow>(initialSemester);
  const [editOpen, setEditOpen] = useState(false);

  if (initialSemester !== prevSemester) {
    setPrevSemester(initialSemester);
    setSemester(initialSemester);
  }

  const createdText = useMemo(
    () => format(new Date(semester.created_at), "MMM d, yyyy 'at' h:mm a"),
    [semester.created_at]
  );

  return (
    <div className="flex flex-col gap-6">
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

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{semester.name}</CardTitle>
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
            <DetailField label="Created" value={createdText} />
          </dl>
        </CardContent>
      </Card>

      <SemesterClassesSection
        semesterName={semester.name}
        initialClasses={initialClasses}
      />

      <SemesterPaymentPhasesSection
        semesterName={semester.name}
        initialPhases={initialPaymentPhases}
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
