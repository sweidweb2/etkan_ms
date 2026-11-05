import { expect, type Page } from "@playwright/test";

/** Fatal Next/React error UI must not appear on smoke navigations. */
export async function assertNoErrorOverlay(page: Page): Promise<void> {
  await expect(
    page.getByText(/Application error: a client-side exception/i)
  ).toHaveCount(0);
  await expect(page.getByText(/Unhandled Runtime Error/i)).toHaveCount(0);
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
}
