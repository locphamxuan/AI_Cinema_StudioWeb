import type { Page } from '@playwright/test';
import { expect, logIn, STUDIO, test } from './fixtures';

const style = (page: Page, selector: string, property: string) =>
  page.locator(selector).first().evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

// Studio Web has no theme switch of its own: it follows the system theme, which the test flips.
test('follows the system theme, light and dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await logIn(page, STUDIO.email, 'sai-mat-khau');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  const light = {
    alert: await style(page, 'main [role="alert"]', 'color'),
    button: await style(page, 'button[type="submit"]', 'color'),
  };
  expect(await style(page, 'body', 'background-color')).toBe('rgb(248, 250, 252)');
  expect(light.button).toBe('rgb(255, 255, 255)');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => style(page, 'body', 'background-color')).toBe('rgb(11, 17, 32)');
  // The `dark:` utilities switch too: light text on the error card, dark text on the bright accent button.
  expect(await style(page, 'main [role="alert"]', 'color')).not.toBe(light.alert);
  expect(await style(page, 'button[type="submit"]', 'color')).not.toBe(light.button);
});
