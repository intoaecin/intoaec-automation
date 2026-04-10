const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list card → kebab → Preview full-screen dialog. */
class PurchaseOrderPreviewPoPage extends PurchaseOrderCreatePoPage {
  fullScreenPoPreviewDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page.getByText(/purchase order|po no|preview|billed to/i),
      })
      .first();
  }

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
    const dialog = this.fullScreenPoPreviewDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      dialog.getByText(/purchase order|po no|preview|billed to/i).first()
    ).toBeVisible({ timeout: 60000 });
  }

  async closePurchaseOrderFullScreenPreview() {
    const dialog = this.fullScreenPoPreviewDialog();
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const tryClick = async (loc) => {
      const el = loc.first();
      if (await el.isVisible({ timeout: 2500 }).catch(() => false)) {
        await el.click({ timeout: 10000 });
        return true;
      }
      return false;
    };

    const closeCandidates = [
      dialog.locator('button:has(svg[data-testid="CloseIcon"])'),
      dialog.locator('button:has(svg[data-testid="ArrowBackIcon"])'),
      dialog.getByRole('button', { name: /^close$/i }),
      dialog.locator('button[aria-label*="close" i]'),
      dialog.getByRole('button', { name: /back/i }),
      dialog.locator('.MuiDialogTitle-root button').first(),
      dialog.locator('header button').first(),
    ];

    for (const loc of closeCandidates) {
      if (await tryClick(loc)) {
        break;
      }
    }

    await expect(dialog).toBeHidden({ timeout: 45000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(400);
      await expect(dialog).toBeHidden({ timeout: 20000 });
    });
  }

  async expectPurchaseOrderListWithCreateActionVisible() {
    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = PurchaseOrderPreviewPoPage;
