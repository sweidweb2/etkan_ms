"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { format } from "date-fns";
import { ListTodoIcon } from "lucide-react";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";

type ClassFinalExamStudentSectionProps = {
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
};


function formatGrade(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export function ClassFinalExamStudentSection({
  finalExam,
  studentFinalExamGrade,
}: ClassFinalExamStudentSectionProps) {
  return (
    <ClassTabCollapsibleSection
      title="Final exam"
      description="Final exam details and this student's grade."
    >
      <div className="p-5">
        {!finalExam ? (
          <EmptyState
            size="sm"
            icon={ListTodoIcon}
            title="No final exam"
            description="No final exam created for this class yet."
          />
        ) : (
          <div className="rounded-xl border bg-background">
            <div className="border-b bg-muted/40 px-4 py-3">
              <h4 className="text-sm font-semibold">{finalExam.title}</h4>
              <p className="text-xs text-muted-foreground">
                {finalExam.description ?? "No description available."}
              </p>
            </div>
            <dl className="grid gap-4 px-4 py-4 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-4">
              <DetailField
                label="Max grade"
                value={finalExam.max_grade?.toString() ?? "—"}
              />
              <DetailField
                label="Due date"
                value={
                  finalExam.due_date
                    ? format(new Date(finalExam.due_date), "MMM d, yyyy 'at' h:mm a")
                    : "—"
                }
              />
              <DetailField
                label="Student grade"
                value={
                  studentFinalExamGrade?.grade == null
                    ? "Not graded yet"
                    : formatGrade(studentFinalExamGrade.grade)
                }
              />
              <DetailField label="Status">
                {studentFinalExamGrade ? (
                  <StudentTaskStatusBadge status={studentFinalExamGrade.status} />
                ) : (
                  "—"
                )}
              </DetailField>
            </dl>
          </div>
        )}
      </div>
    </ClassTabCollapsibleSection>
  );
}
