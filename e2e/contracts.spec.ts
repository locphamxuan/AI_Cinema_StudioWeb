import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const project = (page: Page, title: string) => page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });
const agree = (card: Locator) => card.getByLabel('Tôi đã đọc điều khoản và ký hợp đồng thay mặt Studio.').check();

test.beforeEach(async ({ loggedIn: page }) => {
  await page.getByRole('link', { name: 'Hợp đồng', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hợp đồng', level: 1 })).toBeVisible();
});

test('lists the rounds of every project, those waiting for the studio first', async ({ page }) => {
  // Mùa hạ cuối: a template just sent to the studio (e.g. after the Admin changed the studio of the project).
  await expect(page.locator('section h2')).toHaveText(['Mùa hạ cuối', 'Hành trình ánh sáng', 'Phố đêm']);
  await expect(project(page, 'Hành trình ánh sáng').getByText('Vòng 2')).toBeVisible();
  await expect(project(page, 'Hành trình ánh sáng').getByText('Đã thay thế')).toBeVisible();
  await expect(project(page, 'Phố đêm').getByText('Đã ký đủ')).toBeVisible();
});

test('signs the cost the Admin countered', async ({ page }) => {
  const card = project(page, 'Hành trình ánh sáng');
  await agree(card);
  await card.getByRole('button', { name: 'Đồng ý giá và ký' }).click();
  await expect(card.getByText('Đã ký đủ')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Đồng ý giá và ký' })).toHaveCount(0);
});

test('counters the Admin with another cost, which opens a new round', async ({ page }) => {
  const card = project(page, 'Hành trình ánh sáng');
  await card.getByRole('button', { name: 'Đề xuất giá khác', exact: true }).click();
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('160.000.000');
  await expect(card.getByText('= 160.000.000 VND')).toBeVisible();
  await agree(card);
  await card.getByRole('button', { name: 'Gửi đề xuất giá khác' }).click();
  await expect(card.getByText('Vòng 3')).toBeVisible();
  await expect(card.getByText('Studio đã ký – chờ Admin')).toBeVisible();
});

test('fills in the cost of a template just sent to the studio', async ({ page }) => {
  const card = project(page, 'Mùa hạ cuối');
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('1500');
  await expect(card.getByText('Giá phải là bội số của 1.000 VND.')).toBeVisible();
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('120000000');
  await agree(card);
  await card.getByRole('button', { name: 'Gửi giá và ký' }).click();
  await expect(card.getByText('Studio đã ký – chờ Admin')).toBeVisible();
});
