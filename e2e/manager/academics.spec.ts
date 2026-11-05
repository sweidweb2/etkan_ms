import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { selectOptionByTriggerId } from "../helpers/select-option";
import { e2eStamp } from "../helpers/unique";

/**
 * Phase 5 — subjects / semesters / classes / enroll on dedicated E2E rows.
 * Serial so class create can reuse the subject created earlier.
 */
test.describe("manager academics @mutation", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: storageStatePath("manager") });

  const stamp = e2eStamp("acad");
  const subjectName = `E2E Subject ${stamp}`.slice(0, 80);
  const semesterName = `E2E Semester ${stamp}`.slice(0, 80);
  const className = `E2E Class ${stamp}`.slice(0, 80);
  let classUrl = "";

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("create subject and open catalog", async ({ page }) => {
    await page.goto("/manager/subjects");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage subjects" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add subject" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add subject" })
    ).toBeVisible();
    await dialog.locator("#add-subject-name").fill(subjectName);
    await dialog.locator("#add-subject-sessions").fill("2");
    await dialog.getByRole("button", { name: "Create subject" }).click();

    await expectToastVisible(page, "Subject created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(subjectName).first()).toBeVisible();

    await page.getByRole("link", { name: "Categories & exercises" }).click();
    await expect(page).toHaveURL(/\/manager\/subjects\/catalog/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Categories & exercises" })
    ).toBeVisible();
  });

  test("create semester and open detail", async ({ page }) => {
    await page.goto("/manager/semesters");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage semesters" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add semester" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add semester" })
    ).toBeVisible();
    await dialog.locator("#add-semester-name").fill(semesterName);
    await dialog.getByRole("button", { name: "Create semester" }).click();

    await expectToastVisible(page, "Semester created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(semesterName).first()).toBeVisible();

    await page
      .getByRole("link", { name: `View semester ${semesterName}` })
      .click();
    await expect(page).toHaveURL(/\/manager\/semesters\/[^/]+/);
    await expect(page.getByText(semesterName).first()).toBeVisible();
  });

  test("create class linked to subject", async ({ page }) => {
    await page.goto("/manager/classes");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage classes" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add class" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add class" })).toBeVisible();

    await dialog.locator("#add-class-name").fill(className);
    await selectOptionByTriggerId(page, "add-class-subject", subjectName);
    // Status defaults to Scheduled.
    await dialog.getByRole("button", { name: "Create class" }).click();

    await expectToastVisible(page, "Class created.");
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText(className).first()).toBeVisible({
      timeout: 20_000,
    });

    const view = page.getByRole("button", { name: `View ${className}` }).first();
    const href = await view.getAttribute("href");
    expect(href).toBeTruthy();
    classUrl = new URL(href!, page.url()).pathname;
    await page.goto(classUrl);
    await expect(page).toHaveURL(/\/manager\/classes\/[^/]+/);
    await expect(page.getByText(className).first()).toBeVisible();
  });

  test("enroll seeded student into class", async ({ page }) => {
    test.skip(!classUrl, "class URL not captured from prior test");

    await page.goto(classUrl);
    await expect(page).toHaveURL(/\/manager\/classes\/[^/]+/);

    await page.getByRole("button", { name: "Add student" }).click();
    const enroll = page.getByRole("dialog");
    await expect(
      enroll.getByRole("heading", { name: "Add students to class" })
    ).toBeVisible();

    await expect(enroll.getByText("Loading students…")).toHaveCount(0, {
      timeout: 30_000,
    });

    if (
      await enroll
        .getByText("Every available student is already enrolled in this class.")
        .isVisible()
        .catch(() => false)
    ) {
      test.skip(true, "No available students to enroll");
    }

    // Prefer demo Alice; fall back to Select all.
    const studentInput = enroll.locator("#add-student-to-class-id");
    await studentInput.click();
    await studentInput.fill("Alice");
    const aliceOption = enroll
      .locator("button")
      .filter({ hasText: /Alice Anderson/i })
      .first();
    if ((await aliceOption.count()) > 0) {
      await aliceOption.click();
    } else {
      await enroll.getByRole("button", { name: "Select all" }).click();
    }

    const submit = enroll.getByRole("button", {
      name: /Add student|Add \d+ students/,
    });
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();
    await expectToastVisible(page, /added to class\./i);

    const paymentFollowUp = page.getByRole("dialog").filter({
      hasText: /payment|phase/i,
    });
    if (await paymentFollowUp.isVisible().catch(() => false)) {
      await paymentFollowUp.getByRole("button", { name: "Skip" }).click();
    }

    await expect(
      page.getByText(/Alice Anderson|added to class/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
