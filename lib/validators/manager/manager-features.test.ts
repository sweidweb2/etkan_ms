import { describe, expect, it } from "vitest";
import { parseAddStudentToSemesterFormData } from "@/lib/validators/manager/add-student-to-semester";
import { parseConnectSemesterClassFormData } from "@/lib/validators/manager/connect-semester-class";
import { parseCreateBorrowsFormData } from "@/lib/validators/manager/create-borrows";
import { parseCreateEquipmentFormData } from "@/lib/validators/manager/create-equipment";
import { parseCreatePhaseFormData } from "@/lib/validators/manager/create-phase";
import { parseCreateSessionTaskFormData } from "@/lib/validators/manager/create-session-task";
import { parseUpdateSessionTaskFormData } from "@/lib/validators/manager/update-session-task";
import { parseCreateSubjectFormData } from "@/lib/validators/manager/create-subject";
import { parseEditStudentTaskFormData, createEditStudentTaskSchema } from "@/lib/validators/manager/edit-student-task";
import { createEditStudentFinalExamGradeSchema } from "@/lib/validators/manager/edit-student-finalexam-grade";
import { parseUpdateAttendeeFormData } from "@/lib/validators/manager/update-attendee";
import { parseUpdateEquipmentFormData } from "@/lib/validators/manager/update-equipment";
import { parseUpdateSessionSettingsFormData } from "@/lib/validators/manager/update-session-settings";
import { parseUpdateClassSessionFormData } from "@/lib/validators/manager/update-class-session";
import {
  createClassSessionSchema,
  parseCreateClassSessionFormData,
} from "@/lib/validators/manager/create-class-session";
import { parseRemoveStudentFromClassFormData } from "@/lib/validators/manager/remove-student-from-class";
import { parseTransferSppFormData } from "@/lib/validators/manager/transfer-spp";
import { parseCreateNotificationFormData } from "@/lib/validators/manager/create-notification";
import { parseUpdateNotificationFormData } from "@/lib/validators/manager/update-notification";
import { parseNotificationIdFormData } from "@/lib/validators/manager/notification-id";
import { parseMarkNotificationReadFormData } from "@/lib/validators/manager/mark-notifications-read";

const sampleId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

describe("parseCreateSubjectFormData", () => {
  it("parses valid subject form data", () => {
    const formData = new FormData();
    formData.set("name", "Physics");
    formData.set("syllabus_link", "https://school.edu/syllabus/physics");
    formData.set("reference_link", "");
    formData.set("handout_link", "https://school.edu/handouts/physics");

    const result = parseCreateSubjectFormData(formData);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Physics",
        syllabus_link: "https://school.edu/syllabus/physics",
        reference_link: "",
        handout_link: "https://school.edu/handouts/physics",
        nb_sessions: 0,
      },
    });
  });

  it("rejects invalid syllabus URL", () => {
    const formData = new FormData();
    formData.set("name", "Physics");
    formData.set("syllabus_link", "not-a-url");
    formData.set("reference_link", "");
    formData.set("handout_link", "");

    const result = parseCreateSubjectFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.syllabus_link).toBeDefined();
    }
  });

  it("rejects missing subject name", () => {
    const formData = new FormData();
    formData.set("name", "");

    const result = parseCreateSubjectFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });
});

describe("parseCreatePhaseFormData", () => {
  it("parses valid semester form data", () => {
    const formData = new FormData();
    formData.set("name", "Fall 2026 Core Semester");

    const result = parseCreatePhaseFormData(formData);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Fall 2026 Core Semester",
      },
    });
  });

  it("rejects missing semester name", () => {
    const formData = new FormData();
    formData.set("name", "");

    const result = parseCreatePhaseFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });
});

describe("parseAddStudentToSemesterFormData", () => {
  it("parses valid enrollment form data", () => {
    const formData = new FormData();
    formData.set("semester_id", sampleId);
    formData.set("student_profile_id", sampleId);
    formData.set("status", "pending");

    const result = parseAddStudentToSemesterFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("pending");
      expect(result.data.semester_id).toBe(sampleId);
    }
  });
});

describe("parseConnectSemesterClassFormData", () => {
  it("parses valid connect class form data", () => {
    const formData = new FormData();
    formData.set("semester_id", sampleId);
    formData.set("classId", sampleId);

    const result = parseConnectSemesterClassFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.classId).toBe(sampleId);
      expect(result.data.semester_id).toBe(sampleId);
    }
  });
});

describe("parseCreateEquipmentFormData", () => {
  it("parses valid equipment form data", () => {
    const formData = new FormData();
    formData.set("name", "Microscope");
    formData.set("description", "Lab equipment");
    formData.set("quantity", "10");
    formData.set("unit_price", "250");

    const result = parseCreateEquipmentFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Microscope");
      expect(result.data.quantity).toBe(10);
      expect(result.data.unit_price).toBe(250);
    }
  });

  it("rejects missing name", () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("quantity", "10");
    formData.set("unit_price", "250");

    const result = parseCreateEquipmentFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });
});

describe("parseUpdateEquipmentFormData", () => {
  it("parses valid update equipment form data", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("name", "Microscope");
    formData.set("description", "");
    formData.set("quantity", "8");
    formData.set("unit_price", "300");

    const result = parseUpdateEquipmentFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(sampleId);
      expect(result.data.quantity).toBe(8);
    }
  });

  it("rejects missing id", () => {
    const formData = new FormData();
    formData.set("name", "Microscope");
    formData.set("quantity", "8");
    formData.set("unit_price", "300");

    const result = parseUpdateEquipmentFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.id).toBeDefined();
    }
  });
});

describe("parseCreateBorrowsFormData", () => {
  it("parses valid borrow items JSON", () => {
    const formData = new FormData();
    formData.set(
      "items",
      JSON.stringify([
        {
          user_id: sampleId,
          equipment_id: sampleId,
          quantity: 2,
        },
      ])
    );

    const result = parseCreateBorrowsFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]?.quantity).toBe(2);
    }
  });

  it("rejects empty items", () => {
    const formData = new FormData();
    formData.set("items", JSON.stringify([]));

    const result = parseCreateBorrowsFormData(formData);

    expect(result.success).toBe(false);
  });
});

describe("parseCreateNotificationFormData", () => {
  it("parses valid notification form data", () => {
    const formData = new FormData();
    formData.set("title", "Schedule update");
    formData.set("body", "Classes resume on Monday.");
    formData.set("audience", "manager");
    formData.set("category", "academic");
    formData.set("priority", "high");
    formData.set("action_href", "__none__");

    const result = parseCreateNotificationFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Schedule update");
      expect(result.data.audience).toBe("manager");
    }
  });

  it("rejects missing title", () => {
    const formData = new FormData();
    formData.set("title", "");
    formData.set("body", "Message");
    formData.set("audience", "manager");
    formData.set("category", "general");
    formData.set("priority", "normal");

    const result = parseCreateNotificationFormData(formData);

    expect(result.success).toBe(false);
  });
});

describe("parseUpdateNotificationFormData", () => {
  it("parses valid update form data", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("title", "Updated title");
    formData.set("body", "Updated body");
    formData.set("audience", "teacher");
    formData.set("category", "system");
    formData.set("priority", "low");
    formData.set("action_href", "__none__");

    const result = parseUpdateNotificationFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(sampleId);
    }
  });
});

describe("parseNotificationIdFormData", () => {
  it("parses notification id", () => {
    const formData = new FormData();
    formData.set("id", sampleId);

    const result = parseNotificationIdFormData(formData);

    expect(result.success).toBe(true);
  });
});

describe("parseMarkNotificationReadFormData", () => {
  it("parses single mark read", () => {
    const formData = new FormData();
    formData.set("id", sampleId);

    const result = parseMarkNotificationReadFormData(formData);

    expect(result.success).toBe(true);
  });

  it("parses mark all", () => {
    const formData = new FormData();
    formData.set("mark_all", "true");

    const result = parseMarkNotificationReadFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mark_all).toBe(true);
    }
  });
});

describe("parseUpdateSessionSettingsFormData", () => {
  it("parses phase link fields", () => {
    const formData = new FormData();
    formData.set("session_id", sampleId);
    formData.set("class_id", sampleId);
    formData.set("semester_id", sampleId);

    const result = parseUpdateSessionSettingsFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.semester_id).toBe(sampleId);
      expect(result.data.group_grade_level).toBeUndefined();
    }
  });

  it("rejects missing session or class", () => {
    const formData = new FormData();
    formData.set("semester_id", sampleId);

    const result = parseUpdateSessionSettingsFormData(formData);

    expect(result.success).toBe(false);
  });
});

describe("parseUpdateClassSessionFormData", () => {
  it("parses valid session update payload", () => {
    const formData = new FormData();
    formData.set("session_id", sampleId);
    formData.set("class_id", sampleId);
    formData.set("topic", "Updated topic");
    formData.set("session_report", "Session went well");
    formData.set("starts_at", "2026-07-01T10:00");
    formData.set("ends_at", "2026-07-01T12:00");

    const result = parseUpdateClassSessionFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session_id).toBe(sampleId);
      expect(result.data.class_id).toBe(sampleId);
      expect(result.data.topic).toBe("Updated topic");
      expect(result.data.session_report).toBe("Session went well");
      expect(result.data.starts_at).toBe("2026-07-01T10:00");
      expect(result.data.ends_at).toBe("2026-07-01T12:00");
    }
  });

  it("rejects session report over 5000 characters", () => {
    const parsed = createClassSessionSchema.safeParse({
      topic: "Topic",
      session_report: "x".repeat(5001),
      starts_at: "2026-07-01T10:00",
      ends_at: "2026-07-01T12:00",
    });

    expect(parsed.success).toBe(false);
  });

  it("parses create payload with optional session report", () => {
    const formData = new FormData();
    formData.set("class_id", sampleId);
    formData.set("topic", "New session");
    formData.set("session_report", "First meeting notes");
    formData.set("starts_at", "2026-07-01T10:00");
    formData.set("ends_at", "2026-07-01T12:00");

    const result = parseCreateClassSessionFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session_report).toBe("First meeting notes");
    }
  });

  it("rejects end before start", () => {
    const formData = new FormData();
    formData.set("session_id", sampleId);
    formData.set("class_id", sampleId);
    formData.set("topic", "Updated topic");
    formData.set("starts_at", "2026-07-01T12:00");
    formData.set("ends_at", "2026-07-01T10:00");

    const result = parseUpdateClassSessionFormData(formData);

    expect(result.success).toBe(false);
  });

  it("rejects missing session or class", () => {
    const formData = new FormData();
    formData.set("topic", "Updated topic");
    formData.set("starts_at", "2026-07-01T10:00");
    formData.set("ends_at", "2026-07-01T12:00");

    const result = parseUpdateClassSessionFormData(formData);

    expect(result.success).toBe(false);
  });
});

describe("parseUpdateAttendeeFormData", () => {
  it("parses attendance status enum", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("session_id", sampleId);
    formData.set("class_id", sampleId);
    formData.set("status", "late");

    const result = parseUpdateAttendeeFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("late");
    }
  });
});

describe("parseCreateSessionTaskFormData", () => {
  it("parses task create payload", () => {
    const formData = new FormData();
    formData.set("session_id", sampleId);
    formData.set("class_id", sampleId);
    formData.set("title", "Homework 1");
    formData.set("max_grade", "20");

    const result = parseCreateSessionTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Homework 1");
      expect(result.data.max_grade).toBe(20);
    }
  });
});

describe("parseUpdateSessionTaskFormData", () => {
  it("parses task update payload", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("session_id", sampleId);
    formData.set("class_id", sampleId);
    formData.set("title", "Homework 1 revised");
    formData.set("max_grade", "15");

    const result = parseUpdateSessionTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(sampleId);
      expect(result.data.title).toBe("Homework 1 revised");
      expect(result.data.max_grade).toBe(15);
    }
  });
});

describe("parseEditStudentTaskFormData", () => {
  it("parses student task update", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("status", "graded");
    formData.set("grade", "18");

    const result = parseEditStudentTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("graded");
      expect(result.data.grade).toBe(18);
    }
  });

  it("parses student report on student task update", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("status", "submitted");
    formData.set("student_report", "My report text");

    const result = parseEditStudentTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.student_report).toBe("My report text");
    }
  });

  it("rejects student report over 5000 characters", () => {
    const schema = createEditStudentTaskSchema(20);
    const parsed = schema.safeParse({
      status: "pending",
      student_report: "x".repeat(5001),
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects grade above task max when schema is scoped", () => {
    const schema = createEditStudentTaskSchema(20);
    const parsed = schema.safeParse({
      status: "graded",
      grade: "25",
    });

    expect(parsed.success).toBe(false);
  });

  it("promotes pending to graded when a grade is provided", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("status", "pending");
    formData.set("grade", "18");

    const result = parseEditStudentTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("graded");
      expect(result.data.grade).toBe(18);
    }
  });

  it("keeps pending when no grade is provided", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("status", "pending");

    const result = parseEditStudentTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("pending");
    }
  });

  it("does not change submitted when a grade is provided", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("status", "submitted");
    formData.set("grade", "18");

    const result = parseEditStudentTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("submitted");
    }
  });

  it("demotes graded to pending when grade is cleared", () => {
    const schema = createEditStudentTaskSchema(20, "2099-01-01T00:00:00.000Z");
    const parsed = schema.safeParse({
      status: "graded",
      grade: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("pending");
    }
  });

  it("marks pending as missing when due date has passed", () => {
    const schema = createEditStudentTaskSchema(20, "2020-01-01T00:00:00.000Z");
    const parsed = schema.safeParse({
      status: "pending",
      grade: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("missing");
    }
  });

  it("keeps overdue pending as graded when a grade is provided", () => {
    const schema = createEditStudentTaskSchema(20, "2020-01-01T00:00:00.000Z");
    const parsed = schema.safeParse({
      status: "pending",
      grade: "15",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("graded");
    }
  });

  it("marks cleared graded work as missing when due date has passed", () => {
    const schema = createEditStudentTaskSchema(20, "2020-01-01T00:00:00.000Z");
    const parsed = schema.safeParse({
      status: "graded",
      grade: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("missing");
    }
  });

  it("promotes missing to late when a grade is provided", () => {
    const schema = createEditStudentTaskSchema(20, "2099-01-01T00:00:00.000Z");
    const parsed = schema.safeParse({
      status: "missing",
      grade: "15",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("late");
    }
  });
});

describe("createEditStudentFinalExamGradeSchema", () => {
  it("rejects grade above final exam max", () => {
    const schema = createEditStudentFinalExamGradeSchema(50);
    const parsed = schema.safeParse({
      status: "graded",
      grade: "55",
    });

    expect(parsed.success).toBe(false);
  });

  it("promotes missing to late when a grade is provided", () => {
    const schema = createEditStudentFinalExamGradeSchema(100, "2099-01-01T00:00:00.000Z");
    const parsed = schema.safeParse({
      status: "missing",
      grade: "72",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("late");
      expect(parsed.data.grade).toBe(72);
    }
  });
});

describe("parseRemoveStudentFromClassFormData", () => {
  it("parses remove student form data", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("class_id", sampleId);

    const result = parseRemoveStudentFromClassFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(sampleId);
      expect(result.data.class_id).toBe(sampleId);
    }
  });

  it("rejects missing enrollment or class", () => {
    const formData = new FormData();
    formData.set("id", "not-a-uuid");

    const result = parseRemoveStudentFromClassFormData(formData);

    expect(result.success).toBe(false);
  });
});

describe("parseTransferSppFormData", () => {
  it("parses transfer SPP form data", () => {
    const formData = new FormData();
    formData.set("spp_id", sampleId);
    formData.set("destination_payment_phase_id", sampleId);

    const result = parseTransferSppFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.spp_id).toBe(sampleId);
      expect(result.data.destination_payment_phase_id).toBe(sampleId);
    }
  });

  it("rejects invalid uuids", () => {
    const formData = new FormData();
    formData.set("spp_id", "bad");
    formData.set("destination_payment_phase_id", "also-bad");

    const result = parseTransferSppFormData(formData);

    expect(result.success).toBe(false);
  });
});
