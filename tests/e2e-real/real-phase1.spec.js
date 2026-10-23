import {
  test,
  expect,
  dismissToasts,
  expectNoBrokenImages,
  expectNoHorizontalOverflow,
  TEST_PHOTO,
} from '../e2e/helpers.js';

function uniqueSuffix(testInfo, offset = 0) {
  const project = testInfo.project.name.replace(/\D/g, '');
  return `${project}${offset}${Date.now().toString(36)}`;
}

function testPhone(suffix) {
  return `98765${String(suffix).slice(-5).padStart(5, '0')}`;
}

async function signup(page, { name, email, phone, password }) {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { level: 1, name: 'Join Purana Bazaar' })).toBeVisible();
  await page.locator('#auth-name').fill(name);
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-phone').fill(phone);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/me$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function login(page, { email, password }) {
  await page.goto('/login');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
}

async function logout(page) {
  await page.goto('/me');
  await page.getByRole('button', { name: 'Sign out' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('real Supabase auth and listing lifecycle work end to end', async ({ page }, testInfo) => {
  test.setTimeout(120000);

  const suffix = uniqueSuffix(testInfo);
  const seller = {
    name: `E2E Seller ${testInfo.project.name}`,
    email: `phase1.e2e.seller.${suffix}@example.com`,
    phone: testPhone(`${Date.now()}`),
    password: `Phase1E2E!${suffix}`,
  };
  const buyer = {
    name: `E2E Buyer ${testInfo.project.name}`,
    email: `phase1.e2e.buyer.${suffix}@example.com`,
    phone: testPhone(`${Number(Date.now()) + 1}`),
    password: `Phase1E2E!${suffix}`,
  };
  const title = `Phase 1 E2E cycle ${suffix}`;
  const editedTitle = `${title} edited`;

  // Signed-out real build: no demo-only chrome or prose.
  await page.goto('/');
  await expect(page.locator('.demo-pill')).toHaveCount(0);
  await expect(page.getByText('Demo sign-in', { exact: false })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await signup(page, seller);
  await expect(page.getByText(/Demo profile/i)).toHaveCount(0);

  // Create a real listing with a browser-compressed photo upload.
  await page.goto('/sell');
  await expect(page.getByRole('heading', { level: 1, name: 'Sell something' })).toBeVisible();
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
    .fill('A real Supabase listing created by the Phase 1 browser test. It should be removed.');
  await page.locator('input[type=file]').setInputFiles({
    name: 'phase1-e2e.png',
    mimeType: 'image/png',
    buffer: TEST_PHOTO,
  });
  await expect(page.locator('.photo-item img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Publish listing' }).click();
  await expect(page).toHaveURL(/\/l\//, { timeout: 20000 });
  await expect(page.locator('.detail-title')).toHaveText(title);
  await expect(page.locator('.price-ticket')).toContainText('1,800');
  await expect(page.locator('.detail-media img')).toHaveCount(1);
  await expect(page.locator('.attr').filter({ hasText: 'Brand' })).toContainText('Hero');
  await expect(page.locator('.attr').filter({ hasText: 'Frame' })).toContainText('Steel');
  await expectNoBrokenImages(page);
  await expect(page.locator('.detail-media .fav-btn')).toHaveCount(0);
  const listingUrl = page.url();
  const listingId = listingUrl.match(/\/l\/([^/]+)/)?.[1]?.split('-')[0];
  expect(listingId).toBeTruthy();
  await dismissToasts(page);

  // Edit the real listing.
  await page.goto('/me/listings');
  const sellerRow = page.locator('.listing-row').filter({ hasText: title });
  await expect(sellerRow).toBeVisible();
  await sellerRow.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Edit listing' })).toBeVisible();
  await page.locator('#sell-title').fill(editedTitle);
  await page.locator('#sell-price').fill('1900');
  await expect(page.locator('#sell-attr-brand')).toHaveValue('Hero');
  await page.locator('#sell-attr-brand').fill('Atlas');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/l\//, { timeout: 20000 });
  await expect(page.locator('.detail-title')).toHaveText(editedTitle);
  await expect(page.locator('.price-ticket')).toContainText('1,900');
  await expect(page.locator('.attr').filter({ hasText: 'Brand' })).toContainText('Atlas');
  await dismissToasts(page);

  // A second real account saves the first account's listing.
  await logout(page);
  await signup(page, buyer);
  await page.goto(listingUrl);
  await expect(page.locator('.detail-title')).toHaveText(editedTitle);
  const favourite = page.locator('.detail-media .fav-btn');
  await expect(favourite).toHaveAttribute('aria-pressed', 'false');
  await favourite.click();
  await expect(favourite).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.toast')).toContainText('Saved');
  await dismissToasts(page);
  await page.goto('/saved');
  await expect(page.getByRole('heading', { level: 1, name: 'Saved items' })).toBeVisible();
  await expect(page.locator('.listing-card__title').filter({ hasText: editedTitle })).toBeVisible();
  await expectNoBrokenImages(page);
  await expectNoHorizontalOverflow(page);
  await logout(page);

  // The seller marks the listing sold and then removes it from the database.
  await login(page, seller);
  await page.goto('/me/listings');
  const activeRow = page.locator('.listing-row').filter({ hasText: editedTitle });
  await expect(activeRow).toBeVisible();
  await activeRow.getByRole('button', { name: 'Mark sold' }).click();
  const soldDialog = page.getByRole('dialog');
  await expect(soldDialog).toBeVisible();
  await soldDialog.getByRole('button', { name: 'Mark sold' }).click();
  await expect(page.locator('.toast')).toContainText('Listing marked as sold');
  await dismissToasts(page);
  await page.getByRole('tab', { name: /^Sold/ }).click();
  const soldRow = page.locator('.listing-row').filter({ hasText: editedTitle });
  await expect(soldRow).toBeVisible();
  await soldRow.getByRole('button', { name: 'Delete' }).click();
  const deleteDialog = page.getByRole('dialog');
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.listing-row').filter({ hasText: editedTitle })).toHaveCount(0);
  await expect(page.getByText('No listings here')).toBeVisible();
  await dismissToasts(page);
  await expectNoHorizontalOverflow(page);

  await logout(page);
});
