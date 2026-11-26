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
  await expect(page.getByRole('heading', { name: 'Kịch bản chính thức' })).toBeVisible();
  await page.getByText('Bản 1 - bấm để xem').click();
  await expect(page.getByText('Kịch bản Final của Phố đêm')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Danh sách tập \(2\)/ })).toBeVisible();
});

test('ST-STUDIO-29 downloads the idea file the Reviewer attached to the project', async ({ loggedIn: page }) => {
  await page.getByRole('link', { name: 'Dự án', exact: true }).click();
  await page.getByRole('link', { name: /Phố đêm/ }).click();
  await expect(page.getByRole('heading', { name: /Tài liệu ý tưởng \(1\)/ })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Tải y-tuong.pdf' }).click();
  expect((await download).suggestedFilename()).toBe('y-tuong.pdf');
});
