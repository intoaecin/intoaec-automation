// pages/admin/auth/LoginPage.js
const BasePage = require('../../BasePage');
const env = require('../../../config/env');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page
      .locator('input[type="email"], input[name="email"], input[name="username"]')
      .or(page.getByPlaceholder(/email|username/i))
      .or(page.getByLabel(/email|username/i))
      .first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.loginButton = page
      .getByRole('button', { name: /^(login|log in|sign in)$/i })
      .or(page.locator('button:has-text("Login")'))
      .first();
    this.errorMessage = page.getByText('Invalid username or password').first();
    this.appHeader = page
      .getByLabel(/account settings|profile settings/i)
      .or(page.getByRole('button', { name: /account settings|profile settings/i }))
      .first();
    this.appShell = page
      .getByRole('button', { name: /^resources$/i })
      .or(page.getByRole('button', { name: /^dashboard$/i }))
      .or(page.getByRole('link', { name: /^dashboard$/i }))
      .first();
  }

  async _isAppReady() {
    if (await this.appHeader.isVisible({ timeout: 2500 }).catch(() => false)) {
      return true;
    }
    return this.appShell.isVisible({ timeout: 2500 }).catch(() => false);
  }

  async _isSignInVisible() {
    return this.passwordInput.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async goto() {
    await this.page.goto(env.admin, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (await this._isAppReady()) {
      return;
    }
    if (await this._isSignInVisible()) {
      return;
    }
    await this.page.goto(`${env.admin}/auth/signIn`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.passwordInput.waitFor({ state: 'visible', timeout: 30000 });
  }

  async _fillStable(locator, value) {
    await locator.waitFor({ state: 'visible', timeout: 30000 });
    for (let i = 0; i < 3; i++) {
      await locator.click({ timeout: 10000 });
      await locator.fill('');
      await locator.fill(value);
      const current = await locator.inputValue().catch(() => '');
      if (current === value) return;
      await this.page.waitForTimeout(250);
    }
  }

  async login(email, password) {
    if (await this._isAppReady()) {
      return;
    }
    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.passwordInput.waitFor({ state: 'visible', timeout: 30000 });

    for (let attempt = 1; attempt <= 2; attempt++) {
      await this._fillStable(this.emailInput, email);
      await this._fillStable(this.passwordInput, password);

      await this.loginButton.waitFor({ state: 'visible', timeout: 15000 });
      const enabled = await this.loginButton.isEnabled().catch(() => true);
      if (!enabled) {
        await this.page.waitForTimeout(500);
      }

      await this.loginButton.click({ timeout: 15000 });
      const ok = await this.isLoginSuccessful();
      if (ok || (await this._isAppReady())) {
        return;
      }
      console.log(`[Login] Attempt ${attempt} still on ${this.page.url()}`);

      // Already past sign-in (session landed on the app) — wait for chrome instead of retyping credentials.
      const signedIn =
        !String(this.page.url()).includes('signIn') && !(await this._isSignInVisible());
      if (signedIn) {
        await this.appHeader
          .or(this.appShell)
          .first()
          .waitFor({ state: 'visible', timeout: 60000 });
        return;
      }
    }

    const err = await this.errorMessage.isVisible({ timeout: 1500 }).catch(() => false);
    throw new Error(
      `Login did not leave the sign-in page within the expected time. URL: ${this.page.url()}${
        err ? ' (invalid credentials)' : ''
      }`
    );
  }

  async isLoginSuccessful() {
    let success = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 45000);
      const done = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      this.page
        .waitForURL((url) => !String(url).includes('signIn'), { timeout: 45000 })
        .then(() => done(true))
        .catch(() => {});
      this.appHeader
        .waitFor({ state: 'visible', timeout: 45000 })
        .then(() => done(true))
        .catch(() => {});
    });
    if (!success && !String(this.page.url()).includes('signIn')) {
      success = true;
    }
    if (!success) {
      return false;
    }
    const chrome = this.appHeader.or(this.appShell).first();
    await chrome.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
    return this._isAppReady();
  }

  /** Navigate to sign-in; log in only when the app still shows the sign-in screen (cookies may skip it). */
  async ensureAuthenticated(email, password) {
    await this.goto();
    if (await this._isAppReady()) {
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
