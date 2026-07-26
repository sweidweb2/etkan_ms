export const en = {
  "brand.name": "Etkan MS",
  "brand.description": "School management system",

  "nav.home": "Home",
  "nav.login": "Log in",
  "nav.register": "Register",
  "nav.dashboard": "Dashboard",
  "nav.openMenu": "Open menu",
  "nav.navigate": "Navigate the site",
  "nav.language": "Language",

  "hero.title": "School management, clearly organized",
  "hero.subtitle":
    "Administration and student management in one place—built for your school’s daily work.",
  "hero.ctaLogin": "Log in",
  "hero.ctaRegister": "Create account",
  "hero.ctaDashboard": "Go to dashboard",

  "auth.login.title": "Sign in",
  "auth.login.description": "Enter your credentials to access your account.",
  "auth.login.submit": "Sign in",
  "auth.login.submitting": "Signing in…",
  "auth.login.noAccount": "Don't have an account?",
  "auth.login.signUpLink": "Sign up",

  "auth.signup.title": "Create account",
  "auth.signup.description": "Register as a student with your profile details.",
  "auth.signup.submit": "Create account",
  "auth.signup.submitting": "Creating account…",
  "auth.signup.hasAccount": "Already have an account?",
  "auth.signup.signInLink": "Sign in",
  "auth.signup.backToSignIn": "Back to sign in",

  "auth.field.email": "Email",
  "auth.field.password": "Password",
  "auth.field.username": "Username",
  "auth.field.fullName": "Full name",
  "auth.field.birthDate": "Birth date",
  "auth.field.phone": "Phone",
  "auth.field.confirmPassword": "Confirm password",

  "auth.placeholder.email": "you@example.com",
  "auth.placeholder.username": "student_username",
  "auth.placeholder.fullName": "Your full name",
  "auth.placeholder.phone": "+961 ...",

  "auth.hint.username":
    "3–30 characters, letters, numbers, underscores",
  "auth.hint.fullName": "2–80 characters",
  "auth.hint.email": "Valid email format, max 254 characters",
  "auth.hint.password": "8–72 characters",
  "auth.hint.confirmPassword": "Must match password (8–72 characters)",
  "auth.hint.phone": "Optional, max 20 characters",
  "auth.hint.birthDate": "Optional, cannot be in the future",

  "auth.loading": "Loading…",

  "maintenance.title": "Maintenance mode",
  "maintenance.description":
    "The app is temporarily unavailable. Please try again later.",
  "maintenance.managerHint": "Manager can turn it off here:",
  "maintenance.settingsLink": "Settings",

  "language.en": "EN",
  "language.ar": "ع",
} as const;

export type MessageKey = keyof typeof en;
