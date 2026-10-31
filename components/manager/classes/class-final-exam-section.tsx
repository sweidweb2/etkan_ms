"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ClipboardListIcon, PencilIcon, PlusIcon, UsersIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { CreateFinalExamDialog } from "@/components/manager/classes/create-final-exam-dialog";
import { EditFinalExamDialog } from "@/components/manager/classes/edit-final-exam-dialog";
import { EditStudentFinalExamGradeSheet } from "@/components/manager/classes/edit-student-finalexam-grade-sheet";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentTaskStatusBadge } from "@/components/manager/students/student-task-status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { CLASS_FINAL_EXAM_TABLE_LIMITS } from "@/lib/constants/manager-class-final-exam-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
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
  hasComputedGrades?: boolean;
  lockedUserIds?: string[];
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
  hasComputedGrades = false,
  lockedUserIds = [],
}: ClassFinalExamSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditExamOpen, setIsEditExamOpen] = useState(false);
  const [selectedStudentGrade, setSelectedStudentGrade] =
    useState<ManagerStudentFinalExamGradeRow | null>(null);
  const [isEditGradeOpen, setIsEditGradeOpen] = useState(false);
  const lockedUserIdSet = useMemo(() => new Set(lockedUserIds), [lockedUserIds]);
  const selectedGradeLocked = selectedStudentGrade
    ? lockedUserIdSet.has(selectedStudentGrade.student_id)
    : false;

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
          dueDate={finalExam?.due_date ?? null}
          onStudentGradeUpdated={handleUpdateStudentGrade}
          readOnly={selectedGradeLocked}
        />
      ) : null}

      <ClassTabCollapsibleSection
        title="Final exam"
        description="One final exam per class with a grade row per enrolled student."
        storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_FINAL_EXAM}
        defaultOpen
        action={
          !finalExam ? (
            <Can permission={PERMISSIONS.FINAL_EXAMS_CREATE}>
              {hasComputedGrades ? (
                <Tooltip>
                  <TooltipTrigger
                    render={<span className="inline-flex" tabIndex={0} />}
                  >
                    <Button type="button" disabled>
                      <PlusIcon data-icon="inline-start" />
                      Create final exam
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Create final exam
                </Button>
              )}
            </Can>
          ) : (
            <Can permission={PERMISSIONS.FINAL_EXAMS_UPDATE}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit final exam"
                onClick={() => setIsEditExamOpen(true)}
              >
                <PencilIcon />
              </Button>
            </Can>
          )
        }
      >
        {!finalExam ? (
          <div className="px-4 py-3">
            <EmptyState
              size="sm"
              icon={ClipboardListIcon}
              title="No final exam yet"
              description={`No final exam has been created for ${className} yet.`}
            />
          </div>
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

            {sortedStudentGrades.length === 0 ? (
              <div className="px-4 py-3">
                <EmptyState
                  size="sm"
                  icon={UsersIcon}
                  title="No students yet"
                  description="No students enrolled in this class yet."
                />
              </div>
            ) : (
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
                    {sortedStudentGrades.map((row) => (
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
                            <Can permission={PERMISSIONS.FINAL_EXAMS_UPDATE_STUDENT}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit final exam for ${row.full_name}`}
                                onClick={() => handleOpenEditGrade(row)}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </ClassTabCollapsibleSection>
    </TooltipProvider>
  );
}
