import { expect, test } from './fixtures';

test('ST-STUDIO-08 shows only this studio\'s projects with the Final Script and deadlines', async ({ loggedIn: page }) => {
  await page.getByRole('link', { name: 'Dự án', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'Dự án', level: 1 })).toBeVisible();

  // Only the three projects the fake API gives this studio; no other studio's project appears.
  await expect(page.getByRole('heading', { name: 'Hành trình ánh sáng' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mùa hạ cuối' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Phố đêm' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(3);

  // A project opens with its Final Script and the episode deadlines.
  await page.getByRole('link', { name: /Phố đêm/ }).click();
  await expect(page.getByRole('heading', { name: 'Phố đêm', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kịch bản Final' })).toBeVisible();
  await page.getByText('Phiên bản 1 – bấm để xem toàn văn').click();
  await expect(page.getByText('Kịch bản Final của Phố đêm')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Danh sách tập \(2\)/ })).toBeVisible();
});