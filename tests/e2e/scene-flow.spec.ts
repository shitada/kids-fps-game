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
  await page.getByRole('button', { name: /つぎへ/ }).click();
  await expect(page.getByText('どこで あそぶ？')).toBeVisible();
});
