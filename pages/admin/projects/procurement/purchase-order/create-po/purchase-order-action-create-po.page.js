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

    this.poCreateSuccessObserved = false;
    await createItem.click();

    const toast = this.locatorPoCreatedFromActionMenuToast();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: 60000 }).then(() => {
        this.poCreateSuccessObserved = true;
      }),
      this.page
        .getByRole('button', { name: /create purchase order/i })
        .waitFor({ state: 'visible', timeout: 60000 })
        .catch(() => {}),
      this.page
        .waitForURL(/client\/profile|purchase-order(?!\/create)/i, {
          timeout: 60000,
        })
        .catch(() => {}),
    ]).catch(() => {});

    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();
  }

  /**
   * Toast after Action → Create: created-only or same copy as create+send if the app reuses it.
   */
  locatorPoCreatedFromActionMenuToast() {
    const re =
      /PO created[\s&.,-]*sent[\s\w&.,-]*successfully|PO created[\s&.,-]*sent[\s\w&.,-]*for approval|PO created successfully|purchase order created successfully|po created successfully|po saved successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  async expectPurchaseOrderCreatedFromActionMenuToast() {
    if (this.poCreateSuccessObserved) return;

    const toast = this.locatorPoCreatedFromActionMenuToast();
    if (await toast.isVisible({ timeout: 15000 }).catch(() => false)) {
      return;
    }

    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = PurchaseOrderActionCreatePoPage;
