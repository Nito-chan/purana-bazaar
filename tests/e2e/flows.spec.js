import {
  test,
  expect,
  dismissToasts,
  expectNoHorizontalOverflow,
  loginDemo,
  spaNavigate,
  TEST_PHOTO,
} from './helpers.js';

test.describe('discovery', () => {
  test('feed filters, searches and loads more', async ({ page }) => {
    await loginDemo(page);
    await dismissToasts(page);

    const cards = page.locator('.listing-grid--home .listing-card');
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThan(0);

    const beforeMore = await cards.count();
    await page.locator('.feed-sentinel').scrollIntoViewIfNeeded();
    await expect.poll(() => cards.count()).toBeGreaterThan(beforeMore);

    await page.getByRole('button', { name: 'Mobiles', exact: true }).click();
    await expect(page).toHaveURL(/category=mobiles/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mobiles in Khargone');
    await expect(cards.first()).toBeVisible();

    await page.getByRole('searchbox', { name: /search listings/i }).fill('iPhone');
    await page.getByRole('searchbox', { name: /search listings/i }).press('Enter');
    await expect(page).toHaveURL(/q=iPhone/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('iPhone');
    await expect(cards.first()).toBeVisible();

    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(cards.first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('saved listings', () => {
  test('saving a listing adds it to the saved page', async ({ page }) => {
    await loginDemo(page);
    await dismissToasts(page);
    await page.locator('.listing-card__link').first().click();
    await expect(page).toHaveURL(/\/l\//);
    const title = (await page.locator('.detail-title').textContent()).trim();

    const favourite = page.locator('.detail-media .fav-btn');
    await expect(favourite).toHaveAttribute('aria-pressed', 'false');
    await favourite.click();
    await expect(favourite).toHaveAttribute('aria-pressed', 'true');
    await expect(favourite).toHaveAttribute('aria-label', 'Remove from saved');
    await expect(page.locator('.toast')).toContainText('Saved');

    await spaNavigate(page, '/saved');
    await expect(page.getByRole('heading', { level: 1, name: 'Saved items' })).toBeVisible();
    await expect(page.locator('.listing-card__title', { hasText: title })).toBeVisible();
  });
});

test.describe('selling', () => {
  test('a seller can publish and edit a listing with a photo', async ({ page }) => {
    await loginDemo(page);
    await dismissToasts(page);
    await spaNavigate(page, '/sell');
    await expect(page.getByRole('heading', { level: 1, name: 'Sell something' })).toBeVisible();

    const title = 'QA test cycle in good condition';
    await page.locator('#sell-title').fill(title);
    await page.locator('#sell-price').fill('1800');
    await page.locator('#sell-category').selectOption({ label: 'Cycles' });
    await expect(page.getByRole('heading', { name: 'Item specifics' })).toBeVisible();
    await page.locator('#sell-attr-brand').fill('Hero');
    await page.locator('#sell-attr-gears').fill('6');
    await page.locator('#sell-attr-frame').fill('Steel');
    await page.locator('#sell-area').fill('Civil Lines');
    await page
      .locator('#sell-description')
      .fill(
        'A clean test cycle used only for automated quality checks. Gears and brakes work well.',
      );
    await page.locator('input[type=file]').setInputFiles({
      name: 'qa-cycle.png',
      mimeType: 'image/png',
      buffer: TEST_PHOTO,
    });
    await expect(page.locator('.photo-item img')).toHaveCount(1);

    await page.getByRole('button', { name: 'Publish listing' }).click();
    await expect(page).toHaveURL(/\/l\//);
    await expect(page.locator('.detail-title')).toHaveText(title);
    await expect(page.locator('.price-ticket')).toContainText('1,800');
    await expect(page.locator('.detail-media img')).toHaveCount(1);
    await expect(page.locator('.attr').filter({ hasText: 'Brand' })).toContainText('Hero');
    await expect(page.locator('.attr').filter({ hasText: 'Frame' })).toContainText('Steel');
    await expect(page.locator('.toast')).toContainText('Your listing is live');
    await dismissToasts(page);

    await spaNavigate(page, '/me/listings');
    await expect(page.getByRole('heading', { level: 1, name: 'My listings' })).toBeVisible();
    const summary = page.locator('.performance-summary');
    await expect(summary.getByRole('heading', { name: 'Your performance' })).toBeVisible();
    await expect(summary.locator('.performance-card')).toHaveCount(4);
    await expect(summary.locator('.performance-card').filter({ hasText: 'Active' })).toContainText(
      /[1-9]/,
    );
    await expect(
      summary.locator('.performance-card').filter({ hasText: 'Total views' }),
    ).toContainText(/\d/);
    const row = page.locator('.listing-row').filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.locator('.listing-row__metric')).toContainText('contact');
    await expectNoHorizontalOverflow(page);
    await row.getByRole('link', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/sell\//);
    await expect(page.locator('#sell-title')).toHaveValue(title);
    await expect(page.locator('#sell-attr-brand')).toHaveValue('Hero');

    await page.locator('#sell-price').fill('1900');
    await page.locator('#sell-attr-brand').fill('Atlas');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/l\//);
    await expect(page.locator('.price-ticket')).toContainText('1,900');
    await expect(page.locator('.attr').filter({ hasText: 'Brand' })).toContainText('Atlas');
    await expect(page.locator('.toast')).toContainText('Listing updated');
  });
});

test.describe('messages', () => {
  test('a conversation can be opened and replied to', async ({ page }) => {
    await loginDemo(page);
    await dismissToasts(page);
    await spaNavigate(page, '/chats');
    await expect(page.getByRole('heading', { level: 1, name: 'Chats' })).toBeVisible();
    await expect(page.locator('.conversation').first()).toBeVisible();
    await page.locator('.conversation').first().click();
    await expect(page).toHaveURL(/\/chat\//);
    await expect(page.locator('.chat-composer')).toBeVisible();
    await expect(page.locator('.site-footer')).toBeHidden();

    const before = await page.locator('.msg').count();
    await page.locator('.chat-quick__chip').first().click();
    const input = page.locator('.chat-composer__input');
    await expect(input).toHaveValue('Is this still available?');
    await input.press('Enter');
    await expect(page.locator('.msg')).toHaveCount(before + 1);
    await expect(page.locator('.msg--mine').last()).toContainText('Is this still available?');
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('notifications', () => {
  test('all notifications can be marked read', async ({ page }) => {
    await loginDemo(page);
    await dismissToasts(page);
    await spaNavigate(page, '/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    await expect(page.locator('.notification').first()).toBeVisible();
    await expect(page.locator('.notification--unread').first()).toBeVisible();

    const markAll = page.getByRole('button', { name: 'Mark all as read' });
    await expect(markAll).toBeEnabled();
    await markAll.click();
    await expect(page.locator('.toast')).toContainText('All notifications marked as read');
    await expect(page.locator('.notification--unread')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    await expect(page.locator('a[href="/notifications"] .icon-btn__badge')).toHaveCount(0);
  });
});
