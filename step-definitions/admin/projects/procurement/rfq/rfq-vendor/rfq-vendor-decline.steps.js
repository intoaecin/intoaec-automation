const { When, Then } = require('@cucumber/cucumber');
const {
  RfqVendorPortalDeclinePage,
} = require('../../../../../../pages/admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-portal-decline.page');

When('I decline the RFQ on the vendor portal', { timeout: 180000 }, async function () {
  const p = this.vendorPortalPage;
  if (!p) throw new Error('Vendor portal page missing.');

  const vp = new RfqVendorPortalDeclinePage(p);
  await vp.declineRfq();
});

Then('I should see the RFQ declined on the vendor portal', { timeout: 120000 }, async function () {
  const p = this.vendorPortalPage;
  if (!p) throw new Error('Vendor portal page missing.');

  const vp = new RfqVendorPortalDeclinePage(p);
  await vp.expectRfqDeclined();
});
