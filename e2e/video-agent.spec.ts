import { test, expect } from '@playwright/test'

test.describe('Video Ad Agent E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('video agent page renders with style selector', async ({ page }) => {
    await page.goto('/projects/test-project-id/video')
    await expect(page.getByText('Presenter Ad')).toBeVisible()
    await expect(page.getByText('Cinematic Ad')).toBeVisible()
    await expect(page.locator('[data-testid="cinematic-coming-soon"]')).toBeVisible()
  })

  test('free/pro user sees upgrade prompt instead of form', async ({ page }) => {
    // This test requires a free/pro tier test account
    await page.goto('/projects/test-project-id/video')
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible()
    await expect(page.locator('[data-testid="video-brief-form"]')).not.toBeVisible()
  })

  test('video agent appears in project nav', async ({ page }) => {
    await page.goto('/projects/test-project-id/overview')
    await expect(page.locator('nav').getByText('Video')).toBeVisible()
  })
})
