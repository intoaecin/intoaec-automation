/**
 * Dump User Hub → Roles → Add Role form locators.
 * Run: node scripts/inspectUserHubRoles.js
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
    name: el.getAttribute('name'),
    id: el.getAttribute('id'),
    placeholder: el.getAttribute('placeholder'),
    type: el.getAttribute('type'),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
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
  console.log('After Roles click URL:', page.url());

  const addBtn = await userHub._findAddRoleButton();
  console.log('Add Role button found:', Boolean(addBtn));
  if (addBtn) {
    console.log('Add Role button text:', (await addBtn.innerText().catch(() => '')).trim());
    await addBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  console.log('After Add Role click URL:', page.url());

  const inputs = await page.locator('input, textarea').evaluateAll(dump);
  console.log('Visible inputs/textareas:', JSON.stringify(inputs.filter((i) => i), null, 2));

  const buttons = await page.getByRole('button').evaluateAll(dump);
  console.log(
    'Buttons (sample):',
    JSON.stringify(buttons.filter((b) => /add|role|save|create|cancel/i.test(`${b.text} ${b.aria}`)).slice(0, 30), null, 2)
  );

  const labels = await page.locator('label').evaluateAll(dump);
  console.log('Labels:', JSON.stringify(labels.slice(0, 40), null, 2));

  const headings = await page.getByRole('heading').evaluateAll(dump);
  console.log('Headings:', JSON.stringify(headings.slice(0, 20), null, 2));

  const bodySnippet = ((await page.locator('body').innerText().catch(() => '')) || '')
    .replace(/\s+/g, ' ')
    .slice(0, 2000);
  console.log('Body snippet:', bodySnippet);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
