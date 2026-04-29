const { expect } = require('@playwright/test');
const RFQComposePage = require('./rfq-compose.page');

/**
 * RFQ create: interact with Ship to / Ship to address, then Action → Compose email → Send (same as compose-rfq).
 */
class RfqShipToPage extends RFQComposePage {
  /**
   * Clicks the Ship to address control (link, label, or checkbox) — UI may vary; mirrors PO ship-to fallbacks.
   */
  async clickShipToAddressOnRfqForm() {
    await expect(this.page).toHaveURL(/rfq\/(create|edit)/i);
    await this.waitForNetworkSettled();
    await this.dismissOpenMenusAndPopovers();

    let target = this.page
      .getByText(/ship\s*to\s*address/i)
      .filter({ visible: true })
      .first();

    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('button', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('link', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page
        .locator('span.pointer, a, button')
        .filter({ hasText: /ship\s*to/i })
        .first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      const label = this.page.getByText(/^ship\s*to$/i).filter({ visible: true }).first();
      if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
        target = label
          .locator(
            'xpath=ancestor-or-self::*[self::label or self::div or self::span][1]'
          )
          .locator('xpath=.//input[@type="checkbox"][1]')
          .first();
      }
    }
    if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
      const shipText = this.page.getByText(/ship\s*to/i).filter({ visible: true }).first();
      if (await shipText.isVisible({ timeout: 3000 }).catch(() => false)) {
        target = shipText
          .locator('xpath=./following::input[@type="checkbox"][1]')
          .first();
      }
    }
    if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
      target = this.page.getByRole('checkbox', { name: /ship\s*to/i }).first();
    }

    await expect(target).toBeVisible({ timeout: 60000 });
    await target.scrollIntoViewIfNeeded();
    await target.click({ timeout: 15000 });
    await this.waitForNetworkSettled();
  }
}

module.exports = RfqShipToPage;
