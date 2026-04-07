import { test, expect } from '@playwright/test'

// Use a unique test email per run to avoid conflicts
const testEmail = `test-${Date.now()}@conduikt-test.com`
const testPassword = 'TestPassword123!'

test.describe('Authentication E2E', () => {
  test('user can sign up with email and password', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', testPassword)
    await page.click('[type="submit"]')
    // Should land on dashboard or email confirmation page
    await expect(page).toHaveURL(/\/(dashboard|confirm)/)
  })

  test('user can log in with email and password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', testPassword)
    await page.click('[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('[type="submit"]')
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})
