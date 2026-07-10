"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PencilIcon, PlusIcon } from "lucide-react";
import { CreateFinalExamDialog } from "@/components/manager/classes/create-final-exam-dialog";
import { EditFinalExamDialog } from "@/components/manager/classes/edit-final-exam-dialog";
import { EditStudentFinalExamGradeSheet } from "@/components/manager/classes/edit-student-finalexam-grade-sheet";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CLASS_FINAL_EXAM_TABLE_LIMITS } from "@/lib/constants/manager-class-final-exam-display";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";

type ClassFinalExamSectionProps = {
  classId: string;
  className: string;
  finalExam: ManagerClassFinalExamRow | null;
  studentGrades: ManagerStudentFinalExamGradeRow[];
  onFinalExamChange: (exam: ManagerClassFinalExamRow | null) => void;
  onStudentGradesChange: (grades: ManagerStudentFinalExamGradeRow[]) => void;
};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function formatDateTimeCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function ClassFinalExamSection({
  classId,
  className,
  finalExam,
  studentGrades,
  onFinalExamChange,
  onStudentGradesChange,
}: ClassFinalExamSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditExamOpen, setIsEditExamOpen] = useState(false);
  const [selectedStudentGrade, setSelectedStudentGrade] =
    useState<ManagerStudentFinalExamGradeRow | null>(null);
  const [isEditGradeOpen, setIsEditGradeOpen] = useState(false);

  const sortedStudentGrades = useMemo(
    () =>
      [...studentGrades].sort((left, right) =>
        left.full_name.localeCompare(right.full_name)
      ),
    [studentGrades]
  );

  const handleCreateFinalExam = (
    exam: ManagerClassFinalExamRow,
    grades: ManagerStudentFinalExamGradeRow[]
  ) => {
    onFinalExamChange(exam);
    onStudentGradesChange(grades);
  };

  const handleUpdateFinalExam = (exam: ManagerClassFinalExamRow) => {
    onFinalExamChange(exam);
  };

  const handleOpenEditGrade = (row: ManagerStudentFinalExamGradeRow) => {
    setSelectedStudentGrade(row);
    setIsEditGradeOpen(true);
  };

  const handleUpdateStudentGrade = (updated: ManagerStudentFinalExamGradeRow) => {
    onStudentGradesChange(
      studentGrades.map((row) => (row.id === updated.id ? updated : row))
    );
    setSelectedStudentGrade(updated);
  };

  return (
    <TooltipProvider>
      {isCreateOpen ? (
        <CreateFinalExamDialog
          open
          onOpenChange={setIsCreateOpen}
          classId={classId}
          className={className}
          onFinalExamCreated={handleCreateFinalExam}
        />
      ) : null}

      {isEditExamOpen && finalExam ? (
        <EditFinalExamDialog
          open
          onOpenChange={setIsEditExamOpen}
          finalExam={finalExam}
          className={className}
          onFinalExamUpdated={handleUpdateFinalExam}
        />
      ) : null}

      {isEditGradeOpen ? (
        <EditStudentFinalExamGradeSheet
          open
          onOpenChange={setIsEditGradeOpen}
          studentGrade={selectedStudentGrade}
          maxGrade={finalExam?.max_grade ?? null}
          onStudentGradeUpdated={handleUpdateStudentGrade}
        />
      ) : null}

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Final exam</CardTitle>
          <p className="text-sm text-muted-foreground">
            One final exam per class with a grade row per enrolled student.
          </p>
          <CardAction className="self-center">
            {!finalExam ? (
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Create final exam
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit final exam"
                onClick={() => setIsEditExamOpen(true)}
              >
                <PencilIcon />
              </Button>
            )}
          </CardAction>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {!finalExam ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No final exam has been created for {className} yet.
            </p>
          ) : (
            <>
              <div className="border-b bg-muted/20 px-4 pt-2 pb-3">
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Title
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{finalExam.title}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Max grade
                    </dt>
                    <dd className="mt-1 text-sm tabular-nums">
                      {finalExam.max_grade ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Due date
                    </dt>
                    <dd className="mt-1 text-sm">
                      {formatDateTimeCell(finalExam.due_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm">
                      {formatDateTimeCell(finalExam.created_at)}
                    </dd>
                  </div>
                </dl>
                {finalExam.description ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {finalExam.description}
                  </p>
                ) : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Grade</th>
                      <th className="px-4 py-3 font-medium">Submitted</th>
                      <th className="px-4 py-3 font-medium">Graded</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudentGrades.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No students enrolled in this class yet.
                        </td>
                      </tr>
                    ) : (
                      sortedStudentGrades.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="max-w-[12rem] px-4 py-3">
                            <TruncatedCell
                              value={row.full_name}
                              maxLength={CLASS_FINAL_EXAM_TABLE_LIMITS.fullName}
                              className="font-medium"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <StudentTaskStatusBadge status={row.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                            {row.grade ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {formatDateTimeCell(row.submitted_at)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {formatDateTimeCell(row.graded_at)}
                          </td>
                          <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                            <TruncatedCell
                              value={row.notes ?? "—"}
                              maxLength={CLASS_FINAL_EXAM_TABLE_LIMITS.notes}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit final exam for ${row.full_name}`}
                                onClick={() => handleOpenEditGrade(row)}
                              >
                                <PencilIcon />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
