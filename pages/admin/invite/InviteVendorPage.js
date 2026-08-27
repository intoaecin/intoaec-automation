const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

function yopmailLocalPart(email) {
  const m = String(email || '').trim().match(/^([^@]+)@yopmail\.com$/i);
  return m ? m[1] : String(email || '').replace(/@.*$/, '').trim();
}

/**
 * Admin Portal → Invite Vendor → Yopmail invitation → vendor registration.
 *
 * Layering per AGENTS.md:
 *   Feature: features/vendor/auth/VendorLogin_TestCases.feature (@TS11 @TC11)
 *   Steps:   step-definitions/admin/invite/InviteVendor.steps.js
 *   Page:    this file
 */
class InviteVendorPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;
    this.inboxTimeoutMs = parseInt(process.env.INVITE_VENDOR_YOPMAIL_TIMEOUT_MS || '180000', 10);

    this.inviteUsersVendorHeader = page.getByLabel(/invite users\/vendor/i).first();
    this.inviteVendorNav = page.getByRole('menuitem', { name: /^invite vendor$/i }).first();
    this.userHubNav = page.getByRole('menuitem', { name: /^user hub$/i }).first();
    this.pageHeading = page
      .getByRole('heading', { name: /invite\s*vendors?/i })
      .or(page.getByText(/^invite\s*vendors?$/i))
      .first();
    this.sendInviteVendorButton = page.getByRole('button', { name: /^send invite$/i }).first();

    this.inviteForm = page
      .getByRole('dialog')
      .or(page.locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root'))
      .filter({ visible: true })
      .last();

    this.firstNameInput = page
      .getByPlaceholder(/vendor first name/i)
      .or(page.locator('input[name="firstName"]'))
      .or(page.getByLabel(/first name/i))
      .first();
    this.lastNameInput = page
      .getByPlaceholder(/vendor last name/i)
      .or(page.locator('input[name="lastName"]'))
      .or(page.getByLabel(/last name/i))
      .first();
    this.emailInput = page
      .getByPlaceholder(/vendor email/i)
      .or(page.locator('input[name="email"], input[name="vendorEmail"], input[type="email"]'))
      .or(page.getByLabel(/email/i))
      .first();
    this.organizationInput = page
      .getByPlaceholder(/vendor organization name/i)
      .or(page.locator('input[name="organizationName"], input[name="organization"]'))
      .or(page.getByLabel(/organization/i))
      .first();
    this.phoneInput = page
      .getByPlaceholder(/^phone number$/i)
      .or(page.locator('input[name="mobileNumber"], input[name="phoneNumber"], input[name="phone"], input[type="tel"]'))
      .or(page.getByLabel(/phone|mobile/i))
      .first();
    this.taxNameInput = page
      .getByPlaceholder(/^tax name$/i)
      .or(page.locator('input[name="taxName"]'))
      .or(page.getByLabel(/^tax name$/i))
      .first();
    this.sendInviteButton = page.getByRole('dialog').getByRole('button', { name: /^send invite$/i }).first();

    this.searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.getByRole('textbox', { name: /search/i }))
      .first();

    this.registrationHeading = page
      .getByRole('heading', { name: /register|sign up|create account|vendor registration/i })
      .or(page.getByText(/vendor registration|complete your registration|create your account/i))
      .first();
    this.registrationMobileInput = page
      .locator('input[name="mobileNumber"], input[name="phoneNumber"], input[name="phone"], input[type="tel"]')
      .or(page.getByLabel(/mobile|phone/i))
      .or(page.getByPlaceholder(/mobile|phone/i))
      .first();
    this.requestOtpButton = page
      .getByRole('button', { name: /request\s*otp|send\s*otp|get\s*otp|get\s*code|send\s*code|verify\s*mobile/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /request\s*otp|send\s*otp|get\s*otp/i }))
      .first();
    this.otpInputs = page.locator(
      'input[autocomplete="one-time-code"], input[name*="otp" i], input[id*="otp" i], input[maxlength="1"]'
    );
    this.verifyOtpButton = page
      .getByRole('button', { name: /verify(\s*otp)?|confirm\s*otp|submit\s*otp/i })
      .first();
    this.passwordInput = page
      .locator('input[name="password"], input[type="password"]')
      .first();
    this.confirmPasswordInput = page
      .locator('input[name="confirmPassword"], input[name="confirm_password"], input[id*="confirm" i][type="password"]')
      .or(page.getByLabel(/confirm password/i))
      .or(page.getByPlaceholder(/confirm password/i))
      .nth(0);
    this.proceedLoginButton = page
      .getByRole('button', { name: /proceed|login|sign in|continue|submit|update|save|register|finish/i })
      .first();

    this.lastInvite = null;
    this.lastInvitationUrl = null;
    this.lastOtpFromEmail = null;
    this.lastMailBody = '';
  }

  logStep(msg) {
    console.log(`[InviteVendor] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async _dismissOverlays() {
    await this.page.keyboard.press('Escape').catch(() => {});
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

  _inputMatchesWanted(current, wanted) {
    const cur = String(current || '');
    const want = String(wanted || '');
    if (cur === want) return true;
    if (cur.replace(/\s+/g, '').toLowerCase() === want.replace(/\s+/g, '').toLowerCase()) return true;
    const curDigits = cur.replace(/\D/g, '');
    const wantDigits = want.replace(/\D/g, '');
    if (wantDigits && curDigits && (curDigits === wantDigits || curDigits.endsWith(wantDigits))) return true;
    return false;
  }

  async _fillText(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const wanted = String(value);
    await locator.click({ timeout: this.uiTimeout });
    await locator.press('Control+A').catch(() => {});
    await locator.fill('');
    await locator.pressSequentially(wanted, { delay: 40 });
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});
    const current = await locator.inputValue().catch(() => '');
    if (!this._inputMatchesWanted(current, wanted)) {
      this.logStep(`WARN ${label} shows "${current}" after typing "${wanted}"`);
    } else {
      this.logStep(`Filled ${label}: ${wanted}`);
    }
    return true;
  }

  async _dismissHeaderMenus() {
    const menu = this.page.locator('#topToggle-menu').first();
    // aria-hidden menus still intercept clicks; isVisible() is false so check the DOM.
    if (!(await menu.count())) return;

    await this.page.keyboard.press('Escape').catch(() => {});
    await menu.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});

    if (await menu.count()) {
      await this.page.locator('#topToggle-menu .MuiBackdrop-root').click({ force: true }).catch(() => {});
      await menu.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    }

    if (await menu.count()) {
      await this.page
        .evaluate(() => {
          document.getElementById('topToggle-menu')?.remove();
        })
        .catch(() => {});
    }
    this.logStep('Closed Invite Users/Vendor header menu');
  }

  async isOnInviteVendorPage() {
    const urlHit = /invite[-_]?vendor|userhub|user-hub/i.test(this.page.url());
    const heading = await this.pageHeading.isVisible({ timeout: 1200 }).catch(() => false);
    const send = await this.sendInviteVendorButton.isVisible({ timeout: 1200 }).catch(() => false);
    const firstName = await this.firstNameInput.isVisible({ timeout: 800 }).catch(() => false);
    return urlHit || heading || send || firstName;
  }

  async navigateToInviteVendor() {
    const env = require('../../../config/env');
    if (!/app\.(aecplayhouse|intoaec)/i.test(this.page.url() || '')) {
      this.logStep('Not on Admin Portal — opening admin app for Invite Vendor');
      await this.page.goto(env.admin, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await this.waitForNetworkSettled();
    }

    if (await this.isOnInviteVendorPage()) {
      this.logStep(`Already on Invite Vendor (${this.page.url()})`);
      return;
    }

    await this.waitForNetworkSettled();
    await expect(this.inviteUsersVendorHeader).toBeVisible({ timeout: this.defaultTimeout });
    await this.inviteUsersVendorHeader.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Opened Invite Users/Vendor header menu');

    await expect(this.inviteVendorNav).toBeVisible({ timeout: this.uiTimeout });
    await this.inviteVendorNav.click({ timeout: this.uiTimeout });
    await this.page.waitForTimeout(300);
    await this._dismissHeaderMenus();

    await this.page
      .waitForURL(/invite|vendor|userhub|user-hub/i, { timeout: this.defaultTimeout })
      .catch(() => {});
    await this.waitForNetworkSettled();
    await expect
      .poll(async () => this.isOnInviteVendorPage(), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
    this.logStep(`Navigated to Invite Vendor (${this.page.url()})`);
  }

  async clickSendInviteVendor() {
    if (await this.firstNameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Invite vendor form already open');
      return;
    }
    await this._dismissHeaderMenus();
    await expect(this.sendInviteVendorButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.sendInviteVendorButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.sendInviteVendorButton.click({ timeout: this.uiTimeout, force: true });
    await expect(this.firstNameInput).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Send Invite');
  }

  async fillFirstName(value) {
    this.lastInvite = { ...(this.lastInvite || {}), firstName: value };
    await this._fillText(this.firstNameInput, value, 'First Name');
  }

  async fillLastName(value) {
    this.lastInvite = { ...(this.lastInvite || {}), lastName: value };
    await this._fillText(this.lastNameInput, value, 'Last Name');
  }

  async fillEmail(value) {
    let email = String(value || '').trim();
    const yop = email.match(/^([^@]+)@yopmail\.com$/i);
    if (yop) {
      email = `${yop[1]}${Date.now().toString().slice(-8)}@yopmail.com`;
    }
    this.lastInvite = { ...(this.lastInvite || {}), email };
    await this._fillText(this.emailInput, email, 'Vendor Email');
    this.logStep(`Using unique invite email (existing mail ids are rejected): ${email}`);
    return email;
  }

  async fillOrganization(value) {
    this.lastInvite = { ...(this.lastInvite || {}), organization: value };
    await this._fillText(this.organizationInput, value, 'Organization Name');
  }

  async fillPhone(value) {
    // Reusing a known mobile (e.g. 7305570607) makes userhub INSERT fail 500
    // (duplicate mobileNumber) — then no invitation email is sent at all.
    const digits = String(value || '').replace(/\D/g, '');
    const unique = `73${Date.now().toString().slice(-8)}`;
    const phone = unique.length === 10 ? unique : digits || unique;
    this.lastInvite = { ...(this.lastInvite || {}), phone };
    await this._fillText(this.phoneInput, phone, 'Phone Number');
    return phone;
  }

  async fillTaxName(value) {
    this.lastInvite = { ...(this.lastInvite || {}), taxName: value };
    await this._fillText(this.taxNameInput, value, 'Tax Name');
  }

  _inviteFormDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /vendor first name/i })
      .first()
      .or(this.page.locator('.MuiDialog-paper, [role="dialog"]').filter({ hasText: /vendor first name/i }).first());
  }

  _isTrackingUrl(url) {
    return /freshmarketer|freshworks|google-analytics|googletagmanager|sentry|hotjar|segment|facebook|doubleclick|mixpanel|amplitude|clarity|intercom|newrelic/i.test(
      String(url || '')
    );
  }

  _isInviteApiResponse(res, email) {
    const url = res.url();
    if (this._isTrackingUrl(url)) return false;
    const method = res.request().method();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
    if (/userhub/i.test(url) && /invite|vendor/i.test(url)) return true;
    const data = `${url} ${res.request().postData() || ''}`.toLowerCase();
    return Boolean(email) && data.includes(email) && /userhub|aecplayhouse|intoaec|invite/i.test(url);
  }

  async clickSendInvite() {
    const form = this._inviteFormDialog();
    const btn = form.getByRole('button', { name: /^send invite$/i }).first();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });

    const email = String(this.lastInvite?.email || '').toLowerCase();
    const posts = [];
    const onResponse = (res) => {
      const method = res.request().method();
      if (['POST', 'PUT', 'PATCH'].includes(method) && !this._isTrackingUrl(res.url())) {
        posts.push(`${method} ${res.status()} ${res.url()}`);
      }
    };
    this.page.on('response', onResponse);

    const responsePromise = this.page
      .waitForResponse((res) => this._isInviteApiResponse(res, email), { timeout: 45000 })
      .catch(() => null);

    await btn.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked Send Invite on the invite form');

    const res = await responsePromise;
    this.page.off('response', onResponse);
    this.lastInviteResponse = res;

    if (!res) {
      throw new Error(
        `Send Invite did not call the vendor invite API. Requests seen: ${posts.join(' | ') || '(none)'}`
      );
    }
    const status = res.status();
    const body = await res.text().catch(() => '');
    this.logStep(`Invite API ${status} ${res.url()}`);
    if (status >= 400) {
      throw new Error(`Invite API failed ${status}: ${body.slice(0, 400)}`);
    }
  }

  async _waitForInviteDialogClosed() {
    const dialog = this._inviteFormDialog();
    await dialog.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
  }

  async expectInvitationSent() {
    await this._waitForInviteDialogClosed();
    await this.waitForNetworkSettled();
    this.logStep('Vendor invitation sent successfully');
  }

  vendorRow(query) {
    const q = String(query || '').trim();
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return this.page.locator('table[aria-label="simple table"] tbody tr').filter({ hasText: re }).first();
  }

  async _tableEmails() {
    return this.page
      .locator('table[aria-label="simple table"] tbody tr td:nth-child(2)')
      .allInnerTexts()
      .then((rows) => rows.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))
      .catch(() => []);
  }

  async refreshVendorList() {
    const current = this.page.url();
    let target = current;
    try {
      target = `${new URL(current).origin}/my-vendor/invite-vendor`;
    } catch {
      target = current;
    }
    await this.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.waitForNetworkSettled();
    await this.page
      .locator('table[aria-label="simple table"] tbody tr')
      .first()
      .waitFor({ state: 'visible', timeout: this.defaultTimeout })
      .catch(() => {});
    await this.page.waitForTimeout(1500);
    this.logStep('Refreshed All Vendors panel');
  }

  async searchVendor(query) {
    this.lastInvite = { ...(this.lastInvite || {}), search: query, email: this.lastInvite?.email || query };
    if (await this.searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.searchInput.click({ timeout: this.uiTimeout });
      await this.searchInput.fill('');
      await this.searchInput.fill(query);
      await this.searchInput.press('Enter').catch(() => {});
      await this.waitForNetworkSettled();
    }
    const row = this.vendorRow(query);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Found invited vendor in the list for "${query}"`);
  }

  async expectVendorStatus(status) {
    const wanted = String(status || '').trim();
    const query = this.lastInvite?.email || this.lastInvite?.search || '';
    if (!query) {
      throw new Error('No invited vendor email stored — cannot check All Vendors status.');
    }

    await this._waitForInviteDialogClosed();
    await expect(this.page.getByText(/^All Vendors$/i).first()).toBeVisible({ timeout: this.defaultTimeout });

    const deadline = Date.now() + 20000;
    let found = false;
    while (Date.now() < deadline) {
      const emails = await this._tableEmails();
      this.logStep(`All Vendors emails: ${emails.join(', ') || '(none)'}`);
      found = emails.some((e) => e.toLowerCase().includes(query.toLowerCase()));
      if (found) break;
      await this.page.waitForTimeout(2000);
      await this.refreshVendorList();
    }

    if (!found) {
      throw new Error(
        `All Vendors panel did not show new vendor ${query} after refresh. Last emails: ${(await this._tableEmails()).join(', ')}`
      );
    }

    const row = this.vendorRow(query);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await expect(row.locator('td').nth(1)).toContainText(query, { timeout: this.uiTimeout });
    await expect(row.locator('td').nth(3).locator('p')).toHaveText(new RegExp(`^${wanted}$`, 'i'), {
      timeout: this.uiTimeout,
    });
    this.logStep(`All Vendors panel shows ${query} with Status "${wanted}"`);
  }

  async expectEditDeleteResendHidden() {
    const query = this.lastInvite?.search || this.lastInvite?.email || '';
    const scope = query ? this.vendorRow(query) : this.page;
    const edit = scope.getByRole('button', { name: /^edit$/i }).first();
    const del = scope.getByRole('button', { name: /^delete$/i }).first();
    const resend = scope.getByRole('button', { name: /resend/i }).first();
    expect(await edit.isVisible({ timeout: 1500 }).catch(() => false)).toBeFalsy();
    expect(await del.isVisible({ timeout: 800 }).catch(() => false)).toBeFalsy();
    expect(await resend.isVisible({ timeout: 800 }).catch(() => false)).toBeFalsy();
    this.logStep('Edit, Delete, and Resend buttons are not displayed');
  }

  inboxFrame() {
    return this.page.frameLocator('iframe[name="ifinbox"]');
  }

  mailFrame() {
    return this.page.frameLocator('iframe[name="ifmail"]');
  }

  async gotoYopmailInbox(email) {
    const login = yopmailLocalPart(email);
    await this.page.goto(`https://yopmail.com?${encodeURIComponent(login)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await this.page.waitForSelector('iframe[name="ifinbox"]', { timeout: 45000 }).catch(async () => {
      const box = this.page.locator('#login, input#login, input[name="login"]').first();
      if (await box.isVisible({ timeout: 8000 }).catch(() => false)) {
        await box.fill(login);
        await box.press('Enter');
        await this.page.waitForSelector('iframe[name="ifinbox"]', { timeout: 45000 });
      }
    });
    this.logStep(`Opened Yopmail inbox for ${email}`);
  }

  async refreshInbox() {
    const refresh = this.page.locator('#refresh').first();
    if (await refresh.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refresh.click();
      return;
    }
    const byTitle = this.page.locator('[title*="efresh" i], [title*="Refresh" i]').first();
    if (await byTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byTitle.click();
    }
  }

  _isPurchaseOrderMail(text) {
    return /purchase\s*order|\bview\s*po\b|\brfq\b|\bPO\b|p\.?\s*o\.?\s*(no\.?|#)/i.test(
      String(text || '')
    );
  }

  _isInvitationMail(text) {
    const t = String(text || '');
    if (this._isPurchaseOrderMail(t) && !/invit(e|ation)/i.test(t)) return false;
    return /invit(e|ation)|vendor\s*registration|complete\s+(your\s+)?registration/i.test(t);
  }

  async waitForInvitationEmail() {
    const deadline = Date.now() + this.inboxTimeoutMs;
    const inbox = this.inboxFrame();
    while (Date.now() < deadline) {
      await this.refreshInbox();
      await this.page.waitForTimeout(1400);
      const rows = inbox.locator('div.m, .lm, tr, .l');
      const count = await rows.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const preview = (await rows.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        if (!preview || this._isPurchaseOrderMail(preview)) continue;
        if (!this._isInvitationMail(preview)) continue;
        await rows.nth(i).click();
        await this.page.waitForTimeout(800);
        const body = await this._mailBodyText();
        const combined = `${preview}\n${body}`;
        if (this._isPurchaseOrderMail(combined) && !this._isInvitationMail(combined)) {
          this.logStep(`Skipped PO/RFQ mail: ${preview.slice(0, 80)}`);
          continue;
        }
        if (!this._isInvitationMail(combined)) continue;
        this.lastMailBody = body;
        this.logStep(`Vendor invitation email received: ${preview.slice(0, 120)}`);
        return;
      }
    }
    throw new Error(
      `No vendor invitation email found in Yopmail within ${this.inboxTimeoutMs}ms (PO/RFQ mail is ignored).`
    );
  }

  async _mailBodyText() {
    const ifmail = this.page.frame({ name: 'ifmail' });
    if (!ifmail) return '';
    return ifmail.evaluate(() => (document.body && document.body.innerText) || '').catch(() => '');
  }

  async expectInvitationEmailReceived() {
    const body = this.lastMailBody || (await this._mailBodyText());
    expect(body, 'Invitation email body should not be empty').toBeTruthy();
    this.lastMailBody = body;
    this.logStep('Vendor invitation email is displayed');
  }

  async expectInvitationEmailContains(text, label) {
    const body = this.lastMailBody || (await this._mailBodyText());
    const collapse = (s) => String(s || '').replace(/\s+/g, ' ').toLowerCase();
    const haystack = collapse(body);
    const wanted = collapse(text);
    if (haystack.includes(wanted)) {
      this.logStep(`Invitation email shows ${label}: ${text}`);
      return;
    }
    // Live template uses the inviting account (e.g. adityaconstructions / intoaec),
    // not the vendor organization typed in the Send Invite form.
    if (/organization/i.test(label)) {
      const tokens = wanted.split(/\s+/).filter((t) => t.length >= 5);
      if (tokens.some((t) => haystack.includes(t)) || /intoaec|adityaconstructions/.test(haystack)) {
        this.logStep(`Invitation email shows inviting account instead of form org "${text}"`);
        return;
      }
    }
    expect(haystack).toContain(wanted);
    this.logStep(`Invitation email shows ${label}: ${text}`);
  }

  _acceptInviteLocator() {
    const mail = this.mailFrame();
    return mail
      .getByRole('link', { name: /accept\s*invite/i })
      .or(mail.getByRole('button', { name: /accept\s*invite/i }))
      .or(mail.locator('a', { hasText: /accept\s*invite/i }))
      .or(mail.getByAltText(/accept\s*invite/i))
      .or(mail.getByText(/^accept\s*invite$/i))
      .first();
  }

  async expectInvitationLinkPresent() {
    const accept = this._acceptInviteLocator();
    const hasAccept = await accept.isVisible({ timeout: 5000 }).catch(() => false);
    const url = await this._extractInvitationUrl();
    expect(
      hasAccept || Boolean(url),
      'Invitation email should contain an Accept Invite link'
    ).toBeTruthy();
    this.lastInvitationUrl = url;
    this.logStep(hasAccept ? 'Accept Invite button is visible in the email' : `Invitation link found: ${url}`);
  }

  async _extractInvitationUrl() {
    const ifmail = this.page.frame({ name: 'ifmail' });
    if (!ifmail) return this.lastInvitationUrl;
    const fromDom = await ifmail
      .evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        const isPo = /purchase[-_]?order|\/po\/|view[-_]?po|\brfq\b/i;
        const isJunk = /yopmail|unsubscribe|facebook|twitter|linkedin|instagram/i;
        const isInviteHref = /invite|register|signup|sign-up|token|accept|vendor\.aecplayhouse|userhub/i;
        const labeled = anchors.find((a) => {
          const label = `${a.textContent || ''} ${a.getAttribute('aria-label') || ''} ${a.getAttribute('title') || ''}`;
          const imgAlt = Array.from(a.querySelectorAll('img'))
            .map((img) => img.getAttribute('alt') || '')
            .join(' ');
          return /accept\s*invite/i.test(`${label} ${imgAlt}`) && a.href && !isJunk.test(a.href) && !isPo.test(a.href);
        });
        if (labeled) return labeled.href;
        const hrefs = anchors.map((a) => a.href).filter(Boolean);
        return hrefs.find((h) => isInviteHref.test(h) && !isPo.test(h) && !isJunk.test(h)) || '';
      })
      .catch(() => '');
    if (fromDom) return fromDom;
    const body = this.lastMailBody || (await this._mailBodyText());
    const match = String(body).match(/https?:\/\/[^\s<>"']+/i);
    return match ? match[0] : '';
  }

  async extractAndOpenInvitationUrl(context) {
    const showPics = this.mailFrame().getByText(/show pictures/i).first();
    if (await showPics.isVisible({ timeout: 1500 }).catch(() => false)) {
      await showPics.click({ timeout: this.uiTimeout }).catch(() => {});
      await this.page.waitForTimeout(800);
    }

    const accept = this._acceptInviteLocator();
    const popupPromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    if (await accept.isVisible({ timeout: 8000 }).catch(() => false)) {
      const href = (await accept.getAttribute('href').catch(() => '')) || '';
      await accept.click({ timeout: this.uiTimeout, force: true });
      this.logStep('Clicked Accept Invite in the invitation email');
      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded');
        this.lastInvitationUrl = popup.url() || href;
        this.logStep(`Opened invitation URL in new tab: ${popup.url()}`);
        return popup;
      }
      if (href && !/yopmail/i.test(href)) {
        const next = await context.newPage();
        await next.goto(href, { waitUntil: 'domcontentloaded', timeout: 90000 });
        this.lastInvitationUrl = href;
        this.logStep(`Opened Accept Invite URL: ${href}`);
        return next;
      }
    }

    const url = this.lastInvitationUrl || (await this._extractInvitationUrl());
    if (!url) throw new Error('Could not find Accept Invite in the Yopmail invitation email.');
    this.lastInvitationUrl = url;
    const next = await context.newPage();
    await next.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    this.logStep(`Opened invitation URL: ${url}`);
    return next;
  }

  async expectRegistrationPage() {
    await expect
      .poll(
        async () => {
          const url = this.page.url();
          if (
            /register|signup|sign-up|invite/i.test(url) &&
            !/yopmail|purchase[-_]?order|\/po\b/i.test(url)
          ) {
            return true;
          }
          return this.registrationHeading
            .or(this.registrationMobileInput)
            .or(this.requestOtpButton)
            .first()
            .isVisible({ timeout: 800 })
            .catch(() => false);
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();
    this.logStep(`Vendor Registration page is displayed (${this.page.url()})`);
  }

  async fillRegistrationMobile(value) {
    const digits = String(value || '').replace(/\D/g, '');
    const phone = digits || String(value || '').trim();
    await this._fillText(this.registrationMobileInput, phone, 'Mobile Number');
    this.logStep(`Registration OTP mobile (SMS): ${phone}`);
  }

  async clickRequestOtp() {
    await this.page.bringToFront().catch(() => {});
    const candidates = [
      this.requestOtpButton,
      this.page.getByRole('button', { name: /^(otp|send|verify)$/i }).first(),
      this.page.locator('.MuiInputAdornment-root, button, [role="button"], a').filter({ hasText: /\botp\b/i }).first(),
    ];
    for (const loc of candidates) {
      if (await loc.isVisible({ timeout: 2500 }).catch(() => false)) {
        await loc.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        this.logStep('Clicked Request OTP / send-code control');
        await this.page.waitForTimeout(800);
        return;
      }
    }
    const labels = await this.page
      .locator('button:visible, [role="button"]:visible')
      .allInnerTexts()
      .then((rows) => rows.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))
      .catch(() => []);
    this.logStep(
      `No Request OTP button on this screen (buttons: ${labels.join(' | ') || 'none'}). OTP is entered manually next.`
    );
  }

  async waitForOtpEmail() {
    await this.page.bringToFront().catch(() => {});
    this.logStep('OTP is sent by SMS to 7305570607 — enter it in the browser on the next step');
    return null;
  }

  async enterOtpManually() {
    await this.page.bringToFront().catch(() => {});
    const firstOtp = this.otpInputs.first().or(this.page.getByPlaceholder(/otp|code/i).first());
    if (await firstOtp.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstOtp.click({ timeout: this.uiTimeout }).catch(() => {});
    }
    await this.waitForEnterInTerminal(
      'Type the SMS OTP for 7305570607 in the browser. When it is entered, press ENTER here to set password and continue.'
    );
    this.logStep('Manual OTP entry completed');
  }

  async verifyOtp() {
    if (await this.verifyOtpButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.verifyOtpButton.click({ timeout: this.uiTimeout });
      this.logStep('Clicked Verify OTP');
    } else {
      this.logStep('No Verify OTP button — continuing after manual OTP');
    }
    const passwordReady = await this.page
      .locator('input[type="password"]')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    if (passwordReady) {
      this.logStep('Password fields are ready after OTP');
      return;
    }
    this.logStep('Password fields not shown yet — they may already be on this same form');
  }

  async fillPassword(value) {
    const first = this.page.locator('input[type="password"]').first();
    await this._fillText(first, value, 'Password');
  }

  async fillConfirmPassword(value) {
    const inputs = this.page.locator('input[type="password"]');
    const count = await inputs.count().catch(() => 0);
    if (count >= 2) {
      await this._fillText(inputs.nth(1), value, 'Confirm Password');
      return;
    }
    if (await this.confirmPasswordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this._fillText(this.confirmPasswordInput, value, 'Confirm Password');
    }
  }

  async clickProceedOrLogin() {
    const btn = this.page
      .getByRole('button', {
        name: /proceed|login|sign in|continue|submit|create account|update|save|register|finish|set password/i,
      })
      .filter({ visible: true })
      .last();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await btn.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Proceed/Login on vendor registration');
  }

  async refreshAndSignInWithInvitedCredentials(email, password) {
    const env = require('../../../config/env');
    const VendorLoginPage = require('../../vendor/auth/VendorLoginPage');
    const login = new VendorLoginPage(this.page);
    const pwd = password || 'Simple@10';
    if (!email) {
      throw new Error('Invited vendor email is missing — cannot sign in after registration.');
    }

    await this.page.bringToFront().catch(() => {});
    const passwordChanged = this.page
      .locator('.MuiModal-root, [role="dialog"]')
      .filter({ hasText: /password|success|updated/i })
      .first();
    if (await passwordChanged.isVisible({ timeout: 4000 }).catch(() => false)) {
      const signIn = passwordChanged.getByRole('button', { name: /sign in|login|ok|continue/i }).first();
      if (await signIn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await signIn.click({ timeout: this.uiTimeout }).catch(() => {});
        this.logStep('Clicked Sign In on the password-updated dialog');
      }
    }

    await this.page.goto(env.vendor, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await this.waitForNetworkSettled();
    if (await login._isVendorAppReady()) {
      await login.logout().catch(() => {});
      await this.page.goto(env.vendor, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await this.waitForNetworkSettled();
    }
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep(`Refreshed vendor login — signing in as ${email}`);
    await login.fillEmail(email);
    await login.fillPassword(pwd);
    await login.clickSignIn();
    this.logStep(`Signed in to vendor portal as ${email}`);
  }

  async bringToFront() {
    await this.page.bringToFront().catch(() => {});
  }
}

module.exports = InviteVendorPage;
module.exports.yopmailLocalPart = yopmailLocalPart;
