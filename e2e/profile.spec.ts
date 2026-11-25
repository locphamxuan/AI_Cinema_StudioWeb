import { FAKE_API_URL } from './env';
import { expect, test } from './fixtures';

test('ST-STUDIO-18 blocks signing while the legal profile is incomplete and links to it', async ({ loggedIn: page, request }) => {
  // The studio left its tax code empty: the API now reports the profile incomplete.
  expect((await request.post(`${FAKE_API_URL}/__test/profile`, { data: { taxCode: '' } })).status()).toBe(204);

  await page.goto('/contracts');
  await expect(page.getByRole('heading', { name: 'Hợp đồng', level: 1 })).toBeVisible();

  // A round waiting for the studio shows what is missing instead of a way to sign.
  const notice = page.getByRole('alert').filter({ hasText: 'Chưa ký được: hồ sơ pháp lý của Studio còn thiếu.' });
  await expect(notice.first()).toBeVisible();
  await expect(notice.first()).toContainText('Mã số thuế');
  await expect(notice.first().getByRole('link', { name: 'Hoàn thiện hồ sơ pháp lý' })).toHaveAttribute('href', '/profile');
  // No sign button is offered while the profile is incomplete.
  await expect(page.getByRole('button', { name: /Ký hợp đồng|Đồng ý giá và ký/ })).toHaveCount(0);
});