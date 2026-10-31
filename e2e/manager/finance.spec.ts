import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { selectOptionByTriggerId } from "../helpers/select-option";

const DEMO_PHASE = "Demo Fall Tuition";

/**
 * Phase 8 — accounting deep path + income/academic landmarks.
 * Money writes only when E2E_ALLOW_MONEY=1.
 */
test.describe("manager finance", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("accounting → phase → SPP @smoke", async ({ page }) => {
    page.setDefaultNavigationTimeout(90_000);
    await page.goto("/manager/accounting", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Accounting" })
    ).toBeVisible({ timeout: 60_000 });

    // Eye button is the real <Link>; table rows are role=link without href.
    const phaseLink = page.getByRole("button", {
      name: `View ${DEMO_PHASE}`,
      exact: true,
    });
    if ((await phaseLink.count()) === 0) {
      test.skip(true, "Demo Fall Tuition not seeded — run npm run seed:demo");
    }

    const phaseHref = await phaseLink.first().getAttribute("href");
    expect(phaseHref).toBeTruthy();
    await page.goto(phaseHref!, { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/manager\/accounting\/phases\/[^/]+/);
    await expect(page.getByText(DEMO_PHASE).first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByText("Student payment phases").first()).toBeVisible();

    const sppLink = page
      .getByRole("button", { name: /^View assignment for / })
      .first();
    if ((await sppLink.count()) === 0) {
      test.skip(true, "No SPP rows on demo phase");
    }

    const sppHref = await sppLink.getAttribute("href");
    expect(sppHref).toBeTruthy();
    await page.goto(sppHref!, { waitUntil: "commit" });
    await expect(page).toHaveURL(
      /\/manager\/accounting\/phases\/[^/]+\/students\/[^/]+/
    );
    await expect(page.getByText("Payments").first()).toBeVisible({
      timeout: 45_000,
    });
  });

  test("record payment when E2E_ALLOW_MONEY=1 @money @mutation", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_ALLOW_MONEY !== "1",
      "Set E2E_ALLOW_MONEY=1 to exercise payment writes"
    );

    page.setDefaultNavigationTimeout(90_000);
    await page.goto("/manager/accounting", { waitUntil: "commit" });
    const phaseLink = page.getByRole("button", {
      name: `View ${DEMO_PHASE}`,
      exact: true,
    });
    test.skip((await phaseLink.count()) === 0, "Demo phase missing");

    await page.goto((await phaseLink.first().getAttribute("href"))!, {
      waitUntil: "commit",
    });

    const recordFromTable = page
      .getByRole("button", { name: /^Record payment for / })
      .first();
    if ((await recordFromTable.count()) > 0) {
      await recordFromTable.click();
    } else {
      const sppLink = page
        .getByRole("button", { name: /^View assignment for / })
        .first();
      test.skip((await sppLink.count()) === 0, "No SPP to pay");
      await page.goto((await sppLink.getAttribute("href"))!, {
        waitUntil: "commit",
      });
      const recordBtn = page.getByRole("button", { name: "Record payment" });
      test.skip(
        (await recordBtn.count()) === 0,
        "Record payment locked on this SPP"
      );
      await recordBtn.click();
    }

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Record payment" })
    ).toBeVisible();
    await dialog.locator("#create-payment-amount").fill("1");
    await selectOptionByTriggerId(page, "create-payment-method", "Cash");
    await dialog.getByRole("button", { name: "Record payment" }).click();
    await expectToastVisible(page, "Payment recorded.");
  });

  test("income statement surfaces @smoke", async ({ page }) => {
    page.setDefaultNavigationTimeout(90_000);
    await page.goto("/manager/income-statement", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Income statement" })
    ).toBeVisible({ timeout: 60_000 });

    await page.goto("/manager/income-statement/analytics", {
      waitUntil: "commit",
    });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Income statement analytics",
      })
    ).toBeVisible({ timeout: 60_000 });

    await page.goto("/manager/income-statement/history", {
      waitUntil: "commit",
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Past months" })
    ).toBeVisible({ timeout: 60_000 });
  });

  test("academic analysis loads @smoke", async ({ page }) => {
    await page.goto("/manager/academic-analysis", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Academic analysis" })
    ).toBeVisible({ timeout: 60_000 });
  });
});
