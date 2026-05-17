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
  await expect(page.getByText('🐻')).toBeVisible();
  await expect(page.getByText(/はやさ \+4%/)).toBeVisible();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await expect(page.getByText('どこで あそぶ？')).toBeVisible();
});

test('mobile battle scene shows reusable touch controls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch controls are only shown on mobile devices');

  await page.goto('/');
  await page.getByRole('button', { name: /あそぶ/ }).click();
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await page.getByRole('button', { name: /プールパーク/ }).click();

  await expect(page.locator('#touch-controls')).toBeVisible();
  await expect(page.getByRole('button', { name: 'うつ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'とぶ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'つくる' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'きりかえ' })).toBeVisible();
});
