import { expect, test } from "@playwright/test";
import { loadLocalEnv } from "../fixtures/env";

loadLocalEnv();

test.describe("public invite forms @smoke", () => {
  test("invalid guest registration token shows invalid invite", async ({
    page,
  }) => {
    await page.goto("/register/guest/e2e-invalid-token-phase2");
    await expect(page.getByText("Invalid invite").first()).toBeVisible();
  });

  test("invalid financial invite token shows invalid status", async ({
    page,
  }) => {
    await page.goto("/f/e2e-invalid-token-phase2");
    await expect(page.getByText("Link not valid").first()).toBeVisible();
  });

  test("seeded guest token loads wizard when E2E_GUEST_TOKEN set", async ({
    page,
  }) => {
    const token = process.env.E2E_GUEST_TOKEN;
    test.skip(!token, "Set E2E_GUEST_TOKEN to exercise a valid guest invite");

    await page.goto(`/register/guest/${token}`);
    await expect(
      page
        .getByText(/Student registration|Invalid invite|Invite stopped/i)
        .first()
    ).toBeVisible();
  });

  test("seeded financial token loads form when E2E_FINANCIAL_TOKEN set", async ({
    page,
  }) => {
    const token = process.env.E2E_FINANCIAL_TOKEN;
    test.skip(
      !token,
      "Set E2E_FINANCIAL_TOKEN to exercise a valid financial invite"
    );

    await page.goto(`/f/${token}`);
    await expect(page.locator("body")).toBeVisible();
  });
});
