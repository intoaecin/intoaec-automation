/**
 * Open Inventory → Item Requests and dump list structure (no create).
 * Uses existing Request Items / any rows visible.
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
  page.setDefaultTimeout(90000);

  const login = new LoginPage(page);
  await login.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );

  let projectUrl = null;
  try {
    const sessionPath = path.join(__dirname, '../support/.vendor-po-session.json');
    if (fs.existsSync(sessionPath)) {
      const s = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      projectUrl = s.adminProjectUrl || s.projectUrl || null;
    }
  } catch (_) {}

  if (!projectUrl) throw new Error('No adminProjectUrl in support/.vendor-po-session.json');
  const u = new URL(projectUrl);
  const projectId = u.searchParams.get('projectId');
  const clientId = u.searchParams.get('clientId');
  await page.goto(
    `https://app.aecplayhouse.com/client/profile?projectId=${projectId}&isActive=true&tab=Inventory${
      clientId ? `&clientId=${clientId}` : ''
    }`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForTimeout(4000);
  console.log('URL', page.url());

  const req = new InventoryRequestPage(page);
  await req.openRequestedProductsSection();
  await page.waitForTimeout(3000);

  const dump = await page.evaluate(() => {
    const text = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
    const tabs = Array.from(document.querySelectorAll('[role="tab"], .MuiTab-root'))
      .map((el) => text(el))
      .filter(Boolean)
      .slice(0, 20);
    const headers = Array.from(document.querySelectorAll('th, [role="columnheader"]'))
      .map((el) => text(el))
      .filter(Boolean)
      .slice(0, 20);
    const rows = Array.from(
      document.querySelectorAll(
        'tbody tr, [role="row"], .MuiDataGrid-row, .MuiTableRow-root, .MuiCard-root, .MuiPaper-root'
      )
    )
      .map((el) => text(el))
      .filter((t) => t.length > 8 && t.length < 400)
      .slice(0, 25);
    const buttons = Array.from(document.querySelectorAll('button'))
      .map((el) => text(el) || el.getAttribute('aria-label') || '')
      .filter((t) => /item request|approved|pending|add to group|more/i.test(t))
      .slice(0, 30);
    return { tabs, headers, rows, buttons, title: document.title, body: text(document.body).slice(0, 2000) };
  });

  console.log(JSON.stringify(dump, null, 2));
  await page.screenshot({ path: 'reports/item-requests-list.png', fullPage: true });
  console.log('shot reports/item-requests-list.png');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
