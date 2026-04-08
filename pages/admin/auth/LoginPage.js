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
    // The sign-in form can re-render, detaching inputs; do guarded fill + retry.
    await this.emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.passwordInput.waitFor({ state: 'visible', timeout: 15000 });

    await this.emailInput.fill(email).catch(async () => {
      await this.page.waitForTimeout(300);
      await this.emailInput.fill(email);
    });

    await this.passwordInput.fill(password).catch(async () => {
      await this.page.waitForTimeout(300);
      await this.passwordInput.fill(password);
    });

    await this.loginButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.loginButton.click();
  }

  async isLoginSuccessful() {
    try {
      await this.page.waitForURL(
        url => !url.toString().includes('signIn'), { timeout: 15000 }
      );
      return true;
    } catch {
      return false;
    }
  }

  /** True when the app is already past the sign-in screen (reused session / same browser run). */
  isAlreadyAuthenticated() {
    const url = this.page.url();
    if (!url || url === 'about:blank') {
      return false;
    }
    return !url.includes('signIn');
  }

  async isErrorVisible() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 10000 });
    return await this.errorMessage.isVisible();
  }
}

module.exports = LoginPage;