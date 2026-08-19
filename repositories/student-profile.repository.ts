import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function findStudentProfileByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_profiles")
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function findStudentProfileById(
  client: Supabase,
  studentProfileId: string
) {
  return client
    .from("student_profiles")
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .eq("id", studentProfileId)
    .maybeSingle();
}

export async function listStudentProfilesByIds(
  client: Supabase,
  studentProfileIds: string[]
) {
  if (studentProfileIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_profiles")
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .in("id", studentProfileIds);
}

export async function listStudentProfiles(client: Supabase) {
  return client
    .from("student_profiles")
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .order("created_at", { ascending: false });
}

/** Students not currently enrolled in any of the given user ids (slim columns). */
export async function listStudentProfilesExcludingUserIds(
  client: Supabase,
  excludeUserIds: string[]
) {
  let query = client
    .from("student_profiles")
    .select("id, user_id, full_name, phone, status")
    .order("full_name", { ascending: true });

  if (excludeUserIds.length > 0) {
    query = query.not("user_id", "in", `(${excludeUserIds.join(",")})`);
  }

  return query;
}

export async function listStudentProfilesByUserIds(
  client: Supabase,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_profiles")
    .select("id, user_id, full_name")
    .in("user_id", userIds);
}

export async function listStudentProfileDetailsByUserIds(
  client: Supabase,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_profiles")
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .in("user_id", userIds);
}

export async function createStudentProfile(
  client: Supabase,
  input: {
    user_id: string;
    full_name: string;
    birth_date?: string | null;
    phone?: string | null;
    status?: string;
  }
) {
  return client
    .from("student_profiles")
    .insert({
      user_id: input.user_id,
      full_name: input.full_name,
      birth_date: input.birth_date ?? null,
      phone: input.phone ?? null,
      status: input.status ?? "active",
    })
    .select("id, user_id")
    .single();
}

export async function updateStudentProfileById(
  client: Supabase,
  studentProfileId: string,
  input: {
    full_name: string;
    birth_date?: string | null;
    phone?: string | null;
    status: string;
  }
) {
  return client
    .from("student_profiles")
    .update({
      full_name: input.full_name,
      birth_date: input.birth_date ?? null,
      phone: input.phone ?? null,
      status: input.status,
    })
    .eq("id", studentProfileId)
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .single();
}

export async function updateStudentProfileStatusById(
  client: Supabase,
  studentProfileId: string,
  status: string
) {
  return client
    .from("student_profiles")
    .update({ status })
    .eq("id", studentProfileId)
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .single();
}

export type ChangeStudentStatusRemovedClass = {
  studentClassId: string;
  classId: string;
  className: string;
};

export type ChangeStudentStatusDeletedSpp = {
  sppId: string;
  paymentPhaseId: string;
  paymentPhaseName: string;
  sppStatus: string;
};

export type ChangeStudentStatusRetainedSpp = {
  classId: string;
  semesterId: string | null;
  spp: {
    id: string;
    status: string;
    remaining_amount: number;
  } | null;
};

export type ChangeStudentStatusRpcResult = {
  profileId: string;
  previousStatus: string;
  status: string;
  removedClasses: ChangeStudentStatusRemovedClass[];
  retainedSpps: ChangeStudentStatusRetainedSpp[];
  deletedSpps: ChangeStudentStatusDeletedSpp[];
};

function asNumber(input: unknown) {
  return typeof input === "number" ? input : input == null ? 0 : Number(input);
}

function asRemovedClass(
  value: unknown
): ChangeStudentStatusRemovedClass | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.studentClassId !== "string" || typeof row.classId !== "string") {
    return null;
  }
  return {
    studentClassId: row.studentClassId,
    classId: row.classId,
    className: typeof row.className === "string" ? row.className : "Untitled class",
  };
}

function asDeletedSpp(value: unknown): ChangeStudentStatusDeletedSpp | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.sppId !== "string" || typeof row.paymentPhaseId !== "string") {
    return null;
  }
  return {
    sppId: row.sppId,
    paymentPhaseId: row.paymentPhaseId,
    paymentPhaseName:
      typeof row.paymentPhaseName === "string"
        ? row.paymentPhaseName
        : "Payment phase",
    sppStatus: typeof row.sppStatus === "string" ? row.sppStatus : "",
  };
}

function asRetainedSpp(value: unknown): ChangeStudentStatusRetainedSpp | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.classId !== "string") {
    return null;
  }

  const sppRaw = row.spp;
  let spp: ChangeStudentStatusRetainedSpp["spp"] = null;
  if (sppRaw && typeof sppRaw === "object") {
    const sppRow = sppRaw as Record<string, unknown>;
    if (typeof sppRow.id === "string") {
      spp = {
        id: sppRow.id,
        status: typeof sppRow.status === "string" ? sppRow.status : "",
        remaining_amount: asNumber(sppRow.remaining_amount),
      };
    }
  }

  return {
    classId: row.classId,
    semesterId: typeof row.semesterId === "string" ? row.semesterId : null,
    spp,
  };
}

export async function changeStudentStatusWithSideEffects(
  client: Supabase,
  input: {
    user_id: string;
    target_status: string;
    remove_from_classes: boolean;
    remove_open_spps: boolean;
  }
) {
  const { data, error } = await client.rpc("change_student_status", {
    p_user_id: input.user_id,
    p_target_status: input.target_status,
    p_remove_from_classes: input.remove_from_classes,
    p_remove_open_spps: input.remove_open_spps,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        profileId: "",
        previousStatus: "",
        status: "",
        removedClasses: [],
        retainedSpps: [],
        deletedSpps: [],
      } satisfies ChangeStudentStatusRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  const removedClasses = Array.isArray(row.removedClasses)
    ? row.removedClasses.flatMap((item) => {
        const parsed = asRemovedClass(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const retainedSpps = Array.isArray(row.retainedSpps)
    ? row.retainedSpps.flatMap((item) => {
        const parsed = asRetainedSpp(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const deletedSpps = Array.isArray(row.deletedSpps)
    ? row.deletedSpps.flatMap((item) => {
        const parsed = asDeletedSpp(item);
        return parsed ? [parsed] : [];
      })
    : [];

  return {
    data: {
      profileId: typeof row.profileId === "string" ? row.profileId : "",
      previousStatus:
        typeof row.previousStatus === "string" ? row.previousStatus : "",
      status: typeof row.status === "string" ? row.status : "",
      removedClasses,
      retainedSpps,
      deletedSpps,
    } satisfies ChangeStudentStatusRpcResult,
    error: null,
  };
}
