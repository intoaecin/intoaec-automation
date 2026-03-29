// step-definitions/common.steps.js
const { Given } = require('@cucumber/cucumber');
const LoginPage = require('../../../../pages/admin/auth/LoginPage');
const NavigationPage = require('../../../../pages/admin/common/NavigationPage');
const testData = require('../../../../utils/testData');

Given('I am logged in and on a Lead Profile page', { timeout: 60000 }, async function () {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  await loginPage.login(testData.admin.validUser.email, testData.admin.validUser.password);
  await loginPage.isLoginSuccessful();

  const navigationPage = new NavigationPage(this.page);
  await navigationPage.clickCrmDropdown();
  await navigationPage.clickLeadManager();
  await navigationPage.clickFirstLead();
});
