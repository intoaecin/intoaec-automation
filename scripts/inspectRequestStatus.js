/**
 * Dump status controls on Inventory Request form.
 */
const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const InventoryPage = require('../pages/admin/projects/procurement/InventoryPage');
const InventoryRequestPage = require('../pages/admin/projects/procurement/InventoryRequestPage');
const testData = require('../utils/testData');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.setDefaultTimeout(60000);

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

  const inv = new InventoryPage(page);
  const req = new InventoryRequestPage(page);
  await inv.clickCreateGroup();
  await inv.expectCreateGroupPopupVisible();
  const g = `StatForm ${Date.now().toString(36).slice(-4)}`;
  await inv.groupNameInput().fill(g);
  inv.lastCreatedGroupName = g;
  await inv.clickCreateOnGroupPopup();
  await inv.expectCreatedGroupVisible();
  await inv.openCreatedInventoryGroup();
  await inv.clickAddItem();
  await req.startInventoryItemRequest();
  await page.locator('input[name="itemName"]').first().fill('StatusProbe Item');
  await page.waitForTimeout(1000);

  const dump = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const interesting = [];
    for (const el of all) {
      const t = (el.innerText || el.value || el.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
      const name = el.getAttribute('name') || '';
      const id = el.id || '';
      const role = el.getAttribute('role') || '';
      const cls = (el.className || '').toString().slice(0, 80);
      if (
        /pending|approved|status/i.test(`${t} ${name} ${id} ${cls} ${role}`) &&
        t.length < 80
      ) {
        interesting.push({
          tag: el.tagName,
          name,
          id,
          role,
          t,
          cls,
        });
      }
    }
    // unique-ish
    const seen = new Set();
    return interesting.filter((x) => {
      const k = `${x.tag}|${x.name}|${x.t}|${x.role}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 60);
  });
  console.log(JSON.stringify(dump, null, 2));

  // Click first Pending Approval and list options
  const pending = page.getByText(/^pending approval$/i).filter({ visible: true }).first();
  console.log('pending visible', await pending.isVisible().catch(() => false));
  if (await pending.isVisible().catch(() => false)) {
    await pending.click({ force: true });
    await page.waitForTimeout(800);
    const opts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], li.MuiMenuItem-root, li'))
        .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 40)
        .slice(0, 30)
    );
    console.log('options', opts);
  }

  await page.screenshot({ path: 'reports/status-form.png', fullPage: true });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
