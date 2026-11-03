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

  const teamsTab = page
    .getByRole('tab', { name: /^teams$/i })
    .or(page.getByRole('button', { name: /^teams$/i }))
    .or(page.getByRole('link', { name: /^teams$/i }))
    .filter({ visible: true })
    .first();
  console.log('Teams tab visible:', await teamsTab.isVisible().catch(() => false));
  await teamsTab.click({ force: true });
  await page.waitForTimeout(3000);

  for (const path of ['/userHub/teams', '/userHub/team']) {
    await page.goto(`https://app.aecplayhouse.com${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    console.log('\n--- Path', path, '---');
    console.log('URL:', page.url());
    const body = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    console.log('Body:', body.slice(0, 1500));
    const createCount = await page.locator('button, a').filter({ hasText: /create team|add team|new team/i }).count();
    console.log('Create team buttons:', createCount);
  }

  await page.goto('https://app.aecplayhouse.com/userHub/team', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const teamsTab2 = page.getByRole('tab', { name: /^teams$/i }).first();
  await teamsTab2.click({ force: true }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('\n--- After Teams tab click ---');
  const body2 = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  console.log('Body:', body2.slice(0, 2000));

  const createCandidates = page.locator('button, a').filter({ hasText: /create team|add team|new team|^create$/i });
  const count = await createCandidates.count();
  console.log('Create candidates:', count);
  for (let i = 0; i < Math.min(count, 15); i += 1) {
    const text = ((await createCandidates.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    console.log(`  [${i}] ${text}`);
  }

  const createTeam = page.getByRole('button', { name: /create team/i }).first();
  if (await createTeam.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createTeam.click({ force: true });
    await page.waitForTimeout(3000);
    console.log('After Create Team URL:', page.url());
    const inputs = await page.locator('input, textarea, select').evaluateAll((els) =>
      els.map((el) => ({
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        type: el.getAttribute('type'),
        value: el.value,
        disabled: el.disabled,
        readOnly: el.readOnly,
      }))
    );
    console.log('Form inputs:', JSON.stringify(inputs, null, 2));
    const formBody = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    console.log('Form body:', formBody.slice(0, 2000));
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
