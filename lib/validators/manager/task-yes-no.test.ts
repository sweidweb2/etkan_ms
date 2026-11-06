import { describe, expect, it } from "vitest";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { parseCreateClassTaskFormData } from "@/lib/validators/manager/create-class-task";
import { parseCreateSubjectTaskFormData } from "@/lib/validators/manager/create-subject-task";
import { createEditStudentTaskSchema } from "@/lib/validators/manager/edit-student-task";
import { parseUpdateClassTaskFormData } from "@/lib/validators/manager/update-class-task";
import { parseTaskYesNoFormValue } from "@/lib/validators/manager/task-yes-no";

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const subjectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function classTaskFormData(isYesNo: string | null) {
  const formData = new FormData();
  formData.set("class_id", classId);
  formData.set("title", "Attendance check");
  formData.set("period", "7");
  formData.set("max_grade", "100");
  if (isYesNo !== null) {
    formData.set("is_yes_no", isYesNo);
  }
  return formData;
}

describe("parseTaskYesNoFormValue", () => {
  it("only treats explicit true values as true", () => {
    expect(parseTaskYesNoFormValue("true")).toBe(true);
    expect(parseTaskYesNoFormValue("on")).toBe(true);
    expect(parseTaskYesNoFormValue("false")).toBe(false);
    expect(parseTaskYesNoFormValue(null)).toBe(false);
    expect(parseTaskYesNoFormValue(undefined)).toBe(false);
  });
});

describe("task form parsers", () => {
  it("parses is_yes_no on class task create", () => {
    const yes = parseCreateClassTaskFormData(classTaskFormData("true"));
    const no = parseCreateClassTaskFormData(classTaskFormData("false"));
    const missing = parseCreateClassTaskFormData(classTaskFormData(null));

    expect(yes.success && yes.data.is_yes_no).toBe(true);
    expect(no.success && no.data.is_yes_no).toBe(false);
    expect(missing.success && missing.data.is_yes_no).toBe(false);
  });

  it("parses is_yes_no on class task update", () => {
    const formData = classTaskFormData("true");
    formData.set("id", "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    formData.set("sort_order", "0");

    const parsed = parseUpdateClassTaskFormData(formData);

    expect(parsed.success && parsed.data.is_yes_no).toBe(true);
  });

  it("parses is_yes_no on subject task create", () => {
    const formData = new FormData();
    formData.set("subject_id", subjectId);
    formData.set("title", "Attendance check");
    formData.set("period", "7");
    formData.set("max_grade", "100");
    formData.set("is_yes_no", "true");

    const parsed = parseCreateSubjectTaskFormData(formData);

    expect(parsed.success && parsed.data.is_yes_no).toBe(true);
  });
});

describe("createEditStudentTaskSchema with isYesNo", () => {
  const schema = createEditStudentTaskSchema(100, null, { isYesNo: true });

  it("accepts Not graded, Yes, and No", () => {
    for (const grade of ["", 0, 100, "0", "100"]) {
      expect(
        schema.safeParse({ status: STUDENT_TASK_STATUSES.GRADED, grade }).success
      ).toBe(true);
    }
  });

  it("rejects any other grade", () => {
    const result = schema.safeParse({
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 50,
    });

    expect(result.success).toBe(false);
  });

  it("still allows partial grades on regular tasks", () => {
    const regular = createEditStudentTaskSchema(100, null);

    expect(
      regular.safeParse({ status: STUDENT_TASK_STATUSES.GRADED, grade: 50 })
        .success
    ).toBe(true);
  });
});
