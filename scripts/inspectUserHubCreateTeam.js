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

  const branch = page.getByPlaceholder(/select branch/i).first();
  console.log('Branch value:', await branch.inputValue().catch(() => ''));
  console.log('Branch disabled:', await branch.isDisabled().catch(() => false));
  console.log('Branch editable:', await branch.isEditable().catch(() => false));
  await branch.click().catch(() => {});
  await branch.fill('Changed Branch').catch((e) => console.log('Branch fill error:', e.message));
  console.log('Branch after fill:', await branch.inputValue().catch(() => ''));

  const teamName = page.getByPlaceholder(/marketing team/i).first();
  const unique = `NEW PROJECT ${Date.now().toString().slice(-6)}`;
  await teamName.fill(unique);
  await page.getByPlaceholder(/brief description/i).fill('Team created for managing new project activities and coordination.');

  const checkboxes = page.locator('input[type="checkbox"]:visible');
  const cbCount = await checkboxes.count();
  console.log('Checkbox count:', cbCount);
  const selected = [];
  for (let i = 0; i < cbCount && selected.length < 3; i += 1) {
    const cb = checkboxes.nth(i);
    if (!(await cb.isChecked().catch(() => false))) {
      await cb.check({ force: true }).catch(() => {});
      selected.push(i);
    }
  }
  console.log('Selected checkbox indexes:', selected);

  const createBtn = page.getByRole('button', { name: /^create team$/i }).last();
  await createBtn.click({ force: true });
  await page.waitForTimeout(5000);
  console.log('After save URL:', page.url());
  const body = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  console.log('Body after save:', body.slice(0, 2000));

  const row = page.getByText(new RegExp(unique.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first();
  console.log('Team text visible:', await row.isVisible().catch(() => false));
  if (await row.isVisible().catch(() => false)) {
    await row.click({ force: true });
    await page.waitForTimeout(3000);
    console.log('After open team URL:', page.url());
    const body2 = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    console.log('Open team body:', body2.slice(0, 2500));
  }

  const actionBtn = page.locator('table tbody tr, [class*="row" i]').filter({ hasText: new RegExp(unique, 'i') }).first().getByRole('button').last();
  console.log('Action btn visible:', await actionBtn.isVisible().catch(() => false));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
