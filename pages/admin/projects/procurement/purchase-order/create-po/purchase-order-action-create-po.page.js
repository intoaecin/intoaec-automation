const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * PO create form: Action → Create (save/submit without opening compose email).
 */
class PurchaseOrderActionCreatePoPage extends PurchaseOrderCreatePoPage {
  /**
   * Opens the Action dropdown on the create form and chooses Create (not Compose email).
   */
  async openActionMenuAndChooseCreate() {
    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.scrollIntoViewIfNeeded();
    await actionBtn.click();

    const createItem = this.page
      .getByRole('menuitem')
      .filter({ hasText: /^(create|create\s+po)$/i })
      .first();
    await expect(createItem).toBeVisible({ timeout: this.defaultTimeout });
    await createItem.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();
  }

  /**
   * Toast after Action → Create: created-only or same copy as create+send if the app reuses it.
   */
  locatorPoCreatedFromActionMenuToast() {
    const re =
      /PO created[\s&.,-]*sent[\s\w&.,-]*successfully|PO created[\s&.,-]*sent[\s\w&.,-]*for approval|PO created successfully|purchase order created successfully|po created successfully|po saved successfully/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  async expectPurchaseOrderCreatedFromActionMenuToast() {
    await expect(this.locatorPoCreatedFromActionMenuToast()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = PurchaseOrderActionCreatePoPage;
