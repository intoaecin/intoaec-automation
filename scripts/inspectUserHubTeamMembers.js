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
  await page.getByRole('tab', { name: /^teams$/i }).first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /^create team$/i }).first().click({ force: true });
  await page.waitForTimeout(2000);

  const memberRows = page.locator('label, li, div').filter({ has: page.locator('input[type="checkbox"]') });
  const count = await memberRows.count();
  console.log('Member rows:', count);
  for (let i = 0; i < Math.min(count, 8); i += 1) {
    const text = ((await memberRows.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    console.log(`Member[${i}]:`, text.slice(0, 80));
  }

  const branch = page.getByPlaceholder(/select branch/i).first();
  const attrs = await branch.evaluate((el) => ({
    disabled: el.disabled,
    readOnly: el.readOnly,
    ariaDisabled: el.getAttribute('aria-disabled'),
    role: el.getAttribute('role'),
    className: el.className,
  }));
  console.log('Branch attrs:', attrs);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
