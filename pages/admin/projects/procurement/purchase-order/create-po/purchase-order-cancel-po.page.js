const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list → ⋮ menu → Cancel / Reject. */
class PurchaseOrderCancelPoPage extends PurchaseOrderCreatePoPage {
  cancelMenuItemLocator() {
    return this.page
      .getByRole('menuitem')
      .filter({ hasText: /\b(cancel|reject|decline)\b/i })
      .filter({ visible: true })
      .first();
  }

  openKebabMenuPaper() {
    return this.page
      .locator('.MuiPopover-root, .MuiMenu-root')
      .filter({ visible: true })
      .locator('.MuiPaper-root')
      .last();
  }

  locatorCancelSuccessToast() {
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({
        hasText:
          /rejected successfully|cancelled successfully|canceled successfully|purchase order rejected|po rejected|declined successfully/i,
      })
      .first();
  }

  async preparePurchaseOrderListForCardMenu() {
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await this.dismissListSkeletons();
  }

  async openThreeDotMenuOnFirstPurchaseOrderCardForCancel() {
    await this.preparePurchaseOrderListForCardMenu();

    const card = this.firstPoCard();
    await card.scrollIntoViewIfNeeded();
    await this.ensurePoCardRowExpanded(card);

    const kebab = this.kebabButtonOnPoCard(card);
    await expect(kebab).toBeVisible({ timeout: 30000 });
    await kebab.scrollIntoViewIfNeeded();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenusAndPopovers();
      }

      await kebab.click({ timeout: 15000, force: attempt >= 1 }).catch(async () => {
        await kebab.click({ timeout: 15000, force: true });
      });
      await this.page.waitForTimeout(300);

      if (await this.cancelMenuItemLocator().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(this.cancelMenuItemLocator()).toBeVisible({ timeout: 10000 });
        return;
      }
    }

    await expect(this.cancelMenuItemLocator()).toBeVisible({
      timeout: 30000,
      message:
        'Cancel/Reject was not visible after opening the three-dot menu on the first PO card.',
    });
  }

  async confirmCancelIfDialogAppears() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (!(await dialog.isVisible({ timeout: 2500 }).catch(() => false))) {
      return;
    }

    const confirmButtons = [
      dialog
        .getByRole('button', {
          name: /^(yes|ok|confirm|reject|decline|proceed|continue|submit)$/i,
        })
        .first(),
      dialog
        .getByRole('button')
        .filter({ hasText: /confirm|yes|ok|reject|decline|submit|continue/i })
        .first(),
    ];

    for (const button of confirmButtons) {
      if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
        await button.click({ timeout: 10000, force: true });
        await dialog.waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {});
        return;
      }
    }
  }

  async clickCancelInPurchaseOrderCardMenu() {
    let cancelItem = this.cancelMenuItemLocator();
    if (!(await cancelItem.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.openThreeDotMenuOnFirstPurchaseOrderCardForCancel();
      cancelItem = this.cancelMenuItemLocator();
    }

    await expect(cancelItem).toBeVisible({ timeout: 15000 });
    await cancelItem.click({ timeout: 15000, force: true });

    await this.confirmCancelIfDialogAppears();
    await this.waitForNetworkSettled();
  }

  async expectPurchaseOrderCancelSuccessToast() {
    const toast = this.locatorCancelSuccessToast();
    await expect
      .poll(
        async () => toast.isVisible({ timeout: 600 }).catch(() => false),
        {
          timeout: this.defaultTimeout,
          intervals: [300, 600, 1000, 1500],
          message: 'Expected PO cancel/reject success toast',
        }
      )
      .toBe(true);
  }
}

module.exports = PurchaseOrderCancelPoPage;
