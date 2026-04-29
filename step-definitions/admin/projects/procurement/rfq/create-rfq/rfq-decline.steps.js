const { When, Then } = require('@cucumber/cucumber');
const RfqDeclinePage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-decline.page');

function getRfqDeclinePage(world) {
  if (!world.rfqDeclinePage) {
    world.rfqDeclinePage = new RfqDeclinePage(world.page);
  }
  return world.rfqDeclinePage;
}

When('I click decline in the RFQ card menu', { timeout: 180000 }, async function () {
  const rfq = getRfqDeclinePage(this);
  console.log(`[RFQ decline][${new Date().toISOString()}] Step: click decline in RFQ card menu`);
  await rfq.clickDeclineInRfqCardMenu();
});

Then('I should see the RFQ decline success toast', { timeout: 180000 }, async function () {
  const rfq = getRfqDeclinePage(this);
  console.log(`[RFQ decline][${new Date().toISOString()}] Step: verify RFQ decline success toast`);
  await rfq.expectRfqDeclineSuccessToast(this.lastRfqTitle);
});

