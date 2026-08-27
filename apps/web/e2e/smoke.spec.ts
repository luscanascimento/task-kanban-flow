import { expect, test } from '@playwright/test';

test('unauthenticated root redirects to the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});
