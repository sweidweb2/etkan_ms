import { describe, expect, it } from "vitest";
import { parseAddStudentToSemesterFormData } from "@/lib/validators/manager/add-student-to-semester";
import { parseConnectSemesterClassFormData } from "@/lib/validators/manager/connect-semester-class";
import { parseCreateBorrowsFormData } from "@/lib/validators/manager/create-borrows";
import { parseCreateEquipmentFormData } from "@/lib/validators/manager/create-equipment";
import { parseCreatePhaseFormData } from "@/lib/validators/manager/create-phase";
import { parseCreateRelationshipFormData } from "@/lib/validators/manager/create-relationship";
import { parseCreateSessionTaskFormData } from "@/lib/validators/manager/create-session-task";
import { parseCreateSubjectFormData } from "@/lib/validators/manager/create-subject";
import { parseEditStudentTaskFormData, createEditStudentTaskSchema } from "@/lib/validators/manager/edit-student-task";
import { createEditStudentFinalExamGradeSchema } from "@/lib/validators/manager/edit-student-finalexam-grade";
import { parseUpdateRelationshipFormData } from "@/lib/validators/manager/update-relationship";
import { parseUpdateAttendeeFormData } from "@/lib/validators/manager/update-attendee";
import { parseUpdateEquipmentFormData } from "@/lib/validators/manager/update-equipment";
import { parseUpdateSessionSettingsFormData } from "@/lib/validators/manager/update-session-settings";
import { parseUpdateClassSessionFormData } from "@/lib/validators/manager/update-class-session";
import { parseUpdateStudentClassStatusFormData } from "@/lib/validators/manager/update-student-class-status";
import { parseCreateNotificationFormData } from "@/lib/validators/manager/create-notification";
import { parseUpdateNotificationFormData } from "@/lib/validators/manager/update-notification";
import { parseNotificationIdFormData } from "@/lib/validators/manager/notification-id";
import { parseMarkNotificationReadFormData } from "@/lib/validators/manager/mark-notifications-read";
import {
  parseCreateWeeklyScheduleSlotFormData,
  parseUpdateWeeklyScheduleSlotFormData,
  parseWeeklyScheduleSlotIdFormData,
} from "@/lib/validators/manager/weekly-schedule-slot";

const relationshipId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

describe("parseCreateRelationshipFormData", () => {
  it("parses valid relationship form data", () => {
    const formData = new FormData();
    formData.set("name", "Khaled Ahmad");
    formData.set("phone", "+961 3 123 456");
    formData.set("relation_with", "Father");
    formData.set("major", "Engineering");
    formData.set("speciality", "Civil Engineering");
    formData.set("is_useful", "true");

    const result = parseCreateRelationshipFormData(formData);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Khaled Ahmad",
        phone: "+961 3 123 456",
        relation_with: "Father",
        major: "Engineering",
        speciality: "Civil Engineering",
        is_useful: true,
      },
    });
  });

  it("coerces is_useful from false string", () => {
    const formData = new FormData();
    formData.set("name", "Contact");
    formData.set("phone", "");
    formData.set("relation_with", "");
    formData.set("major", "");
    formData.set("speciality", "");
    formData.set("is_useful", "false");

    const result = parseCreateRelationshipFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_useful).toBe(false);
    }
  });

  it("rejects missing name", () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("is_useful", "true");

    const result = parseCreateRelationshipFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });
});

describe("parseUpdateRelationshipFormData", () => {
  it("parses valid update form data", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);
    formData.set("name", "Updated Contact");
    formData.set("phone", "");
    formData.set("relation_with", "");
    formData.set("major", "");
    formData.set("speciality", "");
    formData.set("is_useful", "true");

    const result = parseUpdateRelationshipFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(relationshipId);
      expect(result.data.name).toBe("Updated Contact");
    }
  });

  it("rejects invalid relationship id", () => {
    const formData = new FormData();
    formData.set("id", "not-a-uuid");
    formData.set("name", "Updated Contact");
    formData.set("is_useful", "true");

    const result = parseUpdateRelationshipFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.id).toBeDefined();
    }
  });
});

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
    formData.set("nb_courses", "6");
    formData.set("amount", "450.5");
    formData.set("status", "scheduled");

    const result = parseCreatePhaseFormData(formData);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Fall 2026 Core Semester",
        nb_courses: 6,
        amount: 450.5,
        status: "scheduled",
        start_date: null,
      },
    });
  });

  it("parses optional start date", () => {
    const formData = new FormData();
    formData.set("name", "Fall 2026 Core Semester");
    formData.set("nb_courses", "6");
    formData.set("amount", "450.5");
    formData.set("status", "scheduled");
    formData.set("start_date", "2026-09-01");

    const result = parseCreatePhaseFormData(formData);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Fall 2026 Core Semester",
        nb_courses: 6,
        amount: 450.5,
        status: "scheduled",
        start_date: "2026-09-01",
      },
    });
  });

  it("rejects negative amount", () => {
    const formData = new FormData();
    formData.set("name", "Fall 2026");
    formData.set("nb_courses", "6");
    formData.set("amount", "-1");
    formData.set("status", "scheduled");

    const result = parseCreatePhaseFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.amount).toBeDefined();
    }
  });

  it("rejects non-integer course count", () => {
    const formData = new FormData();
    formData.set("name", "Fall 2026");
    formData.set("nb_courses", "6.5");
    formData.set("amount", "100");
    formData.set("status", "scheduled");

    const result = parseCreatePhaseFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.nb_courses).toBeDefined();
    }
  });
});

describe("parseAddStudentToSemesterFormData", () => {
  it("parses valid enrollment form data", () => {
    const formData = new FormData();
    formData.set("semester_id", relationshipId);
    formData.set("student_profile_id", relationshipId);
    formData.set("status", "pending");

    const result = parseAddStudentToSemesterFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("pending");
      expect(result.data.semester_id).toBe(relationshipId);
    }
  });
});

describe("parseConnectSemesterClassFormData", () => {
  it("parses valid connect class form data", () => {
    const formData = new FormData();
    formData.set("semester_id", relationshipId);
    formData.set("classId", relationshipId);

    const result = parseConnectSemesterClassFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.classId).toBe(relationshipId);
      expect(result.data.semester_id).toBe(relationshipId);
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
    formData.set("id", relationshipId);
    formData.set("name", "Microscope");
    formData.set("description", "");
    formData.set("quantity", "8");
    formData.set("unit_price", "300");

    const result = parseUpdateEquipmentFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(relationshipId);
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
          user_id: relationshipId,
          equipment_id: relationshipId,
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
    formData.set("id", relationshipId);
    formData.set("title", "Updated title");
    formData.set("body", "Updated body");
    formData.set("audience", "teacher");
    formData.set("category", "system");
    formData.set("priority", "low");
    formData.set("action_href", "__none__");

    const result = parseUpdateNotificationFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(relationshipId);
    }
  });
});

describe("parseNotificationIdFormData", () => {
  it("parses notification id", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);

    const result = parseNotificationIdFormData(formData);

    expect(result.success).toBe(true);
  });
});

describe("parseMarkNotificationReadFormData", () => {
  it("parses single mark read", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);

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

describe("parseCreateWeeklyScheduleSlotFormData", () => {
  it("parses valid schedule slot form data", () => {
    const formData = new FormData();
    formData.set("class_id", relationshipId);
    formData.set("day", "Monday");
    formData.set("start_time", "09:00");
    formData.set("end_time", "10:30");
    formData.set("room", "Room A-201");

    const result = parseCreateWeeklyScheduleSlotFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.day).toBe("Monday");
      expect(result.data.room).toBe("Room A-201");
    }
  });

  it("rejects end time before start time", () => {
    const formData = new FormData();
    formData.set("class_id", relationshipId);
    formData.set("day", "Monday");
    formData.set("start_time", "11:00");
    formData.set("end_time", "10:00");
    formData.set("room", "Room A-201");

    const result = parseCreateWeeklyScheduleSlotFormData(formData);

    expect(result.success).toBe(false);
  });
});

describe("parseUpdateWeeklyScheduleSlotFormData", () => {
  it("parses valid update form data", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);
    formData.set("class_id", relationshipId);
    formData.set("day", "Tuesday");
    formData.set("start_time", "08:00");
    formData.set("end_time", "09:30");
    formData.set("room", "Lab B-104");

    const result = parseUpdateWeeklyScheduleSlotFormData(formData);

    expect(result.success).toBe(true);
  });
});

describe("parseWeeklyScheduleSlotIdFormData", () => {
  it("parses slot id", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);

    const result = parseWeeklyScheduleSlotIdFormData(formData);

    expect(result.success).toBe(true);
  });
});

describe("parseUpdateSessionSettingsFormData", () => {
  it("parses phase link fields", () => {
    const formData = new FormData();
    formData.set("session_id", relationshipId);
    formData.set("class_id", relationshipId);
    formData.set("semester_id", relationshipId);

    const result = parseUpdateSessionSettingsFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.semester_id).toBe(relationshipId);
      expect(result.data.group_grade_level).toBeUndefined();
    }
  });

  it("rejects missing session or class", () => {
    const formData = new FormData();
    formData.set("semester_id", relationshipId);

    const result = parseUpdateSessionSettingsFormData(formData);

    expect(result.success).toBe(false);
  });
});

describe("parseUpdateClassSessionFormData", () => {
  it("parses valid session update payload", () => {
    const formData = new FormData();
    formData.set("session_id", relationshipId);
    formData.set("class_id", relationshipId);
    formData.set("topic", "Updated topic");
    formData.set("starts_at", "2026-07-01T10:00");
    formData.set("ends_at", "2026-07-01T12:00");

    const result = parseUpdateClassSessionFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session_id).toBe(relationshipId);
      expect(result.data.class_id).toBe(relationshipId);
      expect(result.data.topic).toBe("Updated topic");
      expect(result.data.starts_at).toBe("2026-07-01T10:00");
      expect(result.data.ends_at).toBe("2026-07-01T12:00");
    }
  });

  it("rejects end before start", () => {
    const formData = new FormData();
    formData.set("session_id", relationshipId);
    formData.set("class_id", relationshipId);
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
    formData.set("id", relationshipId);
    formData.set("session_id", relationshipId);
    formData.set("class_id", relationshipId);
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
    formData.set("session_id", relationshipId);
    formData.set("class_id", relationshipId);
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

describe("parseEditStudentTaskFormData", () => {
  it("parses student task update", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);
    formData.set("status", "graded");
    formData.set("grade", "18");

    const result = parseEditStudentTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("graded");
      expect(result.data.grade).toBe(18);
    }
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
    formData.set("id", relationshipId);
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
    formData.set("id", relationshipId);
    formData.set("status", "pending");

    const result = parseEditStudentTaskFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("pending");
    }
  });

  it("does not change submitted when a grade is provided", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);
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

describe("parseUpdateStudentClassStatusFormData", () => {
  it("parses enrollment status update", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);
    formData.set("class_id", relationshipId);
    formData.set("status", "enrolled");

    const result = parseUpdateStudentClassStatusFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("enrolled");
    }
  });

  it("parses paused enrollment status", () => {
    const formData = new FormData();
    formData.set("id", relationshipId);
    formData.set("class_id", relationshipId);
    formData.set("status", "paused");

    const result = parseUpdateStudentClassStatusFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("paused");
    }
  });

  it("rejects missing enrollment or class", () => {
    const formData = new FormData();
    formData.set("status", "invalid");

    const result = parseUpdateStudentClassStatusFormData(formData);

    expect(result.success).toBe(false);
  });
});
