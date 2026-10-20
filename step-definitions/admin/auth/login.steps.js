// step-definitions/admin/auth/login.steps.js
const { Given, When, Then , setDefaultTimeout} = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const LoginPage = require('../../../pages/admin/auth/LoginPage');

setDefaultTimeout(60000);

let loginPage;

function getLoginPage(world) {
  if (!loginPage || loginPage.page !== world.page) {
    loginPage = new LoginPage(world.page);
  }
  return loginPage;
}

Given('I am on the login page', async function () {
  const page = getLoginPage(this);
  await page.goto();
});

When('I enter email {string}', async function (email) {
  this.email = email;
});

When('I enter password {string}', async function (password) {
  this.password = password;
});

When('I click the Login button', async function () {
  const page = getLoginPage(this);
  await page.login(this.email, this.password);
});

Then('I should be logged in successfully', async function () {
  const page = getLoginPage(this);
  const result = await page.isLoginSuccessful();
  expect(result).toBeTruthy();
});

Then('I should see an error message', async function () {
  const page = getLoginPage(this);
  const result = await page.isErrorVisible();
  expect(result).toBeTruthy();
});
