const { When } = require('@cucumber/cucumber');
const {
  RfqCompareVendorPricePage,
} = require('../../../../../../pages/admin/projects/procurement/rfq/rfq-vendor/rfq-compare-vendor-price.page');

function getRfqCompareVendorPricePage(world) {
  if (!world.rfqCompareVendorPricePage) {
    world.rfqCompareVendorPricePage = new RfqCompareVendorPricePage(world.page);
  }
  return world.rfqCompareVendorPricePage;
}

When('I click compare vendor price in the RFQ card menu', { timeout: 180000 }, async function () {
  const rfq = getRfqCompareVendorPricePage(this);
  console.log(
    `[RFQ compare vendor price][${new Date().toISOString()}] Step: click compare vendor price`
  );
  await rfq.clickCompareVendorPriceInRfqCardMenu();
});

When('I click the compare vendor price button on the created RFQ card', { timeout: 180000 }, async function () {
  const rfq = getRfqCompareVendorPricePage(this);
  console.log(
    `[RFQ compare vendor price][${new Date().toISOString()}] Step: click compare vendor price button on created RFQ card`
  );
  await rfq.clickCompareVendorPriceButtonOnCreatedRfqCard(this.lastRfqTitle);
});

When('I close the compare vendor price page for the RFQ', { timeout: 180000 }, async function () {
  const rfq = getRfqCompareVendorPricePage(this);
  console.log(
    `[RFQ compare vendor price][${new Date().toISOString()}] Step: close compare vendor price page`
  );
  await rfq.closeCompareVendorPricePage(this.lastRfqTitle);
});
