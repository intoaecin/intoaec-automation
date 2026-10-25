/**
 * After login, open latest Request Items group and dump visible item text.
 */
const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const testData = require('../utils/testData');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const login = new LoginPage(page);
  await login.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );
  const session = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../support/.vendor-po-session.json'), 'utf8')
  );
  const u = new URL(session.adminProjectUrl || session.projectUrl);
  await page.goto(
    `https://app.aecplayhouse.com/client/profile?projectId=${u.searchParams.get(
      'projectId'
    )}&isActive=true&tab=Inventory&clientId=${u.searchParams.get('clientId') || ''}`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForTimeout(3000);

  // Open a Request Items group (most recent-looking)
  const group = page.getByText(/Request Items/i).filter({ visible: true }).first();
  await group.click({ timeout: 20000 });
  await page.waitForTimeout(3000);

  const dump = await page.evaluate(() => {
    const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    const rows = Array.from(
      document.querySelectorAll('tbody tr, [role="row"], .MuiDataGrid-row, .MuiCard-root')
    )
      .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 5 && t.length < 250)
      .slice(0, 40);
    const tabs = Array.from(document.querySelectorAll('[role="tab"], button'))
      .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter((t) => /item|stock|goods|receipt|product|list/i.test(t))
      .slice(0, 20);
    return { tabs, rows, body: text.slice(0, 2500) };
  });
  console.log(JSON.stringify(dump, null, 2));
  await page.screenshot({ path: 'reports/group-detail-dump.png', fullPage: true });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
