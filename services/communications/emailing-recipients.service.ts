import "server-only";

import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { assertPermission } from "@/services/auth/authorization.service";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type {
  ManagerEmailingRecipientsListData,
  ManagerEmailingRecipientsListQuery,
  ManagerEmailingRecipientsListStats,
} from "@/types/manager-emailing";
import type { ManagerUserRow } from "@/types/manager-user";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const EMAILING_RECIPIENTS_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const EMAILING_RECIPIENTS_PAGE_SIZE_DEFAULT = 10;
/** PostgREST `.in()` URL safety for class-member id filters. */
const EMAILING_RECIPIENTS_IDS_IN_LIMIT = 150;
/**
 * Hard cap for role-shortcut bulk loads. Compose should not hydrate an
 * unbounded school roster in one shot — paged UI covers the rest.
 */
export const EMAILING_BULK_MAX = 500;
const EMAILING_BULK_PAGE_SIZE = 100;

export type EmailingBulkRecipientsResult = {
  users: ManagerUserRow[];
  /** True when more matching profiles exist beyond {@link EMAILING_BULK_MAX}. */
  truncated: boolean;
  limit: number;
};
const EMAILING_RECIPIENT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clampEmailingRecipientsPageSize(pageSize: number | undefined): number {
  if (
    pageSize !== undefined &&
    (EMAILING_RECIPIENTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(
      pageSize
    )
  ) {
    return pageSize;
  }
  return EMAILING_RECIPIENTS_PAGE_SIZE_DEFAULT;
}

async function fetchEmailingRecipientsListStats(
  adminClient: Supabase
): Promise<ManagerEmailingRecipientsListStats> {
  const [totalResult, studentsResult] = await Promise.all([
    profileRepository.countProfiles(adminClient),
    profileRepository.countProfiles(adminClient, {
      roles: [ROLES.STUDENT],
    }),
  ]);

  const error = totalResult.error ?? studentsResult.error ?? null;
  if (error) {
    throw new Error(error.message);
  }

  return {
    total: totalResult.count ?? 0,
    students: studentsResult.count ?? 0,
  };
}

async function hydrateEmailingRecipientRows(
  adminClient: Supabase,
  profiles: Array<{
    id: string;
    full_name: string;
    role: string;
    is_instructor: boolean;
    created_at: string | null;
  }>
): Promise<ManagerUserRow[]> {
  if (profiles.length === 0) {
    return [];
  }

  const pageIds = profiles.map((profile) => profile.id);
  const emailsResult = await authRepository.listAuthEmailsByIds(
    adminClient,
    pageIds
  );

  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }

  const emailById = emailsResult.data;
  return profiles.map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as RoleValue,
    is_instructor: profile.is_instructor,
    created_at: profile.created_at ?? "",
    email: emailById.get(profile.id) ?? "",
  }));
}

/**
 * Server-paged emailing recipients (all roles, including students).
 * Search matches profiles.full_name (and id for a pasted UUID).
 * Email is not searchable here: auth emails live outside Postgres tables.
 * Optional `userIds` restricts to a set (e.g. class members).
 */
export async function listEmailingRecipientsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: ManagerEmailingRecipientsListQuery = {}
): Promise<ManagerEmailingRecipientsListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const pageSize = clampEmailingRecipientsPageSize(query.pageSize);
  const requestedPage = Math.max(1, Math.floor(query.page ?? 1));
  const search = query.search?.trim() ?? "";
  const roleFilter = query.role ?? null;
  const userIds = query.userIds
    ? [...new Set(query.userIds.filter(Boolean))]
    : null;

  if (userIds && userIds.length === 0) {
    const stats = await fetchEmailingRecipientsListStats(adminClient);
    return {
      users: [],
      totalCount: 0,
      page: 1,
      pageSize,
      stats,
    };
  }

  const roles = roleFilter ? [roleFilter] : undefined;

  const fetchPage = (page: number) => {
    if (userIds && userIds.length > EMAILING_RECIPIENTS_IDS_IN_LIMIT) {
      return null;
    }

    return profileRepository.listProfilesPage(adminClient, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
      roles,
      search,
      ids: userIds ?? undefined,
    });
  };

  // Large id sets: load matching profiles via chunked `.in()`, then page in memory.
  if (userIds && userIds.length > EMAILING_RECIPIENTS_IDS_IN_LIMIT) {
    const [profilesResult, stats] = await Promise.all([
      profileRepository.listProfilesByIds(adminClient, userIds),
      fetchEmailingRecipientsListStats(adminClient),
    ]);

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    const normalizedSearch = search.toLowerCase();
    let profiles = profilesResult.data ?? [];
    if (roleFilter) {
      profiles = profiles.filter((profile) => profile.role === roleFilter);
    }
    if (normalizedSearch) {
      profiles = profiles.filter((profile) => {
        if (profile.full_name.toLowerCase().includes(normalizedSearch)) {
          return true;
        }
        return EMAILING_RECIPIENT_UUID_PATTERN.test(normalizedSearch)
          ? profile.id.toLowerCase() === normalizedSearch
          : false;
      });
    }

    profiles = [...profiles].sort((a, b) => {
      const createdDiff = (b.created_at ?? "").localeCompare(a.created_at ?? "");
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return b.id.localeCompare(a.id);
    });

    const totalCount = profiles.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const pageProfiles = profiles.slice((page - 1) * pageSize, page * pageSize);
    const users = await hydrateEmailingRecipientRows(adminClient, pageProfiles);

    return { users, totalCount, page, pageSize, stats };
  }

  const [initialPageResult, stats] = await Promise.all([
    fetchPage(requestedPage)!,
    fetchEmailingRecipientsListStats(adminClient),
  ]);

  let pageResult = initialPageResult;
  let page = requestedPage;

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }

  const totalCount = pageResult.count ?? 0;

  if (totalCount > 0 && (pageResult.data ?? []).length === 0) {
    page = Math.max(1, Math.ceil(totalCount / pageSize));
    pageResult = await fetchPage(page)!;
    if (pageResult.error) {
      throw new Error(pageResult.error.message);
    }
  }

  const users = await hydrateEmailingRecipientRows(
    adminClient,
    pageResult.data ?? []
  );

  return { users, totalCount, page, pageSize, stats };
}

/**
 * On-demand bulk roster for compose/resend role shortcuts.
 * Pages profiles up to {@link EMAILING_BULK_MAX}, then hydrates emails.
 * Prefer `listEmailingRecipientsPageForManager` for table/search UIs.
 */
export async function listEmailingRecipientsForBulkForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  roles?: RoleValue[] | null
): Promise<EmailingBulkRecipientsResult> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const roleFilter = roles?.length ? roles : undefined;
  const profiles: Array<{
    id: string;
    full_name: string;
    role: string;
    is_instructor: boolean;
    created_at: string | null;
  }> = [];

  let offset = 0;
  let truncated = false;
  while (profiles.length < EMAILING_BULK_MAX) {
    const limit = Math.min(
      EMAILING_BULK_PAGE_SIZE,
      EMAILING_BULK_MAX - profiles.length
    );
    const pageResult = await profileRepository.listProfilesPage(adminClient, {
      offset,
      limit,
      roles: roleFilter,
    });

    if (pageResult.error) {
      throw new Error(pageResult.error.message);
    }

    const rows = pageResult.data ?? [];
    profiles.push(...rows);
    if (rows.length < limit) {
      break;
    }
    offset += rows.length;
    if (profiles.length >= EMAILING_BULK_MAX) {
      const peek = await profileRepository.listProfilesPage(adminClient, {
        offset,
        limit: 1,
        roles: roleFilter,
      });
      if (peek.error) {
        throw new Error(peek.error.message);
      }
      truncated = (peek.data?.length ?? 0) > 0;
      break;
    }
  }

  const users = await hydrateEmailingRecipientRows(adminClient, profiles);
  return { users, truncated, limit: EMAILING_BULK_MAX };
}

/**
 * Resolve a typed email to an existing user when possible.
 */
export async function findEmailingRecipientByEmailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  email: string
): Promise<ManagerUserRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const { data: authUser, error } = await authRepository.findAuthUserByEmail(
    adminClient,
    email
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!authUser?.user) {
    return null;
  }

  const userId = authUser.user.id;
  const { data: profile, error: profileError } =
    await profileRepository.findProfileById(adminClient, userId);

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) {
    return null;
  }

  const [row] = await hydrateEmailingRecipientRows(adminClient, [profile]);
  return row ?? null;
}
