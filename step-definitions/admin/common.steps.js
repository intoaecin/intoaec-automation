// step-definitions/admin/common.steps.js
const { Given } = require('@cucumber/cucumber');
const LoginPage = require('../../pages/admin/auth/LoginPage');
const testData = require('../../utils/testData');

async function ensureLoggedIn(world) {
  const loginPage = new LoginPage(world.page);
  if (await loginPage._isAppReady()) {
    return;
  }
  await loginPage.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );
}

Given('I am logged in', { timeout: 120000 }, async function () {
  const env = require('../../config/env');
  const loginPage = new LoginPage(this.page);
  console.log(`[Admin] Target portal: ${env.admin} (user: ${testData.admin.validUser.email})`);

  if (await loginPage._isAppReady()) {
    const host = (() => {
      try {
        return new URL(env.admin).host;
      } catch {
        return 'app.aecplayhouse.com';
      }
    })();
    if (!String(this.page.url() || '').includes(host)) {
      console.log(`[Admin] Wrong host (${this.page.url()}) — navigating to ${env.admin}`);
      await this.page.goto(env.admin, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    console.log(`Already logged in to Admin Portal — ${this.page.url()}`);
    return;
  }

  await loginPage.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );
  const loginChrome = loginPage.appHeader.or(loginPage.appShell).first();
  await loginChrome.waitFor({ state: 'visible', timeout: 60000 });
  console.log(`[Admin] Logged in — ${this.page.url()}`);
});

Given('User is logged in', { timeout: 120000 }, async function () {
  await ensureLoggedIn(this);
});
