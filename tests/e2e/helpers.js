import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const issues = [];

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        issues.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      issues.push(`pageerror: ${error.message}`);
    });

    await use(page);

    if (issues.length) {
      await testInfo.attach('browser-console', {
        body: issues.join('\n'),
        contentType: 'text/plain',
      });
    }
    expect(issues, 'browser console should stay clean').toEqual([]);
  },
});

export { expect };

export async function loginDemo(page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  await page.getByRole('button', { name: /use the demo account/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.listing-card').first()).toBeVisible();
}

export async function dismissToasts(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.toast').forEach((toast) => toast.remove());
  });
}

export async function spaNavigate(page, path) {
  await page.evaluate((target) => {
    const link = document.createElement('a');
    link.href = target;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
  }, path);
  const expected = new URL(path, page.url());
  await page.waitForURL(
    (url) => url.pathname + url.search === expected.pathname + expected.search,
    { timeout: 7000 },
  );
}

export async function expectNoHorizontalOverflow(page) {
  const layout = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    const offenders = [];
    if (scrollWidth > clientWidth + 1) {
      for (const element of document.querySelectorAll('body *')) {
        const rect = element.getBoundingClientRect();
        const position = getComputedStyle(element).position;
        if (rect.right > clientWidth + 1 && position !== 'fixed') {
          offenders.push(
            `${element.tagName.toLowerCase()}.${String(element.className).replace(/\s+/g, '.')} ` +
              `right=${Math.round(rect.right)}`,
          );
          if (offenders.length === 5) break;
        }
      }
    }
    return { scrollWidth, clientWidth, offenders };
  });

  expect(
    layout.scrollWidth,
    `horizontal overflow: ${layout.offenders.join(', ') || 'unknown element'}`,
  ).toBeLessThanOrEqual(layout.clientWidth + 1);
}

export async function expectNoBrokenImages(page) {
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src') || ''),
  );
  expect(broken, 'all loaded images should decode').toEqual([]);
}

export const TEST_PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
);
