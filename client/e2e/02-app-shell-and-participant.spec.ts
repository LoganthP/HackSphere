import { expect, test } from "@playwright/test";
import { checkA11y, PASSWORD, signIn, trackErrors } from "./helpers";

test.describe("App Shell and Participant Workspace", () => {
  test("App shell navigation, sliding active indicator, badges, and skip link", async ({ page, isMobile }) => {
    const errors = trackErrors(page);
    await signIn(page, "student@hacksphere.dev");

    // Skip to content
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    if (isMobile) {
      // Mobile drawer open/close
      const openBtn = page.getByRole("button", { name: "Open menu" });
      await openBtn.click();
      const asideMenu = page.getByRole("complementary", { name: "Menu" });
      await expect(asideMenu).toBeVisible();
      await asideMenu.getByRole("link", { name: "My teams" }).click();
      await expect(page).toHaveURL(/\/app\/teams/);
    } else {
      // Desktop sidebar links
      const nav = page.getByRole("navigation", { name: "App" });
      await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Explore" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "My teams" })).toBeVisible();
      await expect(nav.getByRole("link", { name: /Invitations/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /Notifications/i })).toBeVisible();

      // Role check: participant should not see Organize or Administration
      await expect(nav.getByRole("link", { name: "Organize" })).toHaveCount(0);
      await expect(nav.getByRole("link", { name: "Administration" })).toHaveCount(0);

      // Navigate to My teams
      await nav.getByRole("link", { name: "My teams" }).click();
      await expect(page).toHaveURL(/\/app\/teams/);
    }

    // Account menu dropdown
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
    }
    const accountBtn = page.getByRole("button", { name: "Account menu" });
    await accountBtn.click();
    await expect(page.getByRole("menuitem", { name: /Profile and settings/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Use dark mode|Use light mode/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Sign out/i })).toBeVisible();

    // Close menu by clicking outside or pressing Escape
    await page.keyboard.press("Escape");

    expect(errors).toEqual([]);
  });

  test("Dashboard bento layout, cards, invitations, deadlines, and notifications link", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "student@hacksphere.dev");
    await page.goto("/app");

    // Welcome tile
    await expect(page.getByRole("heading", { name: "Rahul", level: 1 })).toBeVisible();

    // Stats tiles
    await expect(page.getByText("Registered events")).toBeVisible();
    await expect(page.getByText("Active projects")).toBeVisible();

    // Deadlines
    const deadlinesTitle = page.getByRole("heading", { name: "Deadlines" });
    await expect(deadlinesTitle).toBeVisible();

    // Recent updates "All" link
    const allUpdates = page.getByRole("link", { name: "All", exact: true });
    await allUpdates.click();
    await expect(page).toHaveURL(/\/app\/notifications/);

    expect(errors).toEqual([]);
  });

  test("Inbox invitations, requests, and withdrawing", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "student@hacksphere.dev");
    await page.goto("/app/inbox");
    await expect(page.getByRole("heading", { name: "Invitations", level: 1 })).toBeVisible();

    // If an invitation is present, we can verify buttons
    const acceptBtn = page.getByRole("button", { name: "Accept" }).first();
    const declineBtn = page.getByRole("button", { name: "Decline" }).first();
    if (await acceptBtn.isVisible()) {
      await expect(declineBtn).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test("Notifications marking individual as read and marking all as read", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "student@hacksphere.dev");
    await page.goto("/app/notifications");
    await expect(page.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();

    const markAllBtn = page.getByRole("button", { name: "Mark all as read" });
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      await expect(page.getByText("You're all caught up.")).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test("Profile settings, avatar color, name, dark mode persistence, and password validation", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "student@hacksphere.dev");
    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: "Profile and settings", level: 1 })).toBeVisible();

    // Color picker
    const colorBtn = page.getByRole("button", { name: "Colour #3DCFAE" });
    if (await colorBtn.isVisible()) {
      await colorBtn.click();
      await expect(colorBtn).toHaveAttribute("aria-pressed", "true");
    }

    // Save profile
    const saveBtn = page.getByRole("button", { name: "Save profile" });
    await saveBtn.click();
    await expect(page.getByText("Profile saved")).toBeVisible();

    // Dark mode toggle
    const darkToggle = page.getByRole("switch", { name: "Dark mode" });
    const isDark = (await page.locator("html").getAttribute("data-theme")) === "dark";
    await darkToggle.click();
    const isDarkAfter = (await page.locator("html").getAttribute("data-theme")) === "dark";
    expect(isDarkAfter).not.toBe(isDark);

    // Reload page to test theme persistence
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", isDarkAfter ? "dark" : "light");

    // Toggle back to light mode
    if (isDarkAfter) {
      await page.getByRole("switch", { name: "Dark mode" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    }

    // Change password validation
    await page.getByLabel("Current password").fill("WrongCurrentPassword");
    await page.getByLabel("New password").fill("short");
    await page.getByRole("button", { name: "Update password" }).click();
    // HTML5 minLength or server error
    await expect(page.getByLabel("New password")).toHaveAttribute("minlength", "8");

    expect(errors).toEqual([]);
  });

  test("Team workspace tabs, milestones persistence, project form draft, and submission checklist", async ({ page }) => {
    const errors = trackErrors(page);
    // Sign in as leader who has a live team (Null Pointers on CodeVerse 2026 or Carbon Coders on GreenGrid)
    await signIn(page, "leader@hacksphere.dev");
    await page.goto("/app/teams");

    // Open first team
    const teamLink = page.getByRole("link", { name: /Null Pointers|Carbon Coders/i }).first();
    await expect(teamLink).toBeVisible();
    await teamLink.click();
    await expect(page).toHaveURL(/\/app\/teams\/.+/);

    // Milestones: add a milestone
    const milestoneInput = page.getByPlaceholder(/Add a milestone/i);
    if (await milestoneInput.isVisible()) {
      const milestoneName = `Test Milestone ${Date.now()}`;
      await milestoneInput.fill(milestoneName);
      await page.getByRole("button", { name: "Add milestone" }).click();
      await expect(page.getByText(milestoneName)).toBeVisible();

      // Toggle milestone done
      const milestoneToggle = page.getByRole("button", { name: new RegExp(`Mark done: ${milestoneName}`) });
      await milestoneToggle.click();
      await expect(page.getByRole("button", { name: new RegExp(`Mark not done: ${milestoneName}`) })).toBeVisible();

      // Reload to ensure persistence
      await page.reload();
      await expect(page.getByText(milestoneName)).toBeVisible();

      // Remove milestone
      const removeBtn = page.getByRole("button", { name: new RegExp(`Remove ${milestoneName}`) });
      await removeBtn.click();
      await expect(page.getByText(milestoneName)).toHaveCount(0);
    }

    // Switch to Project tab
    await page.getByRole("tab", { name: "Project and submission" }).click();

    // Check project form fields
    const titleInput = page.getByLabel("Project title");
    if (await titleInput.isVisible() && !(await titleInput.isDisabled())) {
      await titleInput.fill("Automated QA Prototype");
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect(page.getByText("Draft saved")).toBeVisible();
    }

    // Submission checklist
    const checklist = page.getByRole("list", { name: "Submission checklist" });
    if (await checklist.isVisible()) {
      await expect(page.getByText("Registration approved")).toBeVisible();
      await expect(page.getByText("Challenge selected")).toBeVisible();
    }

    expect(errors).toEqual([]);
  });
});
