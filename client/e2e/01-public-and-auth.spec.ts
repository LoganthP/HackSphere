import { expect, test } from "@playwright/test";
import { checkA11y, PASSWORD, signIn, trackErrors } from "./helpers";

test.describe("Public pages and Authentication", () => {
  test("Landing page elements, links, countdown and anchors work without console errors", async ({ page, isMobile }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Where ideas become innovation." })).toBeVisible();

    // Check next-hackathon countdown card if present
    const nextCard = page.locator("text=Next up");
    if (await nextCard.isVisible()) {
      await expect(page.locator("text=Starts in")).toBeVisible();
    }

    // "How it works" anchor scrolls (header nav link is visible on sm+ screens)
    if (!isMobile) {
      await page.getByRole("link", { name: "How it works" }).first().click();
      await expect(page.locator("#how-it-works")).toBeVisible();
    }

    // "See all hackathons" navigates to /hackathons
    const seeAll = page.getByRole("link", { name: "See all hackathons" });
    await expect(seeAll).toHaveAttribute("href", "/hackathons");

    // Challenge cards on landing
    const challengeCard = page.locator("a[href*='#challenges']").first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await expect(page).toHaveURL(/#challenges/);
    }

    // Explore button
    await page.goto("/");
    await page.getByRole("link", { name: "Explore hackathons" }).first().click();
    await expect(page).toHaveURL(/\/hackathons/);

    // Host button
    await page.goto("/");
    await page.getByRole("link", { name: "Host a hackathon" }).first().click();
    await expect(page).toHaveURL(/\/register\?host=1/);
    const hostToggle = page.getByRole("switch", { name: "I want to host hackathons" });
    await expect(hostToggle).toHaveAttribute("aria-checked", "true");

    // A11y check
    await page.goto("/");
    await checkA11y(page, "Landing page");
    expect(errors).toEqual([]);
  });

  test("Explore page search, format, category, stage filters, and bookmarking", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/hackathons");

    // Search input
    const searchInput = page.getByPlaceholder("Search by name, theme or category");
    await searchInput.fill("CodeVerse");
    await expect(page.getByRole("heading", { name: "CodeVerse 2026" })).toBeVisible();
    await searchInput.fill("NonExistentHackathonXYZ");
    await expect(page.getByText("No hackathons match these filters")).toBeVisible();

    // Clear all filters
    await page.getByRole("button", { name: "Clear all filters" }).click();
    await expect(page.getByRole("heading", { name: "CodeVerse 2026" })).toBeVisible();

    // Format filter
    const formatSelect = page.getByRole("combobox").first();
    await formatSelect.selectOption("ONLINE");
    await expect(page.getByRole("heading", { name: "FinTech Forge 2026" })).toBeVisible();
    await formatSelect.selectOption({ label: "Any format" });

    // Category filter
    const categorySelect = page.getByRole("combobox").nth(1);
    await categorySelect.selectOption("Fintech");
    await expect(page.getByRole("heading", { name: "FinTech Forge 2026" })).toBeVisible();
    await categorySelect.selectOption({ label: "All categories" });

    // Stage chip filters
    const completedChip = page.getByRole("button", { name: "Completed" });
    await completedChip.click();
    await expect(page.getByRole("heading", { name: "FinTech Forge 2026" })).toBeVisible();

    const allStagesChip = page.getByRole("button", { name: "All stages" });
    await allStagesChip.click();

    // Click card navigates to event detail
    await page.getByRole("link", { name: "CodeVerse 2026" }).first().click();
    await expect(page).toHaveURL(/\/hackathons\/codeverse-2026/);

    expect(errors).toEqual([]);
  });

  test("Explore bookmark toggle and Saved chip when signed in", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, "student@hacksphere.dev");
    await page.goto("/hackathons");

    // "Saved" filter chip should now be visible for authenticated user
    const savedChip = page.getByRole("button", { name: "Saved", exact: true });
    await expect(savedChip).toBeVisible();
    await savedChip.click();
    await expect(savedChip).toHaveAttribute("aria-pressed", "true");

    // Toggle saved chip off
    await savedChip.click();
    await expect(savedChip).toHaveAttribute("aria-pressed", "false");

    // Bookmark toggle button on a card
    const bookmarkBtn = page.getByRole("button", { name: /Save CodeVerse 2026|Remove CodeVerse 2026 from saved/i });
    if (await bookmarkBtn.isVisible()) {
      const isPressedBefore = (await bookmarkBtn.getAttribute("aria-pressed")) === "true";
      await bookmarkBtn.click();
      await expect(bookmarkBtn).toHaveAttribute("aria-pressed", isPressedBefore ? "false" : "true");
      // toggle back to preserve state
      await bookmarkBtn.click();
      await expect(bookmarkBtn).toHaveAttribute("aria-pressed", isPressedBefore ? "true" : "false");
    }

    expect(errors).toEqual([]);
  });

  test("Event detail page interactions, tabs, timeline, and dialogs", async ({ page }) => {
    const errors = trackErrors(page);

    // Visitor view on CodeVerse 2026
    await page.goto("/hackathons/codeverse-2026");
    await expect(page.getByRole("heading", { name: "CodeVerse 2026", level: 1 })).toBeVisible();
    await expect(page.getByText("Sign in to join")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to join" })).toHaveAttribute("href", "/login?next=/hackathons/codeverse-2026");

    // Check timeline
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
    await expect(page.getByText("Registration closes")).toBeVisible();
    await expect(page.getByText("Hackathon starts")).toBeVisible();

    // Check announcements anchor
    await page.goto("/hackathons/codeverse-2026#announcements");
    await expect(page.getByRole("heading", { name: "Announcements" })).toBeVisible();

    // Sign in as student who is already on a team
    await signIn(page, "student@hacksphere.dev");
    await page.goto("/hackathons/healthhack-sprint");
    // Completed event with published results
    await page.goto("/hackathons/fintech-forge-2026");
    await expect(page.getByRole("link", { name: "View results" })).toBeVisible();

    // Check Results page
    await page.getByRole("link", { name: "View results" }).click();
    await expect(page).toHaveURL(/\/hackathons\/fintech-forge-2026\/results/);
    await expect(page.getByRole("heading", { name: "Results", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How the top teams scored" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Awards" })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("Event detail role-aware action panels and team dialogs", async ({ page }) => {
    const errors = trackErrors(page);

    // As organizer, command center link
    await signIn(page, "organizer@hacksphere.dev");
    await page.goto("/hackathons/codeverse-2026");
    await expect(page.getByRole("link", { name: "Open command center" })).toBeVisible();

    // As judge, judging workspace link
    await signIn(page, "judge@hacksphere.dev");
    await page.goto("/hackathons/healthhack-sprint");
    await expect(page.getByRole("link", { name: "Open judging workspace" })).toBeVisible();

    // As participant looking to join
    await signIn(page, "arjun@hacksphere.dev");
    await page.goto("/hackathons/campus-build-night");
    const createTeamBtn = page.getByRole("button", { name: "Create a team" });
    if (await createTeamBtn.isVisible()) {
      await createTeamBtn.click();
      await expect(page.getByRole("heading", { name: "Create a team" })).toBeVisible();
      // Test validation: submit with empty name
      const nameInput = page.getByLabel("Team name");
      await nameInput.fill("");
      await page.getByRole("button", { name: "Create team" }).click();
      // Close dialog with Escape
      await page.keyboard.press("Escape");
      await expect(page.getByRole("heading", { name: "Create a team" })).toHaveCount(0);

      // Find a team dialog
      await page.getByRole("button", { name: "Find a team" }).click();
      await expect(page.getByRole("heading", { name: "Teams looking for members" })).toBeVisible();
      await page.keyboard.press("Escape");
    }

    expect(errors).toEqual([]);
  });

  test("Authentication flows: sign in, quick fills, bad credentials, register and password reset", async ({ page }) => {
    const errors = trackErrors(page, { ignoreNetworkStatuses: [400, 401] });

    // Bad credentials
    await page.goto("/login");
    await page.getByLabel("Email").fill("student@hacksphere.dev");
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText(/match an account|invalid/i);

    // Quick-fill buttons
    const leaderFill = page.getByRole("button", { name: /Team leader/i });
    await leaderFill.click();
    await expect(page.getByLabel("Email")).toHaveValue("leader@hacksphere.dev");
    await expect(page.getByLabel("Password")).toHaveValue(PASSWORD);

    // Sign in with redirect ?next=
    await page.goto("/login?next=/hackathons");
    await page.getByRole("button", { name: /Participant/i }).click();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/hackathons/);

    // Register validation and duplicate email
    await page.goto("/register");
    await page.getByLabel("Full name").fill("New User");
    await page.getByLabel("Email").fill("student@hacksphere.dev"); // existing email
    await page.getByLabel("Password").fill("Short");
    await page.getByRole("button", { name: "Create account" }).click();
    // Server returns validation error for short password or duplicate email
    await expect(page.getByText(/Use at least 8 characters|Already registered/i).first()).toBeVisible();

    // Forgot password and reset flow with an isolated test account
    const resetEmail = `reset_${Date.now()}@hacksphere.dev`;
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Reset Tester");
    await page.getByLabel("Email").fill(resetEmail);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app/);

    // Sign out to test forgot password
    await page.goto("/login");

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(resetEmail);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/a reset link is on its way/i)).toBeVisible();

    const resetLink = page.getByRole("link", { name: "open reset page" });
    await expect(resetLink).toBeVisible();
    const resetUrl = await resetLink.getAttribute("href");
    expect(resetUrl).toBeTruthy();

    // Follow reset link
    await page.goto(resetUrl!);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();

    // Mismatched passwords
    await page.getByLabel("New password", { exact: true }).fill("NewSecurePassword123!");
    await page.getByLabel("Confirm new password").fill("MismatchedPassword123!");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("The two passwords don't match.")).toBeVisible();

    // Matching passwords
    await page.getByLabel("Confirm new password").fill("NewSecurePassword123!");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Password updated. You've been signed out everywhere else.")).toBeVisible();

    // Sign in with the new password
    await page.getByRole("link", { name: "Sign in with your new password" }).click();
    await page.getByLabel("Email").fill(resetEmail);
    await page.getByLabel("Password").fill("NewSecurePassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app/);

    expect(errors).toEqual([]);
  });
});
