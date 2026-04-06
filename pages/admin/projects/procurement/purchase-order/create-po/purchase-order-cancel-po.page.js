const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list → kebab → Cancel (after compose flows have closed). */
class PurchaseOrderCancelPoPage extends PurchaseOrderCreatePoPage {
  openKebabMenuPaper() {
    return this.page
      .locator('.MuiPopover-root .MuiPaper-root')
      .filter({ visible: true })
      .last();
  }

  cancelMenuItem() {
    return this.openKebabMenuPaper()
      .getByRole('menuitem', { name: /^cancel$/i })
      .or(this.page.getByRole('menuitem', { name: /^cancel$/i }))
      .first();
  }

  async openThreeDotMenuOnFirstPurchaseOrderCardForCancel() {
    await this.dismissVisibleToastNotifications();
    await this.waitForPurchaseOrderListReadyAfterComposeEmailSent();
    await this.dismissVisibleToastNotifications();

    await expect(
      this.page.locator('.MuiModal-root').filter({ visible: true })
    )
      .toHaveCount(0, { timeout: 20000 })
      .catch(() => {});

    for (let attempt = 0; attempt < 6; attempt++) {
      await this.dismissOpenMenusAndPopovers();
      await this.dismissVisibleToastNotifications();

      const card = this.firstPoCard();
      await card.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(attempt === 0 ? 500 : 700);

      const kebab = this.kebabButtonOnPoCard(card);
      await expect(kebab).toBeVisible({ timeout: 20000 });
      await kebab.scrollIntoViewIfNeeded();

      const force = attempt >= 1;
      try {
        await kebab.click({ timeout: 12000, force });
      } catch {
        await kebab.click({ timeout: 8000, force: true });
      }

      if (
        await this.cancelMenuItem()
          .isVisible({ timeout: 7000 })
          .catch(() => false)
      ) {
        await expect(this.cancelMenuItem()).toBeVisible({ timeout: 5000 });
        return;
      }

      const box = await kebab.boundingBox();
      if (box) {
        await this.page.mouse.click(
          Math.round(box.x + box.width / 2),
          Math.round(box.y + box.height / 2)
        );
        if (
          await this.cancelMenuItem()
            .isVisible({ timeout: 5000 })
            .catch(() => false)
        ) {
          await expect(this.cancelMenuItem()).toBeVisible({ timeout: 5000 });
          return;
        }
      }
    }

    await expect(this.cancelMenuItem()).toBeVisible({ timeout: 15000 });
  }

  async clickCancelInPurchaseOrderCardMenu() {
    await this.cancelMenuItem().click();
    await this.waitForNetworkSettled();
  }

  async expectPurchaseOrderCancelSuccessToast() {
    const toastBody = this.page
      .locator('.Toastify__toast-body[role="alert"]')
      .filter({ hasText: /rejected successfully/i })
      .first();
    await expect(toastBody).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = PurchaseOrderCancelPoPage;
