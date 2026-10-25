const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const UserHubPage = require('../pages/admin/invite/UserHubPage');
const testData = require('../utils/testData');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const login = new LoginPage(page);
  await login.goto();
  await login.login(testData.admin.validUser.email, testData.admin.validUser.password);
  await login.isLoginSuccessful();

  const userHub = new UserHubPage(page);
  await userHub.navigateToUserHub();
  await userHub.clickRoles();
  await page.waitForTimeout(2000);

  const rows = await page.locator('tbody tr').allInnerTexts();
  console.log('Role rows:', rows.map((r) => r.replace(/\s+/g, ' ').trim().slice(0, 120)));

  const plumbing = rows.filter((r) => /plumb|plambar|plumping|electrician|project manager/i.test(r));
  console.log('Plumbing-related:', plumbing);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
