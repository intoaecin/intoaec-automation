const { When } = require('@cucumber/cucumber');
const WorkOrderShipToPage = require('../../../../../../pages/admin/projects/procurement/work-order/create-wo/work-order-ship-to.page');

function getWorkOrderShipToPage(world) {
  if (!world.workOrderShipToPage) {
    world.workOrderShipToPage = new WorkOrderShipToPage(world.page);
  }
  return world.workOrderShipToPage;
}

When(
  'I complete the work order action create with ship to journey with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderShipToPage(this);
    await wo.completeWorkOrderActionCreateWithShipToJourney(title);
  }
);

When(
  'I check the ship to address on the work order form',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderShipToPage(this);
    await wo.checkShipToAddressOnWorkOrderForm();
  }
);
