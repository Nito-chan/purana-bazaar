import { test, expect } from './helpers.js';

test('skip link and keyboard focus indicators work', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.listing-card').first()).toBeVisible();

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await expect
    .poll(() => skip.evaluate((element) => getComputedStyle(element).outlineStyle))
    .not.toBe('none');

  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();

  await page.goto('/');
  await expect(page.locator('.listing-card').first()).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const brand = page.locator('.brand');
  await expect(brand).toBeFocused();
  await expect
    .poll(() => brand.evaluate((element) => getComputedStyle(element).outlineStyle))
    .not.toBe('none');
});
