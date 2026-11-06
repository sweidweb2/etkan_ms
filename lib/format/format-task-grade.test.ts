import { describe, expect, it } from "vitest";
import {
  formatTaskGrade,
  formatTaskMaxGrade,
  formatYesNoGrade,
} from "@/lib/format/format-task-grade";

describe("formatYesNoGrade", () => {
  it("maps 100 to Yes, 0 to No, and null to a dash", () => {
    expect(formatYesNoGrade(100)).toBe("Yes");
    expect(formatYesNoGrade(0)).toBe("No");
    expect(formatYesNoGrade(null)).toBe("—");
  });
});

describe("formatTaskGrade", () => {
  it("shows Yes/No for Yes/No tasks", () => {
    expect(formatTaskGrade({ grade: 100, maxGrade: 100, isYesNo: true })).toBe(
      "Yes"
    );
    expect(formatTaskGrade({ grade: 0, maxGrade: 100, isYesNo: true })).toBe(
      "No"
    );
    expect(
      formatTaskGrade({
        grade: null,
        maxGrade: 100,
        isYesNo: true,
        emptyLabel: "Not done",
      })
    ).toBe("Not done");
  });

  it("keeps grade/max for regular tasks", () => {
    expect(formatTaskGrade({ grade: 18, maxGrade: 20, isYesNo: false })).toBe(
      "18/20"
    );
    expect(formatTaskGrade({ grade: null, maxGrade: 20, isYesNo: false })).toBe(
      "—"
    );
  });
});

describe("formatTaskMaxGrade", () => {
  it("labels Yes/No tasks instead of showing the max", () => {
    expect(formatTaskMaxGrade({ maxGrade: 100, isYesNo: true })).toBe("Yes/No");
    expect(formatTaskMaxGrade({ maxGrade: 20, isYesNo: false })).toBe("20");
    expect(formatTaskMaxGrade({ maxGrade: null, isYesNo: false })).toBe("—");
  });
});
