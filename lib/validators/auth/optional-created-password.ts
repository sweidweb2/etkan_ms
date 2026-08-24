import { z } from "zod";
import {
  AUTH_LIMITS,
  DEFAULT_CREATED_STUDENT_PASSWORD,
} from "@/lib/constants/auth-limits";
import { passwordField } from "@/lib/validators/auth/fields";

export const optionalPasswordInput = z
  .string()
  .max(AUTH_LIMITS.password.max, {
    message: `Password must be at most ${AUTH_LIMITS.password.max} characters.`,
  })
  .optional()
  .or(z.literal(""));

function isBlankPassword(value: string | undefined | null): boolean {
  return (value ?? "") === "";
}

export function resolveCreatedAccountPassword(
  password: string | undefined | null,
  confirmPassword?: string | undefined | null
): string {
  if (
    isBlankPassword(password) &&
    (confirmPassword === undefined || isBlankPassword(confirmPassword))
  ) {
    return DEFAULT_CREATED_STUDENT_PASSWORD;
  }

  return password ?? "";
}

export function addOptionalPasswordIssues(
  password: string | undefined | null,
  ctx: z.RefinementCtx
): void {
  if (isBlankPassword(password)) {
    return;
  }

  const parsedPassword = passwordField.safeParse(password);
  if (!parsedPassword.success) {
    ctx.addIssue({
      code: "custom",
      message: parsedPassword.error.issues[0]?.message ?? "Invalid password.",
      path: ["password"],
    });
  }
}

export function addOptionalPasswordPairIssues(
  data: { password?: string; confirmPassword?: string },
  ctx: z.RefinementCtx
): void {
  const password = data.password ?? "";
  const confirmPassword = data.confirmPassword ?? "";

  if (password === "" && confirmPassword === "") {
    return;
  }

  if (password !== confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    });
  }

  addOptionalPasswordIssues(password, ctx);
}
