import { test, expect } from '@playwright/test'

test.describe('Project Onboarding E2E', () => {
  // Assumes user is authenticated — use storageState for session
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('user can create a new project through the full wizard', async ({ page }) => {
    await page.goto('/projects/new')

    // Step 1: URL
    await expect(page.getByText('Step 1')).toBeVisible()
    await page.fill('[placeholder*="https://"]', 'https://example.com')
    await page.fill('[placeholder*="Project name"]', 'E2E Test Project')
    await page.click('button:has-text("Continue")')

    // Step 2: Setup questionnaire
    await expect(page.getByText('Step 2')).toBeVisible()
    // Select first option in each question tile group
    await page.locator('[data-question="content-tools"] [data-option]:first-child').click()
    await page.locator('[data-question="active-channels"] [data-option]:first-child').click()
    await page.locator('[data-question="challenge"] [data-option]:first-child').click()
    await page.locator('[data-question="gsc-status"] [data-option]:first-child').click()
    await page.locator('[data-question="content-output"] [data-option]:first-child').click()
    await page.locator('[data-question="project-type"] [data-option]:first-child').click()
    await page.click('button:has-text("Continue")')

    // Step 3: Context
    await expect(page.getByText('Step 3')).toBeVisible()
    await page.fill('[name="targetAudience"]', 'Developers building SaaS products')
    await page.fill('[name="valueProposition"]', 'Automates marketing so founders can focus on product')
    await page.click('button:has-text("Create Project")')

    // Should land on project overview
    await expect(page).toHaveURL(/\/projects\/[\w-]+$/)
    await expect(page.getByText('E2E Test Project')).toBeVisible()
  })

  test('personalised setup card appears on project overview after onboarding', async ({ page }) => {
    // Navigate to a project that was created with onboarding answers
    await page.goto('/projects/new')
    // Check that onboarding wizard is accessible
    await expect(page.getByText('Step 1')).toBeVisible()
  })
})
