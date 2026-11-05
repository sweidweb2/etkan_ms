import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkedIn } from "@/repositories/_shared/chunked-in";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const STUDENT_CLASS_COLUMNS = "id, user_id, class_id, joined_at";

export type StudentClassRecord = {
  id: string;
  user_id: string;
  class_id: string;
  joined_at: string | null;
};

export type CreateStudentClassInput = {
  user_id: string;
  class_id: string;
};

export async function countStudentClassesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_class")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
}

export async function countDoneStudentClassesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_class")
    .select("id, classes!inner(status)", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("classes.status", "done");
}

export async function listStudentClassCountsByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client.from("student_class").select("class_id").in("class_id", classIds);
}

export async function listStudentClassEnrollments(client: Supabase) {
  return client.from("student_class").select("class_id, user_id");
}

export async function listStudentClassesByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("class_id", classId)
    .order("joined_at", { ascending: false });
}

export async function listStudentClassesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
}

/** Distinct user_ids that currently have any class membership. */
export async function listMemberUserIdsAmongUserIds(
  client: Supabase,
  userIds: string[]
) {
  return chunkedIn(userIds, (chunk) =>
    client.from("student_class").select("user_id").in("user_id", chunk)
  );
}

export type StudentClassWithClassRecord = StudentClassRecord & {
  classes: { id: string; name: string; status: string } | null;
};

export async function listStudentClassesWithClassByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_class")
    .select(
      "id, user_id, class_id, joined_at, classes ( id, name, status )"
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
}

export async function listStudentUserIdsByClassId(
  client: Supabase,
  classId: string
) {
  return client.from("student_class").select("user_id").eq("class_id", classId);
}

/** All members of a class (binary membership: any student_class row). */
export async function listMemberUserIdsByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("student_class")
    .select("user_id")
    .eq("class_id", classId);
}

/** All members of the given classes (binary membership). */
export async function listMemberUserIdsByClassIds(
  client: Supabase,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_class")
    .select("user_id, class_id")
    .in("class_id", classIds);
}

export async function findStudentClassByUserAndClass(
  client: Supabase,
  userId: string,
  classId: string
) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("user_id", userId)
    .eq("class_id", classId)
    .maybeSingle();
}

export async function createStudentClassEnrollment(
  client: Supabase,
  input: CreateStudentClassInput
) {
  return client
    .from("student_class")
    .insert({
      user_id: input.user_id,
      class_id: input.class_id,
    })
    .select(STUDENT_CLASS_COLUMNS)
    .single();
}

export type EnrollStudentInClassResult =
  | { ok: true; enrollment: StudentClassRecord }
  | { ok: false; code: "already_enrolled" };

export type EnrollStudentsInClassResult = {
  inserted: StudentClassRecord[];
  already_enrolled: string[];
};

export type TransferStudentBetweenClassesRpcResult =
  | {
      ok: true;
      from: StudentClassRecord;
      to: StudentClassRecord;
    }
  | {
      ok: false;
      code: "same_class" | "not_in_source" | "already_in_dest";
    };

function asStudentClassRecord(value: unknown): StudentClassRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.class_id !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    class_id: row.class_id,
    joined_at: typeof row.joined_at === "string" ? row.joined_at : null,
  };
}

function parseEnrollStudentInClassResult(
  data: unknown
): EnrollStudentInClassResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as { ok?: unknown; code?: unknown; enrollment?: unknown };
  if (row.ok === false && row.code === "already_enrolled") {
    return { ok: false, code: "already_enrolled" };
  }

  if (row.ok === true) {
    const enrollment = asStudentClassRecord(row.enrollment);
    if (enrollment) {
      return { ok: true, enrollment };
    }
  }

  return null;
}

function parseEnrollStudentsInClassResult(
  data: unknown
): EnrollStudentsInClassResult {
  if (!data || typeof data !== "object") {
    return { inserted: [], already_enrolled: [] };
  }

  const row = data as { inserted?: unknown; already_enrolled?: unknown };
  const inserted = Array.isArray(row.inserted)
    ? row.inserted
        .map((item) => asStudentClassRecord(item))
        .filter((item): item is StudentClassRecord => item !== null)
    : [];
  const already_enrolled = Array.isArray(row.already_enrolled)
    ? row.already_enrolled.filter((item): item is string => typeof item === "string")
    : [];

  return { inserted, already_enrolled };
}

function parseTransferStudentBetweenClassesResult(
  data: unknown
): TransferStudentBetweenClassesRpcResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as { ok?: unknown; code?: unknown; from?: unknown; to?: unknown };
  if (row.ok === false) {
    if (
      row.code === "same_class" ||
      row.code === "not_in_source" ||
      row.code === "already_in_dest"
    ) {
      return { ok: false, code: row.code };
    }
    return null;
  }

  if (row.ok === true) {
    const from = asStudentClassRecord(row.from);
    const to = asStudentClassRecord(row.to);
    if (from && to) {
      return { ok: true, from, to };
    }
  }

  return null;
}

export async function enrollStudentInClass(
  client: Supabase,
  userId: string,
  classId: string
) {
  const { data, error } = await client.rpc("enroll_student_in_class", {
    p_user_id: userId,
    p_class_id: classId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: parseEnrollStudentInClassResult(data), error: null };
}

export async function enrollStudentsInClass(
  client: Supabase,
  classId: string,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return {
      data: {
        inserted: [],
        already_enrolled: [],
      } satisfies EnrollStudentsInClassResult,
      error: null,
    };
  }

  const { data, error } = await client.rpc("enroll_students_in_class", {
    p_class_id: classId,
    p_user_ids: userIds,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: parseEnrollStudentsInClassResult(data), error: null };
}

export async function deleteStudentClassMembership(
  client: Supabase,
  id: string,
  classId: string
) {
  const { data, error } = await client.rpc("delete_student_class_membership", {
    p_id: id,
    p_class_id: classId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: asStudentClassRecord(data), error: null };
}

export async function transferStudentBetweenClasses(
  client: Supabase,
  userId: string,
  fromClassId: string,
  toClassId: string
) {
  const { data, error } = await client.rpc("transfer_student_between_classes", {
    p_user_id: userId,
    p_from_class_id: fromClassId,
    p_to_class_id: toClassId,
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: parseTransferStudentBetweenClassesResult(data),
    error: null,
  };
}

export async function findStudentClassById(client: Supabase, id: string) {
  return client
    .from("student_class")
    .select(STUDENT_CLASS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function deleteStudentClassById(client: Supabase, id: string) {
  return client
    .from("student_class")
    .delete()
    .eq("id", id)
    .select(STUDENT_CLASS_COLUMNS)
    .maybeSingle();
}

export async function countStudentClassesByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("student_class")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
}
