const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const testData = require('../utils/testData');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const login = new LoginPage(page);
  await login.goto();
  await login.login(testData.admin.validUser.email, testData.admin.validUser.password);
  await login.isLoginSuccessful();

  await page.getByLabel('Clients/Projects').first().click();
  await page.waitForTimeout(2500);

  const html = await page.locator('main, [role="main"], body').first().innerHTML().catch(() => '');
  console.log('Has tbody tr:', await page.locator('tbody tr').count());
  console.log('Has MuiDataGrid:', await page.locator('.MuiDataGrid-root').count());

  const row0 = page.locator('tbody tr').first();
  const cells = row0.locator('td, th');
  console.log('Cells in row0:', await cells.count());
  for (let j = 0; j < Math.min(await cells.count(), 6); j++) {
    console.log(`  cell ${j}:`, (await cells.nth(j).innerText()).replace(/\s+/g, ' ').slice(0, 120));
  }
  const anyLink = row0.locator('a');
  console.log('Links in row0:', await anyLink.count());
  if ((await anyLink.count()) > 0) {
    console.log('First link href:', await anyLink.first().getAttribute('href'));
  }

  await row0.click();
  await page.waitForTimeout(3000);
  console.log('URL after row0 click:', page.url());

  await browser.close();
})().catch(console.error);
