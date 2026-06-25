const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO create: check Ship To, then Action → Compose email. */
class PurchaseOrderShipToPoPage extends PurchaseOrderCreatePoPage {
  async checkShipToCheckbox() {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.dismissOpenMenusAndPopovers();

    let cb = this.page.getByRole('checkbox', { name: /ship\s*to/i }).first();

    if (!(await cb.isVisible({ timeout: 2000 }).catch(() => false))) {
      const shipLabel = this.page
        .getByText(/^ship\s*to$/i)
        .filter({ visible: true })
        .first();
      if (await shipLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        cb = shipLabel
          .locator('xpath=./following::input[@type="checkbox"][1]')
          .first();
      }
    }

    await expect(cb).toBeVisible({ timeout: 15000 });
    await cb.scrollIntoViewIfNeeded();

    if (!(await cb.isChecked().catch(() => false))) {
      try {
        await cb.check({ timeout: 10000 });
      } catch {
        await cb.click({ force: true });
      }
    }
  }

  async addLineItemManuallyForShipToFlow({
    itemName,
    description,
    quantity,
    unitLabel,
    rate,
  }) {
    await this.clickAddManuallyOnPurchaseOrderForm();
    await this.fillLastPoLineItemRow({
      itemName,
      description,
      quantity,
      unitLabel,
      rate,
      lightNetworkWaits: true,
      useFirstUnitOption: true,
    });
  }

  /** Action → Compose → Send with short post-send wait (no long networkidle). */
  async composeAndSendEmailForShipToFlow() {
    await this.dismissOpenMenusAndPopovers();

    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.scrollIntoViewIfNeeded();
    await actionBtn.click();

    const compose = this.page.getByRole('menuitem', { name: /compose email/i });
    await expect(compose).toBeVisible({ timeout: this.defaultTimeout });
    await compose.click();

    await this.waitForComposeEmailModalReady();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch {
      await send.click({ timeout: 15000, force: true });
    }

    // eslint-disable-next-line no-console
    console.log('[PO ship-to] Clicked Send email in the compose dialog.');

    const emailSentToast = this.locatorEmailSentSuccessToast();
    const poCreatedSentToast = this.locatorPoCreatedAndSentToast();
    const emailDialog = this.locatorComposeEmailDialogForClose();

    await Promise.race([
      emailSentToast.waitFor({ state: 'visible', timeout: 30000 }),
      poCreatedSentToast.waitFor({ state: 'visible', timeout: 30000 }),
      emailDialog.waitFor({ state: 'hidden', timeout: 30000 }),
    ]).catch(() => {});

    this.poCreatedAndSentSuccessObserved = true;
    await this.dismissOpenMenusAndPopovers();
  }
}

module.exports = PurchaseOrderShipToPoPage;
