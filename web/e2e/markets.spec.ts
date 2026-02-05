import { test, expect } from '@playwright/test';

test.describe('Markets', () => {
  test('should display GOP primary market', async ({ page }) => {
    await page.goto('/primaries/gop');

    // Check page title
    await expect(page.getByRole('heading', { name: /Republican Primary/i })).toBeVisible();

    // Check odds table is displayed
    await expect(page.getByRole('table')).toBeVisible();

    // Check that candidates are displayed in table
    await expect(page.getByRole('table').getByText(/Vance/i)).toBeVisible();
  });

  test('should display DEM primary market', async ({ page }) => {
    await page.goto('/primaries/dem');

    // Check page title
    await expect(page.getByRole('heading', { name: /Democratic Primary/i })).toBeVisible();

    // Check odds table is displayed
    await expect(page.getByRole('table')).toBeVisible();

    // Check that candidates are displayed in table
    await expect(page.getByRole('table').getByText(/Newsom/i)).toBeVisible();
  });

  test('should display House control market', async ({ page }) => {
    await page.goto('/races/house-2026');

    // Check odds table is displayed
    await expect(page.getByRole('table')).toBeVisible();

    // Check that parties are displayed in table
    await expect(page.getByRole('table').getByText(/Democratic/i)).toBeVisible();
    await expect(page.getByRole('table').getByText(/Republican/i)).toBeVisible();
  });

  test('should display Senate control market', async ({ page }) => {
    await page.goto('/races/senate-2026');

    // Check odds table is displayed
    await expect(page.getByRole('table')).toBeVisible();

    // Check that parties are displayed in table
    await expect(page.getByRole('table').getByText(/Democratic/i)).toBeVisible();
    await expect(page.getByRole('table').getByText(/Republican/i)).toBeVisible();
  });

  test('should display presidential by party market', async ({ page }) => {
    await page.goto('/presidential/party');

    // Check page title
    await expect(page.getByRole('heading', { name: /by Party/i })).toBeVisible();

    // Check odds table is displayed
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should display presidential by candidates market', async ({ page }) => {
    await page.goto('/presidential/candidates');

    // Check page title
    await expect(page.getByRole('heading', { name: /by Candidate/i })).toBeVisible();

    // Check odds table is displayed
    await expect(page.getByRole('table')).toBeVisible();
  });
});
