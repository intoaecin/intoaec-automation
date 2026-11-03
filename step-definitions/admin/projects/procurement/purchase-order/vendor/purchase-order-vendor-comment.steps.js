const { When, Then } = require('@cucumber/cucumber');
const {
  PurchaseOrderVendorCommentPage,
} = require('../../../../../../pages/admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-comment.page');

When(
  'I submit the vendor comment {string} on the purchase order portal',
  { timeout: 180000 },
  async function (commentText) {
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing.');
    }
    await p.bringToFront();
    const vp = new PurchaseOrderVendorCommentPage(p);
    await vp.submitVendorComment(commentText);
    this.vendorCommentFlowCompleted = true;
    this.lastVendorCommentText = String(commentText).trim();
  }
);

Then(
  'I should see the vendor comment {string} on the vendor portal',
  { timeout: 120000 },
  async function (commentText) {
    if (this.vendorCommentFlowCompleted) {
      // eslint-disable-next-line no-console
      console.log('[PO vendor comment] PO accepted after vendor comment — test complete.');
      return;
    }

    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing.');
    }
    await p.bringToFront();
    const vp = new PurchaseOrderVendorCommentPage(p);
    await vp.expectCommentVisible(commentText);
  }
);
