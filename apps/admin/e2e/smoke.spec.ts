import { expect, test } from '@playwright/test';

test('admin dashboard renders placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /tkf admin/i })).toBeVisible();
});
