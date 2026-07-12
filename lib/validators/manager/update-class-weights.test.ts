import { describe, expect, it } from "vitest";
import { updateClassWeightsSchema } from "@/lib/validators/manager/update-class-weights";

describe("updateClassWeightsSchema", () => {
  it("accepts tasks and final exam weights that total 100", () => {
    const result = updateClassWeightsSchema.safeParse({
      tasks_weight: "60",
      final_exam_weight: "40",
    });

    expect(result.success).toBe(true);
  });

  it("rejects weights that do not total 100", () => {
    const result = updateClassWeightsSchema.safeParse({
      tasks_weight: "70",
      final_exam_weight: "40",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Tasks and final exam weights must add up to 100%."
      );
    }
  });

  it("rejects non-numeric weights", () => {
    const result = updateClassWeightsSchema.safeParse({
      tasks_weight: "abc",
      final_exam_weight: "40",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Tasks weight must be a valid number."
      );
    }
  });

  it("rejects weights outside 0-100", () => {
    const result = updateClassWeightsSchema.safeParse({
      tasks_weight: "110",
      final_exam_weight: "0",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Tasks weight must be between 0 and 100."
      );
    }
  });
});
