import { type Page, expect, test } from '@playwright/test';

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('demo@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/teams$/);
}

test.describe('Teams, clients and secrets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('teams list shows seeded teams', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Engineering/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Growth Marketing/ })).toBeVisible();
  });

  test('a team shows only its own boards', async ({ page }) => {
    // Regression: `*/boards` greedily matched `/teams/:id/boards`, leaking every
    // board into every team. Engineering must show only Product Roadmap.
    await page.getByRole('link', { name: /Engineering/ }).click();
    await expect(page).toHaveURL(/\/teams\/team_eng$/);

    const boards = page.locator('.boards');
    await expect(boards.getByRole('link', { name: /Product Roadmap/ })).toBeVisible();
    await expect(boards.getByRole('link', { name: /Website Revamp/ })).toHaveCount(0);
    await expect(boards.getByRole('link', { name: /Campaign Planning/ })).toHaveCount(0);
  });

  test('inviting a known user adds them to the team', async ({ page }) => {
    await page.getByRole('link', { name: /Growth Marketing/ }).click();
    await page.getByPlaceholder('Invite by email…').fill('bruno@example.com');
    await page.getByRole('button', { name: 'Invite' }).click();
    await expect(page.locator('.members').getByText('bruno@example.com')).toBeVisible();
  });

  test('secrets are masked and can be revealed', async ({ page }) => {
    await page.goto('/boards/brd_roadmap');
    await page.getByRole('button', { name: /Secrets/ }).click();

    const aws = page.locator('.secret', { hasText: 'AWS' });
    const secretRow = aws.locator('.secret__row', { hasText: 'Secret' });
    await expect(secretRow.locator('code')).toContainText('•');
    await aws.getByRole('button', { name: 'reveal' }).click();
    await expect(secretRow.locator('code')).toContainText('EXAMPLEKEY');
  });

  test('a board can be assigned to a client', async ({ page }) => {
    await page.goto('/boards/brd_roadmap');
    await expect(page.getByLabel('Board client')).toHaveValue('cli_acme');
  });

  test('client detail lists its assigned boards', async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('link', { name: /Acme Corp/ }).click();
    await expect(page.getByRole('heading', { name: 'Acme Corp' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Product Roadmap/ })).toBeVisible();
  });
});
