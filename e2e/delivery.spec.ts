import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const episodeCard = (page: Page, title: string) =>
  page.locator('article').filter({ has: page.getByRole('heading', { name: new RegExp(title) }) });

test.beforeEach(async ({ loggedIn: page }) => {
  await page.getByRole('link', { name: 'Dự án', exact: true }).click();
  await page.getByRole('link', { name: /Phố đêm/ }).click();
  await expect(page.getByRole('heading', { name: 'Phố đêm', level: 1 })).toBeVisible();
});

test('delivers the film of an episode by link with the AI Disclosure', async ({ page }) => {
  await episodeCard(page, 'Đèn đường').getByRole('link', { name: /Nộp phim/ }).click();
  await page.getByLabel(/Link tệp video/).check();
  await page.getByLabel('Đường dẫn phim').fill('https://cdn.studio.vn/pho-dem/tap-1.mp4');
  await page.getByLabel('Hình ảnh động / video').check();
  await page.getByLabel(/không dùng hình ảnh, giọng nói/).check();
  await page.getByLabel(/không dùng tư liệu có bản quyền/).check();
  await page.getByLabel('Loại nhãn AI đề xuất').selectOption('AI_GENERATED');
  await page.getByRole('button', { name: /Nộp phim cho Reviewer/ }).click();
  await expect(page.getByRole('status')).toContainText('Đã nộp phim cho Reviewer');

  await page.getByRole('link', { name: 'Về trang dự án' }).click();
  const card = episodeCard(page, 'Đèn đường');
  await expect(card).toContainText('phiên bản 1');
  await expect(card).toContainText('Đang chờ xử lý');
});

test('refuses an incomplete delivery before sending it', async ({ page }) => {
  await episodeCard(page, 'Đèn đường').getByRole('link', { name: /Nộp phim/ }).click();
  await page.getByRole('button', { name: /Nộp phim cho Reviewer/ }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(5);
});

test('processes a failed delivery again', async ({ page }) => {
  const card = episodeCard(page, 'Mưa phố');
  await expect(card).toContainText('Lỗi xử lý: Không tải được tệp từ đường dẫn');
  await card.getByRole('button', { name: 'Xử lý lại' }).click();
  await expect(card).toContainText('Đang chờ xử lý');
  await expect(card.getByRole('button', { name: 'Xử lý lại' })).toHaveCount(0);
  await expect(card).not.toContainText('Lỗi xử lý:');
});
