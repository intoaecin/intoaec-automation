/**
 * One-off: login → Clients → first row → dump module-like text (for selector tuning).
 * Run: node scripts/inspectProjectModules.js
 */
const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const testData = require('../utils/testData');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const login = new LoginPage(page);
  await login.goto();
  await login.login(testData.admin.validUser.email, testData.admin.validUser.password);
  await login.isLoginSuccessful();

  const nav = page.getByLabel('Clients/Projects').first();
  await nav.waitFor({ state: 'visible', timeout: 60000 });
  await nav.click();
  await page.waitForTimeout(2000);

  const row = page.locator('tbody tr').first();
  await row.waitFor({ state: 'visible', timeout: 60000 });
  const link = row.getByRole('link').first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
  } else {
    await row.locator('td').first().click();
  }
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const gridItems = await page.locator('.MuiGrid-item p, .MuiGrid-item .fw-500').allTextContents();
  console.log('URL:', page.url());
  console.log('MuiGrid item labels (sample):', gridItems.slice(0, 60));

  const allP = await page.locator('p').allTextContents();
  const interesting = [...new Set(allP.map((t) => t.trim()).filter((t) => t && t.length < 60))];
  console.log('Unique short <p> texts:', interesting.slice(0, 80));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
