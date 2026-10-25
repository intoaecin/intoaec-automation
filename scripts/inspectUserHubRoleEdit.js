/**
 * Dump User Hub Roles list edit menu locators.
 * Run: node scripts/inspectUserHubRoles.js --edit
 */
const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const UserHubPage = require('../pages/admin/invite/UserHubPage');
const testData = require('../utils/testData');

function dump(els) {
  return els.map((el) => ({
    tag: el.tagName,
    role: el.getAttribute('role'),
    aria: el.getAttribute('aria-label'),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
  }));
}

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

  const roleName = 'Project Manager';
  await page.getByPlaceholder(/search/i).fill(roleName).catch(() => {});
  await page.waitForTimeout(1500);

  const rows = page.locator('tbody tr, [role="row"], table tr').filter({ hasText: new RegExp(roleName, 'i') });
  console.log('Matching table rows:', await rows.count());
  const row = rows.filter({ visible: true }).first();
  console.log('Row found:', await row.isVisible().catch(() => false));
  const rowHtml = await row.innerHTML().catch(() => '');
  console.log('Row HTML snippet:', rowHtml.slice(0, 800));

  const menuBtns = row.locator(
    'button[aria-label*="more" i], button:has(svg), [aria-label*="action" i], .MuiIconButton-root, button'
  );
  const count = await menuBtns.count();
  console.log('Buttons in row:', count);
  for (let i = 0; i < Math.min(count, 10); i++) {
    const b = menuBtns.nth(i);
    console.log(i, await b.innerText().catch(() => ''), await b.getAttribute('aria-label').catch(() => ''));
  }

  const lastBtn = row.locator('button').last();
  await lastBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1000);

  const menuItems = await page.getByRole('menuitem').evaluateAll(dump);
  console.log('Menu items:', JSON.stringify(menuItems, null, 2));
  const editItem = page.getByRole('menuitem', { name: /edit permissions|edit/i }).first();
  await editItem.click({ force: true });
  await page.waitForTimeout(2000);
  console.log('After Edit URL:', page.url());
  console.log('Role name value:', await page.locator('input[name="roleName"]').inputValue().catch(() => ''));
  console.log('Description value:', await page.locator('textarea[name="roleDescription"]').inputValue().catch(() => ''));
  const checks = ['ACTIVITY_TRACKER', 'AUTOMATION', 'FEATURES', 'PEOPLE'];
  for (const c of checks) {
    const cb = page.locator(`input[type="checkbox"][name="${c}"]`).first();
    console.log(c, await cb.isChecked().catch(() => false));
  }
  const updateBtn = page.getByRole('button', { name: /^update$/i }).first();
  console.log('Update visible:', await updateBtn.isVisible().catch(() => false));
  await page.locator('input[name="roleName"]').fill('Electrician-Test');
  await updateBtn.click({ force: true });
  await page.waitForTimeout(3000);
  console.log('After Update URL:', page.url());
  const body = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 1500);
  console.log('Body after update:', body);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
