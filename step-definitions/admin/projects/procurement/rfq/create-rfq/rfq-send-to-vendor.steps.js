const { When } = require('@cucumber/cucumber');
const RfqSendToVendorPage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-send-to-vendor.page');

function getRfqSendToVendorPage(world) {
  if (!world.rfqSendToVendorPage) {
    world.rfqSendToVendorPage = new RfqSendToVendorPage(world.page);
  }
  return world.rfqSendToVendorPage;
}

When(
  'I click Send to vendor on the RFQ page',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqSendToVendorPage(this);
    // eslint-disable-next-line no-console
    console.log(`[RFQ send-to-vendor][${new Date().toISOString()}] Step: click Send to vendor`);
    await rfq.clickSendToVendorOnRfqPage();
  }
);

When(
  'I select the first vendor in the send to vendor panel',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqSendToVendorPage(this);
    // eslint-disable-next-line no-console
    console.log(`[RFQ send-to-vendor][${new Date().toISOString()}] Step: select first vendor`);
    await rfq.selectFirstVendorInSendToVendorPanel();
  }
);

When(
  'I click Send and choose the email option',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqSendToVendorPage(this);
    // eslint-disable-next-line no-console
    console.log(`[RFQ send-to-vendor][${new Date().toISOString()}] Step: Send → Email`);
    await rfq.clickSendAndChooseEmailFromDropdown();
  }
);

