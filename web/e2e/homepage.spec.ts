import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the title and hero section', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Election Odds/);

    // Check hero section
    await expect(page.getByRole('heading', { name: /Election Odds Aggregator/i })).toBeVisible();
    await expect(page.getByText(/Real-time aggregated prediction market/i)).toBeVisible();
  });

  test('should display featured markets', async ({ page }) => {
    await page.goto('/');

    // Wait for markets to load
    await expect(page.getByRole('heading', { name: /Featured Markets/i })).toBeVisible();

    // Check that market cards are displayed
    const marketCards = page.locator('[data-slot="card"]');
    await expect(marketCards.first()).toBeVisible();
  });

  test('should display stats section', async ({ page }) => {
    await page.goto('/');

    // Check for stats (Markets, Contracts, Volume, Sources)
    await expect(page.locator('text="Markets"').first()).toBeVisible();
    await expect(page.locator('text="Contracts"').first()).toBeVisible();
    await expect(page.getByText('Total Volume')).toBeVisible();
    await expect(page.locator('text="Data Sources"').first()).toBeVisible();
  });

  test('should navigate to track record page', async ({ page }) => {
    await page.goto('/');

    // Click on track record link/button
    await page.getByRole('link', { name: /View Track Record/i }).click();

    // Check we're on the track record page
    await expect(page).toHaveURL('/track-record');
    await expect(page.getByRole('heading', { name: /Track Record/i })).toBeVisible();
  });
});
