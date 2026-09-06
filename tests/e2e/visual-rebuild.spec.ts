import { test, expect, type Page } from '@playwright/test';

async function enterMap(page: Page, name: string, navigate = true): Promise<void> {
  if (navigate) await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.locator('.skb-radar')).toBeVisible();
}

test('all rebuilt maps render and return to the shared menu renderer', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  for (const map of ['プールパーク', 'おしろのおにわ', 'くものうえひろば']) {
    await enterMap(page, map, false);
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toHaveAttribute('data-triangles', /^[1-9]\d*$/);
    await expect(page.locator('.skb-remaining')).toHaveText(/7 \/ 7/);
    await page.getByRole('button', { name: 'おやすみ', exact: true }).click();
    await page.getByRole('button', { name: /タイトル|さいしょ/ }).click();
    await expect(page.getByRole('button', { name: /あそぶ/ })).toBeVisible();
    await expect(page.locator('#skb-hud')).toHaveCount(0);
    await expect(page.locator('#render-error')).toHaveCount(0);
    await expect(page.locator('canvas#game-canvas')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('existing progress survives the new selection screens without third-party requests', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skb_save_v1', JSON.stringify({
      totalWins: 6, totalMatches: 12, selectedSkin: 'sakana', difficulty: 'normal',
      unlockedSkins: ['kuma', 'usagi', 'neko', 'robo', 'sakana'],
      badges: ['first-win'], bestRank: 1, tutorialSeen: true,
      sfxVolume: 0.3, bgmVolume: 0.2, totalPlayMinutes: 28,
    }));
  });
  const thirdParty: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      thirdParty.push(request.url());
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await expect(page.getByRole('button', { name: /さかなちゃん/ })).toBeEnabled();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();
  await expect(page.locator('.skb-radar')).toBeVisible();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('skb_save_v1') ?? '{}'));
  expect(save).toMatchObject({
    totalWins: 6, totalMatches: 12, selectedSkin: 'sakana', difficulty: 'normal',
    badges: ['first-win'], sfxVolume: 0.3, bgmVolume: 0.2,
  });
  expect(thirdParty).toEqual([]);
});

test('losing the graphics context gives a visible retry path', async ({ page }) => {
  await enterMap(page, 'プールパーク');
  await page.locator('#game-canvas').evaluate((canvas) => {
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'もういちど ひらく' })).toBeVisible();
  await expect(page.locator('#skb-hud')).toHaveCount(0);
});

test('repeated same-map restarts stabilize GPU resource counts', async ({ page }) => {
  test.setTimeout(90_000);
  await enterMap(page, 'プールパーク');
  const counts: number[] = [];
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'おやすみ', exact: true }).click();
    counts.push(Number(await page.locator('#game-canvas').getAttribute('data-geometries')));
    await page.getByRole('button', { name: /もういっかい/ }).click();
    await expect(page.locator('.skb-radar')).toBeVisible();
  }
  // The first match may compile a different weapon; shared caches then plateau.
  expect(Math.max(...counts.slice(1)) - Math.min(...counts.slice(1))).toBeLessThanOrEqual(8);
  await expect(page.locator('#skb-hud')).toHaveCount(1);
  await expect(page.locator('#skb-nameplates')).toHaveCount(1);
  await expect(page.locator('#render-error')).toHaveCount(0);
});

test('keyboard and touch can select every rebuilt building piece', async ({ page, isMobile }) => {
  await enterMap(page, 'プールパーク');
  if (isMobile) await page.getByRole('button', { name: 'つくる', exact: true }).click();
  else await page.keyboard.press('q');
  await expect(page.locator('.skb-mode')).toHaveText(/かべ/);
  await expect(page.getByText(/ここに おける|ここには おけない/)).toBeVisible();
  for (const label of ['ゆか', 'かいだん', 'かべ']) {
    if (isMobile) await page.getByRole('button', { name: 'きりかえ', exact: true }).click();
    else await page.keyboard.press('r');
    await expect(page.locator('.skb-mode')).toHaveText(new RegExp(label));
  }
  if (isMobile) await page.getByRole('button', { name: 'つくる', exact: true }).click();
  else await page.keyboard.press('q');
  await expect(page.getByText(/ここに おける|ここには おけない/)).toBeHidden();
});
