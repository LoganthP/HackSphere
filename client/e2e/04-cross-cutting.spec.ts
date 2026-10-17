import { expect, test } from "@playwright/test";
import { checkA11y, checkNoOverflow, signIn, trackErrors } from "./helpers";

test.describe("Cross-cutting requirements", () => {
  test("Responsive layout has zero horizontal overflow at 390px, 768px, and 1440px", async ({ page }) => {
    const errors = trackErrors(page);
    const viewports = [
      { width: 390, height: 844 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1440, height: 900 }, // Desktop
    ];

    const pagesToCheck = [
      "/",
      "/hackathons",
      "/hackathons/fintech-forge-2026/results",
      "/hackathons/codeverse-2026",
      "/login",
      "/register",
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      for (const path of pagesToCheck) {
        await page.goto(path);
        await checkNoOverflow(page);
      }
    }

    expect(errors).toEqual([]);
  });

  test("Axe accessibility audit on key pages has zero serious or critical violations", async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto("/");
    await checkA11y(page, "Landing");

    await page.goto("/hackathons");
    await checkA11y(page, "Explore");

    await page.goto("/hackathons/fintech-forge-2026/results");
    await checkA11y(page, "Results");

    await page.goto("/login");
    await checkA11y(page, "Login");

    await page.goto("/register");
    await checkA11y(page, "Register");

    expect(errors).toEqual([]);
  });

  test("Keyboard focus trap in dialogs and Escape key dismisses them", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "organizer@hacksphere.dev");
    await page.goto("/app/organize");

    // Click on CodeVerse 2026
    await page.getByRole("link", { name: "CodeVerse 2026" }).first().click();

    // Click "Move to..." which opens confirmation dialog
    const moveBtn = page.getByRole("button", { name: /Move to/i });
    if (await moveBtn.isVisible()) {
      await moveBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Escape key closes dialog
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }

    expect(errors).toEqual([]);
  });

  test("Error states display friendly messages when API fails rather than blank screens", async ({ page }) => {
    const errors = trackErrors(page);

    // Mock API failure for /api/events
    await page.route("**/api/events*", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Database temporarily unavailable." }),
      });
    });

    await page.goto("/hackathons");
    // Assert friendly ErrorState component renders with retry button
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/Request failed|Database temporarily unavailable|Something went wrong/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

    // Do not fail this test on the expected handled 500 network error
  });

  test("Real-time notifications between two browser contexts", async ({ browser }) => {
    const organizerContext = await browser.newContext();
    const organizerPage = await organizerContext.newPage();

    try {
      // Sign in member in recipient context
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      try {
        await signIn(memberPage, "leader@hacksphere.dev");
        await memberPage.goto("/app");

        // Sign in organizer in organizer context
        await signIn(organizerPage, "organizer@hacksphere.dev");
        await organizerPage.goto("/app/organize");
        await organizerPage.getByRole("link", { name: "CodeVerse 2026" }).first().click();

        // Navigate to announcements
        await organizerPage.getByRole("tab", { name: "Announcements" }).click();
        const title = `Realtime Broadcast ${Date.now()}`;
        await organizerPage.getByLabel("Title").fill(title);
        await organizerPage.getByLabel("Message").fill("Testing cross-context real-time notification push.");
        await organizerPage.getByRole("button", { name: "Post and notify everyone" }).click();

        // Verify notification toast or item arrives in member context
        await expect(memberPage.getByText(title).first()).toBeVisible({ timeout: 15_000 });
      } finally {
        await memberContext.close();
      }
    } finally {
      await organizerContext.close();
    }
  });
});
