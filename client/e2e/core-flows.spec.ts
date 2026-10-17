import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "HackSphere@123";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("visitors can browse hackathons and see published results", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Where ideas become innovation." })).toBeVisible();
  await page.goto("/hackathons");
  await expect(page.getByRole("heading", { name: "CodeVerse 2026" })).toBeVisible();
  await page.goto("/hackathons/fintech-forge-2026/results");
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
});

test("protected pages redirect to sign-in", async ({ page }) => {
  await page.goto("/app/teams");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("a participant sees the role-appropriate dashboard", async ({ page }) => {
  await signIn(page, "student@hacksphere.dev");
  await expect(page.getByRole("heading", { name: "Rahul" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Organize" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Administration" })).toHaveCount(0);
});

test("a judge can open an assigned project and sees the rubric", async ({ page }) => {
  await signIn(page, "judge@hacksphere.dev");
  await page.goto("/app/judging");
  await page.getByText("DoseBuddy").first().click();
  await expect(page.getByRole("heading", { name: "Your scores" })).toBeVisible();
  await expect(page.getByLabel("Innovation")).toBeVisible();
});

test("submitting an incomplete evaluation shows clear errors", async ({ page }) => {
  await signIn(page, "judge@hacksphere.dev");
  await page.goto("/app/judging");
  await page.getByText("ClinicFlow").first().click();
  await page.getByRole("button", { name: /Submit evaluation/ }).click();
  await expect(page.getByText(/Score every criterion|isn't complete/).first()).toBeVisible();
});
