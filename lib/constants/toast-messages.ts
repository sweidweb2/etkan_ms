export const TOAST_QUERY_KEYS = {
  success: "toast",
  error: "error",
  info: "message",
} as const;

export const TOAST_MESSAGES = {
  success: {
    signed_in: "Signed in successfully.",
    signed_out: "You have been signed out.",
    signed_up: "Account created. Welcome!",
  },
  error: {
    auth_callback_failed:
      "Sign-in link expired or is invalid. Please try again.",
    auth_failed: "Authentication failed.",
  },
  info: {
    confirm_email:
      "Account created. Check your email to confirm, then sign in.",
  },
} as const;
