import { describe, expect, it } from "vitest";
import {
  isUnder18RegistrationDob,
  registrationDocumentsStepSchema,
  registrationEducationStepSchema,
  registrationPersonalStepSchema,
  registrationSkillsStepSchema,
  submitPublicRegistrationSchema,
} from "@/lib/validators/public/registration";

const adultDob = "2000-01-15";
const minorDob = `${new Date().getUTCFullYear() - 16}-06-01`;
const uploadSessionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const validUploadedDoc = {
  storage_path: `registration/tmp/${uploadSessionId}/dddddddd-dddd-4ddd-8ddd-dddddddddddd-id.pdf`,
  file_name: "id.pdf",
  mime_type: "application/pdf" as const,
  file_size: 2048,
};

describe("registrationPersonalStepSchema", () => {
  it("accepts valid personal data", () => {
    const result = registrationPersonalStepSchema.safeParse({
      full_name: "Ada Lovelace",
      gender: "female",
      date_of_birth: adultDob,
      blood_type: "O+",
    });
    expect(result.success).toBe(true);
  });

  it("rejects future-young ages", () => {
    const result = registrationPersonalStepSchema.safeParse({
      full_name: "Too Young",
      gender: "male",
      date_of_birth: `${new Date().getUTCFullYear() - 5}-01-01`,
      blood_type: "A+",
    });
    expect(result.success).toBe(false);
  });

  it("rejects prefer_not_to_say gender", () => {
    const result = registrationPersonalStepSchema.safeParse({
      full_name: "Ada Lovelace",
      gender: "prefer_not_to_say",
      date_of_birth: adultDob,
      blood_type: "O+",
    });
    expect(result.success).toBe(false);
  });
});

describe("registrationEducationStepSchema", () => {
  it("requires graduation year when graduated", () => {
    const result = registrationEducationStepSchema.safeParse({
      education_level: "uni_graduate",
      learning_status: "graduated",
      graduation_year: null,
      learning_goal: "Learn web development deeply",
    });
    expect(result.success).toBe(false);
  });

  it("allows learning without graduation year", () => {
    const result = registrationEducationStepSchema.safeParse({
      education_level: "uni_year_2",
      learning_status: "learning",
      graduation_year: null,
      learning_goal: "Learn web development deeply",
      organization_name: "State Uni",
      speciality: "CS",
      self_learning_notes: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("registrationSkillsStepSchema", () => {
  it("requires referral_other when source is other", () => {
    const result = registrationSkillsStepSchema.safeParse({
      skills: ["web_dev"],
      referral_source: "other",
      referral_other: "",
      preferred_program: "general",
    });
    expect(result.success).toBe(false);
  });

  it("requires skills_other when other is selected", () => {
    const result = registrationSkillsStepSchema.safeParse({
      skills: ["other"],
      skills_other: "",
      referral_source: "friend",
      preferred_program: "general",
    });
    expect(result.success).toBe(false);
  });

  it("accepts other with a described skill", () => {
    const result = registrationSkillsStepSchema.safeParse({
      skills: ["programming", "other"],
      skills_other: "Welding",
      referral_source: "friend",
      preferred_program: "general",
    });
    expect(result.success).toBe(true);
  });
});

describe("registrationDocumentsStepSchema", () => {
  it("accepts a valid documents step", () => {
    const result = registrationDocumentsStepSchema.safeParse({
      id_document_type: "passport",
      documents: [validUploadedDoc],
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero documents", () => {
    const result = registrationDocumentsStepSchema.safeParse({
      id_document_type: "national_id",
      documents: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than three documents", () => {
    const result = registrationDocumentsStepSchema.safeParse({
      id_document_type: "civil_record",
      documents: [
        validUploadedDoc,
        {
          ...validUploadedDoc,
          storage_path: `${validUploadedDoc.storage_path}-2`,
        },
        {
          ...validUploadedDoc,
          storage_path: `${validUploadedDoc.storage_path}-3`,
        },
        {
          ...validUploadedDoc,
          storage_path: `${validUploadedDoc.storage_path}-4`,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("isUnder18RegistrationDob", () => {
  it("detects minors", () => {
    expect(isUnder18RegistrationDob(minorDob)).toBe(true);
    expect(isUnder18RegistrationDob(adultDob)).toBe(false);
  });
});

describe("submitPublicRegistrationSchema", () => {
  const base = {
    full_name: "Ada Lovelace",
    gender: "female",
    date_of_birth: adultDob,
    blood_type: "O+",
    email: "ada@example.com",
    phone: "+96171123456",
    additional_phone: null,
    city: "Beirut",
    full_address: "Hamra Street 12",
    education_level: "uni_year_2",
    organization_name: null,
    speciality: null,
    learning_status: "learning",
    graduation_year: null,
    self_learning_notes: null,
    learning_goal: "Build real products with a team",
    skills: ["web_dev", "ui_ux"],
    referral_source: "friend",
    referral_other: null,
    skills_other: null,
    preferred_program: "general",
    available_days: ["sat", "sun"],
    preferred_shifts: ["morning"],
    weekly_available_hours: 10,
    job_status: "student_only",
    has_transportation: true,
    id_document_type: "national_id",
    upload_session_id: uploadSessionId,
    documents: [validUploadedDoc],
    consent_terms: true,
    consent_privacy: true,
    guardian_name: null,
    guardian_phone: null,
  };

  it("accepts a full valid adult application", () => {
    expect(submitPublicRegistrationSchema.safeParse(base).success).toBe(true);
  });

  it("requires guardian fields for minors", () => {
    const result = submitPublicRegistrationSchema.safeParse({
      ...base,
      date_of_birth: minorDob,
      guardian_name: null,
      guardian_phone: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts minors with guardian details", () => {
    const result = submitPublicRegistrationSchema.safeParse({
      ...base,
      date_of_birth: minorDob,
      guardian_name: "Parent Name",
      guardian_phone: "+96170111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejects documents outside the upload session", () => {
    const result = submitPublicRegistrationSchema.safeParse({
      ...base,
      documents: [
        {
          ...validUploadedDoc,
          storage_path:
            "registration/tmp/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/id.pdf",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("requires skills_other when skills include other", () => {
    const result = submitPublicRegistrationSchema.safeParse({
      ...base,
      skills: ["other"],
      skills_other: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts other skill with a description", () => {
    const result = submitPublicRegistrationSchema.safeParse({
      ...base,
      skills: ["robotics", "other"],
      skills_other: "CNC machining",
    });
    expect(result.success).toBe(true);
  });
});
