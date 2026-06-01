import { expect, test } from '@playwright/test';

test('health check route renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /task kanban flow/i })).toBeVisible();
});
