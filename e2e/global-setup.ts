import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Sign in with test credentials
  await page.goto('http://localhost:3000/login')
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL ?? 'test@conduikt.com')
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD ?? 'TestPassword123!')
  await page.click('[type="submit"]')
  await page.waitForURL('**/dashboard')

  // Save auth state
  const authDir = path.join(__dirname, '.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir)
  await page.context().storageState({ path: path.join(authDir, 'user.json') })

  await browser.close()
}

export default globalSetup
