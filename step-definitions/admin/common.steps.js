// step-definitions/admin/common.steps.js
const { Given } = require('@cucumber/cucumber');
const LoginPage = require('../../pages/admin/auth/LoginPage');
const testData = require('../../utils/testData');

Given('I am logged in', { timeout: 60000 }, async function () {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  await loginPage.login(testData.admin.validUser.email, testData.admin.validUser.password);
  await loginPage.isLoginSuccessful();
});
