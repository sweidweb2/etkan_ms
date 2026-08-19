"use server";

import { redirect } from "next/navigation";
import { checkAuthRateLimit } from "@/lib/rate-limit/auth-rate-limit";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { parseLoginFormData } from "@/lib/validators/auth/form-data";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { login } from "@/services/auth/auth.service";
import type { LoginActionState } from "@/types/auth";

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = parseLoginFormData(formData);

  if (!parsed.success) {
    return {
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const rateLimit = await checkAuthRateLimit("login");

  if (!rateLimit.allowed) {
    return { error: rateLimit.message };
  }

  const client = await createSupabaseServerActionClient();
  const result = await login(client, {
    email: parsed.data.email,
    password: parsed.data.password,
    next: String(formData.get("next") ?? "") || null,
  });

  if (result.success) {
    redirect(appendQueryParam(result.redirectTo, "toast", "signed_in"));
  }

  return {
    error: result.error,
    fieldErrors: result.fieldErrors,
  };
}
