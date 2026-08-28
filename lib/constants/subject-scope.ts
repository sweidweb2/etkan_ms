import { PERMISSIONS } from "@/lib/constants/permissions";

/**
 * Subject catalogs are scoped: instructors and mentors each own an independent
 * catalog and capability matrix backed by their own tables.
 */
export const SUBJECT_SCOPES = {
  INSTRUCTOR: "instructor",
  MENTOR: "mentor",
} as const;

export type SubjectScope = (typeof SUBJECT_SCOPES)[keyof typeof SUBJECT_SCOPES];

export const SUBJECT_SCOPE_VALUES = [
  SUBJECT_SCOPES.INSTRUCTOR,
  SUBJECT_SCOPES.MENTOR,
] as const satisfies readonly SubjectScope[];

export type SubjectScopeCopy = {
  /** "Instructor subject" */
  subjectSingular: string;
  /** "Instructor subjects" */
  subjectPlural: string;
  /** Lowercased for mid-sentence use. */
  subjectSingularLower: string;
  subjectPluralLower: string;
  /** "Instructor" — the person a capability belongs to. */
  personSingular: string;
  personPlural: string;
  personPluralLower: string;
};

export const SUBJECT_SCOPE_COPY: Record<SubjectScope, SubjectScopeCopy> = {
  instructor: {
    subjectSingular: "Instructor subject",
    subjectPlural: "Instructor subjects",
    subjectSingularLower: "instructor subject",
    subjectPluralLower: "instructor subjects",
    personSingular: "Instructor",
    personPlural: "Instructors",
    personPluralLower: "instructors",
  },
  mentor: {
    subjectSingular: "Mentor subject",
    subjectPlural: "Mentor subjects",
    subjectSingularLower: "mentor subject",
    subjectPluralLower: "mentor subjects",
    personSingular: "Mentor",
    personPlural: "Mentors",
    personPluralLower: "mentors",
  },
};

export const SUBJECT_SCOPE_PERMISSIONS = {
  instructor: {
    view: PERMISSIONS.INSTRUCTORS_VIEW,
    subjectsCreate: PERMISSIONS.INSTRUCTORS_SUBJECTS_CREATE,
    subjectsUpdate: PERMISSIONS.INSTRUCTORS_SUBJECTS_UPDATE,
    subjectsDelete: PERMISSIONS.INSTRUCTORS_SUBJECTS_DELETE,
    capabilitiesUpdate: PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE,
  },
  mentor: {
    view: PERMISSIONS.MENTORS_VIEW,
    subjectsCreate: PERMISSIONS.MENTORS_SUBJECTS_CREATE,
    subjectsUpdate: PERMISSIONS.MENTORS_SUBJECTS_UPDATE,
    subjectsDelete: PERMISSIONS.MENTORS_SUBJECTS_DELETE,
    capabilitiesUpdate: PERMISSIONS.MENTORS_CAPABILITIES_UPDATE,
  },
} as const satisfies Record<
  SubjectScope,
  Record<string, (typeof PERMISSIONS)[keyof typeof PERMISSIONS]>
>;

export function isSubjectScope(value: unknown): value is SubjectScope {
  return (
    typeof value === "string" &&
    SUBJECT_SCOPE_VALUES.includes(value as SubjectScope)
  );
}
