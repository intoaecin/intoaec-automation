const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const { getCustomerPortalUrl } = require('../../../config/customerPortal');

/**
 * Customer portal sign-in (OTP flow) → dashboard.
 */
class CustomerLoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;
    this.inboxTimeoutMs = parseInt(process.env.CUSTOMER_PORTAL_YOPMAIL_TIMEOUT_MS || '600000', 10);

    this.emailInput = page
      .getByPlaceholder(/enter your email|email|mobile/i)
      .or(page.locator('input[type="email"], input[type="text"][name*="email" i]'))
      .or(page.getByLabel(/email|mobile/i))
      .first();
    this.passwordInput = page.getByPlaceholder(/enter your password|password/i).first();
    this.getOtpButton = page
      .getByRole('button', { name: /get\s*otp/i })
      .or(page.locator('button').filter({ hasText: /get\s*otp/i }))
      .first();
    this.loginContinueButton = page
      .getByRole('button', { name: /^(login|log in|continue|sign in)$/i })
      .or(page.locator('button').filter({ hasText: /^(Login|Continue)$/i }))
      .first();
    this.verifyOtpButton = page
      .getByRole('button', { name: /verify|login|log in|submit|continue/i })
      .or(page.locator('button').filter({ hasText: /verify|login/i }))
      .first();
    this.otpInputs = page.locator(
      'input[autocomplete="one-time-code"], input[name*="otp" i], input[id*="otp" i], input[inputmode="numeric"], input[maxlength="1"]'
    );
    this.otpSingleInput = page
      .getByPlaceholder(/otp|code|verification/i)
      .or(page.locator('input[type="text"], input[type="number"]').filter({ has: page.locator('xpath=..') }))
      .first();
    this.dashboardMarker = page
      .getByRole('heading', { name: /dashboard|projects|welcome/i })
      .or(page.getByRole('button', { name: /account settings|profile settings|logout/i }))
      .or(page.getByText(/pick up where you left off|my projects|project dashboard/i))
      .first();
    this.lastOtp = null;
  }

  logStep(msg) {
    console.log(`[Customer] ${msg}`);
  }

  _portalUrl() {
    return getCustomerPortalUrl();
  }

  _isCustomerHost() {
    return /staging-bac9-intoaec1\.wpcomstaging\.com|customer\.(aecplayhouse|intoaec)|customer-portal|cutomer-portal/i.test(
      String(this.page.url() || '')
    );
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async _fillStable(locator, value) {
    await expect(locator).toBeVisible({ timeout: this.uiTimeout });
    await locator.click({ timeout: this.uiTimeout });
    await locator.fill('');
    await locator.pressSequentially(String(value), { delay: 30 });
  }

  async _emailFieldVisible() {
    return this.emailInput.isVisible({ timeout: 4000 }).catch(() => false);
  }

  async _logoutViaAccountMenu() {
    await this.page.keyboard.press('Escape').catch(() => {});
    const account = this.page
      .getByLabel(/account settings|profile settings/i)
      .or(this.page.getByRole('button', { name: /account settings|profile settings/i }))
      .filter({ visible: true })
      .first();
    if (!(await account.isVisible({ timeout: 4000 }).catch(() => false))) return false;
    await account.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    const logout = this.page
      .getByRole('menuitem', { name: /log\s*out|sign\s*out/i })
      .or(this.page.getByRole('button', { name: /log\s*out|sign\s*out/i }))
      .or(this.page.getByText(/^\s*(log\s*out|sign\s*out)\s*$/i))
      .filter({ visible: true })
      .first();
    if (!(await logout.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.page.keyboard.press('Escape').catch(() => {});
      return false;
    }
    await logout.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    this.logStep('Clicked Logout on Customer Portal');
    await this.waitForNetworkSettled();
    return true;
  }

  async _clearCustomerPortalCookies() {
    const context = this.page.context();
    const cookies = await context.cookies().catch(() => []);
    const keep = (cookies || []).filter(
      (cookie) => !/wpcomstaging|cutomer-portal|customer-portal/i.test(`${cookie.domain} ${cookie.path}`)
    );
    await context.clearCookies().catch(() => {});
    if (keep.length) {
      await context.addCookies(keep).catch(() => {});
    }
    this.logStep('Cleared Customer Portal cookies (Admin session kept)');
  }

  async ensureOnLoginPage() {
    const url = this._portalUrl();
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.waitForNetworkSettled();

    if (await this._emailFieldVisible()) return true;

    if (await this.isLoggedIn()) {
      this.logStep('Customer Portal still logged in from a previous TC — logging out for a fresh login');
      await this._logoutViaAccountMenu();
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await this.waitForNetworkSettled();
    }

    if (await this._emailFieldVisible()) return true;

    await this._clearCustomerPortalCookies();
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.waitForNetworkSettled();
    return this._emailFieldVisible();
  }

  async navigateToLoginPage() {
    await this.ensureOnLoginPage();
    await expect(this.emailInput).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Navigated to Customer Portal login (${this.page.url()})`);
  }

  async expectLoginPageDisplayed() {
    await expect(this.emailInput).toBeVisible({ timeout: this.defaultTimeout });
    const hasOtp = await this.getOtpButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasPassword = await this.passwordInput.isVisible({ timeout: 3000 }).catch(() => false);
    const hasLogin = await this.loginContinueButton.isVisible({ timeout: 3000 }).catch(() => false);
    expect(
      hasOtp || hasPassword || hasLogin,
      'Customer Portal login should show Get OTP and/or Login/Continue'
    ).toBeTruthy();
    this.logStep('Customer Portal Login page is displayed');
  }

  async fillEmail(email) {
    await this._fillStable(this.emailInput, email);
    this.logStep(`Entered captured client email on Customer Portal: ${email}`);
  }

  async clickLoginOrContinue() {
    if (await this.getOtpButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.getOtpButton.click({ timeout: this.uiTimeout });
      this.logStep('Clicked Get OTP');
      return;
    }

    const loginBtn = this.loginContinueButton.first();
    await expect(loginBtn).toBeVisible({ timeout: this.uiTimeout });
    await loginBtn.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Login / Continue');
  }

  async clickResendOtpIfVisible() {
    const resend = this.page
      .getByRole('button', { name: /resend(\s*(otp|code))?|get\s*otp|send\s*(otp|again|code)/i })
      .or(this.page.getByRole('link', { name: /resend(\s*(otp|code))?/i }))
      .or(this.page.getByText(/resend(\s*(otp|code))?/i))
      .first();

    if (!(await resend.isVisible({ timeout: 2000 }).catch(() => false))) {
      if (await this.getOtpButton.isVisible({ timeout: 800 }).catch(() => false)) {
        await this.getOtpButton.click({ timeout: this.uiTimeout }).catch(() => {});
        this.logStep('Clicked Get OTP again while waiting for new OTP email');
        return true;
      }
      return false;
    }

    await resend.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    this.logStep('Clicked Resend OTP while waiting for new OTP email');
    return true;
  }

  async expectOtpVerificationPage() {
    const otpVisible = await this.otpInputs
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const singleOtp = await this.page
      .getByPlaceholder(/otp|verification code|enter.*code/i)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
    const otpCopy = /otp|one[-\s]?time|verification code|enter.*code/.test(body);

    expect(
      otpVisible || singleOtp || otpCopy,
      'Customer Portal OTP verification page should be displayed after Login / Continue'
    ).toBeTruthy();
    this.logStep('Customer Portal OTP verification page is displayed');
  }

  async enterOtp(otp) {
    const code = String(otp || '').replace(/\D/g, '');
    if (!code) throw new Error('OTP is empty — retrieve it from Yopmail first.');

    const boxes = this.otpInputs;
    const count = await boxes.count().catch(() => 0);
    if (count > 1) {
      for (let i = 0; i < Math.min(count, code.length); i += 1) {
        await boxes.nth(i).fill(code[i]);
      }
    } else {
      const single = this.page.getByPlaceholder(/otp|verification code|enter.*code/i).first();
      if (await single.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this._fillStable(single, code);
      } else if (count === 1) {
        await boxes.first().fill(code);
      } else {
        throw new Error('No OTP input found on Customer Portal verification page.');
      }
    }

    this.lastOtp = code;
    this.logStep('Entered OTP on Customer Portal');
  }

  async clickVerifyOrLogin() {
    const btn = this.verifyOtpButton.first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click({ timeout: this.uiTimeout });
      this.logStep('Clicked Verify / Login');
      return;
    }
    await this.page.keyboard.press('Enter').catch(() => {});
    this.logStep('Submitted OTP via Enter key');
  }

  async expectLoggedInSuccessfully() {
    await expect
      .poll(async () => this.isLoggedIn(), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
    this.logStep(`Customer logged in successfully (${this.page.url()})`);
  }

  async isLoggedIn() {
    if (!this.page || this.page.isClosed()) return false;
    await this.waitForNetworkSettled();
    const url = String(this.page.url() || '');
    if (/\/auth\/signIn/i.test(url) && !(await this.dashboardMarker.isVisible({ timeout: 800 }).catch(() => false))) {
      return false;
    }
    if (await this.dashboardMarker.isVisible({ timeout: 1200 }).catch(() => false)) return true;
    if (this._isCustomerHost() && !/\/auth\//i.test(url)) return true;
    return false;
  }
}

module.exports = CustomerLoginPage;
