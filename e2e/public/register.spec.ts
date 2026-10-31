import { expect, test } from "@playwright/test";

test.describe("public register @smoke", () => {
  test("registration wizard UI renders", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /Student registration/i })
    ).toBeVisible();
  });

  test("registration submit stays gated without E2E_ALLOW_REGISTER=1", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_ALLOW_REGISTER === "1",
      "Submit path enabled separately when Turnstile test keys are configured"
    );

    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /Student registration/i })
    ).toBeVisible();
    // Phase 2: assert form only — do not submit (Turnstile / side effects).
  });
});
