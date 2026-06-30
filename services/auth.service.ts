import { getAuthCallbackUrl } from "@/lib/config/site";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import { ROUTES } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { loginSchema, signupSchema } from "@/lib/validators/auth/auth";
import * as authRepository from "@/repositories/auth.repository";
import * as userRepository from "@/repositories/user.repository";
import { ROLES } from "@/lib/constants/roles";
import { createUserRecord } from "@/services/user.service";
import { resolveUserRole, syncAuthUserRole } from "@/services/role.service";
import type { LoginResult, SignupResult } from "@/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Invalid email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  return "Unable to sign in. Please try again.";
}

function mapSignupError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("password")) {
    return "Password does not meet requirements.";
  }

  return "Unable to create account. Please try again.";
}

export async function login(
  client: Supabase,
  input: { email: string; password: string; next?: string | null }
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: input.email,
    password: input.password,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const { data, error } = await authRepository.signInWithPassword(
    client,
    parsed.data.email,
    parsed.data.password
  );

  if (error || !data.user) {
    return {
      success: false,
      error: mapAuthError(error?.message ?? "Sign in failed."),
    };
  }

  const role = await resolveUserRole(client, data.user);

  return {
    success: true,
    redirectTo: getPostLoginRedirect(role, input.next),
  };
}

export async function logout(client: Supabase): Promise<void> {
  const { error } = await authRepository.signOut(client);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser(client: Supabase) {
  const { data, error } = await authRepository.getUser(client);

  if (error) {
    return null;
  }

  return data.user;
}

export async function register(
  authClient: Supabase,
  adminClient: Supabase,
  input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = parsed.data;

  const existingEmail = await userRepository.findUserByEmail(adminClient, email);

  if (existingEmail.data) {
    return {
      success: false,
      error: "An account with this email already exists.",
    };
  }

  const username = email.split("@")[0] ?? "user";

  const { data: authData, error: signUpError } = await authRepository.signUp(
    authClient,
    {
      email,
      password,
      fullName: name,
      username,
      emailRedirectTo: getAuthCallbackUrl(),
      role: ROLES.ADMIN,
    }
  );

  if (signUpError || !authData.user) {
    return {
      success: false,
      error: mapSignupError(signUpError?.message ?? "Sign up failed."),
    };
  }

  const authUserId = authData.user.id;

  try {
    await createUserRecord(adminClient, {
      authId: authUserId,
      email,
      password,
      role: ROLES.ADMIN,
    });
    await syncAuthUserRole(adminClient, authUserId, ROLES.ADMIN);
  } catch (err) {
    await authRepository.deleteAuthUser(adminClient, authUserId);
    const message = err instanceof Error ? err.message : "Registration failed.";
    return {
      success: false,
      error: message,
    };
  }

  const requiresEmailConfirmation = !authData.session;

  if (requiresEmailConfirmation) {
    return {
      success: true,
      requiresEmailConfirmation: true,
      redirectTo: `${ROUTES.LOGIN}?message=confirm_email`,
    };
  }

  if (!authData.user) {
    return { success: false, error: "Registration failed." };
  }

  return {
    success: true,
    requiresEmailConfirmation: false,
    redirectTo: appendQueryParam(
      getPostLoginRedirect(ROLES.ADMIN),
      "toast",
      "signed_up"
    ),
  };
}
