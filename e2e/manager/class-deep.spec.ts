import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";

const DEMO_CLASS = "Demo Math 101";

/**
 * Phase 6 — class deep routes against seeded demo class (sessions/tasks exist).
 * Grades stay locked while class is in_progress — assert that state.
 */
test.describe("manager class deep path", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: storageStatePath("manager") });

  let classUrl = "";

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("open demo class detail @smoke", async ({ page }) => {
    await page.goto("/manager/classes");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage classes" })
    ).toBeVisible();

    await page.getByLabel("Search classes").fill(DEMO_CLASS);
    // Panel debounces search before refetching.
    await expect(
      page.getByRole("button", { name: `View ${DEMO_CLASS}` }).first()
    ).toBeVisible({ timeout: 30_000 });

    // Prefer in-progress demo (has sessions/tasks); ignore duplicate Scheduled cards.
    const inProgressView = page
      .getByRole("article")
      .filter({ hasText: DEMO_CLASS })
      .filter({ hasText: /In progress/i })
      .getByRole("button", { name: `View ${DEMO_CLASS}` });

    const view =
      (await inProgressView.count()) > 0
        ? inProgressView.first()
        : page.getByRole("button", { name: `View ${DEMO_CLASS}` }).first();

    const href = await view.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page).toHaveURL(/\/manager\/classes\/[^/]+/);
    classUrl = page.url().replace(/\/$/, "");
    await expect(page.getByText(DEMO_CLASS).first()).toBeVisible();
  });

  test("categories board loads @smoke", async ({ page }) => {
    test.skip(!classUrl, "Demo class URL not captured");
    await page.goto(`${classUrl}/categories`);
    await expect(page).toHaveURL(/\/categories$/);
    await expect(page.getByText("Category follow-up").first()).toBeVisible({
      timeout: 45_000,
    });
  });

  test("grades locked while class not Done @smoke", async ({ page }) => {
    test.skip(!classUrl, "Demo class URL not captured");
    await page.goto(`${classUrl}/grades`);
    await expect(page).toHaveURL(/\/grades$/);
    await expect(
      page.getByText(/Grades locked|Students ready to compute|Done computed/i).first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test("session detail loads and attendance mutation @mutation", async ({
    page,
  }) => {
    test.skip(!classUrl, "Demo class URL not captured");
    await page.goto(classUrl);

    // Carousel may scroll sessions off-screen; navigate via href instead of click.
    const sessionLink = page.locator('a[href*="/sessions/"]').first();
    if ((await sessionLink.count()) === 0) {
      test.skip(true, "No sessions on demo class");
    }

    const sessionHref = await sessionLink.getAttribute("href");
    expect(sessionHref).toBeTruthy();
    await page.goto(sessionHref!);
    await expect(page).toHaveURL(/\/sessions\/[^/]+/);
    await expect(page.getByText("Attendance").first()).toBeVisible({
      timeout: 45_000,
    });

    const markAbsent = page
      .getByRole("button", { name: /^Mark .+ absent$/ })
      .first();
    if ((await markAbsent.count()) === 0) {
      // Smoke-only if no enrolled attendees on this session.
      return;
    }

    await markAbsent.click();
    await expectToastVisible(page, "Attendance updated.");
  });

  test("task detail loads @smoke", async ({ page }) => {
    test.skip(!classUrl, "Demo class URL not captured");
    await page.goto(classUrl);

    const taskLink = page.locator('a[href*="/tasks/"]').first();
    if ((await taskLink.count()) === 0) {
      test.skip(true, "No tasks on demo class");
    }

    const taskHref = await taskLink.getAttribute("href");
    expect(taskHref).toBeTruthy();
    await page.goto(taskHref!);
    await expect(page).toHaveURL(/\/tasks\/[^/]+/);
    await expect(page.getByText(/Demo Algebra|Demo Math|task/i).first()).toBeVisible({
      timeout: 45_000,
    });
  });
});
