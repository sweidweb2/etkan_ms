import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CLASS_COLUMNS =
  "id, subject_id, name, status, semester_id, image_url, card_gradient, created_at";

export type ClassRecord = {
  id: string;
  subject_id: string | null;
  name: string;
  status: string | null;
  semester_id: string | null;
  image_url: string | null;
  card_gradient: string;
  created_at: string | null;
};

const CLASS_LIST_COLUMNS = "id, name";

export async function listClasses(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_LIST_COLUMNS)
    .order("name", { ascending: true });
}

export async function listInProgressClasses(client: Supabase) {
  return client
    .from("classes")
    .select("id, name")
    .eq("status", "in_progress")
    .order("name", { ascending: true });
}

export async function listInProgressClassesWithSemester(client: Supabase) {
  return client
    .from("classes")
    .select("id, name, semester_id")
    .eq("status", "in_progress")
    .order("name", { ascending: true });
}

/**
 * Billing batch: all in-progress classes with created_at so callers can pick
 * oldest per semester without N+1 finds.
 */
export async function listInProgressClassesForBilling(client: Supabase) {
  return client
    .from("classes")
    .select("id, name, semester_id, created_at")
    .eq("status", "in_progress")
    .order("created_at", { ascending: true });
}

const CLASS_PICKER_SELECT = "id, name, subjects ( name )";

export type ClassPickerRecord = {
  id: string;
  name: string;
  subjects: { name: string } | null;
};

export async function listClassesWithSubjectForPicker(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_PICKER_SELECT)
    .order("name", { ascending: true });
}

export async function listClassSubjectIds(client: Supabase) {
  return client.from("classes").select("subject_id");
}

export async function listClassesBySubjectId(client: Supabase, subjectId: string) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
}

export async function countClassesBySubjectId(client: Supabase, subjectId: string) {
  return client
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId);
}

export async function listClassesBySemesterId(client: Supabase, semesterId: string) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("semester_id", semesterId)
    .order("created_at", { ascending: false });
}

export async function countClassesBySemesterId(client: Supabase, semesterId: string) {
  return client
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("semester_id", semesterId);
}

const CLASS_WITH_SUBJECT_SELECT =
  "id, subject_id, name, status, semester_id, image_url, card_gradient, created_at, subjects ( name, nb_sessions )";

export type ClassWithSubjectRecord = ClassRecord & {
  subjects: { name: string; nb_sessions: number } | null;
};

export async function findClassById(client: Supabase, id: string) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

/**
 * Billing class for a semester: status = in_progress.
 * If multiple exist, pick oldest created_at (deterministic).
 */
export async function findInProgressClassBySemesterId(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("semester_id", semesterId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
}

/** Another in-progress class on the same semester (exclude one class id). */
export async function findOtherInProgressClassBySemesterId(
  client: Supabase,
  semesterId: string,
  excludeClassId: string
) {
  return client
    .from("classes")
    .select(CLASS_COLUMNS)
    .eq("semester_id", semesterId)
    .eq("status", "in_progress")
    .neq("id", excludeClassId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
}

export async function listClassesWithSubjectBySemesterId(
  client: Supabase,
  semesterId: string
) {
  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .eq("semester_id", semesterId)
    .order("created_at", { ascending: false });
}

export async function listClassesWithSubjectByIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .in("id", classIds);
}

export async function listLinkedClassesWithSubject(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .not("semester_id", "is", null)
    .order("created_at", { ascending: false });
}

export async function listUnlinkedClassesWithSubject(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_WITH_SUBJECT_SELECT)
    .is("semester_id", null)
    .order("created_at", { ascending: false });
}

export async function updateClassSemesterId(
  client: Supabase,
  classId: string,
  semesterId: string
) {
  return client
    .from("classes")
    .update({ semester_id: semesterId })
    .eq("id", classId)
    .select(CLASS_WITH_SUBJECT_SELECT)
    .single();
}

const CLASS_DETAIL_SELECT =
  "id, subject_id, name, status, semester_id, image_url, card_gradient, created_at, subjects ( name, nb_sessions ), semesters ( name )";

export type ClassDetailRecord = ClassRecord & {
  subjects: { name: string; nb_sessions: number } | null;
  semesters: { name: string } | null;
};

export type UpdateClassRecordInput = {
  name: string;
  subject_id: string;
  status: string;
  semester_id: string | null;
};

export async function findClassDetailById(client: Supabase, id: string) {
  return client
    .from("classes")
    .select(CLASS_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();
}

export async function updateClass(
  client: Supabase,
  classId: string,
  input: UpdateClassRecordInput
) {
  return client
    .from("classes")
    .update({
      name: input.name,
      subject_id: input.subject_id,
      status: input.status,
      semester_id: input.semester_id,
    })
    .eq("id", classId)
    .select(CLASS_DETAIL_SELECT)
    .single();
}

export async function updateClassImageUrl(
  client: Supabase,
  classId: string,
  imageUrl: string | null
) {
  return client
    .from("classes")
    .update({ image_url: imageUrl })
    .eq("id", classId)
    .select(CLASS_DETAIL_SELECT)
    .single();
}

export async function updateClassStatus(
  client: Supabase,
  classId: string,
  status: string
) {
  return client
    .from("classes")
    .update({ status })
    .eq("id", classId)
    .select(CLASS_DETAIL_SELECT)
    .single();
}

export type CreateClassRecordInput = {
  name: string;
  subject_id: string;
  status: string;
  semester_id: string | null;
  card_gradient: string;
};

export async function listClassDetails(client: Supabase) {
  return client
    .from("classes")
    .select(CLASS_DETAIL_SELECT)
    .order("created_at", { ascending: false });
}

export type ListClassDetailsPageInput = {
  offset: number;
  limit: number;
  status?: string;
  semesterId?: string;
  /** Only classes without a semester (ignored when `semesterId` is set). */
  unlinkedSemester?: boolean;
  /** Matches class name or subject name (case-insensitive). */
  search?: string;
};

function sanitizeClassSearch(search: string | undefined) {
  return search?.trim().replace(/[%_,()\\]/g, "") ?? "";
}

/**
 * One page of class detail rows (exact total count).
 * Search matches class `name` and joined subject `name`.
 */
export async function listClassDetailsPage(
  client: Supabase,
  input: ListClassDetailsPageInput
) {
  const search = sanitizeClassSearch(input.search);

  let subjectIds: string[] = [];
  if (search) {
    const subjectsResult = await client
      .from("subjects")
      .select("id")
      .ilike("name", `%${search}%`);

    if (subjectsResult.error) {
      return {
        data: null,
        error: subjectsResult.error,
        count: null,
      };
    }
    subjectIds = (subjectsResult.data ?? []).map((row) => row.id);
  }

  let query = client
    .from("classes")
    .select(CLASS_DETAIL_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (input.status) {
    query = query.eq("status", input.status);
  }
  if (input.semesterId) {
    query = query.eq("semester_id", input.semesterId);
  } else if (input.unlinkedSemester) {
    query = query.is("semester_id", null);
  }
  if (search) {
    const filters = [`name.ilike.%${search}%`];
    if (subjectIds.length > 0) {
      filters.push(`subject_id.in.(${subjectIds.join(",")})`);
    }
    query = query.or(filters.join(","));
  }

  return query.range(input.offset, input.offset + input.limit - 1);
}

/** Head counts per status (global, unfiltered) for manage-classes stat cards. */
export async function countClassesByStatuses(
  client: Supabase,
  statuses: readonly string[]
) {
  const results = await Promise.all(
    statuses.map((status) =>
      client
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("status", status)
    )
  );

  const counts: Record<string, number> = {};
  for (let index = 0; index < statuses.length; index += 1) {
    const result = results[index];
    if (!result || result.error) {
      return {
        data: null,
        error: result?.error ?? { message: "Unable to count classes." },
      };
    }
    counts[statuses[index]!] = result.count ?? 0;
  }

  return { data: counts, error: null };
}

export async function createClass(
  client: Supabase,
  input: CreateClassRecordInput
) {
  return client
    .from("classes")
    .insert({
      name: input.name,
      subject_id: input.subject_id,
      status: input.status,
      semester_id: input.semester_id,
      card_gradient: input.card_gradient,
    })
    .select(CLASS_DETAIL_SELECT)
    .single();
}
