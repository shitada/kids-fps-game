import { test, expect } from '@playwright/test';

test('title scene renders with hiragana play button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('スプラッシュ')).toBeVisible();
  await expect(page.getByRole('button', { name: /あそぶ/ })).toBeVisible();
});

test('navigates from title → skin select → map select', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await expect(page.getByText('どのこで あそぶ？')).toBeVisible();
  await expect(page.getByRole('button', { name: /くまくん/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /くまくんの りったいプレビュー/ })).toBeVisible();
  await expect(page.locator('.skin-thumbnail')).toHaveCount(5);
  await expect(page.getByText(/はやさ \+4%/)).toBeVisible();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await expect(page.getByText('どこで あそぶ？')).toBeVisible();
  await expect(page.locator('.map-thumbnail')).toHaveCount(3);
  for (const image of await page.locator('.map-thumbnail').all()) {
    expect(await image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 100)).toBe(true);
  }
});

test('difficulty and mascot selection have explicit selected and locked states', async ({ page }) => {
  await page.goto('/');
  const hard = page.getByRole('button', { name: /むずかしい/ });
  await hard.click();
  await expect(hard).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  const rabbit = page.getByRole('button', { name: /うさちゃん/ });
  await rabbit.click();
  await expect(rabbit).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /ねこさん/ })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('img', { name: /うさちゃんの りったいプレビュー/ })).toBeVisible();
  await page.getByRole('button', { name: /もどる/ }).click();
  await expect(page.getByRole('button', { name: /むずかしい/ })).toHaveAttribute('aria-pressed', 'true');
});

test('menus use one WebGL canvas, locally generated previews and large controls', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== 'localhost') external.push(request.url());
  });
  await page.goto('/');
  for (const button of await page.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
  }
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  for (const image of await page.locator('.skin-thumbnail').all()) await expect(image).toHaveAttribute('src', /^data:image\/png/);
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  for (const image of await page.locator('.map-thumbnail').all()) await expect(image).toHaveAttribute('src', /^data:image\/png/);
  expect(external).toEqual([]);
});

test('compact menu cards and the back action never overlap', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  const back = await page.getByRole('button', { name: /もどる/ }).boundingBox();
  for (const card of await page.locator('.map-card').all()) {
    const box = await card.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(back!.y);
  }
});

test('mobile battle scene shows reusable touch controls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch controls are only shown on mobile devices');

  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();

  await expect(page.locator('#touch-controls')).toBeVisible();
  await expect(page.getByRole('button', { name: 'うつ', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'とぶ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'つくる' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'きりかえ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'むきをかえる' })).toBeVisible();
});

test('touch controls never cover the wetness gauge or the ammo counter', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch controls are only shown on mobile devices');

  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();
  await expect(page.locator('#touch-controls')).toBeVisible();

  const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  const hp = await page.locator('.skb-hp').boundingBox();
  const ammo = await page.locator('.skb-weapon').boundingBox();
  expect(hp).not.toBeNull();
  expect(ammo).not.toBeNull();

  for (const name of ['うつ', 'とぶ', 'つくる', 'きりかえ', 'むきをかえる']) {
    const button = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(button, `${name} button should be laid out`).not.toBeNull();
    expect(overlaps(button!, hp!), `${name} overlaps the wetness gauge`).toBe(false);
    expect(overlaps(button!, ammo!), `${name} overlaps the ammo counter`).toBe(false);
  }

  const joystick = await page.locator('.skb-joystick').boundingBox();
  expect(joystick).not.toBeNull();
  expect(overlaps(joystick!, hp!), 'joystick overlaps the wetness gauge').toBe(false);
});

test('battle HUD shows the radar, pause button and enemy nameplates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();

  await expect(page.locator('.skb-radar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'おやすみ' })).toBeVisible();
  await expect(page.locator('#skb-nameplates')).toBeAttached();
});

test('pause button opens the rest menu and can resume', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();

  await page.getByRole('button', { name: 'おやすみ' }).click();
  await expect(page.getByText('おやすみちゅう')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'おやすみちゅう' })).toBeVisible();
  await page.getByRole('button', { name: /つづける/ }).click();
  await expect(page.getByText('おやすみちゅう')).toBeHidden();
});

test('Escape toggles the rest menu both ways', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'keyboard shortcuts are a desktop path');

  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();
  await expect(page.locator('.skb-radar')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByText('おやすみちゅう')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('おやすみちゅう')).toBeHidden();
});

test('resuming from the rest menu stays resumed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();

  await page.getByRole('button', { name: 'おやすみ' }).click();
  await expect(page.getByText('おやすみちゅう')).toBeVisible();
  await page.getByRole('button', { name: /つづける/ }).click();
  await page.waitForTimeout(600);
  await expect(page.getByText('おやすみちゅう')).toBeHidden();
});

test('restarting from the rest menu starts a fresh battle', async ({ page }) => {
  // Three full world rebuilds take longer on headless Chromium's software renderer.
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    if (!/pointer lock/i.test(e.message)) errors.push(e.message);
  });

  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();
  await expect(page.locator('.skb-radar')).toBeVisible();

  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'おやすみ' }).click();
    await page.getByRole('button', { name: /もういっかい/ }).click();
    await expect(page.locator('.skb-radar')).toBeVisible();
  }

  await expect(page.locator('#skb-hud')).toHaveCount(1);
  await expect(page.locator('#skb-nameplates')).toHaveCount(1);
  await expect(page.locator('#skb-pause')).toHaveCount(1);
  await expect(page.locator('.skb-remaining')).toHaveText(/のこり 7 \/ 7/);
  expect(errors).toEqual([]);
});
