import { expect, test } from '@playwright/test';

test('can start a mixed human and AI game from the lobby', async ({ page }) => {
  await page.goto('/');

  const aiSeats = page.locator('input[type="checkbox"]');
  await expect(aiSeats).toHaveCount(2);
  await aiSeats.nth(1).check();
  await page.getByRole('button', { name: 'Start Classic' }).click();

  await expect(page.getByText('Lucky Tycoon')).toBeVisible();
  await expect(page.getByText(/Aggressive Alice|Bold Blake|Risky Riley|Tycoon Taylor/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll Dice' })).toBeVisible();
});

test('two browser players can create, join, and start an online room', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await host.getByRole('button', { name: 'Online' }).click();
  await host.getByPlaceholder('Your name').fill('Host');
  await host.getByRole('button', { name: 'Create Room' }).click();
  await expect(host.getByText('Room code')).toBeVisible();
  const code = await host.locator('.font-mono').first().innerText();

  await guest.goto('/');
  await guest.getByRole('button', { name: 'Online' }).click();
  await guest.getByPlaceholder('Your name').fill('Guest');
  await guest.getByPlaceholder('Room code').fill(code);
  await guest.getByRole('button', { name: 'Join Room' }).click();
  await expect(host.getByText('Guest')).toBeVisible();

  await host.getByRole('button', { name: 'Start Game' }).click();
  await expect(host.getByText('Lucky Tycoon')).toBeVisible();
  await expect(guest.getByText('Lucky Tycoon')).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});
