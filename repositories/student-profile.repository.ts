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

export async function listStudentProfiles(client: Supabase) {
  return client
    .from("student_profiles")
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .order("created_at", { ascending: false });
}

/** Lightweight counts for the manager dashboard (avoids full student list). */
export async function countStudentDashboardStats(
  client: Supabase,
  input: { activeStatus: string; monthStartIso: string; weekAgoIso: string }
) {
  const [activeResult, monthResult, weekResult] = await Promise.all([
    client
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", input.activeStatus),
    client
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", input.monthStartIso),
    client
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", input.weekAgoIso),
  ]);

  if (activeResult.error) {
    return { data: null, error: activeResult.error };
  }
  if (monthResult.error) {
    return { data: null, error: monthResult.error };
  }
  if (weekResult.error) {
    return { data: null, error: weekResult.error };
  }

  return {
    data: {
      activeCount: activeResult.count ?? 0,
      createdThisMonth: monthResult.count ?? 0,
      createdLast7Days: weekResult.count ?? 0,
    },
    error: null,
  };
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
