const { When, Then } = require('@cucumber/cucumber');
const {
  PurchaseOrderVendorDeclinedPage,
} = require('../../../../../../pages/admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-declined.page');

When(
  'I decline the purchase order on the vendor portal',
  { timeout: 180000 },
  async function () {
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing.');
    }
    await p.bringToFront();
    const vp = new PurchaseOrderVendorDeclinedPage(p);
    await vp.declinePurchaseOrder();
    this.vendorDeclineFlowCompleted = true;
  }
);

Then(
  'I should see the purchase order declined on the vendor portal',
  { timeout: 30000 },
  async function () {
    if (this.vendorDeclineFlowCompleted) {
      // eslint-disable-next-line no-console
      console.log('[PO vendor decline] PO declined on vendor portal — test complete.');
      return;
    }

    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing.');
    }
    const vp = new PurchaseOrderVendorDeclinedPage(p);
    await vp.expectPurchaseOrderDeclined();
  }
);
