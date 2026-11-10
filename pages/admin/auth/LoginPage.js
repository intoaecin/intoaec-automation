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
      .or(page.getByRole('link', { name: /^resources$/i }))
      .or(page.getByRole('button', { name: /^dashboard$/i }))
      .or(page.getByRole('link', { name: /^dashboard$/i }))
      .or(page.getByRole('button', { name: /clients\/projects/i }))
      .first();
  }

  _isAdminHost() {
    return /app\.(aecplayhouse|intoaec)/i.test(String(this.page.url() || ''));
  }

  /**
   * Welcome/demo modal can aria-hide the shell so Account Settings / Resources never match.
   * Dismiss before treating login as ready.
   */
  async _dismissPostLoginOverlay() {
    const continueToAccount = this.page
      .getByRole('button', { name: /continue\s+to\s+my\s+account/i })
      .or(this.page.getByRole('link', { name: /continue\s+to\s+my\s+account/i }))
      .filter({ visible: true })
      .first();
    if (await continueToAccount.isVisible({ timeout: 1200 }).catch(() => false)) {
      await continueToAccount.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(500).catch(() => {});
      console.log('[Login] Dismissed post-login Continue to My Account');
      return true;
    }

    const dialog = this.page
      .getByRole('dialog')
      .or(this.page.locator('.MuiDialog-root, .MuiModal-root'))
      .filter({ visible: true })
      .filter({ hasText: /welcome|continue|demo|tour|get started/i })
      .first();
    if (await dialog.isVisible({ timeout: 800 }).catch(() => false)) {
      const closeBtn = dialog
        .getByRole('button', { name: /close|cancel|dismiss|continue|got it|^ok$/i })
        .or(dialog.locator('button[aria-label*="close" i]'))
        .filter({ visible: true })
        .first();
      if (await closeBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        await closeBtn.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(400).catch(() => {});
        console.log('[Login] Dismissed post-login dialog');
        return true;
      }
    }

    // Any other blocking modal (demo tour, leftover popup) aria-hides the app shell,
    // so readiness checks fail and login tries to fill the header Search box instead.
    // Never click a Domain-setup Continue here — only close/cancel-style controls.
    const anyDialog = this.page
      .locator('.MuiDialog-root, [role="dialog"]')
      .filter({ visible: true })
      .first();
    if (await anyDialog.isVisible({ timeout: 800 }).catch(() => false)) {
      const closeBtn = anyDialog
        .getByRole('button', { name: /^close$|^cancel$|dismiss|skip|later|got it/i })
        .or(anyDialog.locator('button[aria-label*="close" i]'))
        .filter({ visible: true })
        .first();
      if (await closeBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        await closeBtn.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(400).catch(() => {});
        console.log('[Login] Dismissed blocking dialog');
        return true;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
      if (!(await anyDialog.isVisible({ timeout: 800 }).catch(() => false))) {
        console.log('[Login] Dismissed blocking dialog via Escape');
        return true;
      }
    }
    return false;
  }

  async _isAppReady() {
    if (!this._isAdminHost()) {
      return false;
    }
    await this._dismissPostLoginOverlay().catch(() => {});
    if (await this.appHeader.isVisible({ timeout: 2500 }).catch(() => false)) {
      return true;
    }
    if (await this.appShell.isVisible({ timeout: 2500 }).catch(() => false)) {
      return true;
    }
    return this.page
      .getByRole('button', {
        name: /account settings|profile settings|clients\/projects|resources|dashboard/i,
      })
      .or(
        this.page.getByRole('link', {
          name: /account settings|profile settings|clients\/projects|resources|dashboard/i,
        })
      )
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
  }

  async _waitForAppChrome(timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await this._dismissPostLoginOverlay().catch(() => {});
      if (await this._isAppReady()) return true;
      // Already past sign-in on admin host — soft success if shell still hydrating.
      if (
        this._isAdminHost() &&
        !String(this.page.url()).includes('signIn') &&
        !(await this._isSignInVisible())
      ) {
        const bodyReady = await this.page
          .locator('nav, header, [class*="Sidebar"], [class*="Drawer"], main')
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 800 })
          .catch(() => false);
        if (bodyReady) return true;
      }
      await this.page.waitForTimeout(500).catch(() => {});
    }
    return this._isAppReady();
  }

  async _isSignInVisible() {
    // The password field is the reliable sign-in marker. The email locator's
    // text-input fallback also matches the app header Search box when logged in.
    const passwordVisible = await this.passwordInput.isVisible({ timeout: 1500 }).catch(() => false);
    if (passwordVisible) return true;
    if (!/signIn/i.test(String(this.page.url() || ''))) return false;
    return this.emailInput.isVisible({ timeout: 1500 }).catch(() => false);
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
    if (this.page.isClosed()) {
      throw new Error('Browser page is closed before login navigation');
    }
    await this.page.goto(env.admin, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    let state = await this._waitForSplashToClear(45000);
    if (state === 'app' || state === 'signin') {
      return;
    }
    if (this.page.isClosed()) {
      throw new Error('Browser page closed during login splash wait');
    }
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await this.page.goto(`${env.admin}/auth/signIn`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      state = await this._waitForSplashToClear(45000);
      if (state === 'app') {
        return;
      }
      if (state === 'signin') {
        return;
      }
      const visible = await this.emailInput
        .or(this.passwordInput)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      if (visible) return;
      console.log(`[Login] Sign-in fields not visible after splash (attempt ${attempt}) — retrying`);
    }
    await this.emailInput
      .or(this.passwordInput)
      .first()
      .waitFor({ state: 'visible', timeout: 45000 });
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
    this.lastLoginEmail = String(email || '').trim();
    if (await this._isAppReady()) {
      return;
    }
    // Already inside the app (batch run reusing the session): do not try to fill
    // the sign-in form — its email locator matches the header Search box.
    if (
      this._isAdminHost() &&
      !/signIn/i.test(String(this.page.url() || '')) &&
      !(await this._isSignInVisible())
    ) {
      await this._dismissPostLoginOverlay().catch(() => {});
      if ((await this._isAppReady()) || !(await this._isSignInVisible())) {
        console.log('[Login] Already inside the app — skipping sign-in form');
        return;
      }
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
        await this._dismissPostLoginOverlay().catch(() => {});
        if (await this._waitForAppChrome(45000)) {
          return;
        }
        // Dashboard URL but chrome still missing — hard reload once.
        console.log('[Login] Signed in but chrome missing — reloading dashboard');
        await this.page
          .goto(`${env.admin}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 })
          .catch(() => {});
        await this._waitForSplashToClear(30000);
        await this._dismissPostLoginOverlay().catch(() => {});
        if (await this._waitForAppChrome(45000)) {
          return;
        }
        // Last resort: admin host + not on sign-in is enough to continue scenarios
        // that navigate by URL (Cost Catalog) after Background login.
        if (this._isAdminHost() && !(await this._isSignInVisible())) {
          console.log('[Login] Proceeding with admin session without matching nav chrome');
          return;
        }
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

    // Never use account switcher — leave it (or 404) and go straight to dashboard.
    await this._leaveAccountSwitcherOr404();
    await this._dismissPostLoginOverlay().catch(() => {});
    await this._waitForAppChrome(60000).catch(() => {});
    return this._isAppReady() || (this._isAdminHost() && !(await this._isSignInVisible()));
  }

  /** If login lands on multi-account-switch / 404, go to dashboard only (no account pick). */
  async _leaveAccountSwitcherOr404() {
    const url = String(this.page.url() || '');
    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 200);
    const bad =
      /multi-account-switch|select[-_]?organization|choose[-_]?account/i.test(url) ||
      /404|This page could not be found/i.test(body);
    if (!bad) return;
    console.log(`[Login] Leaving account-switch/404 (${url}) → dashboard (kumar@diy.in only, no switch)`);
    await this.page
      .goto(`${env.admin}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      .catch(() => {});
    await this.page.waitForTimeout(800).catch(() => {});
  }

  /**
   * Login as the given Admin user only.
   * Blocks aadhi / other accounts. No account switch, no password recovery loop.
   */
  async ensureAuthenticated(email, password) {
    const wantedEmail = String(email || '').trim();
    const wantedPassword = String(password || '').trim();
    if (/aadhi@/i.test(wantedEmail)) {
      throw new Error('aadhi@yopmail.com is blocked — use kumar@diy.in / Simple@10 only');
    }
    this.lastLoginEmail = wantedEmail;

    const sessionKey = '__adminAuthenticatedEmail';
    const pageSessionEmail = String(this.page[sessionKey] || '').trim().toLowerCase();

    // After vendor-portal scenarios the shared browser is often still on vendor.* —
    // always land on Admin sign-in first so Account Settings wait is not against the wrong app.
    if (!this._isAdminHost()) {
      console.log(`[Login] Leaving non-admin URL (${this.page.url()}) → Admin sign-in`);
      await this.page.context().clearCookies().catch(() => {});
      this.page[sessionKey] = '';
      await this.page.goto(`${env.admin}/auth/signIn`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await this._waitForSplashToClear(45000);
    } else {
      await this.goto();
      await this._leaveAccountSwitcherOr404();
    }

    if (await this._isAppReady()) {
      if (pageSessionEmail && pageSessionEmail === wantedEmail.toLowerCase()) {
        console.log(`[Login] Reusing session for ${wantedEmail}`);
        this.lastPasswordUsed = wantedPassword;
        return;
      }
      console.log(`[Login] Clearing prior session so only ${wantedEmail} is used`);
      await this.page.context().clearCookies().catch(() => {});
      this.page[sessionKey] = '';
      await this.page.goto(`${env.admin}/auth/signIn`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      }).catch(() => {});
      await this._waitForSplashToClear(30000);
    }

    if (await this._isAppReady()) {
      await this._leaveAccountSwitcherOr404();
      this.page[sessionKey] = wantedEmail;
      this.lastPasswordUsed = wantedPassword;
      console.log(`[Login] App already ready — continuing as ${wantedEmail}`);
      return;
    }

    await this.login(wantedEmail, wantedPassword);
    await this._leaveAccountSwitcherOr404();
    await this._dismissPostLoginOverlay().catch(() => {});
    if (!(await this._isAppReady())) {
      // One more hard navigation + wait for chrome (slow dashboards after vendor suite)
      await this.page.goto(`${env.admin}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await this._waitForSplashToClear(45000);
      await this._dismissPostLoginOverlay().catch(() => {});
      await this._waitForAppChrome(90000).catch(() => {});
    }
    if (!(await this._isAppReady()) && !(this._isAdminHost() && !(await this._isSignInVisible()))) {
      throw new Error(`Login failed for ${wantedEmail} (URL: ${this.page.url()})`);
    }
    this.page[sessionKey] = wantedEmail;
    this.lastPasswordUsed = wantedPassword;
    console.log(`[Login] Signed in as ${wantedEmail} only — no account switch`);
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
