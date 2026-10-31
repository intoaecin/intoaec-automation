// step-definitions/admin/common.steps.js
const { Given } = require('@cucumber/cucumber');
const LoginPage = require('../../pages/admin/auth/LoginPage');
const testData = require('../../utils/testData');
const { resetSharedSession } = require('../../support/world');

/** Admin credentials come from `.env` via `utils/testData.js` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). */
function resolveAdminCredentials() {
  const email = String(testData.admin?.validUser?.email || '').trim().toLowerCase();
  const password = String(testData.admin?.validUser?.password || '').trim();
  if (!email || !password) {
    throw new Error(
      'Admin credentials missing. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (or utils/testData.js).',
    );
  }
  if (/aadhi@/i.test(email)) {
    throw new Error('aadhi@yopmail.com is disabled for Admin automation');
  }
  return { email, password };
}

async function ensureLoggedIn(world) {
  await world.ensureLivePage();
  const { email, password } = resolveAdminCredentials();
  const loginPage = new LoginPage(world.page);
  await loginPage.ensureAuthenticated(email, password);
}

Given('I am logged in', { timeout: 180000 }, async function () {
  const env = require('../../config/env');
  const { email, password } = resolveAdminCredentials();

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await this.ensureLivePage();
    const loginPage = new LoginPage(this.page);
    loginPage.lastLoginEmail = email;

    try {
      console.log(`[Admin] Target portal: ${env.admin} (ONLY user: ${email})`);

      // Close extra tabs left by vendor invite/Yopmail so login uses a clean page.
      const pages = this.context?.pages?.() || [];
      for (const p of pages) {
        if (p !== this.page && !p.isClosed() && /yopmail|vendor\.aecplayhouse/i.test(p.url() || '')) {
          await p.close().catch(() => {});
        }
      }

      await loginPage.ensureAuthenticated(email, password);

      const loginChrome = loginPage.appHeader.or(loginPage.appShell).first();
      await loginChrome.waitFor({ state: 'visible', timeout: 90000 });
      console.log(`[Admin] Logged in as ${email} — ${this.page.url()}`);
      return;
    } catch (err) {
      const msg = String(err?.message || err);
      const recoverable = /closed|crashed|target page|context or browser|Login failed|did not leave/i.test(msg);
      if (!recoverable || attempt === 2) throw err;
      console.log('[Admin] Browser page closed during login — recreating session and retrying');
      await resetSharedSession();
      await this.init();
    }
  }
});

Given('User is logged in', { timeout: 120000 }, async function () {
  await ensureLoggedIn(this);
});
