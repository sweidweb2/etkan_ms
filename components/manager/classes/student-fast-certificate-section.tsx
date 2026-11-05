"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FileTextIcon, ZapIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFastCertificateSheetModel } from "@/lib/manager/build-fast-certificate-sheet-model";
import { DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS } from "@/lib/constants/manager-class-grade-defaults";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { formatCourseGradeValue } from "@/lib/constants/manager-student-course-grade-display";
import {
  buildDefaultTaskWeights,
  buildFactorWeightsFormFromClassWeights,
  parseWeight,
  validateFactorWeights,
  validateTaskWeights,
  type FactorWeightsForm,
} from "@/lib/compute/custom-compute-form-utils";
import {
  areFastCertificateFactorWeightsEditable,
  computeFastCertificateEffectiveFactors,
  resolveFastCertificateAvailability,
  resolveFastCertificateFactorDefaults,
} from "@/lib/manager/fast-certificate-grade";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

type StudentFastCertificateSectionProps = {
  classRow: ManagerClassRow;
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
  finalExamGrade: number | null;
  wrapInCollapsible?: boolean;
};

function formatGrade(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

export function StudentFastCertificateContent({
  classRow,
  student,
  gradeRow,
  detail,
  classTasks,
  finalExam,
  finalExamGrade,
}: StudentFastCertificateSectionProps) {
  const availability = useMemo(
    () =>
      resolveFastCertificateAvailability({
        detailTasks: detail.tasks,
        classTasks,
        finalExam,
        finalExamGrade,
        finalExamMaxGrade: finalExam?.max_grade ?? null,
      }),
    [classTasks, detail.tasks, finalExam, finalExamGrade]
  );

  const factorDefaults = useMemo(
    () =>
      resolveFastCertificateFactorDefaults(
        availability,
        DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.tasks_weight,
        DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.final_exam_weight
      ),
    [availability]
  );

  const factorEditability = useMemo(
    () => areFastCertificateFactorWeightsEditable(availability),
    [availability]
  );

  const defaultFactorForm = useMemo(
    () =>
      buildFactorWeightsFormFromClassWeights({
        class_id: classRow.id,
        tasks_weight: factorDefaults.tasksWeight,
        final_exam_weight: factorDefaults.finalExamWeight,
      }),
    [classRow.id, factorDefaults.finalExamWeight, factorDefaults.tasksWeight]
  );

  const gradedTaskRefs = useMemo(
    () => availability.gradedTasks.map((task) => ({ id: task.taskId })),
    [availability.gradedTasks]
  );

  const defaultTaskWeights = useMemo(
    () => buildDefaultTaskWeights(gradedTaskRefs),
    [gradedTaskRefs]
  );

  const [taskWeights, setTaskWeights] =
    useState<Record<string, string>>(defaultTaskWeights);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setTaskWeights(defaultTaskWeights);
  }, [defaultTaskWeights]);

  const {
    register,
    watch,
    reset,
    formState: { errors },
  } = useForm<FactorWeightsForm>({
    defaultValues: defaultFactorForm,
  });

  useEffect(() => {
    reset(defaultFactorForm);
  }, [defaultFactorForm, reset]);

  const factorValues = watch();
  const factorTotal = useMemo(
    () =>
      parseWeight(factorValues.tasks_weight ?? "") +
      parseWeight(factorValues.final_exam_weight ?? ""),
    [factorValues.final_exam_weight, factorValues.tasks_weight]
  );

  const taskTotal = useMemo(
    () =>
      availability.gradedTasks.reduce(
        (sum, task) => sum + parseWeight(taskWeights[task.taskId] ?? "0"),
        0
      ),
    [availability.gradedTasks, taskWeights]
  );

  const factorWeights = useMemo(
    () => ({
      tasksWeight: parseWeight(factorValues.tasks_weight ?? "0"),
      finalExamWeight: parseWeight(factorValues.final_exam_weight ?? "0"),
    }),
    [factorValues.final_exam_weight, factorValues.tasks_weight]
  );

  const effective = useMemo(
    () =>
      computeFastCertificateEffectiveFactors({
        availability,
        factorWeights,
        taskWeights,
      }),
    [availability, factorWeights, taskWeights]
  );

  const factorValidationError = factorEditability.tasks
    ? validateFactorWeights({
        ...factorValues,
        group_weight: "0",
        attendee_weight: "0",
      })
    : null;

  const taskValidationError =
    gradedTaskRefs.length > 0
      ? validateTaskWeights(gradedTaskRefs, taskWeights)
      : null;

  const canExport =
    availability.canCompute &&
    effective.previewTotal != null &&
    !factorValidationError &&
    !taskValidationError;

  const totalLabel =
    effective.previewTotal == null
      ? "Not available"
      : `${formatCourseGradeValue(effective.previewTotal)} (preview)`;

  async function handleExportPdf() {
    if (!canExport || effective.previewTotal == null) {
      showErrorToast("Unable to export certificate with the current inputs.");
      return;
    }

    setIsExporting(true);

    try {
      const model = buildFastCertificateSheetModel({
        student,
        classRow,
        detail,
        classTasks,
        finalExam,
        finalExamGrade,
        factorWeights: {
          tasksWeight: factorWeights.tasksWeight,
          finalExamWeight: factorWeights.finalExamWeight,
        },
        taskWeights,
      });

      const { downloadStudentGradeSheetPdf } = await import(
        "@/lib/export/student-grade-sheet-export"
      );
      downloadStudentGradeSheetPdf(model, totalLabel, "horizontal");
      showSuccessToast("Certificate exported as PDF.");
    } catch {
      showErrorToast("Unable to export certificate as PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/60 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <ZapIcon className="size-4" />
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              Missing or ungraded tasks and final exam grades are excluded from
              this certificate. They are not counted in the weight distribution
              or course total.
            </p>
            {gradeRow.missing_items.length > 0 ? (
              <div>
                <p className="font-medium text-foreground">Excluded inputs</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {gradeRow.missing_items.map((item) => (
                    <li key={`${item.kind}-${item.label}`}>{item.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Grade factor weights</h4>
            <p className="text-xs text-muted-foreground">
              {availability.hasFinalExamRecord
                ? availability.hasGradedFinalExam
                  ? "Tasks and final exam must total 100% when both are available."
                  : "Final exam is unavailable, so tasks use 100% of the factor weights."
                : "No final exam exists for this class, so tasks use 100% and final exam uses 0%."}
            </p>
          </div>

          <div className="grid gap-4 @xl/panel:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="fast-cert-tasks-weight"
                label="Tasks weight"
                hint="Percent"
              />
              <Input
                id="fast-cert-tasks-weight"
                type="number"
                min={0}
                max={100}
                step={0.5}
                readOnly={!factorEditability.tasks}
                aria-invalid={!!errors.tasks_weight}
                {...register("tasks_weight")}
              />
            </div>
            {availability.hasFinalExamRecord && availability.hasGradedFinalExam ? (
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="fast-cert-final-exam-weight"
                  label="Final exam weight"
                  hint="Percent"
                />
                <Input
                  id="fast-cert-final-exam-weight"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  readOnly={!factorEditability.finalExam}
                  aria-invalid={!!errors.final_exam_weight}
                  {...register("final_exam_weight")}
                />
              </div>
            ) : null}
          </div>

          {factorEditability.tasks ? (
            <p className="text-sm text-muted-foreground">
              Factor total:{" "}
              <span
                className={cn(
                  "font-medium tabular-nums",
                  Math.abs(factorTotal - 100) > 0.001
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {factorTotal}%
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Effective factor split:{" "}
              <span className="font-medium tabular-nums text-foreground">
                Tasks {factorDefaults.tasksWeight}% · Final exam{" "}
                {factorDefaults.finalExamWeight}%
              </span>
            </p>
          )}
        </div>

        {availability.gradedTasks.length > 0 ? (
          <div className="space-y-4 border-t pt-6">
            <div>
              <h4 className="text-sm font-semibold">Per-task weights</h4>
              <p className="text-xs text-muted-foreground">
                Only graded tasks are shown. Their weights must total 100%.
              </p>
            </div>

            <div className="grid gap-3 @lg/panel:grid-cols-2">
              {availability.gradedTasks.map((task) => (
                <div
                  key={task.taskId}
                  className="flex flex-col gap-2 rounded-xl border bg-muted/15 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.sessionLabel ?? "—"} · grade {task.grade} /{" "}
                      {task.maxGrade}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={taskWeights[task.taskId] ?? ""}
                    onChange={(event) => {
                      setTaskWeights((current) => ({
                        ...current,
                        [task.taskId]: event.target.value,
                      }));
                    }}
                    aria-label={`Weight for ${task.title}`}
                  />
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              Task total:{" "}
              <span
                className={cn(
                  "font-medium tabular-nums",
                  Math.abs(taskTotal - 100) > 0.001
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {taskTotal}%
              </span>
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border bg-muted/20 p-4">
          <h4 className="text-sm font-semibold">Preview summary</h4>
          <dl className="mt-3 grid gap-3 text-sm @lg/panel:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Tasks grade</dt>
              <dd className="font-medium tabular-nums">
                {formatGrade(effective.tasksGrade)}
              </dd>
            </div>
            {availability.hasGradedFinalExam ? (
              <div>
                <dt className="text-muted-foreground">Final exam grade</dt>
                <dd className="font-medium tabular-nums">
                  {formatGrade(effective.finalExamGrade)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Course total</dt>
              <dd className="font-medium tabular-nums">
                {effective.previewTotal == null
                  ? "—"
                  : formatGrade(effective.previewTotal)}
              </dd>
            </div>
          </dl>
          {!availability.canCompute ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Add at least one graded task or final exam grade to export a
              certificate.
            </p>
          ) : null}
          {factorValidationError ? (
            <p className="mt-3 text-sm text-destructive">
              {factorValidationError}
            </p>
          ) : null}
          {taskValidationError ? (
            <p className="mt-3 text-sm text-destructive">{taskValidationError}</p>
          ) : null}
        </div>

        <div className="flex justify-end border-t pt-4">
          <Can permission={PERMISSIONS.GRADES_EXPORT_FAST_CERTIFICATE}>
            <Button
              type="button"
              disabled={!canExport || isExporting}
              onClick={handleExportPdf}
            >
              {isExporting ? (
                <InlineSpinner />
              ) : (
                <FileTextIcon data-icon="inline-start" />
              )}
              Export certificate PDF
            </Button>
          </Can>
        </div>
    </div>
  );
}

export function StudentFastCertificateSection({
  wrapInCollapsible = true,
  ...props
}: StudentFastCertificateSectionProps) {
  const content = <StudentFastCertificateContent {...props} />;

  if (!wrapInCollapsible) {
    return content;
  }

  return (
    <ClassTabCollapsibleSection
      title="Fast certificate"
      description="Export a certificate using temporary weights, even when the class or grade inputs are incomplete."
      defaultOpen={false}
    >
      <div className="p-5">{content}</div>
    </ClassTabCollapsibleSection>
  );
}
