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
  const usersTab = page.getByRole('tab', { name: /^users$/i }).or(page.getByRole('button', { name: /^users$/i }));
  await usersTab.first().click({ force: true });
  await page.waitForTimeout(3000);
  console.log('Users URL:', page.url());

  const headers = await page.locator('table thead th, table th').allInnerTexts().catch(() => []);
  console.log('Table headers:', headers);

  const rows = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.slice(0, 5).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())
  );
  console.log('Sample rows:', rows);

  const search = page.getByPlaceholder(/search/i).first();
  console.log('Search visible:', await search.isVisible().catch(() => false));

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
