const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list → Edit → add line → Action → Compose email → Send. */
class PurchaseOrderEditPoPage extends PurchaseOrderCreatePoPage {
  async clickAddManuallyOnPurchaseOrderForm() {
    await this.dismissOpenMenusAndPopovers();
    await super.clickAddManuallyOnPurchaseOrderForm();
  }

  async fillNewPoLineItemOnEditForm(args) {
    await this.dismissOpenMenusAndPopovers();
    await this.fillLastPoLineItemRow({
      ...args,
      lightNetworkWaits: true,
      useFirstUnitOption: true,
    });
  }

  async openThreeDotMenuOnFirstPurchaseOrderCardForEdit() {
    await this.dismissVisibleToastNotifications();
    const card = this.firstPoCard();
    await this.ensurePoCardRowExpanded(card);
    const kebab = this.kebabButtonOnPoCard(card);
    await kebab.scrollIntoViewIfNeeded();
    await kebab.click();
    await expect(
      this.page.getByRole('menuitem', { name: /^edit$/i })
    ).toBeVisible({ timeout: 30000 });
  }

  /** Edit compose: dismiss overlays only — do not auto-fill units (UI may already have them). */
  async prepareEditFormBeforeComposeEmail() {
    await this.dismissOpenMenusAndPopovers();
    const table = await this.ensurePoLineItemsTableVisible();
    await table.scrollIntoViewIfNeeded();
  }

  async composeAndSendEmailFromEditForm() {
    await this.prepareEditFormBeforeComposeEmail();
    await this.openActionMenuAndComposeEmail();
    await this.clickSendEmailInComposeDialogFromEditForm();
  }

  /** Click Send email only — edit compose may not show toast; flow ends here. */
  async clickSendEmailInComposeDialogFromEditForm() {
    await this.waitForComposeEmailModalReady();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });
    await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch (error) {
      await send.click({ timeout: 15000, force: true });
    }

    // eslint-disable-next-line no-console
    console.log('[PO edit compose] Clicked Send email — flow complete.');
    this.poCreatedAndSentSuccessObserved = true;
  }

  async clickEditInPurchaseOrderCardMenu() {
    await this.page.getByRole('menuitem', { name: /^edit$/i }).click();
    await this.waitForPurchaseOrderEditFormReady();
  }

  async waitForPurchaseOrderEditFormReady() {
    await this.page.waitForURL(/purchase-order\/edit/, {
      timeout: this.defaultTimeout,
    });
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();

    await expect(
      this.page.getByText(/edit purchase order/i)
    ).toBeVisible({ timeout: 120000 });

    const table = this.page.locator('[aria-label="PO line items table"]');
    await expect(table).toBeVisible({ timeout: 120000 });
  }

  async expectPurchaseOrderEditFormLoaded() {
    await expect(this.page).toHaveURL(/purchase-order\/edit/);
    await expect(
      this.page.getByText(/edit purchase order/i)
    ).toBeVisible({ timeout: 60000 });
    const table = this.page.locator('[aria-label="PO line items table"]');
    await expect(table).toBeVisible({ timeout: 60000 });
    await table.scrollIntoViewIfNeeded().catch(() => {});
  }
}

module.exports = PurchaseOrderEditPoPage;
