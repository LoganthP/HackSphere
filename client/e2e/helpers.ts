import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const PASSWORD = "HackSphere@123";

export function trackErrors(page: Page, options?: { ignoreNetworkStatuses?: number[] }) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (options?.ignoreNetworkStatuses?.some((status) => text.includes(`status of ${status}`))) {
        return;
      }
      errors.push(`Console error: ${text}`);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`Page error: ${err.message}`);
  });
  return errors;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

export async function signOut(page: Page) {
  const isMobile = await page.getByRole("button", { name: "Open menu" }).isVisible();
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
  }
  const accountBtn = page.getByRole("button", { name: "Account menu" });
  await accountBtn.click();
  await page.getByRole("menuitem", { name: /Sign out/i }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
}

export async function checkA11y(page: Page, contextName = "") {
  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"]) // Check color-contrast separately where helpful to avoid sub-pixel font anti-aliasing false positives
    .analyze();
  const severe = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  if (severe.length > 0) {
    console.error(`A11y violations in ${contextName}:`, JSON.stringify(severe, null, 2));
  }
  expect(severe, `Accessibility violations in ${contextName}`).toEqual([]);
}

export async function checkNoOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth, `Horizontal overflow detected: scrollWidth (${scrollWidth}) > clientWidth (${clientWidth})`).toBeLessThanOrEqual(clientWidth + 2);
}
