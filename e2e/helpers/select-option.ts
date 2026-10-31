import type { Page } from "@playwright/test";

/** Open a shadcn/Base UI select by trigger id and pick an option by visible name. */
export async function selectOptionByTriggerId(
  page: Page,
  triggerId: string,
  optionName: string | RegExp
): Promise<void> {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole("option", { name: optionName }).click();
}
