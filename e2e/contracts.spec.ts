import type { Locator, Page } from '@playwright/test';
import { FAKE_API_URL } from './env';
import { expect, test } from './fixtures';
import { signaturePng } from './signature';

const project = (page: Page, title: string) => page.getByRole('article', { name: title });
const openTab = (page: Page, label: string) => page.getByRole('navigation', { name: 'Nhóm hợp đồng' }).getByRole('link', { name: new RegExp(`^${label}`) }).click();

/** Choose the signature image, wait for its preview and accept the terms: every signing move needs them. */
const agree = async (card: Locator) => {
  await card.getByLabel(/Ảnh chữ ký của Studio/).setInputFiles(signaturePng());
  await expect(card.getByRole('img', { name: 'Xem trước chữ ký của Studio' })).toBeVisible();
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

test('splits the contracts into tabs by where each one stands', async ({ page }) => {
  await expect(page.getByRole('link', { name: /^Cần ký/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(project(page, 'Mùa hạ cuối')).toBeVisible();
  await expect(project(page, 'Hành trình ánh sáng').getByText('Vòng 2', { exact: false })).toBeVisible();
  await openTab(page, 'Đã ký đủ');
  await expect(project(page, 'Phố đêm').getByText('Đã ký đủ')).toBeVisible();
  await openTab(page, 'Lịch sử báo giá');
  const rows = page.getByRole('table', { name: 'Lịch sử báo giá' }).getByRole('row');
  await expect(rows).toHaveCount(5);
  await expect(rows.filter({ hasText: 'Đã thay thế' })).toHaveCount(1);
});

test('refuses a file that is not a signature image before anything is sent', async ({ page }) => {
  const card = project(page, 'Mùa hạ cuối');
  await card.getByLabel(/Ảnh chữ ký của Studio/).setInputFiles({ name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await expect(card.getByRole('alert')).toHaveText('Ảnh chữ ký phải là file PNG hoặc JPG.');
  await card.getByLabel(/Ảnh chữ ký của Studio/).setInputFiles(signaturePng(100, 30));
  await expect(card.getByRole('alert')).toContainText('Ảnh chữ ký quá nhỏ');
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

test('signs the cost the Admin countered, which moves the contract to Đã ký đủ', async ({ page }) => {
  const card = project(page, 'Hành trình ánh sáng');
  await agree(card);
  await card.getByRole('button', { name: 'Đồng ý giá và ký' }).click();
  await expect(page.getByRole('dialog')).toContainText('150.000.000 VND');
  await confirmSign(page, 'Đồng ý giá và ký');
  // The page follows the contract to its new tab and says what happened there.
  await expect(page).toHaveURL(/tab=signed/);
  await expect(page.getByRole('status')).toContainText('Hợp đồng đã đủ hai chữ ký');
  await expect(page.getByRole('link', { name: /^Đã ký đủ/ })).toHaveAttribute('aria-current', 'page');
  const signed = project(page, 'Hành trình ánh sáng');
  await expect(signed.getByText('Đã ký đủ')).toBeVisible();
  const download = page.waitForEvent('download');
  await signed.getByRole('link', { name: 'Bản đủ hai chữ ký' }).click();
  expect((await download).suggestedFilename()).toBe('hop-dong-final.pdf');
});

test('a round the Admin moved on meanwhile is not signed: the page reloads and says so', async ({ page, request }) => {
  const card = project(page, 'Hành trình ánh sáng');
  await agree(card);
  await card.getByRole('button', { name: 'Đồng ý giá và ký' }).click();
  // The Admin replaces the round on its portal while the confirmation is open.
  const moved = await request.post(`${FAKE_API_URL}/__test/contracts/0b6f0c1e-7777-4a6b-9c55-000000000002`, { data: { status: 'SUPERSEDED' } });
  expect(moved.status()).toBe(204);
  await confirmSign(page, 'Đồng ý giá và ký');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Hợp đồng vừa được AI Cinema cập nhật');
  await expect(project(page, 'Hành trình ánh sáng')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^Cần ký/ })).toContainText('1');
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
  await openTab(page, 'Chờ Admin ký');
  const waiting = project(page, 'Hành trình ánh sáng');
  await expect(waiting.getByText(/Vòng 3/)).toBeVisible();
  await expect(waiting.getByText('Studio đã ký – chờ Admin')).toBeVisible();
});

test('signs the contract just received at its budget, after downloading it', async ({ page }) => {
  const card = project(page, 'Mùa hạ cuối');
  await expect(card.getByText('Theo ngân sách')).toBeVisible();
  const download = page.waitForEvent('download');
  await card.getByRole('link', { name: 'Tải hợp đồng chưa ký (PDF)' }).click();
  expect((await download).suggestedFilename()).toMatch(/^hop-dong-.+\.pdf$/);
  await agree(card);
  await card.getByRole('button', { name: 'Ký hợp đồng' }).click();
  await expect(page.getByRole('dialog')).toContainText('200.000.000 VND');
  await confirmSign(page, 'Ký hợp đồng');
  await openTab(page, 'Chờ Admin ký');
  await expect(project(page, 'Mùa hạ cuối').getByText('Studio đã ký – chờ Admin')).toBeVisible();
});

test('proposes a lower cost on the contract just received', async ({ page }) => {
  const card = project(page, 'Mùa hạ cuối');
  await card.getByRole('button', { name: 'Đề xuất giá thấp hơn' }).click();
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('1500');
  await expect(card.getByText('Giá phải là bội số của 1.000 VND.')).toBeVisible();
  await agree(card);
  await card.getByPlaceholder('Ví dụ: 170.000.000').fill('120000000');
  // Enter in the cost field must open the confirmation, not sign straight away.
  await card.getByPlaceholder('Ví dụ: 170.000.000').press('Enter');
  await expect(page.getByRole('dialog')).toContainText('120.000.000 VND');
  await confirmSign(page, 'Ký hợp đồng');
  await openTab(page, 'Chờ Admin ký');
  await expect(project(page, 'Mùa hạ cuối').getByText('Studio đã ký – chờ Admin')).toBeVisible();
});

test('the studio keeps its own legal profile, checked before it is saved', async ({ page }) => {
  await page.getByRole('link', { name: 'Hồ sơ pháp lý' }).click();
  await expect(page.getByRole('heading', { name: 'Hồ sơ pháp lý', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Mã số thuế')).toHaveValue('0312345678');
  await page.getByLabel('Mã số thuế').fill('12345');
  await page.getByRole('button', { name: 'Lưu hồ sơ pháp lý' }).click();
  await expect(page.getByText(/Mã số thuế gồm 10 chữ số/)).toBeVisible();
  await page.getByLabel('Mã số thuế').fill('0312345678-001');
  await page.getByRole('button', { name: 'Lưu hồ sơ pháp lý' }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu hồ sơ pháp lý');
});
