/**
 * Capture toast DOM around vendor profile Save.
 */
const { chromium } = require('playwright');
const VendorLoginPage = require('../pages/vendor/auth/VendorLoginPage');
const VendorProfilePage = require('../pages/vendor/profile/VendorProfilePage');
const testData = require('../utils/testData');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const login = new VendorLoginPage(page);
  const profile = new VendorProfilePage(page);

  await page.addInitScript(() => {
    window.__toastLog = [];
    const dump = (reason) => {
      const nodes = document.querySelectorAll(
        '.Toastify, [class*="Toastify"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"], [class*="toast"], [class*="Toast"], [class*="snackbar"], [class*="notistack"], [id*="toast"]'
      );
      window.__toastLog.push({
        reason,
        t: Date.now(),
        url: location.href,
        nodes: Array.from(nodes).map((el) => ({
          tag: el.tagName,
          cls: el.className && String(el.className).slice(0, 120),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        })),
      });
    };
    const obs = new MutationObserver(() => dump('mut'));
    document.addEventListener('DOMContentLoaded', () => {
      obs.observe(document.body, { childList: true, subtree: true });
    });
    window.__dumpToast = dump;
  });

  await login.ensureAuthenticated(testData.vendor.validUser.email, testData.vendor.validUser.password);
  await profile.navigateToMyProfile();
  await profile.clickEdit();
  await profile.fillFirstName('Madhan');
  await profile.fillLastName('Mehta');
  await profile.fillOrganization('BuildCraft Solutions');

  const responses = [];
  page.on('response', (res) => {
    const method = res.request().method();
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      responses.push({ status: res.status(), method, url: res.url() });
    }
  });

  const save = page.getByRole('button', { name: /^(save|update)$/i }).first();
  await save.click();

  for (let i = 0; i < 8; i += 1) {
    await page.waitForTimeout(500);
    const snap = await page.evaluate(() => {
      const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const alerts = Array.from(
        document.querySelectorAll(
          '.Toastify, [class*="Toastify"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"], [class*="toast"], [class*="notistack"]'
        )
      ).map((el) => collapse(el.textContent).slice(0, 200));
      const bodyHit = /profile updated|updated successfully|success/i.test(document.body.innerText);
      return { alerts, bodyHit, url: location.href, saveVisible: !!document.querySelector('button') };
    });
    console.log(`+${(i + 1) * 500}ms`, JSON.stringify(snap));
  }

  const log = await page.evaluate(() => (window.__toastLog || []).slice(-15));
  console.log('TOAST LOG', JSON.stringify(log, null, 2));
  console.log('RESPONSES', JSON.stringify(responses, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
