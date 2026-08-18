const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const env = require('../../../config/env');

/**
 * Vendor portal sign-in → dashboard.
 *
 * Layering per AGENTS.md:
 *   Feature: features/vendor/auth/VendorLogin_TestCases.feature
 *   Steps:   step-definitions/vendor/auth/VendorLoginStep.js
 *   Page:    this file
 */
class VendorLoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.emailInput = page
      .getByPlaceholder(/enter your email|email|username/i)
      .or(page.locator('input[type="email"], input[name="email"], input[name="username"]'))
      .or(page.getByLabel(/email|username|mobile/i))
      .first();
    this.passwordInput = page.getByPlaceholder(/enter your password/i).first();
    this.signInButton = page
      .getByRole('button', { name: /^(sign in|login|log in)$/i })
      .or(page.locator('button:has-text("Sign In"), button:has-text("Login")'))
      .first();
    this.loginHeading = page
      .getByRole('heading', { name: /sign in|log in|login|welcome/i })
      .or(page.getByText(/sign in to|vendor/i))
      .first();
    this.errorMessage = page
      .getByText(/invalid username or password|invalid credentials|incorrect/i)
      .first();

    this.accountSettings = page
      .getByLabel(/account settings|profile settings/i)
      .or(page.getByRole('button', { name: /account settings|profile settings/i }))
      .first();
    this.dashboardMarker = page
      .getByRole('heading', { name: /dashboard/i })
      .or(page.getByRole('button', { name: /^dashboard$/i }))
      .or(page.getByRole('link', { name: /^dashboard$/i }))
      .or(page.getByText(/^dashboard$/i))
      .first();
    this.logoutMenuItem = page
      .getByRole('menuitem', { name: /log ?out|sign ?out/i })
      .or(page.getByRole('button', { name: /log ?out|sign ?out/i }))
      .or(page.getByRole('link', { name: /log ?out|sign ?out/i }))
      .first();
    this.lastPasswordUsed = null;
  }

  logStep(msg) {
    console.log(`[Vendor] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  _isVendorHost() {
    return /vendor\.(aecplayhouse|intoaec)/i.test(this.page.url());
  }

  async _isSignInVisible() {
    if (!this.page || this.page.isClosed()) return false;
    const emailVisible = await this.emailInput.isVisible({ timeout: 2000 }).catch(() => false);
    const passwordVisible = await this.passwordInput.isVisible({ timeout: 2000 }).catch(() => false);
    return emailVisible && passwordVisible;
  }

  async _isOnLoginPage() {
    if (!this.page || this.page.isClosed()) return false;
    return /signIn/i.test(this.page.url()) && (await this._isSignInVisible());
  }

  async _isVendorAppReady() {
    if (!this._isVendorHost()) return false;
    if (String(this.page.url()).includes('signIn')) return false;
    if (await this.accountSettings.isVisible({ timeout: 2000 }).catch(() => false)) return true;
    return this.dashboardMarker.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async _commitReactInput(locator, wanted) {
    await locator.evaluate((el, val) => {
      const proto =
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      const previous = el.value;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(previous);
      if (desc && desc.set) desc.set.call(el, val);
      else el.value = val;
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, cancelable: true, data: val, inputType: 'insertText' })
      );
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, wanted);
  }

  async _fillStable(locator, value) {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Vendor page was closed before filling a login field');
    }
    await locator.waitFor({ state: 'visible', timeout: 30000 });
    for (let i = 0; i < 3; i += 1) {
      if (this.page.isClosed()) {
        throw new Error('Vendor page was closed while filling a login field');
      }
      await locator.click({ timeout: 10000 });
      await locator.press('Control+A').catch(() => {});
      await locator.fill('');
      await locator.pressSequentially(String(value), { delay: 35 });
      await this._commitReactInput(locator, String(value));
      const current = await locator.inputValue().catch(() => '');
      if (current === String(value)) return;
      await this.page.waitForTimeout(250);
    }
  }

  async navigateToLoginPage() {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Vendor page was closed before opening the login page');
    }
    await this.page.goto(env.vendor, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1500);

    if (await this._isVendorAppReady()) {
      await this.page.context().clearCookies();
      await this.page.goto(env.vendor, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1500);
    }

    await expect(this.emailInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.passwordInput).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Navigated to Vendor login page (${this.page.url()})`);
  }

  async expectLoginPageDisplayed() {
    await expect(this.emailInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.passwordInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.signInButton).toBeVisible({ timeout: this.uiTimeout });
    expect(this.page.url(), 'Vendor login URL should include signIn').toMatch(/signIn/i);
    this.logStep('Vendor Login page is displayed');
  }

  async fillEmail(email) {
    await this._fillStable(this.emailInput, email);
    this.logStep(`Entered vendor email "${email}"`);
  }

  async fillPassword(password) {
    await this._fillStable(this.passwordInput, password);
    this.lastPasswordUsed = password;
    this.logStep('Entered vendor password');
  }

  async _waitForPostLoginNavigation() {
    await expect
      .poll(
        async () => {
          if (!this.page || this.page.isClosed()) return false;
          const url = this.page.url();
          if (await this._isVendorAppReady()) return true;
          if (url.includes('multi-account-switch')) {
            if (!url.includes('signIn')) return true;
            await this.page.waitForTimeout(500);
            return false;
          }
          return !url.includes('signIn') && !(await this._isSignInVisible());
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();

    if (String(this.page.url()).includes('multi-account-switch')) {
      await expect
        .poll(
          async () => {
            const url = this.page.url();
            if (!url.includes('multi-account-switch')) return true;
            if (await this._isVendorAppReady()) return true;
            return false;
          },
          { timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] }
        )
        .toBeTruthy();
    }
  }

  async clickSignIn() {
    const loginButton = this.signInButton.or(this.page.locator('button[type="submit"]').first()).first();
    await expect(loginButton).toBeVisible({ timeout: this.uiTimeout });
    await expect(loginButton).toBeEnabled({ timeout: this.uiTimeout });

    await loginButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Sign In');

    await this._waitForPostLoginNavigation();
  }

  async logout() {
    if (!this.page || this.page.isClosed()) {
      this.logStep('Vendor page already closed — treating as logged out');
      return;
    }

    if (await this._isOnLoginPage()) {
      this.logStep('Already on vendor login page');
      return;
    }

    const passwordModal = this.page
      .locator('.MuiModal-root, [role="dialog"]')
      .filter({ hasText: /password changed/i })
      .first();
    if (await passwordModal.isVisible({ timeout: 1500 }).catch(() => false)) {
      const signIn = passwordModal
        .getByRole('button', { name: /sign in|login/i })
        .or(passwordModal.getByRole('link', { name: /sign in|login/i }))
        .first();
      if (await signIn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await signIn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        this.logStep('Clicked Sign In on password-changed overlay to log out');
      }
      await this.page.waitForURL(/signIn/i, { timeout: this.defaultTimeout }).catch(() => {});
      if (!this.page.isClosed() && (await this._isOnLoginPage())) {
        this.logStep(`Logged out of vendor portal (${this.page.url()})`);
        return;
      }
      if (!this.page || this.page.isClosed()) {
        this.logStep('Vendor page closed after password-changed overlay — treating as logged out');
        return;
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await expect(this.accountSettings).toBeVisible({ timeout: this.defaultTimeout });
    await this.accountSettings.click({ timeout: this.uiTimeout, force: true });
    await expect(this.logoutMenuItem).toBeVisible({ timeout: this.uiTimeout });
    await this.logoutMenuItem.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/signIn/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    if (!this.page || this.page.isClosed()) {
      this.logStep('Vendor page closed after Logout — treating as logged out');
      return;
    }
    await expect(this.emailInput).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Logged out of vendor portal (${this.page.url()})`);
  }

  async expectLoggedInSuccessfully() {
    await expect
      .poll(
        async () => {
          if (!this.page || this.page.isClosed()) return false;
          const url = this.page.url();
          if (!url.includes('signIn') && !(await this._isSignInVisible())) return true;
          if (await this.accountSettings.isVisible({ timeout: 500 }).catch(() => false)) return true;
          return this.dashboardMarker.isVisible({ timeout: 500 }).catch(() => false);
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();

    const chrome = this.accountSettings.or(this.dashboardMarker).first();
    await expect(chrome).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Vendor user is logged in successfully (${this.page.url()})`);
  }

  async expectDashboardDisplayed() {
    await expect(this.dashboardMarker).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Vendor Dashboard is displayed');
  }

  /** Navigate to vendor sign-in; log in only when still on the sign-in screen. */
  async ensureAuthenticated(email = 'testintoaec@gmail.com', password = 'Simple@10') {
    if (this._isVendorHost() && (await this._isVendorAppReady())) {
      this.logStep('Already logged in to vendor portal');
      return;
    }
    await this.navigateToLoginPage();
    const candidates = [...new Set([password, 'Simple@10', 'Courage@10'].filter(Boolean))];
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      await this.fillEmail(email);
      await this.fillPassword(candidate);
      const loginButton = this.signInButton.or(this.page.locator('button[type="submit"]').first()).first();
      await expect(loginButton).toBeVisible({ timeout: this.uiTimeout });
      await loginButton.click({ timeout: this.uiTimeout });
      this.logStep(`Clicked Sign In (password candidate ${i + 1}/${candidates.length})`);

      const loggedIn = await expect
        .poll(
          async () => {
            if (await this._isVendorAppReady()) return true;
            const url = this.page.url();
            if (url.includes('multi-account-switch') && !url.includes('signIn')) return true;
            return !url.includes('signIn') && !(await this._isSignInVisible());
          },
          { timeout: 20000, intervals: [500, 1000, 2000] }
        )
        .toBeTruthy()
        .then(() => true)
        .catch(() => false);

      if (loggedIn) {
        this.lastPasswordUsed = candidate;
        if (String(this.page.url()).includes('multi-account-switch')) {
          await this._waitForPostLoginNavigation();
        }
        await this.expectLoggedInSuccessfully();
        return;
      }
      this.logStep(`Vendor login did not succeed with password candidate ${i + 1}`);
    }
    await this.expectLoggedInSuccessfully();
  }
}

module.exports = VendorLoginPage;
