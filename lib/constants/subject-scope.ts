import { PERMISSIONS } from "@/lib/constants/permissions";

/**
 * Capability matrices are scoped. Columns come from the academic `subjects`
 * table; each scope stores its own capability rows.
 */
export const SUBJECT_SCOPES = {
  INSTRUCTOR: "instructor",
} as const;

export type SubjectScope = (typeof SUBJECT_SCOPES)[keyof typeof SUBJECT_SCOPES];

export const SUBJECT_SCOPE_VALUES = [
  SUBJECT_SCOPES.INSTRUCTOR,
] as const satisfies readonly SubjectScope[];

export type SubjectScopeCopy = {
  /** "Subject" */
  subjectSingular: string;
  /** "Subjects" */
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
    subjectSingular: "Subject",
    subjectPlural: "Subjects",
    subjectSingularLower: "subject",
    subjectPluralLower: "subjects",
    personSingular: "Instructor",
    personPlural: "Instructors",
    personPluralLower: "instructors",
  },
};

export const SUBJECT_SCOPE_PERMISSIONS = {
  instructor: {
    view: PERMISSIONS.INSTRUCTORS_VIEW,
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
