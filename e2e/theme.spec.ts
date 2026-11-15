import type { Page } from '@playwright/test';
import { expect, logIn, STUDIO, test } from './fixtures';

const style = (page: Page, selector: string, property: string) =>
  page.locator(selector).first().evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

test('toggles light and dark themes cleanly with ThemeToggle', async ({ page }) => {
  await logIn(page, STUDIO.email, 'sai-mat-khau');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  const light = {
    bg: await style(page, 'main', 'background-color'),
    alert: await style(page, 'main [role="alert"]', 'color'),
    button: await style(page, 'button[type="submit"]', 'color'),
  };
  expect(light.bg).toBe('rgb(249, 250, 251)');

  await page.getByRole('button', { name: 'Chuyển đổi giao diện sáng / tối' }).click();
  await expect.poll(() => style(page, 'main', 'background-color')).toBe('rgb(9, 11, 16)');
  expect(await style(page, 'main [role="alert"]', 'color')).not.toBe(light.alert);
  expect(await style(page, 'button[type="submit"]', 'color')).not.toBe(light.button);
});
