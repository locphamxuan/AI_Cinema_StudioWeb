import type { Page } from '@playwright/test';
import { FAKE_API_URL } from './env';
import { expect, logIn, test } from './fixtures';

const sidebarBadge = (page: Page) => page.getByRole('link', { name: 'Thông báo' });

test('a notification opens the page it is about and is marked read', async ({ loggedIn: page }) => {
  await expect(sidebarBadge(page)).toContainText('1');
  const list = page.locator('#notifications');
  await expect(list.getByText('1 chưa đọc')).toBeVisible();
  await list.getByRole('button', { name: 'Xem chi tiết' }).click();
  await expect(page).toHaveURL(/\/contracts$/);
  await expect(page.getByRole('heading', { name: 'Hợp đồng', level: 1 })).toBeVisible();
  await expect(sidebarBadge(page)).not.toContainText('1');
});

test('notifications come a page at a time, and all can be marked read at once', async ({ page, request }) => {
  expect((await request.post(`${FAKE_API_URL}/__test/notifications`, { data: { count: 12 } })).status()).toBe(204);
  await logIn(page);
  const list = page.locator('#notifications');
  await expect(list.getByText('13 chưa đọc')).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(10);
  await list.getByRole('link', { name: 'Trang sau' }).click();
  await expect(list.getByText('Trang 2/2')).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await list.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
  await expect(list.getByText(/chưa đọc/)).toHaveCount(0);
});
