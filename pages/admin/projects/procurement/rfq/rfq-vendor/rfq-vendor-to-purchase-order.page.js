const { expect } = require('@playwright/test');
const RfqSendReminderPage = require('../create-rfq/rfq-send-reminder.page');
const PurchaseOrderCreatePoPage = require('../../purchase-order/create-po/purchase-order-create-po.page');

/**
 * RFQ list flow after vendor price update: open the created RFQ card menu and convert it to PO.
 */
class RfqVendorToPurchaseOrderPage extends RfqSendReminderPage {
  buildRandomPurchaseOrderTitle() {
    const suffix = Math.random().toString(36).slice(2, 8);
    return `PO from RFQ ${new Date().toISOString().slice(0, 10)} ${suffix}`;
  }

  async fillRandomPurchaseOrderTitleAfterConvert() {
    const po = new PurchaseOrderCreatePoPage(this.page);
    const title = this.buildRandomPurchaseOrderTitle();
    await po.fillPurchaseOrderTitle(title);
    return title;
  }

  async composeAndSendEmailFromConvertedPurchaseOrder() {
    const po = new PurchaseOrderCreatePoPage(this.page);
    await po.openActionMenuAndComposeEmail();
    await po.expectPurchaseOrderComposeEmailDialogFromActionMenu();
    await po.sendEmailFromComposeModal();
  }

  async expectConvertedPurchaseOrderEmailSentToast() {
    const po = new PurchaseOrderCreatePoPage(this.page);
    await expect(po.locatorEmailSentSuccessToast()).toBeVisible({ timeout: 90000 });
  }

  menuPaperFromOpenCard() {
    return this.page.locator('.MuiPopover-root').filter({ visible: true }).locator('.MuiPaper-root').last();
  }

  async clickConvertToPoInRfqCardMenu() {
    const p = this.page;
    const paper = this.menuPaperFromOpenCard();

    const candidates = [
      paper.getByRole('menuitem', { name: /convert to po|convert to purchase order/i }).first(),
      paper.getByText(/convert to po|convert to purchase order/i).first(),
      p
        .getByRole('menuitem', { name: /convert to po|convert to purchase order/i })
        .filter({ visible: true })
        .first(),
      p.getByText(/convert to po|convert to purchase order/i).filter({ visible: true }).first(),
    ];

    let target = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 4000 }).catch(() => false)) {
        target = candidate;
        break;
      }
    }

    if (!target) {
      throw new Error(
        'RFQ vendor to PO: "Convert to PO" was not visible in the RFQ card menu. Open the created RFQ card menu first.'
      );
    }

    await target.click({ timeout: 15000, force: true }).catch(async () => {
      await target.click({ timeout: 15000, force: true });
    });

    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  }

  async expectPurchaseOrderPageAfterConvert() {
    const p = this.page;

    const poSignals = [
      p.getByText(/purchase order/i).first(),
      p.getByRole('heading', { name: /purchase order/i }).first(),
      p.locator('main').getByText(/purchase order/i).first(),
      p.locator('body').getByText(/purchase order/i).first(),
    ];

    await expect
      .poll(
        async () => {
          const url = p.url();
          if (/purchase-order|purchaseorder/i.test(url)) {
            return true;
          }

          for (const signal of poSignals) {
            // eslint-disable-next-line no-await-in-loop
            if (await signal.isVisible({ timeout: 800 }).catch(() => false)) {
              return true;
            }
          }

          return false;
        },
        { timeout: 120000, intervals: [200, 400, 800, 1200, 2000] }
      )
      .toBe(true);

    // Cleanup: vendor-to-PO flow only. Prevent affecting later scenarios.
    delete process.env.RFQ_LIST_SELECT_FIRST_CARD;
  }
}

module.exports = {
  RfqVendorToPurchaseOrderPage,
};
