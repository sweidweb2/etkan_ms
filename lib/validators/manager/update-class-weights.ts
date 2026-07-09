import { z } from "zod";

function parseWeight(value: string, fieldLabel: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false as const, message: `${fieldLabel} is required.` };
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return { ok: false as const, message: `${fieldLabel} must be a valid number.` };
  }

  if (parsed < 0 || parsed > 100) {
    return { ok: false as const, message: `${fieldLabel} must be between 0 and 100.` };
  }

  return { ok: true as const, value: parsed };
}

export const updateClassWeightsSchema = z
  .object({
    group_weight: z.string(),
    final_exam_weight: z.string(),
    tasks_weight: z.string(),
    attendee_weight: z.string(),
  })
  .superRefine((values, ctx) => {
    const parsedWeights = [
      ["group_weight", "Group weight", values.group_weight],
      ["final_exam_weight", "Final exam weight", values.final_exam_weight],
      ["tasks_weight", "Tasks weight", values.tasks_weight],
      ["attendee_weight", "Attendee weight", values.attendee_weight],
    ] as const;

    let total = 0;

    for (const [field, label, value] of parsedWeights) {
      const result = parseWeight(value, label);
      if (!result.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: result.message,
        });
        continue;
      }

      total += result.value;
    }

    if (Math.abs(total - 100) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attendee_weight"],
        message: "All weights must add up to 100%.",
      });
    }
  });

export type UpdateClassWeightsInput = z.infer<typeof updateClassWeightsSchema>;
