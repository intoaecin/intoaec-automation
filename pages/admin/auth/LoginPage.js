// pages/admin/auth/LoginPage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const env = require('../../../config/env');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.locator('input').first();
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.locator('button:has-text("Login")');
    this.errorMessage = page.getByText('Invalid username or password').first();
  }

  loginSuccessTimeoutMs() {
    const raw = process.env.LOGIN_SUCCESS_TIMEOUT_MS;
    const n = raw === undefined || raw === '' ? 120000 : Number(raw);
    if (Number.isNaN(n)) return 120000;
    return Math.max(15000, Math.min(300000, n));
  }

  async goto() {
    await this.page.goto(`${env.admin}/auth/signIn`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async resolveEmailField() {
    const candidates = [
      this.page.getByRole('textbox', { name: /email/i }),
      this.page.getByPlaceholder(/email/i),
      this.page.locator('input[type="email"]'),
      this.page.locator('input[name="email" i], input[name="username" i]'),
      this.emailInput,
    ];
    for (const loc of candidates) {
      const first = loc.first();
      if (await first.isVisible({ timeout: 4000 }).catch(() => false)) {
        return first;
      }
    }
    return this.emailInput;
  }

  async resolveLoginButton() {
    const byRole = this.page.getByRole('button', { name: /^log\s*in$/i }).first();
    if (await byRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      return byRole;
    }
    return this.loginButton.first();
  }

  async login(email, password) {
    const emailEl = await this.resolveEmailField();
    await expect(emailEl).toBeVisible({ timeout: 60000 });
    await expect(this.passwordInput).toBeVisible({ timeout: 30000 });
    await emailEl.click({ timeout: 5000 }).catch(() => {});
    await emailEl.fill(String(email), { timeout: 30000 });
    await this.passwordInput.fill(String(password), { timeout: 30000 });
    const btn = await this.resolveLoginButton();
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /** True while the browser is still on a sign-in URL (case-insensitive; fixes `/auth/signin` vs `signIn`). */
  stillOnSignInUrl(urlString) {
    return /signin|sign-in/i.test(String(urlString || ''));
  }

  /**
   * Wait until we are clearly past the admin sign-in screen (slow redirects / cold start).
   */
  async waitForLoginRedirectSuccess() {
    const timeoutMs = this.loginSuccessTimeoutMs();
    await this.page.waitForURL(
      (url) => {
        const href = typeof url === 'string' ? url : url.href;
        return !this.stillOnSignInUrl(href);
      },
      { timeout: timeoutMs }
    );
  }

  async isLoginSuccessful() {
    try {
      await this.waitForLoginRedirectSuccess();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fails with a useful message (URL + invalid credentials hint) for suite Background steps.
   */
  async assertLoginSuccessful() {
    try {
      await this.waitForLoginRedirectSuccess();
    } catch (e) {
      const currentUrl = this.page.url();
      let invalid = false;
      try {
        invalid = await this.errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
      } catch {
        invalid = false;
      }
      const hint =
        'Check RFQ_TEST_EMAIL / RFQ_TEST_PASSWORD (or your app credentials), TEST_ENV, and network. ' +
        `LOGIN_SUCCESS_TIMEOUT_MS (default ${this.loginSuccessTimeoutMs()}).`;
      throw new Error(
        `Login did not leave the sign-in page within ${this.loginSuccessTimeoutMs()}ms. ` +
          `Current URL: ${currentUrl}. Invalid-credentials banner visible: ${invalid}. ${hint} ` +
          (e && e.message ? `(${e.message})` : '')
      );
    }
  }

  /** True when the app is already past the sign-in screen (reused session / same browser run). */
  isAlreadyAuthenticated() {
    const url = this.page.url();
    if (!url || url === 'about:blank') {
      return false;
    }
    return !this.stillOnSignInUrl(url);
  }

  async isErrorVisible() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 10000 });
    return await this.errorMessage.isVisible();
  }
}

module.exports = LoginPage;
