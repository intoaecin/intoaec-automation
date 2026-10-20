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
  await page.waitForTimeout(2000);

  const body = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  console.log('URL:', page.url());
  console.log('Tabs snippet:', body.match(/Users|Roles|Teams|User Invite|Invite/gi));

  const usersTab = page.getByRole('tab', { name: /^users$/i }).or(page.getByRole('button', { name: /^users$/i }));
  console.log('Users tab visible:', await usersTab.first().isVisible().catch(() => false));
  await usersTab.first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(2000);
  console.log('After Users URL:', page.url());

  const inviteUserBtn = page.getByRole('button', { name: /^invite user$/i });
  console.log('Invite User visible:', await inviteUserBtn.isVisible().catch(() => false));
  await inviteUserBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('After Invite User URL:', page.url());

  const inputs = await page.locator('input, textarea, select').evaluateAll((els) =>
    els.map((el) => ({
      name: el.getAttribute('name'),
      placeholder: el.getAttribute('placeholder'),
      type: el.getAttribute('type'),
      id: el.getAttribute('id'),
      ariaLabel: el.getAttribute('aria-label'),
    }))
  );
  console.log('Inputs after Invite User:', inputs);

  const buttons = await page.getByRole('button').evaluateAll((els) =>
    els.map((el) => (el.textContent || '').trim()).filter(Boolean).slice(0, 30)
  );
  console.log('Buttons:', buttons);

  const body2 = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  console.log('Form snippet:', body2.slice(0, 800));

  const inviteBtns = await page.getByRole('button').evaluateAll((els) =>
    els.map((el) => ({
      text: (el.textContent || '').trim(),
      aria: el.getAttribute('aria-label'),
    })).filter((b) => /invite|user/i.test(`${b.text} ${b.aria}`))
  );
  console.log('Invite buttons:', inviteBtns);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
