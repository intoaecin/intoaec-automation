const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const InventoryRequestPage = require('../pages/admin/projects/procurement/InventoryRequestPage');
const testData = require('../utils/testData');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const login = new LoginPage(page);
  await login.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );
  const s = JSON.parse(fs.readFileSync('./support/.vendor-po-session.json', 'utf8'));
  const u = new URL(s.adminProjectUrl || s.projectUrl);
  await page.goto(
    `https://app.aecplayhouse.com/client/profile?projectId=${u.searchParams.get(
      'projectId'
    )}&isActive=true&tab=Inventory&clientId=${u.searchParams.get('clientId') || ''}`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForTimeout(2000);
  const req = new InventoryRequestPage(page);
  await req.openRequestedProductsSection();
  await req.selectItemRequestsStatusFilter('Approved');
  await page.waitForTimeout(1500);

  const row = page.locator('tbody tr').filter({ hasText: /Wire Cable Auto/i }).first();
  await row.hover();
  await page.waitForTimeout(500);

  const info = await row.evaluate((tr) => {
    const svg = tr.querySelector('svg');
    if (!svg) return { noSvg: true };
    const p = svg.parentElement;
    const pp = p && p.parentElement;
    const lastTd = tr.querySelector('td:last-child');
    return {
      parent: p
        ? {
            tag: p.tagName,
            role: p.getAttribute('role'),
            aria: p.getAttribute('aria-label'),
            cls: (p.className || '').toString().slice(0, 120),
          }
        : null,
      grand: pp
        ? {
            tag: pp.tagName,
            role: pp.getAttribute('role'),
            aria: pp.getAttribute('aria-label'),
            cls: (pp.className || '').toString().slice(0, 120),
          }
        : null,
      lastTdHtml: lastTd ? lastTd.outerHTML.slice(0, 600) : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  await row.locator('svg').first().click({ force: true });
  await page.waitForTimeout(1000);
  const menu = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="menuitem"], .MuiMenuItem-root, li'))
      .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 60)
      .slice(0, 25)
  );
  console.log('menu after svg click', menu);

  // Also try IconButton class
  await page.keyboard.press('Escape').catch(() => {});
  await row.locator('.MuiIconButton-root, button').last().click({ force: true }).catch(async () => {
    await row.locator('td').last().click({ force: true });
  });
  await page.waitForTimeout(1000);
  const menu2 = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="menuitem"], .MuiMenuItem-root'))
      .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 25)
  );
  console.log('menu after iconbutton/td click', menu2);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
