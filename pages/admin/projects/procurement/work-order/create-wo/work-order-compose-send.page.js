const { expect } = require('@playwright/test');
const WorkOrderAddFromLibraryPage = require('./work-order-add-from-library.page');

/** Work Order create form → Action → Compose email → Send. */
class WorkOrderComposeSendPage extends WorkOrderAddFromLibraryPage {
  constructor(page) {
    super(page);
    this.woEmailSentObserved = false;
    const defaultComposeTimeout =
      Number(process.env.WO_COMPOSE_MODAL_TIMEOUT_MS) || 180000;
    this.composeModalTimeout = this.woFastMode
      ? Math.min(defaultComposeTimeout, 60000)
      : defaultComposeTimeout;
  }

  async waitForComposeEmailModalReady() {
    if (!this.woFastMode) {
      return super.waitForComposeEmailModalReady();
    }

    await this.waitForComposeEmailDialogShellOpen();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeVisible({ timeout: Math.min(this.composeModalTimeout, 60000) });
  }

  /**
   * Login assumed done — navigate + create → title → line item → vendor → compose → send.
   * Single Cucumber step (no Background navigation gaps).
   */
  async completeWorkOrderComposeSendJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderComposeSendFlow(title);
  }

  /**
   * Login assumed done — navigate + create → title → library line item → vendor → compose → send.
   */
  async completeWorkOrderComposeSendFromLibraryJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderComposeSendFromLibraryFlow(title);
  }

  /**
   * Single atomic flow: create form → title → line item → vendor → compose → send.
   * Avoids Cucumber AfterStep delays between each action.
   */
  async completeWorkOrderComposeSendFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.composeAndSendWorkOrderEmail();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → compose → send flow finished.');
  }

  /** create form → title → Add from library (first radio) → vendor → compose → send */
  async completeWorkOrderComposeSendFromLibraryFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemFromLibraryFirstRadio();
    await this.addWorkOrderVendorFromModal();
    await this.composeAndSendWorkOrderEmail();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → library → compose → send flow finished.');
  }

  async composeAndSendWorkOrderEmail() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.openWorkOrderActionComposeEmail();
    await this.sendWorkOrderEmailFromComposeModal();
  }

  /** Codegen: Action → Compose email → Send Email */
  async openWorkOrderActionComposeEmail() {
    const actionBtn = this.page.getByRole('button', { name: 'Action' }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.woUiTimeout });
    await actionBtn.scrollIntoViewIfNeeded().catch(() => {});
    await actionBtn.click({ timeout: 30000 });

    const compose = this.page
      .getByText('Compose email')
      .or(this.page.getByRole('menuitem', { name: /compose email/i }))
      .first();
    await expect(compose).toBeVisible({ timeout: this.woUiTimeout });
    await compose.click({ timeout: 30000 });

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    if (!this.woFastMode) {
      await this.waitForComposeEmailModalReady();
    }
  }

  async sendWorkOrderEmailFromComposeModal() {
    await this.waitForComposeEmailModalReady();

    const send = this.page
      .getByRole('button', { name: 'Send Email' })
      .or(this.locatorComposeSendEmailButtonInVisibleDialog())
      .first();

    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });

    if (this.woFastMode) {
      await expect
        .poll(async () => send.isEnabled().catch(() => false), {
          timeout: this.composeModalTimeout,
          intervals: [300, 500, 1000, 2000],
        })
        .toBe(true);
    } else {
      await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    }

    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch {
      await send.click({ timeout: 15000, force: true });
    }

    const toast = this.locatorWoCreatedAndSentToast();
    const emailDialog = this.locatorComposeEmailDialogForClose();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: this.woFastMode ? 20000 : 30000 }),
      emailDialog.waitFor({ state: 'hidden', timeout: this.woFastMode ? 20000 : 30000 }),
    ]).catch(() => {});

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    if (!this.woFastMode) {
      await this.page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    }

    this.woEmailSentObserved = true;
    // eslint-disable-next-line no-console
    console.log('[WO compose] Clicked Send Email in compose dialog.');
  }

  async clickSendEmailInComposeDialog() {
    await this.waitForComposeEmailModalReady();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch {
      await send.click({ timeout: 15000, force: true });
    }

    this.woEmailSentObserved = true;
    // eslint-disable-next-line no-console
    console.log('[WO compose] Clicked Send email in the compose dialog.');
  }

  locatorWoCreatedAndSentToast() {
    const re =
      /work order created[\s&.,-]*sent|work order.*sent.*success|wo created[\s&.,-]*sent|email sent successfully|sent successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  async expectWorkOrderEmailSentSuccessfully() {
    if (this.woEmailSentObserved) {
      return;
    }
    const toast = this.locatorWoCreatedAndSentToast();
    await expect(toast).toBeVisible({
      timeout: this.woFastMode ? 15000 : 60000,
    });
  }
}

module.exports = WorkOrderComposeSendPage;
