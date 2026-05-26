// step-definitions/admin/common.steps.js
const { Given } = require('@cucumber/cucumber');
const LoginPage = require('../../pages/admin/auth/LoginPage');
const testData = require('../../utils/testData');

async function ensureLoggedIn(world) {
  const url = world.page.url();
  if (url && url !== 'about:blank' && !url.includes('signIn')) {
    return;
  }
  const loginPage = new LoginPage(world.page);
  await loginPage.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );
}

Given('I am logged in', { timeout: 120000 }, async function () {
  const url = this.page.url();
  if (url && url !== 'about:blank' && !url.includes('signIn')) {
    console.log('Already logged in — continuing in same tab');
    return;
  }
  await ensureLoggedIn(this);
});

Given('User is logged in', { timeout: 120000 }, async function () {
  await ensureLoggedIn(this);
});
