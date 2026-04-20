const { When, Then } = require('@cucumber/cucumber');
const {
  RfqVendorToWorkOrderPage,
} = require('../../../../../../pages/admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-to-work-order.page');

function getRfqVendorToWorkOrderPage(world) {
  if (!world.rfqVendorToWorkOrderPage) {
    world.rfqVendorToWorkOrderPage = new RfqVendorToWorkOrderPage(world.page);
  }
  return world.rfqVendorToWorkOrderPage;
}

When('I click convert to WO in the RFQ card menu', { timeout: 180000 }, async function () {
  const rfq = getRfqVendorToWorkOrderPage(this);
  console.log(`[RFQ vendor to WO][${new Date().toISOString()}] Step: click convert to WO`);
  await rfq.clickConvertToWoInRfqCardMenu();
});

Then('I should see the work order page after converting the RFQ', { timeout: 180000 }, async function () {
  const rfq = getRfqVendorToWorkOrderPage(this);
  console.log(
    `[RFQ vendor to WO][${new Date().toISOString()}] Step: verify work order page after convert`
  );
  await rfq.expectWorkOrderPageAfterConvert();
});

When(
  'I fill work order title with a random value after converting RFQ',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqVendorToWorkOrderPage(this);
    console.log(
      `[RFQ vendor to WO][${new Date().toISOString()}] Step: fill random WO title after convert`
    );
    this.lastConvertedWoTitle = await rfq.fillRandomWorkOrderTitleAfterConvert();
  }
);

When(
  'I compose and send the work order email from the converted WO',
  { timeout: 240000 },
  async function () {
    const rfq = getRfqVendorToWorkOrderPage(this);
    console.log(
      `[RFQ vendor to WO][${new Date().toISOString()}] Step: compose and send email from converted WO`
    );
    await rfq.composeAndSendEmailFromConvertedWorkOrder();
  }
);

Then(
  'I should see the work order email sent toast from the converted WO',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqVendorToWorkOrderPage(this);
    console.log(
      `[RFQ vendor to WO][${new Date().toISOString()}] Step: verify email sent toast from converted WO`
    );
    await rfq.expectConvertedWorkOrderEmailSentToast();
  }
);
