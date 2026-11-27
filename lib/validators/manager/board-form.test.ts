import { describe, expect, it } from "vitest";
import {
  createSaveBoardSchema,
  parseSaveBoardFormData,
} from "@/lib/validators/manager/board-form";

const schema = createSaveBoardSchema({
  unassignedId: "unassigned",
  columnNotFoundMessage: "Team not found.",
  itemNotFoundMessage: "Semester not found.",
});

const semesterA = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const teamId = "b1b2b3b4-d5e6-7890-abcd-ef1234567890";

describe("parseSaveBoardFormData", () => {
  it("parses a valid columns payload", () => {
    const formData = new FormData();
    formData.set(
      "columns",
      JSON.stringify({
        unassigned: [semesterA],
        [teamId]: [],
      })
    );

    expect(parseSaveBoardFormData(schema, formData)).toEqual({
      success: true,
      data: {
        columns: {
          unassigned: [semesterA],
          [teamId]: [],
        },
      },
    });
  });

  it("rejects non-uuid item ids", () => {
    const formData = new FormData();
    formData.set(
      "columns",
      JSON.stringify({
        unassigned: ["not-a-uuid"],
      })
    );

    const result = parseSaveBoardFormData(schema, formData);
    expect(result.success).toBe(false);
  });

  it("treats invalid JSON as empty columns object", () => {
    const formData = new FormData();
    formData.set("columns", "{broken");

    expect(parseSaveBoardFormData(schema, formData)).toEqual({
      success: true,
      data: { columns: {} },
    });
  });
});
