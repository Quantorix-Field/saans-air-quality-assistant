import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/app'] as const;
const COLOR_SCHEMES = ['light', 'dark'] as const;

for (const route of ROUTES) {
  for (const scheme of COLOR_SCHEMES) {
    test(`axe: ${route} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(route);
      await page.waitForSelector('main');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (results.violations.length > 0) {
        const details = results.violations
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(', ')).join('; ')}`)
          .join('\n');
        throw new Error(`Axe violations on ${route} (${scheme}):\n${details}`);
      }

      expect(results.violations).toHaveLength(0);
    });

    test(`no CSP errors: ${route} (${scheme})`, async ({ page }) => {
      const cspErrors: string[] = [];
      page.on('console', (msg) => {
        if (/content security policy|refused to/i.test(msg.text())) {
          cspErrors.push(msg.text());
        }
      });

      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(route);
      await page.waitForSelector('main');

      expect(cspErrors).toHaveLength(0);
    });
  }
}

test('no horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.waitForSelector('main');

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow, 'Horizontal overflow at 320px').toBe(false);
});

test('keyboard: Tab reaches skip link first', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('main');

  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.className ?? '';
  });
  expect(focused).toContain('skip-link');
});
