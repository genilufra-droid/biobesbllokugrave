// Playwright UI checks. Install and run from this directory with:
//   npm install -D @playwright/test
//   npx playwright install chromium
//   npx playwright test
//
// The first test only needs the public deployment. The form-review test is
// skipped by default because it requires a configured Supabase session and a
// saved draft; enable it in a staging environment with test credentials.
const { test, expect } = require('@playwright/test');

test('public deployment shows the login screen', async ({ page }) => {
  await page.goto('https://genilufra-droid.github.io/biobesbllokugrave/');
  await expect(page.getByText('Hyrje vetëm për llogarinë e autorizuar.')).toBeVisible();
});

test('form review renders all sections without tabs', async ({ page }) => {
  test.skip(true, 'Requires a configured Supabase session and a saved draft');
  await page.goto('https://genilufra-droid.github.io/biobesbllokugrave/');
  // After login and opening a saved record:
  await expect(page.locator('.editor-tabs')).toHaveCount(0);
  await expect(page.getByText('Të dhënat e ditës')).toBeVisible();
  await expect(page.getByText('Punonjësit')).toBeVisible();
  await expect(page.getByText('Peshimet')).toBeVisible();
  await expect(page.getByText('Komente')).toBeVisible();
});
