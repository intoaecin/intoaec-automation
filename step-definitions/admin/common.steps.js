// step-definitions/admin/common.steps.js
const { Given } = require('@cucumber/cucumber');
const LoginPage = require('../../pages/admin/auth/LoginPage');
const testData = require('../../utils/testData');

async function ensureLoggedIn(world) {
  const loginPage = new LoginPage(world.page);
  if (loginPage.isAlreadyAuthenticated()) {
    return;
  }
  await loginPage.goto();
  await loginPage.login(testData.admin.validUser.email, testData.admin.validUser.password);
  await loginPage.isLoginSuccessful();
}

Given('I am logged in', { timeout: 60000 }, async function () {
  await ensureLoggedIn(this);
});

Given('User is logged in', { timeout: 60000 }, async function () {
  await ensureLoggedIn(this);
});
