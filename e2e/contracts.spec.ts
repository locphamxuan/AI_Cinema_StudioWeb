import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const project = (page: Page, title: string) => page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });
const signedPdf = { name: 'hop-dong-da-ky.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 signed') };
/** Attach the contract PDF the studio signed and accept the terms: every signing move needs both. */
const agree = async (card: Locator) => {
  await card.getByLabel('Hợp đồng Studio đã ký (PDF, tối đa 10 MB)').setInputFiles(signedPdf);
  await card.getByLabel('Tôi đã đọc điều khoản và ký hợp đồng thay mặt Studio.').check();
};

/** Every signing move asks for confirmation first; the dialog repeats the button's label. */
const confirmSign = async (page: Page, label: string) => {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: label }).click();
};

test.beforeEach(async ({ loggedIn: page }) => {
  await page.getByRole('link', { name: 'Hợp đồng', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hợp đồng', level: 1 })).toBeVisible();
});

test('going back from the confirmation signs nothing', async ({ page }) => {
  const card = project(page, 'Hành trình ánh sáng');
  await agree(card);
  const opener = card.getByRole('button', { name: 'Đồng ý giá và ký' });
  await opener.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Quay lại' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  // The page behind the modal is inert: Tab stays in the dialog, Escape closes it.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(card.getByText('Admin đề xuất giá – chờ Studio')).toBeVisible();
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
  await expect(page.getByRole('dialog')).toContainText('150.000.000 VND');
  await confirmSign(page, 'Đồng ý giá và ký');
  await expect(card.getByText('Đã ký đủ')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Đồng ý giá và ký' })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await card.getByRole('link', { name: 'Bản cuối (đủ hai chữ ký)' }).first().click();
  expect((await download).suggestedFilename()).toBe('hop-dong-final.pdf');
});

test('counters the Admin with another cost, which opens a new round', async ({ page }) => {
  const card = project(page, 'Hành trình ánh sáng');
  await card.getByRole('button', { name: 'Đề xuất giá khác', exact: true }).click();
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('160.000.000');
  await expect(card.getByText('= 160.000.000 VND')).toBeVisible();
  await agree(card);
  await card.getByRole('button', { name: 'Gửi đề xuất giá khác' }).click();
  await expect(page.getByRole('dialog')).toContainText('160.000.000 VND');
  await confirmSign(page, 'Gửi đề xuất giá khác');
  await expect(card.getByText('Vòng 3')).toBeVisible();
  await expect(card.getByText('Studio đã ký – chờ Admin')).toBeVisible();
});

test('fills in the cost of a template just sent to the studio', async ({ page }) => {
  const card = project(page, 'Mùa hạ cuối');
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('1500');
  await expect(card.getByText('Giá phải là bội số của 1.000 VND.')).toBeVisible();
  await agree(card);
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('120000000');
  // Enter in the cost field must open the confirmation, not sign straight away.
  await card.getByPlaceholder('Ví dụ: 170.000.000').press('Enter');
  await expect(page.getByRole('dialog')).toContainText('120.000.000 VND');
  await confirmSign(page, 'Gửi giá và ký');
  await expect(card.getByText('Studio đã ký – chờ Admin')).toBeVisible();
});
