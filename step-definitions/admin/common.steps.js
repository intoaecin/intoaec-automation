// step-definitions/admin/common.steps.js
const { Given } = require('@cucumber/cucumber');
const LoginPage = require('../../pages/admin/auth/LoginPage');
const testData = require('../../utils/testData');

async function ensureLoggedIn(world) {
  const loginPage = new LoginPage(world.page);
  const headerReady = await loginPage.appHeader.isVisible({ timeout: 3000 }).catch(() => false);
  if (headerReady) {
    return;
  }
  await loginPage.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );
}

Given('I am logged in', { timeout: 120000 }, async function () {
  const loginPage = new LoginPage(this.page);
  const headerReady = await loginPage.appHeader.isVisible({ timeout: 3000 }).catch(() => false);
  if (headerReady) {
    console.log('Already logged in — continuing in same tab');
    const loginPage = new LoginPage(this.page);
    await loginPage.waitForPostLoginShell();
    return;
  }
  await ensureLoggedIn(this);
  const loginChrome = loginPage.appHeader.or(loginPage.appShell).first();
  await loginChrome.waitFor({ state: 'visible', timeout: 60000 });
});

Given('User is logged in', { timeout: 120000 }, async function () {
  await ensureLoggedIn(this);
});
