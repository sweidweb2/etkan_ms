import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { loadLocalEnv } from "./env";

loadLocalEnv();

export const E2E_ROLES = [
  "manager",
  "teacher",
  "student",
  "admin",
  "ceo",
  "crm",
  "supervisor",
  "co-manager",
] as const;

export type E2eRole = (typeof E2E_ROLES)[number];

/** Roles required for Phase 1 exit (setup fails if these cannot log in). */
export const REQUIRED_AUTH_ROLES: readonly E2eRole[] = [
  "manager",
  "teacher",
  "student",
];

export type E2eCredentials = {
  email: string;
  password: string;
};

/** Post-login homes from `getDashboardRouteForRole` in `lib/constants/routes.ts`. */
export const ROLE_HOME: Record<E2eRole, string> = {
  manager: "/manager/students",
  teacher: "/teacher/classes",
  student: "/student",
  admin: "/admin",
  ceo: "/manager/instructors",
  crm: "/manager/guests",
  supervisor: "/manager/students",
  "co-manager": "/co-manager",
};

/**
 * Fallbacks match seed scripts (`seed:manager`, `seed:admin`, `seed:demo`)
 * when E2E_* env vars are unset. Override via `.env.local` for Docker/local.
 */
/**
 * Demo seed passwords are stable (`Demo123!`). Manager/admin fall back to
 * seed-script defaults only when SEED_* / E2E_* are unset — override in
 * `.env.local` if your local manager password differs.
 */
const demoPassword = () => process.env.SEED_DEMO_PASSWORD ?? "Demo123!";

const SEED_FALLBACKS: Record<E2eRole, E2eCredentials> = {
  manager: {
    email: process.env.SEED_MANAGER_EMAIL ?? "asweid657@gmail.com",
    password: process.env.SEED_MANAGER_PASSWORD ?? "ali@1234",
  },
  admin: {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!",
  },
  teacher: {
    email: "demo.teacher.math@example.com",
    password: demoPassword(),
  },
  student: {
    email: "demo.student.alice@example.com",
    password: demoPassword(),
  },
  ceo: {
    email: "demo.ceo@example.com",
    password: demoPassword(),
  },
  crm: {
    email: "demo.crm@example.com",
    password: demoPassword(),
  },
  supervisor: {
    email: "demo.supervisor@example.com",
    password: demoPassword(),
  },
  "co-manager": {
    email: "demo.comanager@example.com",
    password: demoPassword(),
  },
};

const ENV_KEYS: Record<E2eRole, { email: string; password: string }> = {
  manager: { email: "E2E_MANAGER_EMAIL", password: "E2E_MANAGER_PASSWORD" },
  teacher: { email: "E2E_TEACHER_EMAIL", password: "E2E_TEACHER_PASSWORD" },
  student: { email: "E2E_STUDENT_EMAIL", password: "E2E_STUDENT_PASSWORD" },
  admin: { email: "E2E_ADMIN_EMAIL", password: "E2E_ADMIN_PASSWORD" },
  ceo: { email: "E2E_CEO_EMAIL", password: "E2E_CEO_PASSWORD" },
  crm: { email: "E2E_CRM_EMAIL", password: "E2E_CRM_PASSWORD" },
  supervisor: {
    email: "E2E_SUPERVISOR_EMAIL",
    password: "E2E_SUPERVISOR_PASSWORD",
  },
  "co-manager": {
    email: "E2E_CO_MANAGER_EMAIL",
    password: "E2E_CO_MANAGER_PASSWORD",
  },
};

export const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

export function storageStatePath(role: E2eRole): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

export function ensureAuthDir(): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export function getCredentials(role: E2eRole): E2eCredentials {
  const keys = ENV_KEYS[role];
  const email = process.env[keys.email] ?? SEED_FALLBACKS[role].email;
  const password = process.env[keys.password] ?? SEED_FALLBACKS[role].password;
  return { email, password };
}

export function hasStorageState(role: E2eRole): boolean {
  return fs.existsSync(storageStatePath(role));
}

/** UI login against `/auth/login`. Waits for role home (or optional `next`). */
export async function loginViaUi(
  page: Page,
  credentials: E2eCredentials,
  expectedPath?: string
): Promise<void> {
  // Local Next (esp. after Docker/cache churn) can abort the first navigation.
  await expect
    .poll(
      async () => {
        const response = await page.goto("/auth/login", {
          waitUntil: "domcontentloaded",
        });
        return response?.ok() ?? false;
      },
      { timeout: 60_000, intervals: [1_000, 2_000, 5_000] }
    )
    .toBeTruthy();

  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password", { exact: true });
  const submit = page.getByRole("button", { name: "Sign in" });
  await expect(submit).toBeVisible();

  // Wait until the client LoginForm has hydrated. Otherwise the native form
  // submits as GET /auth/login?email=&password= and never hits the server action.
  await expect(page.getByTestId("login-form")).toHaveAttribute(
    "data-hydrated",
    "true",
    { timeout: 60_000 }
  );

  await email.click();
  await email.fill(credentials.email);
  await password.fill(credentials.password);
  await expect(email).toHaveValue(credentials.email);

  // Prefer commit over load — Next server-action redirects often skip a full
  // document load, which makes waitForURL(..., load) flake under workers=1.
  await submit.click();
  try {
    await page.waitForURL(
      (url) =>
        !url.pathname.startsWith("/auth/login") ||
        url.searchParams.has("toast") ||
        url.searchParams.has("error"),
      { timeout: 45_000, waitUntil: "commit" }
    );
  } catch (error) {
    const toastText = (
      await page
        .locator("[data-sonner-toast], [role='status'], [role='alert']")
        .allTextContents()
        .catch(() => [])
    )
      .join(" | ")
      .trim();
    throw new Error(
      `Login did not navigate away from /auth/login (url=${page.url()}).${
        toastText ? ` UI message: ${toastText}` : ""
      } Underlying: ${String(error)}`
    );
  }

  if (page.url().includes("password=")) {
    throw new Error(
      "Login form submitted as a native GET (React did not handle submit). Retry after a hard refresh."
    );
  }

  if (expectedPath) {
    await expect(page).toHaveURL(new RegExp(escapeRegExp(expectedPath)), {
      timeout: 45_000,
    });
  } else {
    await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/, {
      timeout: 45_000,
    });
  }
}

export async function loginAs(page: Page, role: E2eRole): Promise<void> {
  await loginViaUi(page, getCredentials(role), ROLE_HOME[role]);
}

export async function logoutViaUi(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
