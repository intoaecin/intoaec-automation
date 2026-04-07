const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list → Edit → form changes → Action → Update. */
class PurchaseOrderEditPoPage extends PurchaseOrderCreatePoPage {
  async openThreeDotMenuOnFirstPurchaseOrderCardForEdit() {
    await this.clickKebabOnFirstPurchaseOrderCard();
    await expect(
      this.page.getByRole('menuitem', { name: /^edit$/i })
    ).toBeVisible({ timeout: 30000 });
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
    await expect(
      this.page.locator('[aria-label="PO line items table"]')
    ).toBeVisible({ timeout: 60000 });
  }
}

module.exports = PurchaseOrderEditPoPage;
