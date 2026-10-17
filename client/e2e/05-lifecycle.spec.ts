import { expect, test } from "@playwright/test";
import { PASSWORD, signIn, trackErrors } from "./helpers";

test.describe("Full Hackathon Lifecycle", () => {
  test("Runs complete lifecycle from organizer registration to published results", async ({ page }) => {
    test.setTimeout(240000);
    const errors = trackErrors(page);
    const tag = Date.now().toString().slice(-6);

    const orgEmail = `org_${tag}@hacksphere.dev`;
    const stu1Email = `stu1_${tag}@hacksphere.dev`;
    const stu2Email = `stu2_${tag}@hacksphere.dev`;
    const judgeEmail = `jdg_${tag}@hacksphere.dev`;
    const hackTitle = `Lifecycle Cup ${tag}`;

    // 1. Register accounts
    // Register Organizer (requesting organizer status)
    await page.goto("/register?host=1");
    await page.getByLabel("Full name").fill(`Organizer ${tag}`);
    await page.getByLabel("Email").fill(orgEmail);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app/);

    // Register Student 1
    await page.goto("/register");
    await page.getByLabel("Full name").fill(`Alice ${tag}`);
    await page.getByLabel("Email").fill(stu1Email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app/);

    // Register Student 2
    await page.goto("/register");
    await page.getByLabel("Full name").fill(`Bob ${tag}`);
    await page.getByLabel("Email").fill(stu2Email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app/);

    // Register Judge
    await page.goto("/register");
    await page.getByLabel("Full name").fill(`Judge ${tag}`);
    await page.getByLabel("Email").fill(judgeEmail);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app/);

    // 2. Admin verifies the new organizer
    await signIn(page, "admin@hacksphere.dev");
    await page.goto("/app/admin?tab=users");
    const searchInput = page.getByPlaceholder("Search by name or email");
    await searchInput.fill(orgEmail);
    const orgRow = page.locator("tr").filter({ hasText: orgEmail });
    await expect(orgRow).toBeVisible();
    await orgRow.getByRole("button", { name: "Verify" }).click();
    await expect(orgRow.getByText("Verified")).toBeVisible();

    // 3. Organizer signs in and creates hackathon
    await signIn(page, orgEmail);
    await page.goto("/app/organize/new");
    await page.getByLabel("Title").fill(hackTitle);
    await page.getByLabel("Tagline").fill("End to end automated lifecycle verification");
    await page.getByLabel("Description").fill("A comprehensive hackathon created by autonomous QA to verify every workflow.");
    await page.getByLabel("Category").fill("Testing");
    await page.getByLabel("Format").selectOption("ONLINE");
    await page.getByLabel("Minimum size").fill("2");
    await page.getByLabel("Maximum size").fill("4");
    await page.getByRole("button", { name: "Create draft" }).click();

    await expect(page).toHaveURL(/\/app\/organize\/(?!new\b)[^/]+$/);
    const eventUrl = page.url();
    const eventId = eventUrl.split("/").pop()?.split("?")[0];

    // Add problem statement
    await page.getByRole("tab", { name: "Challenges" }).click();
    await page.getByRole("button", { name: "Add problem statement" }).click();
    await page.getByLabel("ID").fill("LC-01");
    await page.getByLabel("Title").fill("Smart Campus Grid");
    await page.getByLabel("Category").fill("Energy");
    await page.getByLabel("Challenge description").fill("Optimize power consumption across academic campus buildings.");
    await page.getByLabel("Expected output").fill("Working dashboard and prototype model.");
    await page.getByRole("button", { name: "Save problem statement" }).click();
    await expect(page.getByText("Smart Campus Grid")).toBeVisible();

    // Open registration (Stage: REGISTRATION_OPEN)
    await page.getByLabel("or set stage").selectOption("REGISTRATION_OPEN");
    const confirmBtn = page.getByRole("button", { name: "Confirm" });
    await confirmBtn.click();
    await expect(page.getByText("Moved to Registration open")).toBeVisible();

    // 4. Student 1 creates team and invites Student 2
    await signIn(page, stu1Email);
    await page.goto("/hackathons");
    await page.getByRole("link", { name: hackTitle }).first().click();

    // Create team
    await page.getByRole("button", { name: "Create a team" }).click();
    const teamName = `Rocket Devs ${tag}`;
    await page.getByLabel("Team name").fill(teamName);
    await page.getByRole("button", { name: "Create team" }).click();
    await expect(page).toHaveURL(/\/app\/teams\/.+/);

    // Invite Student 2
    const inviteInput = page.getByPlaceholder("teammate@college.edu");
    await inviteInput.fill(stu2Email);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(new RegExp(`Invited Bob ${tag}`))).toBeVisible();

    // 5. Student 2 accepts invitation
    await signIn(page, stu2Email);
    await page.goto("/app/inbox");
    await page.getByRole("button", { name: "Accept" }).first().click();
    await expect(page.getByText("Accepted")).toBeVisible();

    // 6. Student 1 chooses challenge and registers team
    await signIn(page, stu1Email);
    await page.goto("/app/teams");
    await page.getByRole("link", { name: teamName }).first().click();

    // Choose challenge LC-01
    await page.getByRole("button", { name: "Choose a challenge" }).click();
    await page.getByText("Smart Campus Grid").first().click();
    await expect(page.getByText("Challenge selected")).toBeVisible();

    // Register team
    const regBtn = page.getByRole("button", { name: "Register team" });
    await expect(regBtn).toBeEnabled();
    await regBtn.click();
    await expect(page.getByText("Registration under review")).toBeVisible();

    // 7. Organizer approves team and moves hackathon to live (IN_PROGRESS)
    await signIn(page, orgEmail);
    await page.goto(`/app/organize/${eventId}`);

    // Approve registration
    await page.getByRole("tab", { name: /Registrations/i }).click();
    const approveBtn = page.getByRole("button", { name: "Approve", exact: true });
    await approveBtn.click();
    await expect(page.getByText("Team approved")).toBeVisible();

    // Move to live (IN_PROGRESS)
    await page.getByRole("button", { name: /Move to live/i }).click();
    const confirmLiveBtn = page.getByRole("button", { name: "Confirm" });
    await expect(confirmLiveBtn).toBeVisible();
    await confirmLiveBtn.click();
    await expect(page.getByText(/Moved to Live/i)).toBeVisible();

    // 8. Student 1 fills project and submits final version
    await signIn(page, stu1Email);
    await page.goto("/app/teams");
    await page.getByRole("link", { name: teamName }).first().click();
    await page.getByRole("tab", { name: "Project and submission" }).click();

    await page.getByLabel("Project title").fill("Campus Grid Smart Manager");
    await page.getByLabel("Summary").fill("A robust energy management prototype that dynamically adjusts campus lighting and HVAC based on real-time occupancy.");
    await page.getByLabel("Tech stack").fill("React, Express, SQLite, ChartJS");
    await page.getByLabel("Repository link").fill("https://github.com/hacksphere/grid-manager");
    await page.getByLabel("Live demo link").fill("https://grid.hacksphere.dev");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved")).toBeVisible();

    // Submit final version
    const submitFinalBtn = page.getByRole("button", { name: /Submit final version/i });
    await expect(submitFinalBtn).toBeEnabled();
    await submitFinalBtn.click();
    await expect(page.getByText(/Version 1 submitted/i)).toBeVisible();

    // 9. Organizer adds judge, auto-assigns, and moves hackathon to JUDGING
    await signIn(page, orgEmail);
    await page.goto(`/app/organize/${eventId}`);
    await page.getByRole("tab", { name: /Judging/i }).click();

    // Add judge
    const judgeInput = page.getByPlaceholder("judge@example.com");
    await judgeInput.fill(judgeEmail);
    await judgeInput.press("Enter");
    await expect(page.getByText(`Judge ${tag}`).first()).toBeVisible();

    // Auto-assign
    const autoAssignBtn = page.getByRole("button", { name: "Auto-assign" });
    await autoAssignBtn.scrollIntoViewIfNeeded();
    await autoAssignBtn.click({ force: true });
    await expect(page.getByText(/assignments created/i)).toBeVisible();

    // Move stage to JUDGING
    const moveJudgingBtn = page.getByRole("button", { name: /Move to judging/i });
    await moveJudgingBtn.scrollIntoViewIfNeeded();
    await moveJudgingBtn.click({ force: true });
    const confirmJudgingBtn = page.getByRole("button", { name: "Confirm" });
    await expect(confirmJudgingBtn).toBeVisible();
    await confirmJudgingBtn.click({ force: true });
    await expect(page.getByText("Moved to Judging")).toBeVisible();

    // 10. Judge evaluates the project
    await signIn(page, judgeEmail);
    await page.goto("/app/judging");
    await page.getByText("Campus Grid Smart Manager").first().click();
    await expect(page).toHaveURL(/\/app\/judging\/.+/);
    await expect(page.getByRole("heading", { name: "Your scores" })).toBeVisible();

    // Set slider scores
    const sliders = page.locator('input[type="range"]');
    const count = await sliders.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const slider = sliders.nth(i);
      await slider.scrollIntoViewIfNeeded();
      await slider.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
    }
    // Verify weighted score is computed
    await expect(page.locator("text=Weighted score").locator("..").locator("p.font-display")).not.toHaveText("–");

    await page.getByLabel("Feedback for the team").fill("Impressive build, clean codebase, and thorough energy forecasting calculations.");
    await page.getByRole("button", { name: "Submit evaluation" }).click();
    await expect(page).toHaveURL(/\/app\/judging$/);
    await expect(page.getByText(/evaluation submitted/i)).toBeVisible();

    // 11. Organizer publishes results
    await signIn(page, orgEmail);
    await page.goto(`/app/organize/${eventId}`);
    await page.getByRole("tab", { name: "Results" }).click();
    await page.getByRole("button", { name: "Publish results" }).click();
    await expect(page.getByText(/Results published/i).first()).toBeVisible();

    // 12. Student 1 checks workspace feedback
    await signIn(page, stu1Email);
    await page.goto("/app/teams");
    await page.getByRole("link", { name: teamName }).first().click();
    await expect(page.getByText(/Impressive build, clean codebase/i)).toBeVisible();

    // 13. Public results page verification
    await page.goto(`/hackathons/${eventId}/results`);
    await expect(page.getByRole("heading", { name: "Results", level: 1 })).toBeVisible();
    await expect(page.getByText(teamName).first()).toBeVisible();
    await expect(page.getByText("Campus Grid Smart Manager").first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
