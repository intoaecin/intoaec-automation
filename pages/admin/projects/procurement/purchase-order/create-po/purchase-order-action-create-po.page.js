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
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.closeVendorModalIfOpen();
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: 30000 });
    await actionBtn.scrollIntoViewIfNeeded();
    await actionBtn.click({ timeout: 15000 });
    // eslint-disable-next-line no-console
    console.log('[PO] Opened Action menu.');

    const createItem = this.page
      .getByRole('menuitem', { name: /^create$/i })
      .or(this.page.getByRole('menu').getByText('Create', { exact: true }))
      .or(
        this.page
          .getByRole('menuitem')
          .filter({ hasText: /^(create|create\s+po)$/i })
      )
      .first();
    await expect(createItem).toBeVisible({ timeout: 20000 });

    this.poCreateSuccessObserved = false;
    await createItem.click({ timeout: 15000 });
    // eslint-disable-next-line no-console
    console.log('[PO] Clicked Action → Create.');

    const toast = this.locatorPoCreatedFromActionMenuToast();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: 25000 }).then(() => {
        this.poCreateSuccessObserved = true;
      }),
      this.page
        .getByRole('button', { name: /create purchase order/i })
        .waitFor({ state: 'visible', timeout: 25000 })
        .then(() => {
          this.poCreateSuccessObserved = true;
        })
        .catch(() => {}),
      this.page
        .waitForURL(/client\/profile|purchase-order(?!\/create)/i, {
          timeout: 25000,
        })
        .then(() => {
          this.poCreateSuccessObserved = true;
        })
        .catch(() => {}),
    ]).catch(() => {});

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
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
