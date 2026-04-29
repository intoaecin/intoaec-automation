const { expect } = require('@playwright/test');
const RfqPreviewPage = require('../create-rfq/rfq-preview.page');

/**
 * RFQ Vendor - price update.
 *
 * Assumptions (UI varies by build):
 * - Price update is initiated from the RFQ list card overflow (three-dot) menu, or a vendor panel action.
 * - A dialog/drawer opens with at least one visible textbox/number input for price, and a Save/Update button.
 *
 * This page object keeps selectors flexible and relies on role/text first.
 */
class RfqPriceUpdatePage extends RfqPreviewPage {
  buildRandomVendorPriceValue() {
    // 2 decimals, stable string for inputs expecting currency-like values.
    const base = (Math.floor(Math.random() * 9000) + 1000) / 100;
    return base.toFixed(2);
  }

  async openVendorPriceUpdateFromCreatedRfqCard(titleText) {
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    const card = await this.resolveCreatedRfqCardForPriceUpdate(titleText);
    await expect(card).toBeVisible({ timeout: 60000 });

    // Ensure card expanded, then open kebab.
    await this.ensureRfqCardRowExpanded(card);
    await this.openThreeDotMenuInExpandedRfqCard(card);

    const p = this.page;
    const paper = p.locator('.MuiPopover-root').filter({ visible: true }).locator('.MuiPaper-root').last();

    const priceUpdateItem = paper
      .getByRole('menuitem', { name: /price update|update price|update vendor price|vendor price/i })
      .first()
      .or(
        p
          .getByRole('menuitem', { name: /price update|update price|update vendor price|vendor price/i })
          .filter({ visible: true })
          .first()
      )
      .or(paper.getByText(/price update|update price|vendor price/i).first());

    await expect(priceUpdateItem).toBeVisible({ timeout: 15000 });
    await priceUpdateItem.click({ timeout: 15000, force: true });

    await this.waitForVendorPriceUpdatePanelOpen();
  }

  async resolveCreatedRfqCardForPriceUpdate(titleText) {
    const title = String(titleText || process.env.RFQ_PREVIEW_TITLE || '').trim();
    if (title) {
      const byTitle = this.rfqListCardForTitle(title);
      if (await byTitle.isVisible({ timeout: 4000 }).catch(() => false)) return byTitle;
    }
    return this.rfqListFirstCard();
  }

  vendorPriceUpdatePanel() {
    const p = this.page;
    return p
      .locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root, [role="dialog"]')
      .filter({ visible: true })
      .last();
  }

  async waitForVendorPriceUpdatePanelOpen() {
    const panel = this.vendorPriceUpdatePanel();
    await expect(panel).toBeVisible({ timeout: 60000 });

    const anyField = panel
      .locator('input:not([type="hidden"]), textarea, [contenteditable="true"]')
      .filter({ visible: true })
      .first();
    await expect(anyField).toBeVisible({ timeout: 30000 });
  }

  async fillVendorPriceUpdateValue(priceValue) {
    const value = String(priceValue ?? '').trim();
    if (!value) throw new Error('RFQ vendor price update value must be non-empty');

    const panel = this.vendorPriceUpdatePanel();
    await expect(panel).toBeVisible({ timeout: 30000 });

    const p = this.page;
    const candidates = [
      panel.getByRole('spinbutton', { name: /price|amount|rate|unit price/i }).first(),
      panel.getByRole('textbox', { name: /price|amount|rate|unit price/i }).first(),
      panel.getByPlaceholder(/price|amount|rate|unit price/i).first(),
      panel.locator('input[type="number"]').filter({ visible: true }).first(),
      panel.locator('input:not([type="hidden"])').filter({ visible: true }).first(),
      panel.locator('textarea').filter({ visible: true }).first(),
    ];

    /** @type {import('@playwright/test').Locator | null} */
    let field = null;
    for (const c of candidates) {
      if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
        field = c;
        break;
      }
    }
    if (!field) {
      throw new Error('RFQ vendor price update: could not find a visible price input in the panel.');
    }

    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: 10000 }).catch(() => {});
    await field.fill('').catch(() => {});
    await field.fill(value);

    await p.waitForTimeout(250);
  }

  async saveVendorPriceUpdate() {
    const panel = this.vendorPriceUpdatePanel();
    await expect(panel).toBeVisible({ timeout: 30000 });

    const p = this.page;
    const save = panel
      .getByRole('button', { name: /save|update|apply|submit/i })
      .filter({ visible: true })
      .first();

    await expect(save).toBeVisible({ timeout: 20000 });
    await save.click({ timeout: 20000, force: true }).catch(async () => {
      await save.click({ timeout: 20000, force: true });
    });

    // Allow dialog to close / toast to appear.
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForTimeout(500);
  }

  async expectVendorPriceUpdateSavedToast() {
    const toast = this.page
      .locator('.Toastify__toast, .Toastify__toast-body[role="alert"]')
      .filter({ hasText: /saved|updated|success/i })
      .first();
    await expect(toast).toBeVisible({ timeout: 60000 });
  }
}

module.exports = RfqPriceUpdatePage;

