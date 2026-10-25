const { expect } = require('@playwright/test');
const RFQPage = require('../RFQPage');

/**
 * RFQ create form: Action → Compose email → Send (shared compose dialog pattern with PO).
 */
class RFQComposePage extends RFQPage {
  constructor(page) {
    super(page);
    this.composeModalTimeout =
      Number(process.env.RFQ_COMPOSE_MODAL_TIMEOUT_MS) || 180000;
  }

  /**
   * Collect *@yopmail.com / *@mailinator.com addresses from the visible RFQ compose dialog.
   * Prefers `preferEmail` when present; never returns the Admin login email.
   */
  async readVendorInboxFromComposeDialog(opts = {}) {
    const preferEmail = String(opts.preferEmail || '').trim().toLowerCase();
    const excludeEmails = new Set(
      (opts.excludeEmails || [])
        .map((e) => String(e || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const inboxRe = /[\w.+-]+@(?:yopmail|mailinator)\.com/gi;
    const deadline = Date.now() + Math.min(this.composeModalTimeout, 45000);

    const collectFromDialog = async (emailDialog) => {
      const found = new Set();
      const blob = ((await emailDialog.textContent().catch(() => '')) || '').toLowerCase();
      for (const m of blob.match(inboxRe) || []) found.add(m.toLowerCase());

      const inputs = emailDialog.locator('input');
      const n = await inputs.count().catch(() => 0);
      for (let i = 0; i < n; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const v = ((await inputs.nth(i).inputValue().catch(() => '')) || '').toLowerCase();
        for (const m of v.match(inboxRe) || []) found.add(m.toLowerCase());
      }

      const chips = emailDialog.locator('[class*="Chip"], [class*="chip"], [role="button"]');
      const chipCount = await chips.count().catch(() => 0);
      for (let i = 0; i < Math.min(chipCount, 20); i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const t = ((await chips.nth(i).innerText().catch(() => '')) || '').toLowerCase();
        for (const m of t.match(inboxRe) || []) found.add(m.toLowerCase());
      }
      return [...found];
    };

    while (Date.now() < deadline) {
      const anyVisible = this.page.getByRole('dialog').filter({ visible: true });
      const count = await anyVisible.count().catch(() => 0);
      const all = [];
      for (let i = 0; i < count; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        all.push(...(await collectFromDialog(anyVisible.nth(i))));
      }
      const unique = [...new Set(all)].filter((e) => e && !excludeEmails.has(e));
      if (preferEmail && unique.includes(preferEmail)) return preferEmail;
      if (preferEmail && !excludeEmails.has(preferEmail)) {
        // Prefer email already known from Add Vendor even if compose UI also shows admin CC.
        if (unique.length === 0 || unique.some((e) => e.includes(preferEmail.split('@')[0]))) {
          return preferEmail;
        }
      }
      const vendorOnly = unique.filter((e) => e !== preferEmail);
      if (unique.length) return unique.find((e) => e !== preferEmail) || unique[0];
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(450);
    }

    if (preferEmail && !excludeEmails.has(preferEmail)) return preferEmail;
    return null;
  }

  /**
   * Reads the first *@yopmail.com address from the visible RFQ compose dialog (text, chips, or inputs).
   * Polls while APIs populate the To field (same budget as RFQ_COMPOSE_MODAL_TIMEOUT_MS).
   */
  async readYopmailAddressFromComposeDialog() {
    const found = await this.readVendorInboxFromComposeDialog();
    if (found) return found;
    throw new Error(
      'Could not find a *@yopmail.com address in the RFQ compose email To field after waiting. Ensure the first vendor uses Yopmail.'
    );
  }

  visibleComposeEmailDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: /send email/i }) })
      .filter({ visible: true });
  }

  async waitForComposeEmailDialogShellOpen() {
    await expect
      .poll(async () => this.visibleComposeEmailDialog().count(), {
        message:
          'RFQ compose email dialog did not open (no visible dialog with Send email)',
        timeout: this.composeModalTimeout,
        intervals: [80, 150, 300, 500, 800, 1200],
      })
      .toBeGreaterThan(0);

    await expect(this.visibleComposeEmailDialog().first()).toBeVisible({
      timeout: 15000,
    });
  }

  async waitForComposeEmailModalReady() {
    await this.waitForComposeEmailDialogShellOpen();
    const send = this.visibleComposeEmailDialog()
      .first()
      .getByRole('button', { name: /send email/i });
    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });
  }

  locatorComposeEmailDialogForClose() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: /send email/i }) })
      .last();
  }

  locatorVisibleComposeSendEmailButton() {
    return this.page
      .getByRole('button', { name: /send email/i })
      .filter({ visible: true })
      .last();
  }

  locatorEmailSentSuccessToast() {
    const re =
      /email sent successfully|correo enviado|mail sent|reminder sent|sent successfully/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  locatorRfqCreatedAndSentToast() {
    const re =
      /rfq created[\s&.,-]*sent|rfq.*sent.*success|request for quotation.*sent|created.*sent.*success/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  /**
   * Action → Compose email, then wait until Send is visible in the modal.
   * Hardened for post-attachment flows: scroll to top, force-click Action, extra retries, loose Compose targets.
   */
  async openActionMenuAndComposeEmail() {
    await this.ensureActivePage();
    if (this.page.isClosed()) {
      throw new Error('RFQ compose: page is closed before Action → Compose email.');
    }

    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await this.scrollRfqPageAndMainToTop();
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();

    const resolveAction = async () => {
      const btn = await this.resolveVisibleRfqFormActionButton();
      return btn;
    };

    // Action button can be temporarily hidden/covered after attachments;
    // cap the wait so this step doesn't balloon to 2 minutes.
    let actionBtn = await resolveAction();
    await expect(actionBtn).toBeVisible({ timeout: 30000 });
    await actionBtn.scrollIntoViewIfNeeded();

    const composeLabelRe = /compose\s*(e-?mail|email)/i;

    const tryClickCompose = async () => {
      const visibleMenu = this.page.locator('[role="menu"]').filter({ visible: true }).first();
      await visibleMenu.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});

      const byRoleName = this.page.getByRole('menuitem', { name: composeLabelRe }).first();
      if (await byRoleName.isVisible({ timeout: 3500 }).catch(() => false)) {
        await byRoleName.click({ timeout: 15000, force: true });
        return true;
      }

      const inMenu = visibleMenu
        .getByRole('menuitem')
        .filter({ hasText: composeLabelRe })
        .first();
      if (await inMenu.isVisible({ timeout: 3500 }).catch(() => false)) {
        await inMenu.click({ timeout: 15000, force: true });
        return true;
      }

      const loose = this.page
        .getByRole('menuitem')
        .filter({ visible: true })
        .filter({ hasText: composeLabelRe })
        .first();
      if (await loose.isVisible({ timeout: 3500 }).catch(() => false)) {
        await loose.click({ timeout: 15000, force: true });
        return true;
      }

      const menuComposeBtn = visibleMenu
        .getByRole('button', { name: composeLabelRe })
        .first();
      if (await menuComposeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuComposeBtn.click({ timeout: 15000, force: true });
        return true;
      }

      const byText = this.page.getByText(/^compose\s*(e-?mail|email)$/i).first();
      if (await byText.isVisible({ timeout: 2000 }).catch(() => false)) {
        await byText.click({ timeout: 15000, force: true });
        return true;
      }

      const looseText = this.page.getByText(composeLabelRe).filter({ visible: true }).first();
      if (await looseText.isVisible({ timeout: 2000 }).catch(() => false)) {
        await looseText.click({ timeout: 15000, force: true });
        return true;
      }

      return false;
    };

    let opened = false;
    for (let attempt = 0; attempt < 4 && !opened; attempt += 1) {
      await this.ensureActivePage();
      if (this.page.isClosed()) {
        throw new Error('RFQ compose: page closed while opening Action menu.');
      }
      if (attempt > 0) {
        await this.dismissOpenMenusAndPopovers();
        await this.dismissVisibleToastNotifications();
        await this.scrollRfqPageAndMainToTop();
        actionBtn = await resolveAction();
        await actionBtn.scrollIntoViewIfNeeded().catch(() => {});
      }
      await actionBtn.click(
        attempt === 0 ? { timeout: 15000 } : { timeout: 15000, force: true }
      );
      await this.page.waitForTimeout(attempt === 0 ? 280 : 400);
      opened = await tryClickCompose();
    }

    if (!opened) {
      throw new Error(
        'RFQ: could not open Compose email from Action menu (label may differ from "Compose email").'
      );
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.hideFreshchatWidget();
    await this.waitForComposeEmailModalReady();
  }

  async sendEmailFromRfqComposeModal(opts = {}) {
    await this.hideFreshchatWidget();

    const testData = require('../../../../../../utils/testData');
    const preferEmail = String(
      opts.preferEmail || this.lastAddedVendorEmail || testData.vendor?.rfqUser?.email || ''
    )
      .trim()
      .toLowerCase();
    const adminEmail = String(testData.admin?.validUser?.email || 'kumar@diy.in')
      .trim()
      .toLowerCase();

    // Keep the Add-Vendor email for portal login. Compose dialog often also shows admin CC
    // (kumar@diy.in) — never replace the selected vendor with that.
    const toEmail = await this.readVendorInboxFromComposeDialog({
      preferEmail,
      excludeEmails: [adminEmail],
    }).catch(() => null);

    if (preferEmail) {
      this.lastAddedVendorEmail = preferEmail;
      console.log(
        `[RFQ] Vendor portal login email locked to added vendor: ${preferEmail}` +
          (toEmail && toEmail !== preferEmail ? ` (compose also showed ${toEmail})` : '')
      );
    } else if (toEmail && toEmail !== adminEmail) {
      this.lastAddedVendorEmail = toEmail;
      console.log(`[RFQ] Compose To vendor for portal login: ${toEmail}`);
    } else {
      console.warn(
        `[RFQ] Could not resolve vendor inbox from compose (got ${toEmail || 'none'}); keep lastAddedVendorEmail=${this.lastAddedVendorEmail || 'unset'}`
      );
    }

    const emailDialog = this.locatorComposeEmailDialogForClose();
    const send = this.locatorVisibleComposeSendEmailButton();
    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});
    await this.hideFreshchatWidget();

    try {
      await send.click({ timeout: 20000 });
    } catch (err) {
      console.warn(
        `[RFQ] Send email click blocked (${String(err?.message || err).slice(0, 120)}); retrying with force after hiding chat widget`
      );
      await this.hideFreshchatWidget();
      await send.click({ timeout: this.composeModalTimeout, force: true });
    }

    const emailSentToast = this.locatorEmailSentSuccessToast();
    const rfqSentToast = this.locatorRfqCreatedAndSentToast();
    const rfqCreatedToast = this.locatorRfqCreatedToast();

    await Promise.race([
      emailDialog.waitFor({ state: 'hidden', timeout: 90000 }),
      emailSentToast.waitFor({ state: 'visible', timeout: 90000 }),
      rfqSentToast.waitFor({ state: 'visible', timeout: 90000 }),
      rfqCreatedToast.waitFor({ state: 'visible', timeout: 90000 }),
    ]);

    await this.dismissOpenMenusAndPopovers();
    await this.hideFreshchatWidget();

    const stillOpen = await this.visibleComposeEmailDialog()
      .first()
      .isVisible()
      .catch(() => false);
    if (stillOpen) {
      await emailDialog
        .waitFor({ state: 'hidden', timeout: 20000 })
        .catch(async () => {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        });
    }
    console.log(
      `[RFQ] Compose email sent — Vendor Portal login must use added vendor: ${this.lastAddedVendorEmail || '(unknown)'}`
    );
  }

  locatorRfqComposeFlowSuccessToast() {
    const re =
      /email sent|mail sent|sent successfully|rfq created|request for quotation|rfq saved|created successfully/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  async expectRfqComposeEmailSuccessToast() {
    await expect(this.locatorRfqComposeFlowSuccessToast()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = RFQComposePage;
