"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkAuthRateLimit } from "@/lib/rate-limit/auth-rate-limit";
import { parseSignupFormData } from "@/lib/validators/auth/form-data";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { register } from "@/services/auth.service";
import type { SignupActionState } from "@/types/auth";

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const parsed = parseSignupFormData(formData);

  if (!parsed.success) {
    return {
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const rateLimit = await checkAuthRateLimit("signup", parsed.data.email);

  if (!rateLimit.allowed) {
    return { error: rateLimit.message };
  }

  const authClient = await createSupabaseServerActionClient();
  const adminClient = createSupabaseAdminClient();

  const result = await register(authClient, adminClient, {
    username: parsed.data.username,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    password: parsed.data.password,
    confirmPassword: parsed.data.confirmPassword,
    birthDate: parsed.data.birthDate || null,
    phone: parsed.data.phone || null,
  });

  if (result.success) {
    redirect(result.redirectTo);
  }

  return {
    error: result.error,
    fieldErrors: result.fieldErrors,
  };
}
