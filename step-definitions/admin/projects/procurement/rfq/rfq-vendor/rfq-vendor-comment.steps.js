const { When, Then } = require('@cucumber/cucumber');
const {
  RfqVendorPortalCommentPage,
} = require('../../../../../../pages/admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-portal-comment.page');

When('I add a random vendor comment on the RFQ vendor portal', { timeout: 180000 }, async function () {
  const p = this.vendorPortalPage;
  if (!p) throw new Error('Vendor portal page missing.');

  const vp = new RfqVendorPortalCommentPage(p);
  this.lastRfqVendorComment = vp.buildRandomRelevantComment();
  await vp.submitVendorComment(this.lastRfqVendorComment);
});

Then('I should see the RFQ vendor comment on the vendor portal', { timeout: 120000 }, async function () {
  const p = this.vendorPortalPage;
  if (!p) throw new Error('Vendor portal page missing.');
  if (!this.lastRfqVendorComment) {
    throw new Error('RFQ vendor comment missing from world state.');
  }

  const vp = new RfqVendorPortalCommentPage(p);
  await vp.expectCommentVisible(this.lastRfqVendorComment);
});
