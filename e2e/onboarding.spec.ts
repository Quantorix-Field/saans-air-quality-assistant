/**
 * Onboarding + Settings E2E tests.
 * Playwright cannot run in the Android/Termux environment (Unsupported platform: android);
 * these tests run in CI.
 */
import { test, expect, type Page } from '@playwright/test';

const GEOCODE_MOCK = {
  results: [
    { name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 },
  ],
};

async function mockApi(page: Page) {
  await page.route('/api/geocode**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GEOCODE_MOCK) }),
  );
  await page.route('/api/air**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hours: [{ time: '2026-01-01T00:00', pm25: 30, pm10: 50, no2: 20, so2: 10, o3: 40, co: 0.5 }],
        nowIndex: 0,
        usAqi: 60,
        observedAt: '2026-01-01T00:00',
        dataAgeHours: 0.1,
      }),
    }),
  );
}

test('full flow: search Delhi -> pick -> profile -> Today shows city and reload keeps it', async ({ page }) => {
  await mockApi(page);
  await page.goto('/app');
  await page.fill('#place-search-input', 'Delhi');
  await page.getByRole('button', { name: 'Delhi, Delhi, India' }).click();
  await page.getByRole('heading', { level: 1, name: 'Your profile' }).waitFor();
  await page.getByRole('button', { name: "Save and see today's air" }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Today in Delhi');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Today in Delhi');
});

test('keyboard-only completion', async ({ page }) => {
  await mockApi(page);
  await page.goto('/app');
  await page.getByRole('searchbox').focus();
  await page.keyboard.type('Delhi');
  const resultBtn = page.getByRole('button', { name: 'Delhi, Delhi, India' });
  await resultBtn.waitFor();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(resultBtn).toBeFocused();
  await page.keyboard.press('Enter');

  await page.getByRole('heading', { level: 1, name: 'Your profile' }).waitFor();
  const submitBtn = page.getByRole('button', { name: "Save and see today's air" });
  for (let i = 0; i < 20; i++) {
    const focused = await submitBtn.evaluate((el) => document.activeElement === el);
    if (focused) break;
    await page.keyboard.press('Tab');
  }
  await expect(submitBtn).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Today in Delhi');
});

test('geolocation with granted permission completes step 1', async ({ page, context }) => {
  await mockApi(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 28.6139, longitude: 77.209 });
  await page.goto('/app');
  await page.getByRole('button', { name: 'Use my location' }).click();
  await page.getByRole('heading', { level: 1, name: 'Your profile' }).waitFor();
  await page.getByRole('button', { name: "Save and see today's air" }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Today in My location');
});

test('delete my data returns to onboarding', async ({ page }) => {
  await mockApi(page);
  await page.goto('/app');
  await page.evaluate(() => {
    localStorage.setItem('saans:place', JSON.stringify({ name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 }));
    localStorage.setItem('saans:profile', JSON.stringify({ ageGroup: 'adult', conditions: [], commuteMode: 'metro', hasPurifier: false, hasN95: false, outdoorHours: { start: 5, end: 21 } }));
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Today in Delhi');

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');
  await page.getByRole('button', { name: 'Delete my data' }).click();
  await page.locator('dialog[open]').waitFor();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Choose your city');
});
