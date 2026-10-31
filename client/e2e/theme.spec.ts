import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { checkNoOverflow, signIn, trackErrors } from "./helpers";

test.use({ reducedMotion: "reduce", actionTimeout: 15_000, navigationTimeout: 15_000 });

async function expectTheme(page: Page, theme: "light" | "dark") {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect.poll(() => page.evaluate(() => document.documentElement.style.colorScheme)).toBe(theme);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", theme === "dark" ? "#161a33" : "#F8FAFF");
}

test("all three controls share Light, Dark and System, with keyboard and live device changes", async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await page.emulateMedia({ colorScheme: "light" });
  if (isMobile) await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await checkNoOverflow(page);
  await page.getByRole("button", { name: "Theme menu" }).click();
  for (const label of ["Dark", "Light", "System"] as const) {
    const radio = page.getByRole("menuitemradio", { name: label, exact: true });
    await radio.click();
    await expect(radio).toBeChecked();
    await expectTheme(page, label === "Dark" ? "dark" : "light");
    // Selecting a radio keeps the Radix menu open.
    await expect(page.getByRole("menu")).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light");

  await signIn(page, "student@hacksphere.dev");
  await page.goto("/app/profile");
  for (const label of ["Dark", "Light", "System"] as const) {
    await page.getByRole("radio", { name: label, exact: true }).click();
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menuitemradio", { name: label, exact: true })).toBeChecked();
    await page.keyboard.press("Escape");
    if (isMobile) await page.getByRole("button", { name: "Close menu" }).click();
    await expectTheme(page, label === "Dark" ? "dark" : "light");
  }
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Account menu" }).click();
  for (const label of ["Dark", "Light", "System"] as const) {
    await page.getByRole("menuitemradio", { name: label, exact: true }).click();
    await expect(page.getByRole("menuitemradio", { name: label, exact: true })).toBeChecked();
  }
  await page.keyboard.press("Escape");
  if (isMobile) await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.getByRole("radio", { name: "System", exact: true })).toBeChecked();
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "dark");
  await expect(page.getByText("Currently dark, following your device.")).toBeVisible();
  await page.getByRole("radio", { name: "System", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "Dark", exact: true })).toBeFocused();
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "dark");
  await page.reload();
  await expectTheme(page, "dark");
  expect(errors).toEqual([]);
});

test("the pre-paint script resolves persisted preferences before React loads", async ({ page }) => {
  await page.route("**/src/main.tsx*", (route) => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.goto("/");
  for (const preference of ["light", "dark", "system"] as const) {
    await page.evaluate((value) => localStorage.setItem("hs-theme", value), preference);
    for (const device of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: device });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("#root")).toBeEmpty();
      await expectTheme(page, preference === "system" ? device : preference);
    }
  }
});

test("preferences sync between tabs, including System and clearing storage", async ({ page, context }) => {
  await page.goto("/");
  const other = await context.newPage();
  await other.goto("/");
  await page.getByRole("button", { name: "Theme menu" }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await expectTheme(other, "dark");
  await other.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("menuitemradio", { name: "System", exact: true }).click();
  await expectTheme(other, "dark");
  await other.emulateMedia({ colorScheme: "light" });
  await expectTheme(other, "light");
  await page.evaluate(() => localStorage.clear());
  await other.emulateMedia({ colorScheme: "dark" });
  await expectTheme(other, "light");
  await other.close();
});

for (const theme of ["light", "dark"] as const) {
  test(`every route and tab has readable contrast in ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    const errors = trackErrors(page);
    await page.addInitScript((value) => localStorage.setItem("hs-theme", value), theme);
    const failures: object[] = [];
    async function audit(label: string) {
      await test.step(`Contrast: ${label}`, async () => {
      await expectTheme(page, theme);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main .animate-spin")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      // Motion still fades content under reduced motion. Audit its final appearance.
      await expect.poll(() => page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('main [style], [role="dialog"][style], [role="dialog"] [style]'))
          .filter((element) => element.style.opacity !== "" && element.style.transform !== "" && !element.closest('[aria-hidden="true"]'))
          .every((element) => Number(element.style.opacity) >= 0.999),
      )).toBe(true);
      const result = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      const severe = result.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      if (severe.length) await testInfo.attach(`contrast-${label.replace(/[^a-z0-9]/gi, "-")}`, { body: JSON.stringify(severe.flatMap((v) => v.nodes.map(({ target, failureSummary }) => ({ target, failureSummary }))), null, 2), contentType: "application/json" });
      for (const violation of severe) failures.push({ route: label, id: violation.id, nodes: violation.nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) });
      });
    }
    async function visit(path: string) {
      await page.goto(path);
      await audit(path);
    }
    for (const path of ["/", "/hackathons", "/hackathons/codeverse-2026", "/hackathons/fintech-forge-2026/results", "/login", "/register", "/forgot-password", "/reset-password", "/missing-theme-page"]) await visit(path);

    await signIn(page, "leader@hacksphere.dev");
    for (const path of ["/app", "/app/teams", "/app/inbox", "/app/notifications", "/app/profile"]) await visit(path);
    const dashboard = await (await page.request.get("/api/dashboard")).json();
    const team = dashboard.teams.find((entry: { name: string }) => entry.name === "Null Pointers") ?? dashboard.teams[0];
    expect(team).toBeTruthy();
    await visit(`/app/teams/${team.id}`);
    await page.getByRole("tab", { name: "Project and submission" }).click();
    await audit("team: project and submission");

    await signIn(page, "organizer@hacksphere.dev");
    await visit("/app");
    await visit("/app/organize");
    await visit("/app/organize/new");
    const events = await (await page.request.get("/api/events")).json();
    for (const slug of ["codeverse-2026", "healthhack-sprint"]) {
      const event = events.events.find((entry: { slug: string }) => entry.slug === slug);
      expect(event).toBeTruthy();
      await visit(`/app/organize/${event.id}/edit`);
      await visit(`/app/organize/${event.id}`);
      for (const tab of ["Registrations", "Challenges", "Judging", "Announcements", "Results"]) {
        await page.getByRole("tab", { name: tab }).click();
        await audit(`${slug}: ${tab}`);
      }
    }
    await signIn(page, "judge@hacksphere.dev");
    await visit("/app");
    await visit("/app/judging");
    await page.getByText("DoseBuddy", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Your scores" })).toBeVisible();
    await audit("evaluate");
    await page.getByRole("button", { name: /declare a conflict/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await audit("evaluate: conflict dialog");
    await page.keyboard.press("Escape");

    await signIn(page, "admin@hacksphere.dev");
    await visit("/app");
    await visit("/app/admin");
    for (const tab of ["Users", "Hackathons", "Audit log"]) {
      await page.getByRole("tab", { name: tab }).click();
      await audit(`admin: ${tab}`);
    }
    await testInfo.attach(`contrast-${theme}.json`, { body: JSON.stringify(failures, null, 2), contentType: "application/json" });
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(errors).toEqual([]);
  });
}
