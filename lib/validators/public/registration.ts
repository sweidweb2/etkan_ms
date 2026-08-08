import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  REGISTRATION_APPLICATION_STATUS_VALUES,
  REGISTRATION_BLOOD_TYPE_VALUES,
  REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES,
  REGISTRATION_DOCUMENT_MAX_BYTES,
  REGISTRATION_DOCUMENT_MAX_FILES,
  REGISTRATION_DOCUMENT_MIN_FILES,
  REGISTRATION_EDUCATION_LEVEL_VALUES,
  REGISTRATION_GENDER_VALUES,
  REGISTRATION_ID_DOCUMENT_TYPE_VALUES,
  REGISTRATION_JOB_STATUS_VALUES,
  REGISTRATION_LEARNING_STATUS_VALUES,
  REGISTRATION_LEARNING_STATUSES,
  REGISTRATION_LIMITS,
  REGISTRATION_PREFERRED_PROGRAM_VALUES,
  REGISTRATION_REFERRAL_SOURCE_VALUES,
  REGISTRATION_REFERRAL_SOURCES,
  REGISTRATION_SHIFT_VALUES,
  REGISTRATION_SKILL_VALUES,
  REGISTRATION_WEEKDAY_VALUES,
} from "@/lib/constants/public-registration";
import { isRegistrationTempStoragePath } from "@/lib/public/registration/storage-path";
import { emailField, fullNameField } from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export function ageYearsFromIsoDate(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const birth = new Date(Date.UTC(y!, m! - 1, d!));
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function isUnder18RegistrationDob(
  iso: string,
  now = new Date()
): boolean {
  return ageYearsFromIsoDate(iso, now) < REGISTRATION_LIMITS.under18AgeYears;
}

const requiredPhoneField = z
  .string()
  .trim()
  .min(1, { message: "Phone is required." })
  .max(AUTH_LIMITS.phone.max, {
    message: `Phone must be at most ${AUTH_LIMITS.phone.max} characters.`,
  });

const optionalPhoneField = z
  .string()
  .trim()
  .max(AUTH_LIMITS.phone.max, {
    message: `Phone must be at most ${AUTH_LIMITS.phone.max} characters.`,
  })
  .optional()
  .or(z.literal(""));

const dateOfBirthField = z
  .string()
  .trim()
  .min(1, { message: "Date of birth is required." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Please enter a valid date.",
  })
  .refine((value) => {
    const age = ageYearsFromIsoDate(value);
    return (
      age >= REGISTRATION_LIMITS.minAgeYears &&
      age <= REGISTRATION_LIMITS.maxAgeYears
    );
  }, {
    message: `Age must be between ${REGISTRATION_LIMITS.minAgeYears} and ${REGISTRATION_LIMITS.maxAgeYears}.`,
  });

function optionalNullableText(max: number) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine((value) => value == null || value.length <= max, {
      message: `Must be at most ${max} characters.`,
    });
}

function refineGuardianFields(
  data: {
    date_of_birth: string;
    guardian_name?: string | null;
    guardian_phone?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (!isUnder18RegistrationDob(data.date_of_birth)) {
    return;
  }
  const name = data.guardian_name?.trim() ?? "";
  if (name.length < REGISTRATION_LIMITS.guardianName.min) {
    ctx.addIssue({
      code: "custom",
      path: ["guardian_name"],
      message: "Guardian name is required for applicants under 18.",
    });
  }
  if (!(data.guardian_phone?.trim() ?? "")) {
    ctx.addIssue({
      code: "custom",
      path: ["guardian_phone"],
      message: "Guardian phone is required for applicants under 18.",
    });
  }
}

export const registrationPersonalStepSchema = z.object({
  full_name: fullNameField,
  gender: z.enum(REGISTRATION_GENDER_VALUES, {
    message: "Please select a gender.",
  }),
  date_of_birth: dateOfBirthField,
  blood_type: z.enum(REGISTRATION_BLOOD_TYPE_VALUES, {
    message: "Please select a blood type.",
  }),
});

export const registrationContactStepSchema = z.object({
  email: emailField,
  phone: requiredPhoneField,
  additional_phone: optionalPhoneField,
  city: z
    .string()
    .trim()
    .min(REGISTRATION_LIMITS.city.min, {
      message: `City must be at least ${REGISTRATION_LIMITS.city.min} characters.`,
    })
    .max(REGISTRATION_LIMITS.city.max, {
      message: `City must be at most ${REGISTRATION_LIMITS.city.max} characters.`,
    }),
  full_address: z
    .string()
    .trim()
    .min(REGISTRATION_LIMITS.fullAddress.min, {
      message: `Address must be at least ${REGISTRATION_LIMITS.fullAddress.min} characters.`,
    })
    .max(REGISTRATION_LIMITS.fullAddress.max, {
      message: `Address must be at most ${REGISTRATION_LIMITS.fullAddress.max} characters.`,
    }),
});

export const registrationEducationStepSchema = z
  .object({
    education_level: z.enum(REGISTRATION_EDUCATION_LEVEL_VALUES, {
      message: "Please select an education level.",
    }),
    organization_name: z
      .string()
      .trim()
      .max(REGISTRATION_LIMITS.organizationName.max, {
        message: `Organization name must be at most ${REGISTRATION_LIMITS.organizationName.max} characters.`,
      })
      .optional()
      .or(z.literal("")),
    speciality: z
      .string()
      .trim()
      .max(REGISTRATION_LIMITS.speciality.max, {
        message: `Speciality must be at most ${REGISTRATION_LIMITS.speciality.max} characters.`,
      })
      .optional()
      .or(z.literal("")),
    learning_status: z.enum(REGISTRATION_LEARNING_STATUS_VALUES, {
      message: "Please select a learning status.",
    }),
    graduation_year: z.number().int().nullable().optional(),
    self_learning_notes: z
      .string()
      .trim()
      .max(REGISTRATION_LIMITS.selfLearningNotes.max, {
        message: `Self-learning notes must be at most ${REGISTRATION_LIMITS.selfLearningNotes.max} characters.`,
      })
      .optional()
      .or(z.literal("")),
    learning_goal: z
      .string()
      .trim()
      .min(REGISTRATION_LIMITS.learningGoal.min, {
        message: `Learning goal must be at least ${REGISTRATION_LIMITS.learningGoal.min} characters.`,
      })
      .max(REGISTRATION_LIMITS.learningGoal.max, {
        message: `Learning goal must be at most ${REGISTRATION_LIMITS.learningGoal.max} characters.`,
      }),
  })
  .superRefine((data, ctx) => {
    const needsYear =
      data.learning_status === REGISTRATION_LEARNING_STATUSES.GRADUATED ||
      data.learning_status === REGISTRATION_LEARNING_STATUSES.STOPPED;
    if (needsYear && data.graduation_year == null) {
      ctx.addIssue({
        code: "custom",
        path: ["graduation_year"],
        message: "Graduation year is required for this learning status.",
      });
      return;
    }
    if (data.graduation_year != null) {
      const currentYear = new Date().getUTCFullYear();
      if (
        data.graduation_year < 1970 ||
        data.graduation_year > currentYear + 10
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["graduation_year"],
          message: "Please enter a valid graduation year.",
        });
      }
    }
  });

export const registrationSkillsStepSchema = z
  .object({
    skills: z
      .array(z.enum(REGISTRATION_SKILL_VALUES))
      .min(1, { message: "Select at least one skill." }),
    referral_source: z.enum(REGISTRATION_REFERRAL_SOURCE_VALUES, {
      message: "Please select how you knew about Etkan.",
    }),
    referral_other: z
      .string()
      .trim()
      .max(REGISTRATION_LIMITS.referralOther.max, {
        message: `Please keep this under ${REGISTRATION_LIMITS.referralOther.max} characters.`,
      })
      .optional()
      .or(z.literal("")),
    preferred_program: z.enum(REGISTRATION_PREFERRED_PROGRAM_VALUES, {
      message: "Please select a preferred program.",
    }),
  })
  .superRefine((data, ctx) => {
    if (
      data.referral_source === REGISTRATION_REFERRAL_SOURCES.OTHER &&
      !data.referral_other?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["referral_other"],
        message: "Please tell us how you knew about Etkan.",
      });
    }
  });

export const registrationAvailabilityStepSchema = z.object({
  available_days: z
    .array(z.enum(REGISTRATION_WEEKDAY_VALUES))
    .min(1, { message: "Select at least one available day." }),
  preferred_shifts: z
    .array(z.enum(REGISTRATION_SHIFT_VALUES))
    .min(1, { message: "Select at least one preferred shift." }),
  weekly_available_hours: z
    .number()
    .int({ message: "Hours must be a whole number." })
    .min(REGISTRATION_LIMITS.weeklyHours.min, {
      message: `Hours must be at least ${REGISTRATION_LIMITS.weeklyHours.min}.`,
    })
    .max(REGISTRATION_LIMITS.weeklyHours.max, {
      message: `Hours must be at most ${REGISTRATION_LIMITS.weeklyHours.max}.`,
    }),
  job_status: z.enum(REGISTRATION_JOB_STATUS_VALUES, {
    message: "Please select a job status.",
  }),
  has_transportation: z.boolean({
    message: "Please indicate whether you have transportation.",
  }),
});

const allowedRegistrationMimeSet = new Set<string>(
  REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES
);

export const registrationDocumentFileSchema = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    { message: "A file is required." }
  )
  .superRefine((file, ctx) => {
    if (file.size <= 0) {
      ctx.addIssue({ code: "custom", message: "File is empty." });
    }
    if (file.size > REGISTRATION_DOCUMENT_MAX_BYTES) {
      ctx.addIssue({
        code: "custom",
        message: "File must be at most 10 MB.",
      });
    }
    const mime = file.type.trim();
    if (!mime || !allowedRegistrationMimeSet.has(mime)) {
      ctx.addIssue({
        code: "custom",
        message: "File type is not allowed.",
      });
    }
    if (!file.name.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "File name is required.",
      });
    }
  });

export const registrationUploadedDocumentSchema = z.object({
  storage_path: z.string().min(1),
  file_name: z.string().min(1).max(200),
  mime_type: z.enum(REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES),
  file_size: z
    .number()
    .int()
    .positive()
    .max(REGISTRATION_DOCUMENT_MAX_BYTES),
});

export const registrationDocumentsStepSchema = z.object({
  id_document_type: z.enum(REGISTRATION_ID_DOCUMENT_TYPE_VALUES, {
    message: "Please select an ID document type.",
  }),
  documents: z
    .array(registrationUploadedDocumentSchema)
    .min(REGISTRATION_DOCUMENT_MIN_FILES, {
      message: "Upload at least one identity document.",
    })
    .max(REGISTRATION_DOCUMENT_MAX_FILES, {
      message: `You can upload at most ${REGISTRATION_DOCUMENT_MAX_FILES} files.`,
    }),
});

export const tempUploadRegistrationDocumentSchema = z.object({
  upload_session_id: z.string().uuid({ message: "Invalid upload session." }),
  file: registrationDocumentFileSchema,
});

export type TempUploadRegistrationDocumentInput = z.infer<
  typeof tempUploadRegistrationDocumentSchema
>;

export const removeTempRegistrationDocumentSchema = z.object({
  upload_session_id: z.string().uuid({ message: "Invalid upload session." }),
  storage_path: z.string().min(1),
});

export type RemoveTempRegistrationDocumentInput = z.infer<
  typeof removeTempRegistrationDocumentSchema
>;

export const registrationReviewStepSchema = z
  .object({
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    consent_terms: z.boolean().refine((value) => value === true, {
      message: "You must agree to the terms.",
    }),
    consent_privacy: z.boolean().refine((value) => value === true, {
      message: "You must agree to the privacy policy.",
    }),
    guardian_name: z
      .string()
      .trim()
      .max(REGISTRATION_LIMITS.guardianName.max)
      .optional()
      .or(z.literal("")),
    guardian_phone: optionalPhoneField,
  })
  .superRefine(refineGuardianFields);

export const submitPublicRegistrationSchema = z
  .object({
    full_name: fullNameField,
    gender: z.enum(REGISTRATION_GENDER_VALUES, {
      message: "Please select a gender.",
    }),
    date_of_birth: dateOfBirthField,
    blood_type: z.enum(REGISTRATION_BLOOD_TYPE_VALUES, {
      message: "Please select a blood type.",
    }),
    email: emailField,
    phone: requiredPhoneField,
    additional_phone: optionalNullableText(AUTH_LIMITS.phone.max),
    city: z
      .string()
      .trim()
      .min(REGISTRATION_LIMITS.city.min)
      .max(REGISTRATION_LIMITS.city.max),
    full_address: z
      .string()
      .trim()
      .min(REGISTRATION_LIMITS.fullAddress.min)
      .max(REGISTRATION_LIMITS.fullAddress.max),
    education_level: z.enum(REGISTRATION_EDUCATION_LEVEL_VALUES),
    organization_name: optionalNullableText(
      REGISTRATION_LIMITS.organizationName.max
    ),
    speciality: optionalNullableText(REGISTRATION_LIMITS.speciality.max),
    learning_status: z.enum(REGISTRATION_LEARNING_STATUS_VALUES),
    graduation_year: z.number().int().nullable().optional(),
    self_learning_notes: optionalNullableText(
      REGISTRATION_LIMITS.selfLearningNotes.max
    ),
    learning_goal: z
      .string()
      .trim()
      .min(REGISTRATION_LIMITS.learningGoal.min)
      .max(REGISTRATION_LIMITS.learningGoal.max),
    skills: z
      .array(z.enum(REGISTRATION_SKILL_VALUES))
      .min(1, { message: "Select at least one skill." }),
    referral_source: z.enum(REGISTRATION_REFERRAL_SOURCE_VALUES),
    referral_other: optionalNullableText(REGISTRATION_LIMITS.referralOther.max),
    preferred_program: z.enum(REGISTRATION_PREFERRED_PROGRAM_VALUES),
    available_days: z
      .array(z.enum(REGISTRATION_WEEKDAY_VALUES))
      .min(1, { message: "Select at least one available day." }),
    preferred_shifts: z
      .array(z.enum(REGISTRATION_SHIFT_VALUES))
      .min(1, { message: "Select at least one preferred shift." }),
    weekly_available_hours: z
      .number()
      .int()
      .min(REGISTRATION_LIMITS.weeklyHours.min)
      .max(REGISTRATION_LIMITS.weeklyHours.max),
    job_status: z.enum(REGISTRATION_JOB_STATUS_VALUES),
    has_transportation: z.boolean(),
    id_document_type: z.enum(REGISTRATION_ID_DOCUMENT_TYPE_VALUES),
    upload_session_id: z.string().uuid(),
    documents: z
      .array(registrationUploadedDocumentSchema)
      .min(REGISTRATION_DOCUMENT_MIN_FILES)
      .max(REGISTRATION_DOCUMENT_MAX_FILES),
    consent_terms: z.boolean().refine((value) => value === true, {
      message: "You must agree to the terms.",
    }),
    consent_privacy: z.boolean().refine((value) => value === true, {
      message: "You must agree to the privacy policy.",
    }),
    guardian_name: optionalNullableText(REGISTRATION_LIMITS.guardianName.max),
    guardian_phone: optionalNullableText(AUTH_LIMITS.phone.max),
  })
  .superRefine((data, ctx) => {
    const needsYear =
      data.learning_status === REGISTRATION_LEARNING_STATUSES.GRADUATED ||
      data.learning_status === REGISTRATION_LEARNING_STATUSES.STOPPED;
    if (needsYear && data.graduation_year == null) {
      ctx.addIssue({
        code: "custom",
        path: ["graduation_year"],
        message: "Graduation year is required for this learning status.",
      });
    }
    if (
      data.referral_source === REGISTRATION_REFERRAL_SOURCES.OTHER &&
      !data.referral_other
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["referral_other"],
        message: "Please tell us how you knew about Etkan.",
      });
    }
    for (const [index, doc] of data.documents.entries()) {
      if (
        !isRegistrationTempStoragePath(
          doc.storage_path,
          data.upload_session_id
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["documents", index, "storage_path"],
          message: "Invalid document upload path.",
        });
      }
    }
    refineGuardianFields(data, ctx);
  });

export type SubmitPublicRegistrationInput = z.infer<
  typeof submitPublicRegistrationSchema
>;

export type RegistrationPersonalStepInput = z.infer<
  typeof registrationPersonalStepSchema
>;
export type RegistrationContactStepInput = z.infer<
  typeof registrationContactStepSchema
>;
export type RegistrationEducationStepInput = z.infer<
  typeof registrationEducationStepSchema
>;
export type RegistrationSkillsStepInput = z.infer<
  typeof registrationSkillsStepSchema
>;
export type RegistrationAvailabilityStepInput = z.infer<
  typeof registrationAvailabilityStepSchema
>;
export type RegistrationDocumentsStepInput = z.infer<
  typeof registrationDocumentsStepSchema
>;

function parseJsonArray(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

function parseJsonValue(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseRequiredNumber(raw: FormDataEntryValue | null): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : Number.NaN;
}

function parseBoolean(raw: FormDataEntryValue | null): boolean {
  return raw === "true" || raw === "on" || raw === "1";
}

export function parseSubmitPublicRegistrationFormData(formData: FormData):
  | { success: true; data: SubmitPublicRegistrationInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = submitPublicRegistrationSchema.safeParse({
    full_name: formData.get("full_name"),
    gender: formData.get("gender"),
    date_of_birth: formData.get("date_of_birth"),
    blood_type: formData.get("blood_type"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    additional_phone: formData.get("additional_phone") ?? "",
    city: formData.get("city"),
    full_address: formData.get("full_address"),
    education_level: formData.get("education_level"),
    organization_name: formData.get("organization_name") ?? "",
    speciality: formData.get("speciality") ?? "",
    learning_status: formData.get("learning_status"),
    graduation_year: parseOptionalNumber(formData.get("graduation_year")),
    self_learning_notes: formData.get("self_learning_notes") ?? "",
    learning_goal: formData.get("learning_goal"),
    skills: parseJsonArray(formData.get("skills")),
    referral_source: formData.get("referral_source"),
    referral_other: formData.get("referral_other") ?? "",
    preferred_program: formData.get("preferred_program"),
    available_days: parseJsonArray(formData.get("available_days")),
    preferred_shifts: parseJsonArray(formData.get("preferred_shifts")),
    weekly_available_hours: parseRequiredNumber(
      formData.get("weekly_available_hours")
    ),
    job_status: formData.get("job_status"),
    has_transportation: parseBoolean(formData.get("has_transportation")),
    id_document_type: formData.get("id_document_type"),
    upload_session_id: formData.get("upload_session_id"),
    documents: parseJsonValue(formData.get("documents")) ?? [],
    consent_terms: parseBoolean(formData.get("consent_terms")),
    consent_privacy: parseBoolean(formData.get("consent_privacy")),
    guardian_name: formData.get("guardian_name") ?? "",
    guardian_phone: formData.get("guardian_phone") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseTempUploadRegistrationDocumentFormData(formData: FormData):
  | { success: true; data: TempUploadRegistrationDocumentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = tempUploadRegistrationDocumentSchema.safeParse({
    upload_session_id: formData.get("upload_session_id"),
    file: formData.get("file"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseRemoveTempRegistrationDocumentFormData(formData: FormData):
  | { success: true; data: RemoveTempRegistrationDocumentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = removeTempRegistrationDocumentSchema.safeParse({
    upload_session_id: formData.get("upload_session_id"),
    storage_path: formData.get("storage_path"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export const updateRegistrationStatusSchema = z.object({
  id: z.string().uuid({ message: "Invalid application id." }),
  status: z.enum(REGISTRATION_APPLICATION_STATUS_VALUES, {
    message: "Please select a status.",
  }),
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine(
      (value) =>
        value == null ||
        value.length <= REGISTRATION_LIMITS.managerNotes.max,
      {
        message: `Notes must be at most ${REGISTRATION_LIMITS.managerNotes.max} characters.`,
      }
    )
    .optional(),
});

export type UpdateRegistrationStatusInput = z.infer<
  typeof updateRegistrationStatusSchema
>;

export function parseUpdateRegistrationStatusFormData(formData: FormData):
  | { success: true; data: UpdateRegistrationStatusInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const hasNotes = formData.has("notes");
  const parsed = updateRegistrationStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    ...(hasNotes ? { notes: formData.get("notes") } : {}),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

const managerNotesField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  .refine(
    (value) =>
      value == null || value.length <= REGISTRATION_LIMITS.managerNotes.max,
    {
      message: `Notes must be at most ${REGISTRATION_LIMITS.managerNotes.max} characters.`,
    }
  );

export const updateManagerRegistrationSchema = z
  .object({
    id: z.string().uuid({ message: "Invalid application id." }),
    status: z.enum(REGISTRATION_APPLICATION_STATUS_VALUES, {
      message: "Please select a status.",
    }),
    notes: managerNotesField,
    full_name: fullNameField,
    gender: z.enum(REGISTRATION_GENDER_VALUES, {
      message: "Please select a gender.",
    }),
    date_of_birth: dateOfBirthField,
    blood_type: z.enum(REGISTRATION_BLOOD_TYPE_VALUES, {
      message: "Please select a blood type.",
    }),
    email: emailField,
    phone: requiredPhoneField,
    additional_phone: optionalNullableText(AUTH_LIMITS.phone.max),
    city: z
      .string()
      .trim()
      .min(REGISTRATION_LIMITS.city.min)
      .max(REGISTRATION_LIMITS.city.max),
    full_address: z
      .string()
      .trim()
      .min(REGISTRATION_LIMITS.fullAddress.min)
      .max(REGISTRATION_LIMITS.fullAddress.max),
    education_level: z.enum(REGISTRATION_EDUCATION_LEVEL_VALUES),
    organization_name: optionalNullableText(
      REGISTRATION_LIMITS.organizationName.max
    ),
    speciality: optionalNullableText(REGISTRATION_LIMITS.speciality.max),
    learning_status: z.enum(REGISTRATION_LEARNING_STATUS_VALUES),
    graduation_year: z.number().int().nullable().optional(),
    self_learning_notes: optionalNullableText(
      REGISTRATION_LIMITS.selfLearningNotes.max
    ),
    learning_goal: z
      .string()
      .trim()
      .min(REGISTRATION_LIMITS.learningGoal.min)
      .max(REGISTRATION_LIMITS.learningGoal.max),
    skills: z
      .array(z.enum(REGISTRATION_SKILL_VALUES))
      .min(1, { message: "Select at least one skill." }),
    referral_source: z.enum(REGISTRATION_REFERRAL_SOURCE_VALUES),
    referral_other: optionalNullableText(REGISTRATION_LIMITS.referralOther.max),
    preferred_program: z.enum(REGISTRATION_PREFERRED_PROGRAM_VALUES),
    available_days: z
      .array(z.enum(REGISTRATION_WEEKDAY_VALUES))
      .min(1, { message: "Select at least one available day." }),
    preferred_shifts: z
      .array(z.enum(REGISTRATION_SHIFT_VALUES))
      .min(1, { message: "Select at least one preferred shift." }),
    weekly_available_hours: z
      .number()
      .int()
      .min(REGISTRATION_LIMITS.weeklyHours.min)
      .max(REGISTRATION_LIMITS.weeklyHours.max),
    job_status: z.enum(REGISTRATION_JOB_STATUS_VALUES),
    has_transportation: z.boolean(),
    id_document_type: z.enum(REGISTRATION_ID_DOCUMENT_TYPE_VALUES),
    guardian_name: optionalNullableText(REGISTRATION_LIMITS.guardianName.max),
    guardian_phone: optionalNullableText(AUTH_LIMITS.phone.max),
  })
  .superRefine((data, ctx) => {
    const needsYear =
      data.learning_status === REGISTRATION_LEARNING_STATUSES.GRADUATED ||
      data.learning_status === REGISTRATION_LEARNING_STATUSES.STOPPED;
    if (needsYear && data.graduation_year == null) {
      ctx.addIssue({
        code: "custom",
        path: ["graduation_year"],
        message: "Graduation year is required for this learning status.",
      });
    }
    if (
      data.referral_source === REGISTRATION_REFERRAL_SOURCES.OTHER &&
      !data.referral_other
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["referral_other"],
        message: "Please tell us how you knew about Etkan.",
      });
    }
    refineGuardianFields(data, ctx);
  });

export type UpdateManagerRegistrationInput = z.infer<
  typeof updateManagerRegistrationSchema
>;

export function parseUpdateManagerRegistrationFormData(formData: FormData):
  | { success: true; data: UpdateManagerRegistrationInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateManagerRegistrationSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
    full_name: formData.get("full_name"),
    gender: formData.get("gender"),
    date_of_birth: formData.get("date_of_birth"),
    blood_type: formData.get("blood_type"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    additional_phone: formData.get("additional_phone") ?? "",
    city: formData.get("city"),
    full_address: formData.get("full_address"),
    education_level: formData.get("education_level"),
    organization_name: formData.get("organization_name") ?? "",
    speciality: formData.get("speciality") ?? "",
    learning_status: formData.get("learning_status"),
    graduation_year: parseOptionalNumber(formData.get("graduation_year")),
    self_learning_notes: formData.get("self_learning_notes") ?? "",
    learning_goal: formData.get("learning_goal"),
    skills: parseJsonArray(formData.get("skills")),
    referral_source: formData.get("referral_source"),
    referral_other: formData.get("referral_other") ?? "",
    preferred_program: formData.get("preferred_program"),
    available_days: parseJsonArray(formData.get("available_days")),
    preferred_shifts: parseJsonArray(formData.get("preferred_shifts")),
    weekly_available_hours: parseRequiredNumber(
      formData.get("weekly_available_hours")
    ),
    job_status: formData.get("job_status"),
    has_transportation: parseBoolean(formData.get("has_transportation")),
    id_document_type: formData.get("id_document_type"),
    guardian_name: formData.get("guardian_name") ?? "",
    guardian_phone: formData.get("guardian_phone") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
