const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list card → kebab → Preview full-screen dialog. */
class PurchaseOrderPreviewPoPage extends PurchaseOrderCreatePoPage {
  async openThreeDotMenuOnFirstPurchaseOrderCard() {
    await this.clickKebabOnFirstPurchaseOrderCard();
    await expect(
      this.page.getByRole('menuitem', { name: /^preview$/i })
    ).toBeVisible({ timeout: 30000 });
  }

  async clickPreviewInPurchaseOrderCardMenu() {
    await this.page.getByRole('menuitem', { name: /^preview$/i }).click();
  }

  async expectPurchaseOrderFullScreenPreviewVisible() {
    const dialog = this.page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      dialog.getByText(/purchase order|po no|preview|billed to/i).first()
    ).toBeVisible({ timeout: 60000 });
  }

  async closePurchaseOrderFullScreenPreview() {
    const dialog = this.page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await dialog.locator('button').first().click();
    await expect(dialog).toBeHidden({ timeout: 45000 });
  }

  async expectPurchaseOrderListWithCreateActionVisible() {
    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = PurchaseOrderPreviewPoPage;
