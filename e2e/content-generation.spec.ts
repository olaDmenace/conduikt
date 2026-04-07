import { test, expect } from '@playwright/test'

test.describe('Content Generation E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('user can generate content with copywriting agent', async ({ page }) => {
    // Navigate to a project's content page
    await page.goto('/projects/test-project-id/content')

    // Should see agent selection
    await expect(page.getByText('Copywriting Agent')).toBeVisible()

    // Fill in prompt
    await page.fill('textarea', 'Write a hero headline for a marketing automation SaaS')
    await page.click('button:has-text("Generate")')

    // AI response should stream in
    await expect(page.locator('[data-testid="generation-output"]')).not.toBeEmpty({ timeout: 30000 })

    // Save the output
    await page.click('button:has-text("Save")')
    await expect(page.getByText('Saved')).toBeVisible()
  })

  test('content score panel appears after generation', async ({ page }) => {
    await page.goto('/projects/test-project-id/content')
    await page.fill('textarea', 'Write a hero headline for a marketing automation SaaS')
    await page.click('button:has-text("Generate")')
    await page.waitForSelector('[data-testid="generation-output"]:not(:empty)', { timeout: 30000 })

    // Score panel should auto-appear
    await expect(page.locator('[data-testid="content-score-panel"]')).toBeVisible({ timeout: 15000 })
  })

  test('Cmd+K command palette opens and closes correctly', async ({ page }) => {
    await page.goto('/dashboard')
    await page.keyboard.press('Meta+k')
    await expect(page.locator('[role="dialog"][data-testid="command-palette"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"][data-testid="command-palette"]')).not.toBeVisible()
  })
})
