const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list card → kebab → Preview full-screen dialog. */
class PurchaseOrderPreviewPoPage extends PurchaseOrderCreatePoPage {
  previewDialogRoot() {
    return this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByText(/purchase order|po no|preview|billed to/i),
      })
      .filter({ visible: true })
      .first();
  }

  async openThreeDotMenuOnFirstPurchaseOrderCard() {
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    const card = this.firstPoCard();
    await card.scrollIntoViewIfNeeded();
    await this.ensurePoCardRowExpanded(card);
    const kebab = this.kebabButtonOnPoCard(card);
    await kebab.scrollIntoViewIfNeeded();
    await kebab.click({ timeout: 20000 }).catch(async () => {
      await kebab.click({ force: true, timeout: 10000 });
    });
    await expect(
      this.page.getByRole('menuitem', { name: /^preview$/i })
    ).toBeVisible({ timeout: 30000 });
  }

  async clickPreviewInPurchaseOrderCardMenu() {
    await this.page.getByRole('menuitem', { name: /^preview$/i }).click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async expectPurchaseOrderFullScreenPreviewVisible() {
    const dialog = this.previewDialogRoot();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      dialog.getByText(/purchase order|po no|preview|billed to/i).first()
    ).toBeVisible({ timeout: 60000 });
  }

  async closePurchaseOrderFullScreenPreview() {
    await this.dismissOpenMenusAndPopovers();
    const root = this.previewDialogRoot();
    const rootVisible = await root.isVisible({ timeout: 5000 }).catch(() => false);

    const tryClick = async (loc) => {
      const el = loc.first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.click({ timeout: 15000 }).catch(async () => {
          await el.click({ timeout: 15000, force: true });
        });
        return true;
      }
      return false;
    };

    if (rootVisible) {
      const closeCandidates = [
        root.locator('button:has(svg[data-testid="CloseIcon"])'),
        root.locator('button:has(svg[data-testid="ArrowBackIcon"])'),
        root.locator('button:has(svg[data-testid="ChevronLeftIcon"])'),
        root.getByRole('button', { name: /^close$/i }),
        root.getByRole('button', { name: /back/i }),
        root.locator('button[aria-label*="close" i]'),
        root.locator('button[aria-label*="back" i]'),
      ];

      for (const loc of closeCandidates) {
        if (await tryClick(loc)) break;
      }

      await expect(root)
        .toBeHidden({ timeout: 45000 })
        .catch(async () => {
          await this.page.keyboard.press('Escape').catch(() => {});
          await this.page.waitForTimeout(250);
          await expect(root).toBeHidden({ timeout: 20000 });
        });
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async expectPurchaseOrderListWithCreateActionVisible() {
    await this.dismissOpenMenusAndPopovers();
    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = PurchaseOrderPreviewPoPage;
