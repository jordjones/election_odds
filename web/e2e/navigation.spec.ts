import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should display header with logo', async ({ page }) => {
    await page.goto('/');

    // Check logo is visible
    await expect(page.getByRole('link', { name: /ElectionOdds/i })).toBeVisible();
  });

  test('should navigate to charts page', async ({ page }) => {
    await page.goto('/');

    // Click on Charts link
    await page.getByRole('link', { name: /Charts/i }).first().click();

    // Check we're on the charts page
    await expect(page).toHaveURL('/charts');
    await expect(page.getByRole('heading', { name: /Price Charts/i })).toBeVisible();
  });

  test('should navigate to track record page', async ({ page }) => {
    await page.goto('/');

    // Click on Track Record link
    await page.getByRole('link', { name: /Track Record/i }).first().click();

    // Check we're on the track record page
    await expect(page).toHaveURL('/track-record');
    await expect(page.getByRole('heading', { name: /Track Record/i })).toBeVisible();
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/');

    // Click on About link
    await page.getByRole('link', { name: /About/i }).first().click();

    // Check we're on the about page
    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('heading', { name: 'About Election Odds Aggregator' })).toBeVisible();
  });

  test('should navigate to GOP primary via dropdown', async ({ page }) => {
    await page.goto('/');

    // Open 2028 Election dropdown
    await page.getByRole('button', { name: /2028 Election/i }).click();

    // Click on GOP Primary (use first match from dropdown)
    await page.getByRole('link', { name: 'GOP Primary', exact: true }).click();

    // Check we're on the GOP primary page
    await expect(page).toHaveURL('/primaries/gop');
    await expect(page.getByRole('heading', { name: /Republican Primary/i })).toBeVisible();
  });

  test('should navigate to DEM primary via dropdown', async ({ page }) => {
    await page.goto('/');

    // Open 2028 Election dropdown
    await page.getByRole('button', { name: /2028 Election/i }).click();

    // Click on DEM Primary (use first match from dropdown)
    await page.getByRole('link', { name: 'DEM Primary', exact: true }).click();

    // Check we're on the DEM primary page
    await expect(page).toHaveURL('/primaries/dem');
    await expect(page.getByRole('heading', { name: /Democratic Primary/i })).toBeVisible();
  });
});
