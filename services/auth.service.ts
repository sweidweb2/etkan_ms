import { getAuthCallbackUrl } from "@/lib/config/site";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import { ROUTES } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { loginSchema, signupSchema } from "@/lib/validators/auth/auth";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { ROLES } from "@/lib/constants/roles";
import { ensureStudentRegistration } from "@/services/profile.service";
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

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
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
    username: string;
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    birthDate?: string | null;
    phone?: string | null;
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

  const { username, fullName, email, password, birthDate, phone } = parsed.data;

  const existingUsername = await profileRepository.findProfileByUsername(
    adminClient,
    username
  );

  if (existingUsername.data) {
    return {
      success: false,
      error: "This username is already taken.",
      fieldErrors: { username: ["This username is already taken."] },
    };
  }

  const { data: authData, error: signUpError } = await authRepository.signUp(
    authClient,
    {
      email,
      password,
      fullName,
      username,
      emailRedirectTo: getAuthCallbackUrl(),
      role: ROLES.STUDENT,
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
    await ensureStudentRegistration(adminClient, {
      authId: authUserId,
      username,
      email,
      fullName,
      birthDate,
      phone,
      role: ROLES.STUDENT,
    });
    await syncAuthUserRole(adminClient, authUserId, ROLES.STUDENT);
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

  return {
    success: true,
    requiresEmailConfirmation: false,
    redirectTo: appendQueryParam(
      getPostLoginRedirect(ROLES.STUDENT),
      "toast",
      "signed_up"
    ),
  };
}
