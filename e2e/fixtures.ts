import { expect, test as base, type Page } from '@playwright/test';
import { FAKE_API_URL } from './env';

export const STUDIO = { email: 'studio@aicinema.com', password: 'Aicinema@123' };

export async function logIn(page: Page, email = STUDIO.email, password = STUDIO.password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

/** Every test starts from the seed of the fake API; `loggedIn` also opens a studio session. */
export const test = base.extend<{ loggedIn: Page }>({
  page: async ({ page, request }, provide) => {
    expect((await request.post(`${FAKE_API_URL}/__test/reset`)).status()).toBe(204);
    await provide(page);
  },
  loggedIn: async ({ page }, provide) => {
    await logIn(page);
    await expect(page.getByRole('heading', { name: 'Xin chào, Lumen Studio' })).toBeVisible();
    await provide(page);
  },
});

export { expect };
