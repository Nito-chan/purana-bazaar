import {
  test,
  expect,
  dismissToasts,
  expectNoBrokenImages,
  expectNoHorizontalOverflow,
  loginDemo,
  spaNavigate,
} from './helpers.js';

test.describe('public routes', () => {
  test('home, landing, auth and error pages render cleanly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Fresh in Khargone/ })).toBeVisible();
    await expect(page.locator('.listing-card').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoBrokenImages(page);

    await page.goto('/khargone/mobiles');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mobiles in Khargone');
    await expect(page.locator('.listing-card').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    for (const [path, heading] of [
      ['/login', 'Welcome back'],
      ['/signup', 'Join Purana Bazaar'],
      ['/forgot', 'Reset your password'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    for (const path of ['/admin', '/wanted', '/this-page-does-not-exist']) {
      await page.goto(path);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await expectNoBrokenImages(page);
    await expect(page.locator('body')).not.toContainText('[object ');
  });
});

test.describe('signed-in routes', () => {
  test('primary pages and listing detail render for the demo account', async ({ page }) => {
    await loginDemo(page);
    await dismissToasts(page);

    for (const [path, heading] of [
      ['/me', 'Demo Buyer'],
      ['/me/listings', 'My listings'],
      ['/saved', 'Saved items'],
      ['/chats', 'Chats'],
      ['/notifications', 'Notifications'],
      ['/sell', 'Sell something'],
    ]) {
      await spaNavigate(page, path);
      await expect(page.locator('main h1').first()).toContainText(heading);
      await expectNoHorizontalOverflow(page);
    }

    await spaNavigate(page, '/');
    await expect(page.locator('.listing-card').first()).toBeVisible();
    await page.locator('.listing-card__link').first().click();
    await expect(page).toHaveURL(/\/l\//);
    await expect(page.locator('.detail-title')).toBeVisible();
    await expect(page.locator('.price-ticket')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('link', { name: /see seller profile/i }).click();
    await expect(page).toHaveURL(/\/u\//);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoBrokenImages(page);
  });
});
