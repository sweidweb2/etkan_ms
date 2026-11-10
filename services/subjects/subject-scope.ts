import "server-only";

import type { PermissionKey } from "@/lib/constants/permissions";
import {
  SUBJECT_SCOPES,
  SUBJECT_SCOPE_COPY,
  SUBJECT_SCOPE_PERMISSIONS,
  type SubjectScope,
  type SubjectScopeCopy,
} from "@/lib/constants/subject-scope";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import type { SubjectCapabilityRecord } from "@/repositories/subject-capability";
import type { Database } from "@/types/supabase";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

type CatalogRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string | null;
};

type RepoResult<T> = Promise<{
  data: T | null;
  error: PostgrestError | null;
}>;

/**
 * Read path for one capability matrix. Subjects come from the academic
 * catalog; capabilities stay on the scope's own table.
 */
export type SubjectScopeAdapter = {
  scope: SubjectScope;
  copy: SubjectScopeCopy;
  permissions: {
    view: PermissionKey;
    capabilitiesUpdate: PermissionKey;
  };
  catalog: {
    list: (client: Supabase) => RepoResult<CatalogRow[]>;
    listIds: (client: Supabase) => RepoResult<{ id: string }[]>;
    findById: (client: Supabase, id: string) => RepoResult<CatalogRow>;
  };
  capabilities: {
    listByUserIds: (
      client: Supabase,
      userIds: string[]
    ) => Promise<{
      data: SubjectCapabilityRecord[];
      error: PostgrestError | null;
    }>;
    deleteByPairs: (
      client: Supabase,
      pairs: { user_id: string; subject_id: string }[]
    ) => Promise<{ error: PostgrestError | null }>;
    insert: (
      client: Supabase,
      pairs: { user_id: string; subject_id: string }[]
    ) => Promise<{ error: PostgrestError | null }>;
  };
  people: {
    listIds: (client: Supabase) => RepoResult<{ id: string }[]>;
    /** Whether a profile row belongs to this scope. */
    isMember: (profile: { is_instructor?: boolean }) =>
      | boolean
      | undefined;
  };
};

const instructorAdapter: SubjectScopeAdapter = {
  scope: SUBJECT_SCOPES.INSTRUCTOR,
  copy: SUBJECT_SCOPE_COPY.instructor,
  permissions: {
    view: SUBJECT_SCOPE_PERMISSIONS.instructor.view,
    capabilitiesUpdate: SUBJECT_SCOPE_PERMISSIONS.instructor.capabilitiesUpdate,
  },
  catalog: {
    list: subjectRepository.listSubjectsForCapabilityMatrix,
    listIds: subjectRepository.listSubjectIds,
    findById: subjectRepository.findSubjectForCapabilityMatrix,
  },
  capabilities: {
    listByUserIds: instructorSubjectCapabilityRepository.listCapabilitiesByUserIds,
    deleteByPairs:
      instructorSubjectCapabilityRepository.deleteCapabilitiesByPairs,
    insert: instructorSubjectCapabilityRepository.insertCapabilities,
  },
  people: {
    listIds: profileRepository.listInstructorProfileIds,
    isMember: (profile) => profile.is_instructor,
  },
};

const ADAPTERS: Record<SubjectScope, SubjectScopeAdapter> = {
  instructor: instructorAdapter,
};

export function getSubjectScopeAdapter(
  scope: SubjectScope
): SubjectScopeAdapter {
  return ADAPTERS[scope];
}
