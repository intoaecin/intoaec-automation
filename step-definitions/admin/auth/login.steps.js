// step-definitions/admin/auth/login.steps.js
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const LoginPage = require('../../../pages/admin/auth/LoginPage');

let loginPage;

Given('I am on the login page', async function () {
  loginPage = new LoginPage(this.page);
  await loginPage.goto();
});

When('I enter email {string}', async function (email) {
  this.email = email;
});

When('I enter password {string}', async function (password) {
  this.password = password;
});

When('I click the Login button', async function () {
  await loginPage.login(this.email, this.password);
});

Then('I should be logged in successfully', async function () {
  const result = await loginPage.isLoginSuccessful();
  expect(result).toBeTruthy();
});

Then('I should see an error message', async function () {
  const result = await loginPage.isErrorVisible();
  expect(result).toBeTruthy();
});