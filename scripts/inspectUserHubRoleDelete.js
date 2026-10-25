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
  await userHub.locateRoleInList('Site Engineer');
  await userHub.openRoleActionMenu('Site Engineer');
  await page.getByRole('menuitem', { name: /^delete$/i }).click({ force: true });

  for (const ms of [500, 1500, 3000]) {
    await page.waitForTimeout(ms);
    const body = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const idx = body.toLowerCase().indexOf('delete');
    console.log(`\n--- ${ms}ms ---`);
    console.log(body.slice(Math.max(0, idx - 40), idx + 400));
    console.log('Yes visible:', await page.getByRole('button', { name: /^yes$/i }).first().isVisible().catch(() => false));
    console.log('No visible:', await page.getByRole('button', { name: /^no$/i }).first().isVisible().catch(() => false));
  }

  await page.getByRole('button', { name: /^no$/i }).first().click({ force: true }).catch(() => page.keyboard.press('Escape'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
