import { describe, expect, it } from "vitest";
import { parseAddStudentToSemesterFormData } from "@/lib/validators/manager/add-student-to-semester";
import { parseConnectSemesterClassFormData } from "@/lib/validators/manager/connect-semester-class";
import { parseCreateBorrowsFormData } from "@/lib/validators/manager/create-borrows";
import { parseCreateEquipmentFormData } from "@/lib/validators/manager/create-equipment";
import { parseCreatePhaseFormData } from "@/lib/validators/manager/create-phase";
import { parseCreateRelationshipFormData } from "@/lib/validators/manager/create-relationship";
import { parseCreateSubjectFormData } from "@/lib/validators/manager/create-subject";
import { parseUpdateRelationshipFormData } from "@/lib/validators/manager/update-relationship";
import { parseUpdateEquipmentFormData } from "@/lib/validators/manager/update-equipment";
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

    const result = parseCreatePhaseFormData(formData);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Fall 2026 Core Semester",
        nb_courses: 6,
        amount: 450.5,
      },
    });
  });

  it("rejects negative amount", () => {
    const formData = new FormData();
    formData.set("name", "Fall 2026");
    formData.set("nb_courses", "6");
    formData.set("amount", "-1");

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
