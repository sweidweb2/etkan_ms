import { expect, test } from "@playwright/test";

test.describe("public marketing @smoke", () => {
  test("home loads brand", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Etkan/i);
    await expect(page.getByText("Etkan", { exact: true }).first()).toBeVisible();
  });

  test("about loads", async ({ page }) => {
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { name: /Etkan builds people/i })
    ).toBeVisible();
  });

  test("careers loads", async ({ page }) => {
    await page.goto("/careers");
    await expect(
      page.getByRole("heading", { name: /Careers & learning tracks/i })
    ).toBeVisible();
  });

  test("careers roadmap stage detail loads", async ({ page }) => {
    await page.goto("/careers/roadmap/stage-1");
    await expect(
      page.getByRole("heading", { name: /Intro to mechatronics/i })
    ).toBeVisible();
  });

  test("projects loads", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText(/Student projects|Etkan projects/i).first()).toBeVisible();
  });

  test("gallery loads", async ({ page }) => {
    await page.goto("/gallery");
    await expect(
      page.getByRole("heading", { name: /Workshop life in frames/i })
    ).toBeVisible();
  });

  test("blogs list loads", async ({ page }) => {
    await page.goto("/blogs");
    await expect(page.getByRole("heading", { name: /Blogs/i })).toBeVisible();
  });

  test("blogs detail opens when a post link exists", async ({ page }) => {
    await page.goto("/blogs");
    const postLink = page.locator('a[href^="/blogs/"]').first();
    if ((await postLink.count()) === 0) {
      test.skip(true, "No published blog posts in this env");
    }
    await postLink.click();
    await expect(page).toHaveURL(/\/blogs\/.+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("life requires auth (unauthenticated → login)", async ({ page }) => {
    // Middleware gates /life to signed-in admins (not a public marketing page).
    await page.goto("/life");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("life detail requires auth (unauthenticated → login)", async ({
    page,
  }) => {
    await page.goto("/life/b1");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
