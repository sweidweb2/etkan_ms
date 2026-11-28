import { expect, type Page } from "@playwright/test";

/** Assert a Sonner toast is visible (scoped — avoids matching page body text). */
export async function expectToastVisible(
  page: Page,
  text: string | RegExp
): Promise<void> {
  const toast = page
    .locator("[data-sonner-toast], [data-sonner-toaster] li")
    .filter({ hasText: text });
  await expect(toast.first()).toBeVisible({ timeout: 15_000 });
}
