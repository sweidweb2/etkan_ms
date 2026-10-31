import { expect, type Page } from "@playwright/test";

/** Sonner toasts are role=status / listitem-ish; match visible text. */
export async function expectToastVisible(
  page: Page,
  text: string | RegExp
): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
}
