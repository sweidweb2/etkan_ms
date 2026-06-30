import type { User } from "@supabase/supabase-js";

export type { User as AuthUser };

export type FieldErrors = Partial<Record<string, string[]>>;

export type LoginSuccess = {
  success: true;
  redirectTo: string;
};

export type LoginFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type LoginResult = LoginSuccess | LoginFailure;

export type LoginActionState = {
  error?: string;
  fieldErrors?: FieldErrors;
  message?: string;
};

export type SignupSuccess = {
  success: true;
  redirectTo: string;
  requiresEmailConfirmation: boolean;
};

export type SignupFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type SignupResult = SignupSuccess | SignupFailure;

export type SignupActionState = LoginActionState;
