const { When, Then } = require('@cucumber/cucumber');
const {
  RfqVendorToPurchaseOrderPage,
} = require('../../../../../../pages/admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-to-purchase-order.page');

function getRfqVendorToPurchaseOrderPage(world) {
  if (!world.rfqVendorToPurchaseOrderPage) {
    world.rfqVendorToPurchaseOrderPage = new RfqVendorToPurchaseOrderPage(world.page);
  }
  return world.rfqVendorToPurchaseOrderPage;
}

When('I click convert to PO in the RFQ card menu', { timeout: 180000 }, async function () {
  const rfq = getRfqVendorToPurchaseOrderPage(this);
  console.log(`[RFQ vendor to PO][${new Date().toISOString()}] Step: click convert to PO`);
  await rfq.clickConvertToPoInRfqCardMenu();
});

Then('I should see the purchase order page after converting the RFQ', { timeout: 180000 }, async function () {
  const rfq = getRfqVendorToPurchaseOrderPage(this);
  console.log(
    `[RFQ vendor to PO][${new Date().toISOString()}] Step: verify purchase order page after convert`
  );
  await rfq.expectPurchaseOrderPageAfterConvert();
});

When(
  'I fill purchase order title with a random value after converting RFQ',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqVendorToPurchaseOrderPage(this);
    console.log(
      `[RFQ vendor to PO][${new Date().toISOString()}] Step: fill random PO title after convert`
    );
    this.lastConvertedPoTitle = await rfq.fillRandomPurchaseOrderTitleAfterConvert();
  }
);

When(
  'I compose and send the purchase order email from the converted PO',
  { timeout: 240000 },
  async function () {
    const rfq = getRfqVendorToPurchaseOrderPage(this);
    console.log(
      `[RFQ vendor to PO][${new Date().toISOString()}] Step: compose and send email from converted PO`
    );
    await rfq.composeAndSendEmailFromConvertedPurchaseOrder();
  }
);

Then(
  'I should see the purchase order email sent toast from the converted PO',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqVendorToPurchaseOrderPage(this);
    console.log(
      `[RFQ vendor to PO][${new Date().toISOString()}] Step: verify email sent toast from converted PO`
    );
    await rfq.expectConvertedPurchaseOrderEmailSentToast();
  }
);
