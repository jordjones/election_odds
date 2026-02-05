import { test, expect } from '@playwright/test';

test.describe('Track Record', () => {
  test('should display track record page', async ({ page }) => {
    await page.goto('/track-record');

    // Check title
    await expect(page.getByRole('heading', { name: /Track Record/i })).toBeVisible();

    // Check description
    await expect(page.getByText(/Historical accuracy/i)).toBeVisible();
  });

  test('should display summary stats', async ({ page }) => {
    await page.goto('/track-record');

    // Check for Brier score explanation
    await expect(page.getByText(/Brier Score/i).first()).toBeVisible();

    // Check for correct predictions stat
    await expect(page.getByText(/Correct Predictions/i)).toBeVisible();
  });

  test('should display historical predictions table', async ({ page }) => {
    await page.goto('/track-record');

    // Check table headers
    await expect(page.getByRole('columnheader', { name: /Year/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Type/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Prediction/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Probability/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Outcome/i })).toBeVisible();
  });

  test('should show election years in table', async ({ page }) => {
    await page.goto('/track-record');

    // Check for specific years in the table
    await expect(page.getByRole('cell', { name: '2024' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '2020' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '2016' }).first()).toBeVisible();
  });
});
