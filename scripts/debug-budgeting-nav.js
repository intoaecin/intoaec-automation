const LoginPage = require('../pages/admin/auth/LoginPage');
const ProjectNavigationPage = require('../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../pages/admin/projects/ProjectProfilePage');
const testData = require('../utils/testData');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);
  await loginPage.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );

  const nav = new ProjectNavigationPage(page);
  await nav.navigateToProjects();
  await nav.clickFirstProject();

  const profile = new ProjectProfilePage(page);
  await profile.selectHeading('Project Management');
  await page.waitForTimeout(1500);

  const tile = page
    .locator('div.MuiBox-root')
    .filter({ has: page.locator('p').filter({ hasText: /^Budgeting$/i }) })
    .filter({ has: page.locator('svg') })
    .first();

  console.log('URL before click', page.url());
  console.log('tile visible', await tile.isVisible().catch(() => false));
  console.log('Budgeting texts', await page.getByText(/Budgeting/i).count());

  const texts = await page.locator('p.MuiTypography-root, p').allTextContents();
  console.log(
    'typography samples',
    texts.map((t) => t.trim()).filter(Boolean).slice(0, 60)
  );

  if (await tile.isVisible().catch(() => false)) {
    await tile.click();
    console.log('clicked tile');
  } else {
    await profile.clickModuleCard('Budgeting');
    console.log('clicked via clickModuleCard');
  }

  await page.waitForTimeout(5000);
  console.log('URL after click', page.url());

  const bodyText = (
    (await page.locator('main, [role="main"], body').first().innerText().catch(() => '')) || ''
  ).slice(0, 3500);
  console.log('---BODY---');
  console.log(bodyText);
  console.log('---END---');

  const buttons = await page.getByRole('button').allTextContents().catch(() => []);
  console.log(
    'buttons',
    buttons.map((b) => b.trim()).filter(Boolean).slice(0, 60)
  );

  await page.screenshot({ path: 'debug-budgeting.png', fullPage: true });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
