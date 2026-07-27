import { expect, test } from '@playwright/test';

test('starts, accepts keyboard input, and pauses', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle('Vector Siege');
  await expect(page.getByRole('heading', { name: /vector siege/i })).toBeVisible();
  await page.getByRole('button', { name: 'START MISSION' }).click();

  const game = page.locator('.game');
  await expect(game).toHaveAttribute('data-phase', 'playing');
  await expect(game).toHaveAttribute('data-wave', '1');
  await expect(page.locator('#game-canvas')).toBeVisible();

  await page.keyboard.press('Space');
  await page.keyboard.press('KeyP');
  await expect(game).toHaveAttribute('data-phase', 'paused');
  await expect(page.getByRole('heading', { name: /mission paused/i })).toBeVisible();
  await page.getByRole('button', { name: 'RESUME' }).click();
  await expect(game).toHaveAttribute('data-phase', 'playing');
  expect(errors).toEqual([]);
});

test('supports sound and fullscreen controls at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'START MISSION' }).click();

  const sound = page.locator('#mute');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect(sound).toHaveText('SOUND OFF');
  await expect(page.getByRole('button', { name: 'FULLSCREEN' })).toBeVisible();
});
