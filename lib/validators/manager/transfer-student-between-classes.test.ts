import { describe, expect, it } from "vitest";
import { transferStudentBetweenClassesSchema } from "@/lib/validators/manager/transfer-student-between-classes";

const studentProfileId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const fromClassId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const toClassId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("transferStudentBetweenClassesSchema", () => {
  it("rejects transferring to the same class", () => {
    const parsed = transferStudentBetweenClassesSchema.safeParse({
      student_profile_id: studentProfileId,
      from_class_id: fromClassId,
      to_class_id: fromClassId,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid transfer payload", () => {
    const parsed = transferStudentBetweenClassesSchema.safeParse({
      student_profile_id: studentProfileId,
      from_class_id: fromClassId,
      to_class_id: toClassId,
    });

    expect(parsed.success).toBe(true);
  });
});
