// pages/admin/auth/LoginPage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const env = require('../../../config/env');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page
      .getByPlaceholder(/email|username/i)
      .or(page.getByLabel(/email|username/i))
      .or(page.getByRole('textbox', { name: /email|username/i }))
      .or(page.locator('input[type="email"], input[name="email"], input[name="username"]'))
      .filter({ visible: true })
      .first();
    this.passwordInput = page
      .getByPlaceholder(/password/i)
      .or(page.getByLabel(/^password$/i))
      .or(page.locator('input[type="password"]'))
      .filter({ visible: true })
      .first();
    this.loginButton = page
      .getByRole('button', { name: /^(sign in|log in|login)$/i })
      .or(page.locator('button[type="submit"]').filter({ hasNotText: /google|microsoft|sso/i }))
      .or(page.locator('button').filter({ hasText: /^(sign in|log in|login)$/i }))
      .first();
    this.errorMessage = page
      .getByText(/invalid username or password|incorrect email or password|invalid credentials/i)
      .first();
    this.appHeader = page
      .getByLabel(/account settings|profile settings/i)
      .or(page.getByRole('button', { name: /account settings|profile settings/i }))
      .first();
    this.appShell = page
      .getByRole('button', { name: /^resources$/i })
      .or(page.getByRole('button', { name: /^dashboard$/i }))
      .or(page.getByRole('link', { name: /^dashboard$/i }))
      .or(page.getByRole('button', { name: /clients\/projects/i }))
      .first();
  }

  _isAuthenticatedUrl(url = this.page.url()) {
    const href = String(url || '');
    if (/signIn/i.test(href)) return false;
    return /\/dashboard|\/client|projectId=/i.test(href);
  }

  async _isAppReady() {
    if (this._isAuthenticatedUrl()) return true;
    const [header, shell] = await Promise.all([
      this.appHeader.isVisible({ timeout: 800 }).catch(() => false),
      this.appShell.isVisible({ timeout: 800 }).catch(() => false),
    ]);
    return !!(header || shell);
  }

  async _isSignInVisible() {
    return this.passwordInput.isVisible({ timeout: 800 }).catch(() => false);
  }

  async goto() {
    await this.page.goto(`${env.admin}/auth/signIn`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    if (this._isAuthenticatedUrl() || (await this._isAppReady())) {
      return;
    }
    await this.emailInput.waitFor({ state: 'visible', timeout: 20000 });
    await this.passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async _submitLogin() {
    await this.loginButton.click({ timeout: 8000 }).catch(async () => {
      await this.loginButton.click({ timeout: 8000, force: true });
    });
  }

  async _fillStable(locator, value) {
    const text = String(value);
    await locator.waitFor({ state: 'visible', timeout: 15000 });
    await locator.click({ timeout: 8000, force: true });
    await locator.fill('');
    await locator.pressSequentially(text, { delay: 20 });
    let current = await locator.inputValue().catch(() => '');
    if (current !== text) {
      await locator.fill(text, { force: true });
      current = await locator.inputValue().catch(() => '');
    }
    if (current !== text) {
      throw new Error(`Login field did not keep the typed value (${current.length} of ${text.length} characters).`);
    }
  }

  async login(email, password) {
    if (await this._isAppReady()) {
      return;
    }
    if (!(await this._isSignInVisible())) {
      await this.page
        .waitForURL((url) => this._isAuthenticatedUrl(url), { timeout: 20000 })
        .catch(() => {});
      return;
    }

    await this._fillStable(this.emailInput, email);
    await this._fillStable(this.passwordInput, password);
    await expect(this.loginButton).toBeEnabled({ timeout: 10000 });
    // eslint-disable-next-line no-console
    console.log(`[Login] Signing in as ${email}`);
    await this._submitLogin();

    const ok = await this.isLoginSuccessful();
    if (ok || (await this._isAppReady()) || this._isAuthenticatedUrl()) {
      return;
    }

    const err = await this.errorMessage.isVisible({ timeout: 800 }).catch(() => false);
    throw new Error(
      `Login did not leave the sign-in page. URL: ${this.page.url()}${
        err ? ' (app showed invalid credentials — check utils/testData.js password)' : ''
      }`
    );
  }

  async isLoginSuccessful() {
    const leftSignIn = await this.page
      .waitForURL((url) => this._isAuthenticatedUrl(url) || !String(url).includes('signIn'), {
        timeout: 20000,
      })
      .then(() => true)
      .catch(() => false);

    if (this._isAuthenticatedUrl()) {
      await this.appHeader.or(this.appShell).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      return true;
    }
    if (!leftSignIn && (await this._isSignInVisible())) {
      return false;
    }
    await this.appHeader.or(this.appShell).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    return this._isAppReady() || this._isAuthenticatedUrl();
  }

  /** Navigate to sign-in; log in only when the app still shows the sign-in screen (cookies may skip it). */
  async ensureAuthenticated(email, password) {
    await this.goto();
    if (await this._isAppReady()) {
      await this.waitForPostLoginShell();
      return;
    }
    await this.login(email, password);
    await this.waitForPostLoginShell();
  }

  /** Wait until the post-login shell exposes navigation or the clients list. */
  async waitForPostLoginShell() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await Promise.race([
      this.appHeader.waitFor({ state: 'visible', timeout: 20000 }),
      this.appShell.waitFor({ state: 'visible', timeout: 20000 }),
      this.page
        .getByRole('button', { name: /clients\/projects/i })
        .first()
        .waitFor({ state: 'visible', timeout: 20000 }),
      this.page.waitForURL((url) => !url.toString().includes('signIn'), { timeout: 20000 }),
    ]).catch(() => {});
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
