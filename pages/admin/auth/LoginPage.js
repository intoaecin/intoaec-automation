// pages/admin/auth/LoginPage.js
const BasePage = require('../../BasePage');
const env = require('../../../config/env');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page
      .locator(
        'input[type="email"], input[name="email" i], input[name="username" i], input[autocomplete="username"], input[autocomplete="email"]'
      )
      .or(page.getByPlaceholder(/email|username/i))
      .or(page.getByLabel(/email|username|user name/i))
      .or(page.locator('input[type="text"]').first())
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

  _isAdminHost() {
    return /app\.(aecplayhouse|intoaec)/i.test(String(this.page.url() || ''));
  }

  async _isAppReady() {
    if (!this._isAdminHost()) {
      return false;
    }
    if (await this.appHeader.isVisible({ timeout: 2500 }).catch(() => false)) {
      return true;
    }
    if (await this.appShell.isVisible({ timeout: 2500 }).catch(() => false)) {
      return true;
    }
    return this.page
      .getByRole('button', { name: /account settings|profile settings|clients\/projects|resources|dashboard/i })
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
  }

  async _isSignInVisible() {
    const emailVisible = await this.emailInput.isVisible({ timeout: 1500 }).catch(() => false);
    const passwordVisible = await this.passwordInput.isVisible({ timeout: 1500 }).catch(() => false);
    return Boolean(emailVisible || passwordVisible);
  }

  async _waitForSplashToClear(timeoutMs = 45000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.page.isClosed()) return;
      if (await this._isAppReady()) return 'app';
      if (await this._isSignInVisible()) return 'signin';
      await this.page.waitForTimeout(400).catch(() => {});
    }
    if (await this._isAppReady()) return 'app';
    if (await this._isSignInVisible()) return 'signin';
    return 'timeout';
  }

  async goto() {
    await this.page.goto(env.admin, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const state = await this._waitForSplashToClear(45000);
    if (state === 'app' || state === 'signin') {
      return;
    }
    await this.page.goto(`${env.admin}/auth/signIn`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const afterSignIn = await this._waitForSplashToClear(30000);
    if (afterSignIn === 'app') {
      return;
    }
    await this.emailInput
      .or(this.passwordInput)
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });
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
    await this.emailInput
      .or(this.passwordInput)
      .first()
      .waitFor({ state: 'visible', timeout: 45000 });
    if (await this.emailInput.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this._fillStable(this.emailInput, email);
    }
    await this.passwordInput.waitFor({ state: 'visible', timeout: 30000 });

    for (let attempt = 1; attempt <= 3; attempt++) {
      const loadingStuck = await this.loginButton
        .evaluate((el) =>
          Boolean(
            el.disabled ||
              el.classList.contains('Mui-disabled') ||
              el.classList.contains('MuiLoadingButton-loading')
          )
        )
        .catch(() => false);

      if (loadingStuck) {
        console.log(
          `[Login] Submit control stuck loading (attempt ${attempt}) — reloading sign-in`
        );
        await this.page.goto(`${env.admin}/auth/signIn`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await this._waitForSplashToClear(30000);
        await this.emailInput
          .or(this.passwordInput)
          .first()
          .waitFor({ state: 'visible', timeout: 30000 });
      }

      await this._fillStable(this.emailInput, email);
      await this._fillStable(this.passwordInput, password);

      await this.loginButton.waitFor({ state: 'visible', timeout: 15000 });

      // Wait until enabled — do not force-click a disabled LoadingButton.
      const enabledDeadline = Date.now() + 25000;
      let enabled = false;
      while (Date.now() < enabledDeadline) {
        enabled = await this.loginButton.isEnabled().catch(() => false);
        if (enabled) break;
        await this.page.waitForTimeout(300);
      }
      if (!enabled) {
        console.log(
          `[Login] Button never enabled on attempt ${attempt} — will reload next loop`
        );
        continue;
      }

      await this.loginButton.click({ timeout: 20000 });
      const ok = await this.isLoginSuccessful();
      if (ok || (await this._isAppReady())) {
        return;
      }
      console.log(`[Login] Attempt ${attempt} still on ${this.page.url()}`);

      const signedIn =
        !String(this.page.url()).includes('signIn') &&
        !(await this._isSignInVisible());
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
