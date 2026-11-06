import { PERMISSIONS } from "@/lib/constants/permissions";

/**
 * Subject catalogs are scoped: each scope owns an independent catalog and
 * capability matrix backed by its own tables.
 */
export const SUBJECT_SCOPES = {
  INSTRUCTOR: "instructor",
} as const;

export type SubjectScope = (typeof SUBJECT_SCOPES)[keyof typeof SUBJECT_SCOPES];

export const SUBJECT_SCOPE_VALUES = [
  SUBJECT_SCOPES.INSTRUCTOR,
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
};

export const SUBJECT_SCOPE_PERMISSIONS = {
  instructor: {
    view: PERMISSIONS.INSTRUCTORS_VIEW,
    subjectsCreate: PERMISSIONS.INSTRUCTORS_SUBJECTS_CREATE,
    subjectsUpdate: PERMISSIONS.INSTRUCTORS_SUBJECTS_UPDATE,
    subjectsDelete: PERMISSIONS.INSTRUCTORS_SUBJECTS_DELETE,
    capabilitiesUpdate: PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE,
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
