export const REGISTRATION_GENDERS = {
  MALE: "male",
  FEMALE: "female",
} as const;

export type RegistrationGender =
  (typeof REGISTRATION_GENDERS)[keyof typeof REGISTRATION_GENDERS];

export const REGISTRATION_GENDER_VALUES = [
  REGISTRATION_GENDERS.MALE,
  REGISTRATION_GENDERS.FEMALE,
] as const;

export const REGISTRATION_GENDER_LABELS: Record<RegistrationGender, string> = {
  male: "Male",
  female: "Female",
};

export const REGISTRATION_BLOOD_TYPES = {
  A_POS: "A+",
  A_NEG: "A-",
  B_POS: "B+",
  B_NEG: "B-",
  AB_POS: "AB+",
  AB_NEG: "AB-",
  O_POS: "O+",
  O_NEG: "O-",
  UNKNOWN: "unknown",
} as const;

export type RegistrationBloodType =
  (typeof REGISTRATION_BLOOD_TYPES)[keyof typeof REGISTRATION_BLOOD_TYPES];

export const REGISTRATION_BLOOD_TYPE_VALUES = [
  REGISTRATION_BLOOD_TYPES.A_POS,
  REGISTRATION_BLOOD_TYPES.A_NEG,
  REGISTRATION_BLOOD_TYPES.B_POS,
  REGISTRATION_BLOOD_TYPES.B_NEG,
  REGISTRATION_BLOOD_TYPES.AB_POS,
  REGISTRATION_BLOOD_TYPES.AB_NEG,
  REGISTRATION_BLOOD_TYPES.O_POS,
  REGISTRATION_BLOOD_TYPES.O_NEG,
  REGISTRATION_BLOOD_TYPES.UNKNOWN,
] as const;

export const REGISTRATION_BLOOD_TYPE_LABELS: Record<
  RegistrationBloodType,
  string
> = {
  "A+": "A+",
  "A-": "A-",
  "B+": "B+",
  "B-": "B-",
  "AB+": "AB+",
  "AB-": "AB-",
  "O+": "O+",
  "O-": "O-",
  unknown: "Unknown",
};

export const REGISTRATION_EDUCATION_LEVELS = {
  SCHOOL: "school",
  UNI_YEAR_1: "uni_year_1",
  UNI_YEAR_2: "uni_year_2",
  UNI_YEAR_3: "uni_year_3",
  UNI_YEAR_4_PLUS: "uni_year_4_plus",
  UNI_GRADUATE: "uni_graduate",
  OTHER: "other",
} as const;

export type RegistrationEducationLevel =
  (typeof REGISTRATION_EDUCATION_LEVELS)[keyof typeof REGISTRATION_EDUCATION_LEVELS];

export const REGISTRATION_EDUCATION_LEVEL_VALUES = [
  REGISTRATION_EDUCATION_LEVELS.SCHOOL,
  REGISTRATION_EDUCATION_LEVELS.UNI_YEAR_1,
  REGISTRATION_EDUCATION_LEVELS.UNI_YEAR_2,
  REGISTRATION_EDUCATION_LEVELS.UNI_YEAR_3,
  REGISTRATION_EDUCATION_LEVELS.UNI_YEAR_4_PLUS,
  REGISTRATION_EDUCATION_LEVELS.UNI_GRADUATE,
  REGISTRATION_EDUCATION_LEVELS.OTHER,
] as const;

export const REGISTRATION_EDUCATION_LEVEL_LABELS: Record<
  RegistrationEducationLevel,
  string
> = {
  school: "School",
  uni_year_1: "University — year 1",
  uni_year_2: "University — year 2",
  uni_year_3: "University — year 3",
  uni_year_4_plus: "University — year 4+",
  uni_graduate: "University graduate",
  other: "Other",
};

export const REGISTRATION_LEARNING_STATUSES = {
  LEARNING: "learning",
  STOPPED: "stopped",
  GRADUATED: "graduated",
} as const;

export type RegistrationLearningStatus =
  (typeof REGISTRATION_LEARNING_STATUSES)[keyof typeof REGISTRATION_LEARNING_STATUSES];

export const REGISTRATION_LEARNING_STATUS_VALUES = [
  REGISTRATION_LEARNING_STATUSES.LEARNING,
  REGISTRATION_LEARNING_STATUSES.STOPPED,
  REGISTRATION_LEARNING_STATUSES.GRADUATED,
] as const;

export const REGISTRATION_LEARNING_STATUS_LABELS: Record<
  RegistrationLearningStatus,
  string
> = {
  learning: "Currently learning",
  stopped: "Stopped",
  graduated: "Graduated",
};

export const REGISTRATION_PREFERRED_PROGRAMS = {
  GENERAL: "general",
  SPECIALIZED: "specialized",
  UNDECIDED: "undecided",
} as const;

export type RegistrationPreferredProgram =
  (typeof REGISTRATION_PREFERRED_PROGRAMS)[keyof typeof REGISTRATION_PREFERRED_PROGRAMS];

export const REGISTRATION_PREFERRED_PROGRAM_VALUES = [
  REGISTRATION_PREFERRED_PROGRAMS.GENERAL,
  REGISTRATION_PREFERRED_PROGRAMS.SPECIALIZED,
  REGISTRATION_PREFERRED_PROGRAMS.UNDECIDED,
] as const;

export const REGISTRATION_PREFERRED_PROGRAM_LABELS: Record<
  RegistrationPreferredProgram,
  string
> = {
  general: "General path",
  specialized: "Specialized path",
  undecided: "Undecided",
};

export const REGISTRATION_SKILLS = {
  WEB_DEV: "web_dev",
  MOBILE_DEV: "mobile_dev",
  UI_UX: "ui_ux",
  GRAPHIC_DESIGN: "graphic_design",
  VIDEO_EDITING: "video_editing",
  PHOTOGRAPHY: "photography",
  MARKETING: "marketing",
  ENGLISH: "english",
  SOFT_SKILLS: "soft_skills",
  OTHER: "other",
} as const;

export type RegistrationSkill =
  (typeof REGISTRATION_SKILLS)[keyof typeof REGISTRATION_SKILLS];

export const REGISTRATION_SKILL_VALUES = [
  REGISTRATION_SKILLS.WEB_DEV,
  REGISTRATION_SKILLS.MOBILE_DEV,
  REGISTRATION_SKILLS.UI_UX,
  REGISTRATION_SKILLS.GRAPHIC_DESIGN,
  REGISTRATION_SKILLS.VIDEO_EDITING,
  REGISTRATION_SKILLS.PHOTOGRAPHY,
  REGISTRATION_SKILLS.MARKETING,
  REGISTRATION_SKILLS.ENGLISH,
  REGISTRATION_SKILLS.SOFT_SKILLS,
  REGISTRATION_SKILLS.OTHER,
] as const;

export const REGISTRATION_SKILL_LABELS: Record<RegistrationSkill, string> = {
  web_dev: "Web development",
  mobile_dev: "Mobile development",
  ui_ux: "UI / UX",
  graphic_design: "Graphic design",
  video_editing: "Video editing",
  photography: "Photography",
  marketing: "Marketing",
  english: "English",
  soft_skills: "Soft skills",
  other: "Other",
};

export const REGISTRATION_REFERRAL_SOURCES = {
  FRIEND: "friend",
  SOCIAL: "social",
  EVENT: "event",
  SEARCH: "search",
  OTHER: "other",
} as const;

export type RegistrationReferralSource =
  (typeof REGISTRATION_REFERRAL_SOURCES)[keyof typeof REGISTRATION_REFERRAL_SOURCES];

export const REGISTRATION_REFERRAL_SOURCE_VALUES = [
  REGISTRATION_REFERRAL_SOURCES.FRIEND,
  REGISTRATION_REFERRAL_SOURCES.SOCIAL,
  REGISTRATION_REFERRAL_SOURCES.EVENT,
  REGISTRATION_REFERRAL_SOURCES.SEARCH,
  REGISTRATION_REFERRAL_SOURCES.OTHER,
] as const;

export const REGISTRATION_REFERRAL_SOURCE_LABELS: Record<
  RegistrationReferralSource,
  string
> = {
  friend: "Friend / family",
  social: "Social media",
  event: "Event",
  search: "Search",
  other: "Other",
};

export const REGISTRATION_WEEKDAYS = {
  SUN: "sun",
  MON: "mon",
  TUE: "tue",
  WED: "wed",
  THU: "thu",
  FRI: "fri",
  SAT: "sat",
} as const;

export type RegistrationWeekday =
  (typeof REGISTRATION_WEEKDAYS)[keyof typeof REGISTRATION_WEEKDAYS];

export const REGISTRATION_WEEKDAY_VALUES = [
  REGISTRATION_WEEKDAYS.SUN,
  REGISTRATION_WEEKDAYS.MON,
  REGISTRATION_WEEKDAYS.TUE,
  REGISTRATION_WEEKDAYS.WED,
  REGISTRATION_WEEKDAYS.THU,
  REGISTRATION_WEEKDAYS.FRI,
  REGISTRATION_WEEKDAYS.SAT,
] as const;

export const REGISTRATION_WEEKDAY_LABELS: Record<RegistrationWeekday, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

export const REGISTRATION_SHIFTS = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  EVENING: "evening",
} as const;

export type RegistrationShift =
  (typeof REGISTRATION_SHIFTS)[keyof typeof REGISTRATION_SHIFTS];

export const REGISTRATION_SHIFT_VALUES = [
  REGISTRATION_SHIFTS.MORNING,
  REGISTRATION_SHIFTS.AFTERNOON,
  REGISTRATION_SHIFTS.EVENING,
] as const;

export const REGISTRATION_SHIFT_LABELS: Record<RegistrationShift, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const REGISTRATION_JOB_STATUSES = {
  EMPLOYED: "employed",
  UNEMPLOYED: "unemployed",
  STUDENT_ONLY: "student_only",
  FREELANCE: "freelance",
} as const;

export type RegistrationJobStatus =
  (typeof REGISTRATION_JOB_STATUSES)[keyof typeof REGISTRATION_JOB_STATUSES];

export const REGISTRATION_JOB_STATUS_VALUES = [
  REGISTRATION_JOB_STATUSES.EMPLOYED,
  REGISTRATION_JOB_STATUSES.UNEMPLOYED,
  REGISTRATION_JOB_STATUSES.STUDENT_ONLY,
  REGISTRATION_JOB_STATUSES.FREELANCE,
] as const;

export const REGISTRATION_JOB_STATUS_LABELS: Record<
  RegistrationJobStatus,
  string
> = {
  employed: "Employed",
  unemployed: "Unemployed",
  student_only: "Student only",
  freelance: "Freelance",
};

export const REGISTRATION_APPLICATION_STATUSES = {
  OPEN: "open",
  PENDING: "pending",
  ACCEPTED: "accepted",
  APPLIED: "applied",
  MISSING: "missing",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export type RegistrationApplicationStatus =
  (typeof REGISTRATION_APPLICATION_STATUSES)[keyof typeof REGISTRATION_APPLICATION_STATUSES];

export const REGISTRATION_APPLICATION_STATUS_VALUES = [
  REGISTRATION_APPLICATION_STATUSES.OPEN,
  REGISTRATION_APPLICATION_STATUSES.PENDING,
  REGISTRATION_APPLICATION_STATUSES.ACCEPTED,
  REGISTRATION_APPLICATION_STATUSES.APPLIED,
  REGISTRATION_APPLICATION_STATUSES.MISSING,
  REGISTRATION_APPLICATION_STATUSES.REJECTED,
  REGISTRATION_APPLICATION_STATUSES.CANCELLED,
] as const;

export const REGISTRATION_APPLICATION_STATUS_LABELS: Record<
  RegistrationApplicationStatus,
  string
> = {
  open: "Open",
  pending: "Pending",
  accepted: "Accepted",
  applied: "Applied",
  missing: "Missing",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const REGISTRATION_ID_DOCUMENT_TYPES = {
  NATIONAL_ID: "national_id",
  PASSPORT: "passport",
  CIVIL_RECORD: "civil_record",
} as const;

export type RegistrationIdDocumentType =
  (typeof REGISTRATION_ID_DOCUMENT_TYPES)[keyof typeof REGISTRATION_ID_DOCUMENT_TYPES];

export const REGISTRATION_ID_DOCUMENT_TYPE_VALUES = [
  REGISTRATION_ID_DOCUMENT_TYPES.NATIONAL_ID,
  REGISTRATION_ID_DOCUMENT_TYPES.PASSPORT,
  REGISTRATION_ID_DOCUMENT_TYPES.CIVIL_RECORD,
] as const;

export const REGISTRATION_ID_DOCUMENT_TYPE_LABELS: Record<
  RegistrationIdDocumentType,
  string
> = {
  national_id: "National ID",
  passport: "Passport",
  civil_record: "Civil record",
};

export const REGISTRATION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const REGISTRATION_DOCUMENT_MAX_FILES = 3;
export const REGISTRATION_DOCUMENT_MIN_FILES = 1;

export const REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type RegistrationDocumentAllowedMimeType =
  (typeof REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES)[number];

export const REGISTRATION_DOCUMENT_ACCEPT =
  REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES.join(",");

export const REGISTRATION_STEPS = [
  "personal",
  "contact",
  "education",
  "skills",
  "availability",
  "documents",
  "review",
] as const;

export type RegistrationStep = (typeof REGISTRATION_STEPS)[number];

export const REGISTRATION_STEP_LABELS: Record<RegistrationStep, string> = {
  personal: "Personal",
  contact: "Contact",
  education: "Education",
  skills: "Skills",
  availability: "Availability",
  documents: "Documents",
  review: "Review",
};

export const REGISTRATION_LIMITS = {
  city: { min: 2, max: 100 },
  fullAddress: { min: 5, max: 500 },
  organizationName: { max: 200 },
  speciality: { max: 200 },
  selfLearningNotes: { max: 1000 },
  learningGoal: { min: 5, max: 1000 },
  referralOther: { max: 200 },
  guardianName: { min: 2, max: 100 },
  managerNotes: { max: 2000 },
  weeklyHours: { min: 1, max: 60 },
  minAgeYears: 10,
  maxAgeYears: 80,
  under18AgeYears: 18,
} as const;
