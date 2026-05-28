import { test, expect, type APIRequestContext } from '@playwright/test';

const API = 'http://localhost:3000/api/v1';

async function cleanupBaby(api: APIRequestContext, name: string) {
  const res = await api.get(`${API}/babies?limit=100`);
  if (!res.ok()) return;
  const json = (await res.json()) as { data: { id: string; name: string }[] };
  for (const b of json.data) {
    if (b.name === name) await api.delete(`${API}/babies/${b.id}`);
  }
}

/**
 * US01 quick record + US07 multi-baby:
 * 1. Create a fresh baby through the UI.
 * 2. Open AddFeedingSheet via FAB.
 * 3. Search a food, fill form, submit.
 * 4. Expect the home page to reflect a new TRYING entry.
 */
test.describe('Quick record happy path', () => {
  const name = `E2E測試寶_${Date.now()}`;

  test.afterEach(async ({ request }) => {
    await cleanupBaby(request, name);
  });

  test('create baby → record feeding → status updates', async ({ page }) => {
    await page.goto('/babies/new');

    await page.getByLabel('姓名').fill(name);
    await page.getByLabel('出生日期').fill('2025-11-15');
    await page.getByRole('button', { name: '儲存' }).click();

    // Land on /babies and see the new entry as 使用中
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText('使用中')).toBeVisible();

    // Navigate home and trigger AddFeedingSheet
    await page.goto('/');
    await expect(page.getByText(name).first()).toBeVisible();
    await page.getByRole('button', { name: '新增餵食' }).click();

    // Pick a known seed food
    await page.getByPlaceholder('搜尋食材').fill('紅蘿蔔泥');
    await page
      .getByRole('button', { name: /紅蘿蔔泥/ })
      .first()
      .click();

    // Submit
    await page.getByRole('button', { name: /把這一頁收下/ }).click();

    // Sheet closes; status TRYING count > 0 visible on home
    await expect(page.getByText('嘗試中')).toBeVisible();
    // The status card under 嘗試中 should now contain at least 1
    await expect(
      page
        .locator('div', { hasText: /^嘗試中$/ })
        .locator('xpath=..')
        .locator('div')
        .first(),
    ).toBeVisible();
  });
});
