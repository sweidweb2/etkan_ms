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
import * as instructorSubjectRepository from "@/repositories/instructor-subject.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { SubjectCapabilityRecord } from "@/repositories/subject-capability";
import type { Database } from "@/types/supabase";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

type CatalogRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

type RepoResult<T> = Promise<{
  data: T | null;
  error: PostgrestError | null;
}>;

/**
 * Everything the scoped catalog service needs to talk to one scope's tables.
 * Repositories stay concrete per table; only this adapter varies.
 */
export type SubjectScopeAdapter = {
  scope: SubjectScope;
  copy: SubjectScopeCopy;
  permissions: {
    view: PermissionKey;
    subjectsCreate: PermissionKey;
    subjectsUpdate: PermissionKey;
    subjectsDelete: PermissionKey;
    capabilitiesUpdate: PermissionKey;
  };
  catalog: {
    list: (client: Supabase) => RepoResult<CatalogRow[]>;
    listIds: (client: Supabase) => RepoResult<{ id: string }[]>;
    findById: (client: Supabase, id: string) => RepoResult<CatalogRow>;
    findByName: (
      client: Supabase,
      name: string
    ) => RepoResult<{ id: string; name: string }>;
    getMaxSortOrder: (client: Supabase) => RepoResult<{ sort_order: number }>;
    create: (
      client: Supabase,
      input: { name: string; sort_order: number }
    ) => RepoResult<CatalogRow>;
    updateById: (
      client: Supabase,
      id: string,
      input: { name: string }
    ) => RepoResult<CatalogRow>;
    reorder: (
      client: Supabase,
      orderedIds: string[]
    ) => RepoResult<CatalogRow[]>;
    deleteById: (
      client: Supabase,
      id: string
    ) => Promise<{ error: PostgrestError | null }>;
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
  permissions: SUBJECT_SCOPE_PERMISSIONS.instructor,
  catalog: {
    list: instructorSubjectRepository.listInstructorSubjects,
    listIds: instructorSubjectRepository.listInstructorSubjectIds,
    findById: instructorSubjectRepository.findInstructorSubjectById,
    findByName: instructorSubjectRepository.findInstructorSubjectByName,
    getMaxSortOrder:
      instructorSubjectRepository.getMaxInstructorSubjectSortOrder,
    create: instructorSubjectRepository.createInstructorSubject,
    updateById: instructorSubjectRepository.updateInstructorSubjectById,
    reorder: instructorSubjectRepository.reorderInstructorSubjects,
    deleteById: instructorSubjectRepository.deleteInstructorSubjectById,
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
