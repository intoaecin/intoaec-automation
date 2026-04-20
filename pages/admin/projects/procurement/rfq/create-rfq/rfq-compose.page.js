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
   * Reads the first *@yopmail.com address from the visible RFQ compose dialog (text, chips, or inputs).
   * Polls while APIs populate the To field (same budget as RFQ_COMPOSE_MODAL_TIMEOUT_MS).
   */
  async readYopmailAddressFromComposeDialog() {
    const yopRe = /[\w.+-]+@yopmail\.com/i;
    const deadline = Date.now() + this.composeModalTimeout;

    const tryExtract = async (emailDialog) => {
      const blob = (await emailDialog.textContent()) || '';
      let m = blob.match(yopRe);
      if (m) return m[0].toLowerCase();

      const inputs = emailDialog.locator('input');
      const n = await inputs.count();
      for (let i = 0; i < n; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const v = await inputs.nth(i).inputValue().catch(() => '');
        m = v.match(yopRe);
        if (m) return m[0].toLowerCase();
      }

      const combobox = emailDialog.getByRole('combobox').first();
      if (await combobox.isVisible({ timeout: 400 }).catch(() => false)) {
        const v = await combobox.inputValue().catch(() => '');
        m = v.match(yopRe);
        if (m) return m[0].toLowerCase();
      }

      return null;
    };

    while (Date.now() < deadline) {
      const anyVisible = this.page.getByRole('dialog').filter({ visible: true });
      const count = await anyVisible.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const dlg = anyVisible.nth(i);
        // eslint-disable-next-line no-await-in-loop
        const found = await tryExtract(dlg);
        if (found) return found;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(450);
    }

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
    await this.waitForComposeEmailModalReady();
  }

  async sendEmailFromRfqComposeModal() {
    const emailDialog = this.locatorComposeEmailDialogForClose();
    const send = this.locatorVisibleComposeSendEmailButton();
    await send.click({ timeout: this.composeModalTimeout });

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
