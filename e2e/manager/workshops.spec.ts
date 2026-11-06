import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { e2eStamp } from "../helpers/unique";

test.describe("manager workshops", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("create workshop and open detail @mutation", async ({ page }) => {
    const name = `E2E Workshop ${e2eStamp("ws")}`.slice(0, 80);

    await page.goto("/manager/workshops");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage workshops" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add workshop" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Create workshop" })
    ).toBeVisible();
    await dialog.locator("#add-workshop-name").fill(name);
    // Type defaults to Workshop.
    await dialog.getByRole("button", { name: "Create workshop" }).click();

    await expectToastVisible(page, "Workshop created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    const view = page.getByRole("link", { name: `View ${name}` });
    await expect(view).toBeVisible({ timeout: 20_000 });
    const href = await view.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page).toHaveURL(/\/manager\/workshops\/[^/]+/);
    await expect(page.getByText(name).first()).toBeVisible();
  });

  test("payments overview loads @smoke", async ({ page }) => {
    await page.goto("/manager/workshops/payments");
    await expect(page.getByText(/Total payments/i).first()).toBeVisible({
      timeout: 45_000,
    });
  });

  test("demo workshop detail opens when seeded @smoke", async ({ page }) => {
    await page.goto("/manager/workshops");
    const view = page.getByRole("link", {
      name: "View Demo Intro to Robotics",
    });
    if ((await view.count()) === 0) {
      test.skip(true, "Demo Intro to Robotics not seeded");
    }
    await view.first().click();
    await expect(page).toHaveURL(/\/manager\/workshops\/[^/]+/);
    await expect(
      page.getByText("Demo Intro to Robotics").first()
    ).toBeVisible();
  });
});
