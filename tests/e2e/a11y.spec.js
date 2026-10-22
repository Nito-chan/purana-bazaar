import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './helpers.js';

async function seriousViolations(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
      page: label,
    }));
}

test('home, login and listing detail have no serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.listing-card').first()).toBeVisible();
  const home = await seriousViolations(page, 'home');

  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  const login = await seriousViolations(page, 'login');

  await page.goto('/');
  const listingHref = await page.locator('.listing-card__link').first().getAttribute('href');
  await page.goto(listingHref);
  await expect(page.locator('.detail-title')).toBeVisible();
  const listing = await seriousViolations(page, 'listing');

  const violations = [...home, ...login, ...listing];
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
