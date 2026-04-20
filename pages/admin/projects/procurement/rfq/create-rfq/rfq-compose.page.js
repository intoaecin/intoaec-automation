const { expect } = require('@playwright/test');
const RFQPage = require('./RFQPage');

/**
 * RFQ create form: Action → Compose email → Send (shared compose dialog pattern with PO).
 */
class RFQComposePage extends RFQPage {
  constructor(page) {
    super(page);
    this.composeModalTimeout =
      Number(process.env.RFQ_COMPOSE_MODAL_TIMEOUT_MS) || 180000;
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
        intervals: [150, 300, 500, 800, 1200, 1800],
      })
      .toBeGreaterThan(0);

    await expect(this.visibleComposeEmailDialog().first()).toBeVisible({
      timeout: 20000,
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
   */
  async openActionMenuAndComposeEmail() {
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });

    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.scrollIntoViewIfNeeded();

    const tryClickCompose = async () => {
      const visibleMenu = this.page.locator('[role="menu"]').filter({ visible: true }).first();
      await visibleMenu.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});

      const inMenu = visibleMenu
        .getByRole('menuitem')
        .filter({ hasText: /compose\s*email/i })
        .first();
      if (await inMenu.isVisible({ timeout: 4000 }).catch(() => false)) {
        await inMenu.click({ timeout: 15000 });
        return true;
      }

      const loose = this.page
        .getByRole('menuitem')
        .filter({ visible: true })
        .filter({ hasText: /compose\s*email/i })
        .first();
      if (await loose.isVisible({ timeout: 4000 }).catch(() => false)) {
        await loose.click({ timeout: 15000 });
        return true;
      }

      return false;
    };

    let opened = false;
    for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenusAndPopovers();
        await this.dismissVisibleToastNotifications();
      }
      await actionBtn.click({ timeout: 15000 });
      await this.page.waitForTimeout(250);
      opened = await tryClickCompose();
    }

    if (!opened) {
      throw new Error(
        'RFQ: Action menu did not expose Compose email (check menu label).'
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
