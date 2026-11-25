import { expect, test } from './fixtures';

test('ST-STUDIO-05 an expired session is sent to the login page, never a raw 401/502', async ({ loggedIn: page }) => {
  // Drop the session cookies the way an expiry would, then open a protected page.
  await page.context().clearCookies();
  await page.goto('/contracts');
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole('heading', { name: 'Studio Web' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
});

test('ST-STUDIO-07 signing out in another tab sends this tab to the login page (D-36)', async ({ loggedIn: page }) => {
  const other = await page.context().newPage();
  await other.goto('/');
  await expect(other.getByRole('heading', { name: 'Xin chào, Lumen Studio' })).toBeVisible();

  // The other tab signs out: the shared session cookie is cleared.
  await other.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(other).toHaveURL(/\/login$/);

  // This tab comes back to the front and follows the session to the login page. Headless Chromium does not
  // always fire focus/visibilitychange on bringToFront, so nudge both the way a real window switch would.
  await page.bringToFront();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveURL(/\/login$/);
  await other.close();
});