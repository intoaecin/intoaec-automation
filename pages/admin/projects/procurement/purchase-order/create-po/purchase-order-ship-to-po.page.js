const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO create: check Ship To, then Action → Compose email. */
class PurchaseOrderShipToPoPage extends PurchaseOrderCreatePoPage {
  async checkShipToCheckbox() {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.waitForNetworkSettled();

    // Try the most direct accessible locator first.
    let cb = this.page.getByRole('checkbox', { name: /ship\s*to/i }).first();

    // Fallback: checkbox near visible "Ship To" text label.
    if (!(await cb.isVisible({ timeout: 1500 }).catch(() => false))) {
      const label = this.page.getByText(/^ship\s*to$/i).filter({ visible: true }).first();
      if (await label.isVisible({ timeout: 2500 }).catch(() => false)) {
        cb = label
          .locator('xpath=ancestor-or-self::*[self::label or self::div or self::span][1]')
          .locator('xpath=.//input[@type="checkbox"][1]')
          .first();
      }
    }

    // Fallback: any checkbox following a visible Ship To label in DOM order.
    if (!(await cb.isVisible({ timeout: 1500 }).catch(() => false))) {
      const shipText = this.page.getByText(/ship\s*to/i).filter({ visible: true }).first();
      if (await shipText.isVisible({ timeout: 2500 }).catch(() => false)) {
        cb = shipText.locator('xpath=./following::input[@type="checkbox"][1]').first();
      }
    }

    await expect(cb).toBeVisible({ timeout: 30000 });
    await cb.scrollIntoViewIfNeeded();

    try {
      await cb.check({ timeout: 15000 });
    } catch {
      await cb.click({ force: true });
    }
  }
}

module.exports = PurchaseOrderShipToPoPage;

