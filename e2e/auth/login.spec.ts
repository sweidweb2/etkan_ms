import { expect, test } from "@playwright/test";
import {
  getCredentials,
  loginViaUi,
  ROLE_HOME,
} from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";

test.describe("auth login @smoke", () => {
  test("manager signs in and lands on manager home", async ({ page }) => {
    await loginViaUi(page, getCredentials("manager"), ROLE_HOME.manager);
    await expect(page).toHaveURL(new RegExp(ROLE_HOME.manager));
    await expectToastVisible(page, /Signed in successfully/i);
  });
});
