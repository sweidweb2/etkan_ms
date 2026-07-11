import { describe, expect, it } from "vitest";
import { buildClassGroupGradeTrend } from "@/lib/manager/class-group-grade-analytics";
import { SESSION_GROUP_GRADE_LEVELS } from "@/types/manager-session-group-grade";

describe("buildClassGroupGradeTrend", () => {
  it("includes only sessions with a group grade level set", () => {
    const trend = buildClassGroupGradeTrend([
      { nb_order: 1, group_grade_level: SESSION_GROUP_GRADE_LEVELS.LOW },
      { nb_order: 2, group_grade_level: null },
      { nb_order: 3, group_grade_level: SESSION_GROUP_GRADE_LEVELS.HIGH },
    ]);

    expect(trend).toHaveLength(2);
    expect(trend[0]).toMatchObject({
      session_label: "S1",
      group_grade_level: "low",
      group_grade_label: "Low",
      group_grade_index: 1,
    });
    expect(trend[1]).toMatchObject({
      session_label: "S3",
      group_grade_level: "high",
      group_grade_label: "High",
      group_grade_index: 3,
    });
  });

  it("returns an empty trend when no sessions are graded", () => {
    expect(
      buildClassGroupGradeTrend([
        { nb_order: 1, group_grade_level: null },
        { nb_order: 2, group_grade_level: null },
      ])
    ).toEqual([]);
  });
});
