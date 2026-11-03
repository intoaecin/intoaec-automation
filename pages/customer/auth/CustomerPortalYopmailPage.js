const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

function yopmailLocalPart(email) {
  const m = String(email || '').trim().match(/^([^@]+)@yopmail\.com$/i);
  return m ? m[1] : '';
}

/**
 * Strip relative times so the same mail does not look "new" on every refresh.
 */
function normalizeInboxFingerprint(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(
      /\b\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?)\b/gi,
      ''
    )
    .replace(/\b\d+\s*[smhd]\b/gi, '')
    .replace(/\b(ago|just now|today|yesterday|now)\b/gi, '')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, 140);
}

/**
 * Yopmail inbox — wait for a NEW Customer Portal OTP email (ignore pre-request mail).
 */
class CustomerPortalYopmailPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.inboxTimeoutMs = parseInt(process.env.CUSTOMER_PORTAL_YOPMAIL_TIMEOUT_MS || '600000', 10);
    this.lastOtp = null;
    this.lastMailBody = null;
    this.inboxBaseline = null;
    this.inboxLogin = null;
    this._captchaCleared = false;
  }

  _isHeadlessRun() {
    return (
      process.env.HEADLESS === 'true' ||
      process.env.CI === 'true' ||
      process.env.HEADED === 'false'
    );
  }

  async _isCaptchaMessageVisible() {
    return this.page
      .getByText(/complete the captcha/i)
      .first()
      .isVisible({ timeout: 600 })
      .catch(() => false);
  }

  async _isCaptchaBlocking() {
    return this._isCaptchaMessageVisible();
  }

  async _safeWait(ms) {
    if (this.page.isClosed()) {
      throw new Error('Yopmail tab was closed — keep the Yopmail browser tab open during the test.');
    }
    await this.page.waitForTimeout(ms).catch((err) => {
      if (this.page.isClosed()) {
        throw new Error('Yopmail tab was closed — keep the Yopmail browser tab open during the test.');
      }
      throw err;
    });
  }

  async _waitForCaptchaClearedAfterManualStep() {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (this.page.isClosed()) {
        throw new Error('Yopmail tab was closed — keep the Yopmail browser tab open during the test.');
      }

      if (!(await this._isCaptchaMessageVisible())) {
        await this._invokeYopmailRefreshFunction().catch(() => {});
        await this._safeWait(1500);
        const rows = await this._readInboxRowCount();
        this._captchaCleared = true;
        this.logStep(`Yopmail inbox accessible after CAPTCHA (rows=${rows})`);
        return true;
      }

      await this._safeWait(1000);
    }
    return false;
  }

  /** Yopmail hides inbox rows until CAPTCHA is completed — pause once per session in headed runs. */
  async ensureInboxAccessible(context = 'Yopmail inbox') {
    if (this._captchaCleared && !(await this._isCaptchaMessageVisible())) return;

    if (!(await this._isCaptchaBlocking())) {
      this._captchaCleared = true;
      return;
    }

    await this.page.bringToFront().catch(() => {});
    this.logStep(`${context}: Yopmail CAPTCHA is blocking the inbox`);

    if (
      this._isHeadlessRun() &&
      process.env.CUSTOMER_PORTAL_YOPMAIL_ALLOW_CAPTCHA_SKIP !== 'true'
    ) {
      throw new Error(
        'Yopmail inbox is blocked by CAPTCHA. Re-run in headed mode (visible browser), solve CAPTCHA in the Yopmail tab, then continue.'
      );
    }

    if (process.env.CUSTOMER_PORTAL_YOPMAIL_CAPTCHA_PAUSE === 'false') {
      this.logStep('CUSTOMER_PORTAL_YOPMAIL_CAPTCHA_PAUSE=false — continuing without CAPTCHA pause');
      this._captchaCleared = true;
      return;
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await this.waitForEnterInTerminal(
        attempt === 1
          ? 'In the Yopmail tab: solve the CAPTCHA, wait until the inbox/email list appears, then press ENTER here.'
          : `Yopmail CAPTCHA still showing (attempt ${attempt}/${maxAttempts}). Solve it, confirm emails are visible, then press ENTER again.`
      );

      if (await this._waitForCaptchaClearedAfterManualStep()) return;
    }

    this.logStep('Could not auto-verify CAPTCHA clearance — continuing and trusting manual inbox access');
    this._captchaCleared = true;
  }

  logStep(msg) {
    console.log(`[CustomerYopmail] ${msg}`);
  }

  inboxFrame() {
    return this.page.frameLocator('iframe[name="ifinbox"]');
  }

  mailFrame() {
    return this.page.frameLocator('iframe[name="ifmail"]');
  }

  inboxRowLocator() {
    return this.inboxFrame().locator('div.m[id], div.m, button.lm, a.lm, div.lm');
  }

  async gotoInbox(email) {
    const login = yopmailLocalPart(email);
    if (!login) {
      throw new Error(`Customer Portal Yopmail requires *@yopmail.com address, got: ${email || '(empty)'}`);
    }
    this.inboxLogin = login;
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
    await this.page.waitForTimeout(1200);
    this.logStep(`Opened Yopmail for ${email} (CAPTCHA pause happens before reading OTP if needed)`);
  }

  async _readInboxRowCount() {
    return this.inboxRowLocator().count().catch(() => 0);
  }

  async _waitAfterRefresh(previousCount = null) {
    await this.page.waitForTimeout(1200).catch(() => {});
    if (previousCount === null) return;

    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const current = await this._readInboxRowCount();
      if (current !== previousCount) {
        this.logStep(`Yopmail inbox updated (${previousCount} -> ${current} row(s))`);
        return;
      }
      await this.page.waitForTimeout(400).catch(() => {});
    }
  }

  async _reloadInboxFrame() {
    const reloaded = await this.page
      .evaluate(() => {
        const iframe = document.querySelector('iframe[name="ifinbox"]');
        if (!iframe) return false;
        try {
          if (iframe.contentWindow && iframe.contentWindow.location) {
            iframe.contentWindow.location.reload();
            return true;
          }
        } catch {
          // Cross-origin — fall through to src bump.
        }
        const src = String(iframe.getAttribute('src') || iframe.src || '');
        if (!src) return false;
        const joiner = src.includes('?') ? '&' : '?';
        iframe.src = `${src}${joiner}_t=${Date.now()}`;
        return true;
      })
      .catch(() => false);
    return reloaded;
  }

  async _reloadInboxPage() {
    const login =
      this.inboxLogin ||
      yopmailLocalPart(
        (await this.page.locator('#login, input#login, input[name="login"]').first().inputValue().catch(() => '')) ||
          ''
      );
    if (login) {
      this.inboxLogin = login;
      await this.page.goto(`https://yopmail.com?${encodeURIComponent(login)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await this.page.waitForSelector('iframe[name="ifinbox"]', { timeout: 45000 }).catch(() => {});
      return true;
    }
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    return true;
  }

  async _invokeYopmailRefreshFunction() {
    await this._dismissBlockingOverlays();
    return this.page
      .evaluate(() => {
        // Yopmail's #refresh uses onclick="if(chkl())r();" — chkl() rate-limits and blocks r().
        // Call r() directly so refresh still runs when the consent popup would intercept clicks.
        if (typeof window.r === 'function') {
          window.r();
          return 'r()';
        }
        const btn = document.querySelector('#refresh');
        if (btn) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'refresh-click';
        }
        return null;
      })
      .catch(() => null);
  }

  async _dismissBlockingOverlays() {
    await this.page
      .evaluate(() => {
        const selectors = ['#r_parent', '.r_popup', '#r_cookies', '#consent'];
        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach((node) => {
            node.remove();
          });
        }
      })
      .catch(() => {});

    const closeButtons = this.page.locator(
      '#r_parent button, #r_parent .close, .r_popup button, .r_popup .close, [aria-label*="close" i]'
    );
    const closeCount = Math.min(await closeButtons.count().catch(() => 0), 5);
    for (let i = 0; i < closeCount; i += 1) {
      await closeButtons.nth(i).click({ force: true, timeout: 1500 }).catch(() => {});
    }

    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async _invokeRefreshButton(refresh) {
    const viaFn = await this._invokeYopmailRefreshFunction();
    if (viaFn) return viaFn;

    await refresh.click({ force: true, timeout: 5000 }).catch(() => {});
    return 'button-force';
  }

  _hasValidBaseline(baseline) {
    return Boolean(baseline && typeof baseline.count === 'number');
  }

  async refreshInbox() {
    if (this.page.isClosed()) {
      throw new Error('Yopmail page is closed — cannot refresh inbox');
    }

    await this.page.bringToFront().catch(() => {});
    if (!this._captchaCleared && (await this._isCaptchaMessageVisible())) {
      await this.ensureInboxAccessible('Before Yopmail refresh');
    }
    await this._dismissBlockingOverlays();

    const beforeCount = await this._readInboxRowCount();
    let method = await this._invokeYopmailRefreshFunction();
    if (method) {
      await this._waitAfterRefresh(beforeCount);
      this.logStep(`Refreshed Yopmail inbox via ${method} (rows before=${beforeCount})`);
      return true;
    }

    const refresh = this.page.locator('#refresh').first();
    if (await refresh.isVisible({ timeout: 3000 }).catch(() => false)) {
      method = await this._invokeRefreshButton(refresh);
      await this._waitAfterRefresh(beforeCount);
      this.logStep(`Refreshed Yopmail inbox via ${method} (rows before=${beforeCount})`);
      return true;
    }

    const byTitle = this.page.locator('[title*="efresh" i], [title*="Refresh" i]').first();
    if (await byTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byTitle.click({ force: true }).catch(() => {});
      await this._waitAfterRefresh(beforeCount);
      this.logStep(`Refreshed Yopmail inbox via title button (rows before=${beforeCount})`);
      return true;
    }

    if (await this._reloadInboxFrame()) {
      await this._waitAfterRefresh(beforeCount);
      this.logStep(`Refreshed Yopmail inbox via iframe reload (rows before=${beforeCount})`);
      return true;
    }

    await this._reloadInboxPage();
    await this._waitAfterRefresh(beforeCount);
    this.logStep(`Refreshed Yopmail inbox via page reload (rows before=${beforeCount})`);
    return true;
  }

  async _openTopMailAndExtractOtp(top) {
    this.logStep(`Opening NEW OTP mail id=${top.id || '(none)'} fp="${top.fp.slice(0, 70)}"`);
    await top.row.click({ force: true });
    await this.page.waitForTimeout(900);

    const body = await this._mailBodyText();
    const combined = `${top.text}\n${body}`;
    const otp = this._extractOtpFromText(combined);
    if (otp) {
      this.lastOtp = otp;
      this.lastMailBody = combined;
      this.logStep(`Retrieved NEW OTP from Yopmail (${otp})`);
      return otp;
    }
    return null;
  }

  _isOtpMail(text) {
    const t = String(text || '').toLowerCase();
    if (!t.trim()) return false;
    if (/purchase\s*order|\bview\s*po\b|\brfq\b|vendor\s*invit/i.test(t) && !/otp|verification/i.test(t)) {
      return false;
    }
    return /otp|one[-\s]?time|verification(\s*code)?|verify|login\s*code|customer\s*portal|sign[-\s]?in|authentication|lead\s*capture|intoaec|email\s*code|security\s*code/i.test(
      t
    );
  }

  _extractOtpFromText(text) {
    const t = String(text || '');
    const labeled =
      t.match(/(?:otp|code|verification(?:\s*code)?)\s*(?:is|:)?\s*(\d{4,8})/i) ||
      t.match(/(\d{4,8})\s*(?:is your|is the)\s*(?:otp|code)/i);
    if (labeled && labeled[1]) return labeled[1];

    const digits = t.match(/\b(\d{6})\b/g) || t.match(/\b(\d{4})\b/g);
    if (digits && digits.length) {
      return digits.find((d) => d.length >= 4 && d.length <= 8) || digits[0];
    }
    return null;
  }

  async _tryRetrieveNewOtpFromInbox(baseline) {
    const top = await this._readTopRow();
    if (!top) return null;

    const baselineCount = Number(baseline?.count || 0);
    const isNew = this._isNewInboxMail(top, baseline);
    const previewOtp = this._extractOtpFromText(top.text);
    const looksLikeOtp = this._isOtpMail(top.text) || Boolean(previewOtp);
    const emptyInboxNowHasMail = baselineCount === 0 && top.count > 0 && looksLikeOtp;

    if (!isNew && !emptyInboxNowHasMail) return null;

    // OTP digits are often only in the mail body — open new mail even when preview
    // does not match Customer Portal OTP keywords (e.g. Lead Capture verify emails).
    if (!looksLikeOtp) {
      this.logStep(
        `Top mail is new; preview not OTP-like — opening body to extract code (fp="${top.fp.slice(0, 60)}")`
      );
    }

    const otp = await this._openTopMailAndExtractOtp(top);
    if (otp) return otp;

    if (!looksLikeOtp) {
      this.logStep('Opened new mail but no OTP digits found in body — keep refreshing');
    }
    return null;
  }

  /**
   * Snapshot inbox before OTP is requested so old OTP mails are ignored.
   * @returns {Promise<{ count: number, ids: string[], fingerprints: string[] }>}
   */
  async snapshotInboxBaseline() {
    if (!this._captchaCleared && (await this._isCaptchaMessageVisible())) {
      await this.ensureInboxAccessible('Before Yopmail baseline snapshot');
    }

    await this.refreshInbox().catch(() => {});
    await this.page.waitForTimeout(800);

    const rows = this.inboxRowLocator();
    const count = await rows.count().catch(() => 0);
    const ids = [];
    const fingerprints = [];

    for (let i = 0; i < Math.min(count, 30); i += 1) {
      const row = rows.nth(i);
      const id = String((await row.getAttribute('id').catch(() => '')) || '').trim();
      const text = (await row.innerText().catch(() => '')) || '';
      const fp = normalizeInboxFingerprint(text);
      if (id) ids.push(id);
      if (fp) fingerprints.push(fp);
    }

    this.inboxBaseline = { count, ids, fingerprints };
    this.logStep(
      `Yopmail baseline before OTP: count=${count}, ids=${ids.length}, fps=${fingerprints.length}`
    );
    return this.inboxBaseline;
  }

  async _mailBodyText() {
    const ifmail = this.page.frame({ name: 'ifmail' });
    if (!ifmail) return '';
    return ifmail.evaluate(() => (document.body && document.body.innerText) || '').catch(() => '');
  }

  async _readTopRow() {
    const rows = this.inboxRowLocator();
    const count = await rows.count().catch(() => 0);
    if (count < 1) return null;

    const top = rows.first();
    if (!(await top.isVisible({ timeout: 1500 }).catch(() => false))) return null;

    const id = String((await top.getAttribute('id').catch(() => '')) || '').trim();
    const text = ((await top.innerText().catch(() => '')) || '').trim();
    return {
      row: top,
      id,
      text,
      fp: normalizeInboxFingerprint(text),
      count,
    };
  }

  _isNewInboxMail(top, baseline) {
    if (!top) return false;

    const baselineIds = new Set((baseline?.ids || []).map((id) => String(id || '').trim()).filter(Boolean));
    const baselineTopId = String((baseline?.ids || [])[0] || '').trim();
    const baselineTopFp = normalizeInboxFingerprint((baseline?.fingerprints || [])[0] || '');
    const baselineCount = Number(baseline?.count || 0);

    const topIsNewId = Boolean(top.id) && (baselineIds.size === 0 || !baselineIds.has(top.id));
    const topChanged =
      (baselineTopId && top.id && top.id !== baselineTopId) ||
      (baselineTopFp && top.fp && top.fp !== baselineTopFp) ||
      topIsNewId ||
      top.count > baselineCount;

    return topChanged;
  }

  /**
   * Refresh Yopmail once after Get OTP, then read the new mail. Falls back to polling if needed.
   */
  async refreshOnceAndRetrieveOtp(opts = {}) {
    await this._reopenInboxIfClosed(opts);
    if (!this._captchaCleared) {
      await this.ensureInboxAccessible('Before reading Customer Portal OTP from Yopmail');
    }

    const baseline = opts.baseline || this.inboxBaseline;
    if (!this._hasValidBaseline(baseline)) {
      this.logStep('No Yopmail baseline — snapshotting now (prefer baseline before Get OTP)');
      await this.snapshotInboxBaseline();
    }

    const activeBaseline = opts.baseline || this.inboxBaseline || { count: 0, ids: [], fingerprints: [] };
    const deliveryMs = parseInt(process.env.CUSTOMER_PORTAL_OTP_DELIVERY_MS || '5000', 10);

    this.logStep(`Waiting ${deliveryMs}ms for Customer Portal OTP email delivery`);
    await this.page.waitForTimeout(deliveryMs).catch(() => {});

    this.logStep('Refreshing Yopmail inbox once for Customer Portal OTP');
    await this.page.bringToFront().catch(() => {});
    await this.refreshInbox();
    await this.page.waitForTimeout(2000);

    const otpOnce = await this._tryRetrieveNewOtpFromInbox(activeBaseline);
    if (otpOnce) return otpOnce;

    this.logStep('OTP not found after one refresh — continuing Yopmail refresh until new OTP arrives');
    return this.waitForOtpEmailAndRetrieve({
      baseline: activeBaseline,
      skipInitialRefresh: true,
      onPageReopened: opts.onPageReopened,
      onStillWaiting: opts.onStillWaiting,
    });
  }

  bindInbox(email) {
    const login = yopmailLocalPart(email);
    if (login) this.inboxLogin = login;
    if (email) this.inboxEmail = String(email).trim();
  }

  _inboxLoginFrom(opts = {}) {
    return (
      this.inboxLogin ||
      yopmailLocalPart(opts.email || '') ||
      yopmailLocalPart(this.inboxEmail || '')
    );
  }

  async _reopenInboxIfClosed(opts = {}) {
    if (this.page && !this.page.isClosed()) return false;

    const login = this._inboxLoginFrom(opts);
    if (!login) {
      throw new Error(
        'Yopmail tab closed while waiting for OTP and the inbox address is missing. Open Yopmail for the captured client email first.'
      );
    }

    let context = opts.context || null;
    try {
      context = context || this.page?.context?.();
    } catch {
      /* closed page may still expose context */
    }
    if (!context) {
      throw new Error('Yopmail tab closed and the browser context is gone — cannot reopen the inbox.');
    }

    this.inboxLogin = login;
    this.logStep(
      `Yopmail tab closed — reopening inbox for ${login}@yopmail.com and continuing until new OTP arrives`
    );
    this.page = await context.newPage();
    this._captchaCleared = false;
    await this.gotoInbox(`${login}@yopmail.com`);
    if (typeof opts.onPageReopened === 'function') {
      await opts.onPageReopened(this.page);
    }
    return true;
  }

  async waitForOtpEmailAndRetrieve(opts = {}) {
    await this._reopenInboxIfClosed(opts);
    const baseline = opts.baseline || this.inboxBaseline;
    if (!this._hasValidBaseline(baseline)) {
      this.logStep('No Yopmail baseline — snapshotting now (prefer baseline before Get OTP)');
      await this.snapshotInboxBaseline();
    }

    const activeBaseline = opts.baseline || this.inboxBaseline || { count: 0, ids: [], fingerprints: [] };
    const deadline = Date.now() + this.inboxTimeoutMs;
    let lastResendAt = 0;

    this.logStep(
      `Waiting for NEW OTP mail until it arrives (timeout ${this.inboxTimeoutMs}ms, baseline top id=${(activeBaseline.ids || [])[0] || '(none)'}, count=${activeBaseline.count || 0})`
    );

    if (!opts.skipInitialRefresh) {
      await this.refreshInbox().catch(() => {});
      await this.page.waitForTimeout(1400).catch(() => {});
      const otp = await this._tryRetrieveNewOtpFromInbox(activeBaseline);
      if (otp) return otp;
    }

    while (Date.now() < deadline) {
      await this._reopenInboxIfClosed(opts);

      await this.page.bringToFront().catch(() => {});
      await this.refreshInbox().catch(async (err) => {
        if (this.page.isClosed() || String(err?.message || err).includes('closed')) {
          await this._reopenInboxIfClosed(opts);
          return;
        }
        this.logStep(`Yopmail refresh attempt failed: ${err?.message || err}`);
      });
      await this.page.waitForTimeout(1400).catch(async (err) => {
        if (this.page?.isClosed?.() || /closed/i.test(String(err?.message || err))) {
          await this._reopenInboxIfClosed(opts);
        }
      });

      const otp = await this._tryRetrieveNewOtpFromInbox(activeBaseline);
      if (otp) return otp;

      const top = await this._readTopRow();
      if (top && !this._isNewInboxMail(top, activeBaseline)) {
        this.logStep(
          `Still waiting for new OTP — top id=${top.id || '(none)'} fp="${top.fp.slice(0, 50)}" (old mail)`
        );
      } else if (top) {
        this.logStep('Top mail is new but does not look like OTP — keep refreshing');
      } else {
        this.logStep('Still waiting for new OTP — inbox has no readable top mail yet');
      }

      if (typeof opts.onStillWaiting === 'function' && Date.now() - lastResendAt >= 60000) {
        lastResendAt = Date.now();
        this.logStep('No new OTP yet — requesting Get OTP / Resend on Customer Portal');
        await opts.onStillWaiting().catch((err) => {
          this.logStep(`Resend OTP skipped: ${err?.message || err}`);
        });
        await this.page.bringToFront().catch(() => {});
      }
    }

    throw new Error(
      `No NEW Customer Portal OTP email appeared in Yopmail within ${this.inboxTimeoutMs}ms (old OTP mails are ignored).`
    );
  }

  async expectOtpRetrieved() {
    expect(this.lastOtp, 'OTP should be retrieved from Yopmail').toBeTruthy();
    this.logStep(`OTP ready: ${this.lastOtp}`);
  }
}

module.exports = { CustomerPortalYopmailPage, yopmailLocalPart, normalizeInboxFingerprint };
