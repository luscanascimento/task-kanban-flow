import { type Page, expect, test } from '@playwright/test';

/** Sign in through the real login form; the mock backend accepts any creds. */
async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('demo@example.com');
  await page.getByRole('textbox', { name: 'Senha' }).fill('password123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/teams$/);
}

/**
 * Drive a CDK drag-and-drop. CDK relies on pointer movement past a small
 * threshold, so we press, nudge, move to the target in steps, and settle
 * before releasing — a single `dragTo` is not reliable.
 */
async function dragCardTo(
  page: Page,
  cardText: string,
  targetListSelector: () => ReturnType<Page['locator']>,
): Promise<void> {
  const card = page.locator('tkf-task-card', { hasText: cardText });
  const target = targetListSelector();
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('Could not resolve drag source/target boxes');

  const tx = to.x + to.width / 2;
  const ty = to.y + Math.min(to.height / 2, 80);

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Engage the CDK drag (must move past the drag threshold), then travel to
  // the target in steps, settling with extra moves so CDK reliably registers
  // the enter into the new drop container before release. CDK drags via
  // synthetic pointer events are timing-sensitive, so we over-settle.
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12);
  await page.waitForTimeout(50);
  await page.mouse.move(tx, ty, { steps: 25 });
  await page.waitForTimeout(150);
  await page.mouse.move(tx, ty + 6, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.move(tx, ty - 4, { steps: 5 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(350);
}

test.describe('Kanban', () => {
  // Wide enough for all five columns to fit without horizontal scrolling, so
  // drag-and-drop targets are on-screen.
  test.use({ viewport: { width: 1900, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/boards'); // default route is now /teams; these tests work from the boards list
  });

  test('boards list renders seeded boards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Product Roadmap/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Campaign Planning/ })).toBeVisible();
  });

  test('opening a board shows its columns and cards', async ({ page }) => {
    await page.getByRole('link', { name: /Product Roadmap/ }).click();
    await expect(page).toHaveURL(/\/boards\/brd_roadmap$/);

    for (const title of ['Backlog', 'To Do', 'In Progress', 'Review', 'Done']) {
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    await expect(
      page.locator('tkf-task-card', { hasText: 'Implement drag-and-drop between columns' }),
    ).toBeVisible();
  });

  test('a new card can be added to a column', async ({ page }) => {
    await page.getByRole('link', { name: /Product Roadmap/ }).click();
    const backlog = page.locator('tkf-column', {
      has: page.getByRole('heading', { name: 'Backlog', exact: true }),
    });

    await backlog.getByRole('button', { name: '+ Add card' }).click();
    await backlog.getByPlaceholder('Task title…').fill('Write ADR for state management');
    await backlog.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(
      backlog.locator('tkf-task-card', { hasText: 'Write ADR for state management' }),
    ).toBeVisible();
  });

  test('a card can be dragged from Backlog to Done', async ({ page }) => {
    await page.getByRole('link', { name: /Product Roadmap/ }).click();

    const backlog = page.locator('tkf-column', {
      has: page.getByRole('heading', { name: 'Backlog', exact: true }),
    });
    const done = page.locator('tkf-column', {
      has: page.getByRole('heading', { name: 'Done', exact: true }),
    });

    const cardText = 'Research competitor onboarding flows';
    await expect(backlog.locator('tkf-task-card', { hasText: cardText })).toBeVisible();

    await dragCardTo(page, cardText, () => done.locator('.column__list'));

    await expect(done.locator('tkf-task-card', { hasText: cardText })).toBeVisible();
    await expect(backlog.locator('tkf-task-card', { hasText: cardText })).toHaveCount(0);
  });

  test('an image can be attached to a task', async ({ page }) => {
    await page.getByRole('link', { name: /Product Roadmap/ }).click();

    const cardText = 'Add keyboard shortcuts for card actions';
    await page.locator('tkf-task-card', { hasText: cardText }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // A 1×1 transparent PNG, uploaded through the (hidden) file input.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await dialog
      .locator('input[type=file]')
      .setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: png });

    await expect(dialog.locator('.attachment', { hasText: 'screenshot.png' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    // The card now shows the attachment count badge.
    await expect(page.locator('tkf-task-card', { hasText: cardText })).toContainText('📎');
  });

  test('editing a task updates the card', async ({ page }) => {
    await page.getByRole('link', { name: /Product Roadmap/ }).click();

    await page
      .locator('tkf-task-card', { hasText: 'Add keyboard shortcuts for card actions' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox', { name: 'Title' }).fill('Add keyboard shortcuts (v2)');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.locator('tkf-task-card', { hasText: 'Add keyboard shortcuts (v2)' }),
    ).toBeVisible();
  });
});
