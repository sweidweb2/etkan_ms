export const en = {
  "brand.name": "Etkan MS",
  "brand.description": "School management system",

  "nav.home": "Home",
  "nav.about": "About us",
  "nav.courses": "Courses",
  "nav.life": "Life",
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

  "about.eyebrow": "Our model",
  "about.title": "Learning that builds people—and real technology",
  "about.lead":
    "Etkan is a distinctive learning model built around small teams of about ten students, ages sixteen to twenty-one, working in a setting that mirrors real industrial and technological practice. Participants are not only receivers of knowledge—they move through a full journey that includes:",
  "about.image.alt":
    "Illustration of a collaborative tech team coding, building robotics, and developing ideas",
  "about.journey.eyebrow": "The journey",
  "about.pillar.1.title": "Hands-on training",
  "about.pillar.1.body":
    "Practical training with comprehensive and specialized workshops that turn concepts into skill.",
  "about.pillar.2.title": "Project planning & delivery",
  "about.pillar.2.body":
    "From idea to execution—planning projects carefully and carrying them through to completion.",
  "about.pillar.3.title": "Cross-disciplinary teamwork",
  "about.pillar.3.body":
    "Collaborating across specialties so each team learns to build together, not in isolation.",
  "about.pillar.4.title": "A usable technology product",
  "about.pillar.4.body":
    "Reaching a complete technology product that is ready for real-world use—not only a classroom exercise.",
  "about.closing":
    "In this way, Etkan goes beyond conventional schooling. It offers a productive educational model grounded in an Islamic outlook: shaping the person before the product, emphasizing practical experience, structured thinking, and professional responsibility, and bringing genuine industrial experience to the rising generation.",

  "footer.tagline":
    "A productive learning model that shapes people first—and ships real technology.",
  "footer.navLabel": "Footer",
  "footer.copyright": "© {year} Etkan. All rights reserved.",

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
