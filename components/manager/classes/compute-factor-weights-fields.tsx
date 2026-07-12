"use client";

import { FieldLabel } from "@/components/auth/field-label";
import { Input } from "@/components/ui/input";
import { parseWeight } from "@/lib/compute/custom-compute-form-utils";
import { cn } from "@/lib/utils";

export type ComputeFactorWeightsValues = {
  tasks_weight: string;
  final_exam_weight: string;
};

type ComputeFactorWeightsFieldsProps = {
  idPrefix: string;
  values: ComputeFactorWeightsValues;
  onChange: (values: ComputeFactorWeightsValues) => void;
  error?: string | null;
};

export function ComputeFactorWeightsFields({
  idPrefix,
  values,
  onChange,
  error,
}: ComputeFactorWeightsFieldsProps) {
  const factorTotal =
    parseWeight(values.tasks_weight) + parseWeight(values.final_exam_weight);
  const isTotalValid = Math.abs(factorTotal - 100) <= 0.001;

  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <h3 className="text-sm font-medium">Compute weights</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Tasks and final exam must total 100%. These weights apply to this compute
        only.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-tasks-weight`}
            label="Tasks weight"
            hint="Percent"
          />
          <Input
            id={`${idPrefix}-tasks-weight`}
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={values.tasks_weight}
            onChange={(event) =>
              onChange({ ...values, tasks_weight: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={`${idPrefix}-final-exam-weight`}
            label="Final exam weight"
            hint="Percent"
          />
          <Input
            id={`${idPrefix}-final-exam-weight`}
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={values.final_exam_weight}
            onChange={(event) =>
              onChange({ ...values, final_exam_weight: event.target.value })
            }
          />
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Factor total:{" "}
        <span
          className={cn(
            "font-medium tabular-nums",
            isTotalValid ? "text-foreground" : "text-destructive"
          )}
        >
          {factorTotal}%
        </span>
      </p>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
