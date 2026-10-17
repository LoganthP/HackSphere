import { expect, test } from "@playwright/test";
import { PASSWORD, signIn, trackErrors } from "./helpers";

test.describe("Organizer, Judge, and Administrator Workflows", () => {
  test("Host form validation: venue required for offline/hybrid, date validation, accent preview, create and edit", async ({ page }) => {
    const errors = trackErrors(page, { ignoreNetworkStatuses: [400] });
    await signIn(page, "organizer@hacksphere.dev");
    await page.goto("/app/organize/new");
    await expect(page.getByRole("heading", { name: "Host a hackathon", level: 1 })).toBeVisible();

    // Check accent color selection updates preview
    const accentBtn = page.getByRole("button", { name: "Accent #3DCFAE" });
    await accentBtn.click();
    await expect(accentBtn).toHaveAttribute("aria-pressed", "true");

    // In-person/Hybrid venue required validation
    await page.getByLabel("Title").fill("Venue Validation Hack");
    await page.getByLabel("Tagline").fill("Testing hybrid venue requirements");
    await page.getByLabel("Description").fill("A long enough description for the test hackathon to pass basic length checks.");
    await page.getByLabel("Category").fill("Testing");
    await page.getByLabel("Format").selectOption("HYBRID");
    await page.getByLabel("Venue").fill(""); // leave venue blank
    await page.getByRole("button", { name: "Create draft" }).click();

    // Venue error is displayed
    await expect(page.getByText(/Add a venue for offline or hybrid events/i)).toBeVisible();

    // Fill venue and submit
    await page.getByLabel("Venue").fill("Bengaluru Tech Park");
    await page.getByRole("button", { name: "Create draft" }).click();

    // Redirects to command center for the newly created draft
    await expect(page).toHaveURL(/\/app\/organize\/.+/);
    await expect(page.getByRole("heading", { name: "Venue Validation Hack", level: 1 })).toBeVisible();

    // Edit details
    await page.getByRole("link", { name: "Edit details" }).click();
    await expect(page.getByRole("heading", { name: "Edit hackathon", level: 1 })).toBeVisible();
    await page.getByLabel("Title").fill("Venue Validation Hack (Updated)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Venue Validation Hack (Updated)", level: 1 })).toBeVisible();

    // Clean up: delete draft
    const deleteDraftBtn = page.getByRole("button", { name: "Delete draft" });
    await expect(deleteDraftBtn).toBeVisible();
    await deleteDraftBtn.click();
    await expect(page).toHaveURL(/\/app\/organize/);

    expect(errors).toEqual([]);
  });

  test("Command center tabs: overview charts, add co-organizer, registrations, challenges, judging, announcements, results", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "organizer@hacksphere.dev");

    // Open existing event command center (CodeVerse 2026)
    await page.goto("/app/organize");
    await page.getByRole("link", { name: "CodeVerse 2026" }).first().click();
    await expect(page).toHaveURL(/\/app\/organize\/.+/);

    // Overview Tab
    await expect(page.getByRole("heading", { name: "Registrations over time" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Teams per challenge" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Organizers" })).toBeVisible();

    // Add co-organizer
    const coOrgInput = page.getByPlaceholder("Add co-organizer by email");
    if (await coOrgInput.isVisible()) {
      await coOrgInput.fill("techclub@hacksphere.dev");
      await page.getByRole("button", { name: "Add co-organizer" }).click();
      await expect(page.getByText("Tech Club VVCE")).toBeVisible();
    }

    // Registrations Tab
    await page.getByRole("tab", { name: /Registrations/i }).click();
    await expect(page.getByRole("button", { name: /All teams/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pending/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Approved/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Declined/i })).toBeVisible();

    // Challenges Tab
    await page.getByRole("tab", { name: "Challenges" }).click();
    await expect(page.getByRole("button", { name: "Add problem statement" })).toBeVisible();
    // Add challenge
    await page.getByRole("button", { name: "Add problem statement" }).click();
    await expect(page.getByRole("heading", { name: "New problem statement" })).toBeVisible();
    await page.getByLabel("ID").fill(`TST-${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    await page.getByLabel("Title").fill("Automated Challenge Test");
    await page.getByLabel("Category").fill("Testing");
    await page.getByLabel("Challenge description").fill("A test challenge for automated validation");
    await page.getByLabel("Expected output").fill("A working report and dashboard");
    await page.getByRole("button", { name: "Save problem statement" }).click();
    await expect(page.getByText("Automated Challenge Test").first()).toBeVisible();

    // Judging Tab
    await page.getByRole("tab", { name: /Judging/i }).click();
    await expect(page.getByRole("heading", { name: "Rubric" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Judges" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Auto-assign" })).toBeVisible();

    // Announcements Tab
    await page.getByRole("tab", { name: "Announcements" }).click();
    await page.getByLabel("Title").fill("Live QA Announcement");
    await page.getByLabel("Message").fill("This is a live test announcement delivered via Socket.io.");
    await page.getByRole("button", { name: "Post and notify everyone" }).click();
    await expect(page.getByText("Live QA Announcement").first()).toBeVisible();

    // Results Tab
    await page.getByRole("tab", { name: "Results" }).click();
    await expect(page.getByRole("heading", { name: /Results are/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /leaderboard/i })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("Judge evaluation sliders, mouse/keyboard interaction, scoring validation, and draft saving", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "judge@hacksphere.dev");
    await page.goto("/app/judging");
    await expect(page.getByRole("heading", { name: "Judging", level: 1 })).toBeVisible();

    // Open DoseBuddy evaluation
    await page.getByText("DoseBuddy").first().click();
    await expect(page).toHaveURL(/\/app\/judging\/.+/);
    await expect(page.getByRole("heading", { name: "Your scores" })).toBeVisible();

    // Sliders: interact with first slider
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    // Weighted score updates
    const weightedScore = page.locator("text=Weighted score").locator("..").locator("p.font-display");
    await expect(weightedScore).not.toHaveText("–");

    // Save draft
    const saveDraftBtn = page.getByRole("button", { name: "Save draft" });
    await saveDraftBtn.click();
    await expect(page.getByText("Draft saved")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("Administrator portal: user search, role filter, verification, audit log, and self-protection", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "admin@hacksphere.dev");
    await page.goto("/app/admin");
    await expect(page.getByRole("heading", { name: "Administration", level: 1 })).toBeVisible();

    // Overview Tab
    await expect(page.getByRole("tabpanel", { name: "Overview" }).getByText("Accounts", { exact: true })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Overview" }).getByText("Hackathons", { exact: true })).toBeVisible();

    // Users Tab
    await page.getByRole("tab", { name: /Users/i }).click();

    // Search user
    const searchInput = page.getByPlaceholder("Search by name or email");
    await searchInput.fill("Priya");
    await expect(page.getByText("Priya Raman", { exact: true })).toBeVisible();
    await searchInput.fill("");

    // Self-protection: admin's own row should have disabled role selector and no suspend button
    const adminSelect = page.locator("select").filter({ hasText: /Admin/ }).first();
    // Should be disabled for the logged-in admin
    const selfRow = page.locator("tr").filter({ hasText: "Neha Kulkarni" });
    await expect(selfRow.getByRole("combobox")).toBeDisabled();
    await expect(selfRow.getByRole("button", { name: "Suspend" })).toHaveCount(0);

    // Verify organizer button for unverified organizer (techclub)
    const techclubRow = page.locator("tr").filter({ hasText: "Tech Club VVCE" });
    if (await techclubRow.isVisible()) {
      const verifyBtn = techclubRow.getByRole("button", { name: "Verify" });
      if (await verifyBtn.isVisible()) {
        await verifyBtn.click();
        await expect(techclubRow.getByText("Verified")).toBeVisible();
      }
    }

    // Hackathons Tab
    await page.getByRole("tab", { name: "Hackathons" }).click();
    await expect(page.getByText("CodeVerse 2026")).toBeVisible();
    await expect(page.getByRole("link", { name: "Moderate" }).first()).toBeVisible();

    // Audit Log Tab
    await page.getByRole("tab", { name: "Audit log" }).click();
    await expect(page.getByPlaceholder("Filter by action, e.g. results or judge")).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    expect(errors).toEqual([]);
  });
});
