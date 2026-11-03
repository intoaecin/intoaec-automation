/**
 * Dump action buttons on Approved Item Requests rows.
 */
const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const InventoryRequestPage = require('../pages/admin/projects/procurement/InventoryRequestPage');
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
  await page.waitForTimeout(2500);
  const req = new InventoryRequestPage(page);
  await req.openRequestedProductsSection();
  await req.selectItemRequestsStatusFilter('Approved');
  await page.waitForTimeout(2000);

  const dump = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr')).slice(0, 5);
    return rows.map((tr) => {
      const buttons = Array.from(tr.querySelectorAll('button, [role="button"], svg'))
        .map((el) => ({
          tag: el.tagName,
          aria: el.getAttribute('aria-label'),
          title: el.getAttribute('title'),
          cls: (el.getAttribute('class') || '').slice(0, 80),
          text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        }))
        .slice(0, 15);
      return {
        row: (tr.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        buttons,
      };
    });
  });
  console.log(JSON.stringify(dump, null, 2));
  await page.screenshot({ path: 'reports/item-requests-row-actions.png', fullPage: true });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
