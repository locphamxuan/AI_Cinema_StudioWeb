import { expect, logIn, STUDIO, test } from './fixtures';

test('a visitor without a session lands on the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Studio Web' })).toBeVisible();
});

test('a studio logs in and reaches its dashboard', async ({ page }) => {
  await logIn(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Xin chào, Lumen Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Hợp đồng chờ Studio xử lý/ })).toContainText('2');
  await expect(page.getByText('Admin đề xuất giá mới')).toBeVisible();
});

test('a studio logs in through the AI Cinema consent screen (OAuth 2.0 + PKCE)', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Đăng nhập bằng tài khoản AI Cinema' }).click();
  await expect(page.getByRole('heading', { name: 'Xin chào, Lumen Studio' })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('a studio that denies the consent is told so', async ({ page }) => {
  const start = await page.request.get('/api/auth/login', { maxRedirects: 0 });
  const consent = new URL(start.headers().location);
  consent.searchParams.set('deny', '1');
  await page.goto(consent.toString());
  await expect(page.getByText('Bạn đã từ chối cấp quyền cho Studio Web.')).toBeVisible();
});

test('a wrong password is refused with a clear message', async ({ page }) => {
  await logIn(page, STUDIO.email, 'sai-mat-khau');
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng.');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email')).toHaveValue(STUDIO.email);
});

test('logging out ends the session', async ({ loggedIn: page }) => {
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/contracts');
  await expect(page).toHaveURL(/\/login$/);
});
