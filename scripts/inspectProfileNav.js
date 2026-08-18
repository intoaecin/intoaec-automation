const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const testData = require('../utils/testData');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const login = new LoginPage(page);
  await login.ensureAuthenticated(testData.admin.validUser.email, testData.admin.validUser.password);
  await page.waitForTimeout(1500);
  await page.getByLabel('Account Settings').first().click({ timeout: 20000 });
  await page.getByRole('menuitem', { name: /^my account$/i }).click({ timeout: 20000 });
  await page.waitForURL(/myprofile/i, { timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.locator('[data-testid="KeyboardDoubleArrowRightIcon"]').first().click({ force: true });
  await page.locator('#simple-popover [aria-label="Preview"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#simple-popover [aria-label="Preview"]').click({ force: true });
  await page.waitForTimeout(1500);

  const preview = page.locator('.MuiModal-root').filter({ hasNot: page.locator('#simple-popover') }).last();
  console.log('preview class', await preview.getAttribute('class'));
  const html = await preview.innerHTML();
  console.log('preview html length', html.length);
  console.log(html.slice(0, 2500));
  console.log('--- buttons ---');
  console.log(await preview.locator('button, [aria-label], svg[data-testid]').evaluateAll((els) =>
    els.map((el) => ({
      tag: el.tagName,
      aria: el.getAttribute('aria-label'),
      testid: el.getAttribute('data-testid'),
      text: (el.textContent || '').trim().slice(0, 40),
    }))
  ));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
