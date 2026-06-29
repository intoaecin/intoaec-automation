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
    await this.page.goto(env.admin, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    if (this.isAlreadyAuthenticated()) {
      return;
    }
    await this.page.goto(`${env.admin}/auth/signIn`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
  }

  async login(email, password) {
    if (this.isAlreadyAuthenticated()) {
      return;
    }
    // The sign-in form can re-render, detaching inputs; do guarded fill + retry.
    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.passwordInput.waitFor({ state: 'visible', timeout: 30000 });

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
    const ok = await this.isLoginSuccessful();
    if (!ok) {
      throw new Error('Login did not leave the sign-in page within the expected time.');
    }
  }

  async isLoginSuccessful() {
    try {
      await Promise.race([
        this.page.waitForURL(
          url => !url.toString().includes('signIn'),
          { timeout: 45000 }
        ),
        this.page
          .getByLabel(/clients\/projects/i)
          .first()
          .waitFor({ state: 'visible', timeout: 45000 }),
        this.page
          .getByText(/dashboard/i)
          .first()
          .waitFor({ state: 'visible', timeout: 45000 }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /** Navigate to sign-in; log in only when the app still shows the sign-in screen (cookies may skip it). */
  async ensureAuthenticated(email, password) {
    await this.goto();
    if (this.isAlreadyAuthenticated()) {
      return;
    }
    await this.login(email, password);
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
