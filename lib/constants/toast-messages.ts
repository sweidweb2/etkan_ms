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
    staff_user_created: "Staff account created.",
    student_created: "Student account created.",
    student_updated: "Student details updated.",
    session_deleted: "Session deleted.",
  },
  error: {
    auth_callback_failed:
      "Sign-in link expired or is invalid. Please try again.",
    auth_failed: "Authentication failed.",
  },
  info: {
    confirm_email:
      "Account created. Check your email to confirm, then sign in.",
    session_expired:
      "Your session expired due to inactivity. Please sign in again.",
  },
} as const;
