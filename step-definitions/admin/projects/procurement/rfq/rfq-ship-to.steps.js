const { When } = require('@cucumber/cucumber');
const RfqShipToPage = require('../../../../../pages/admin/projects/procurement/rfq/rfq-ship-to.page');

function getRfqShipToPage(world) {
  if (!world.rfqShipToPage) {
    world.rfqShipToPage = new RfqShipToPage(world.page);
  }
  return world.rfqShipToPage;
}

When(
  'I click the RFQ ship to address control on the form',
  { timeout: 120000 },
  async function () {
    const rfq = getRfqShipToPage(this);
    await rfq.clickShipToAddressOnRfqForm();
  }
);
