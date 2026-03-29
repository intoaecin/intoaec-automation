// pages/admin/auth/LoginPage.js
const BasePage = require('../../BasePage');
const env = require('../../../config/env');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput    = page.locator('input').first();
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton   = page.locator('button:has-text("Login")');
    this.errorMessage  = page.getByText('Invalid username or password').first();
  }

  async goto() {
    await this.page.goto(`${env.admin}/auth/signIn`);
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async isLoginSuccessful() {
    try {
      await this.page.waitForURL(
        url => !url.toString().includes('signIn'), { timeout: 15000 }
      );
      return true;
    } catch { return false; }
  }

  async isErrorVisible() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 10000 });
    return await this.errorMessage.isVisible();
  }
}

module.exports = LoginPage;