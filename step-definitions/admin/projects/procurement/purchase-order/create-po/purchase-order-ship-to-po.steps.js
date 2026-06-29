const { When } = require('@cucumber/cucumber');
const PurchaseOrderShipToPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-ship-to-po.page');

function getPurchaseOrderShipToPoPage(world) {
  if (!world.purchaseOrderShipToPoPage) {
    world.purchaseOrderShipToPoPage = new PurchaseOrderShipToPoPage(world.page);
  }
  return world.purchaseOrderShipToPoPage;
}

When(
  'I check the Ship To checkbox on the purchase order form',
  { timeout: 60000 },
  async function () {
    const po = getPurchaseOrderShipToPoPage(this);
    await po.checkShipToCheckbox();
  }
);

When(
  'I add a manual line item for ship to purchase order with name {string} description {string} quantity {string} unit {string} rate {string}',
  { timeout: 90000 },
  async function (name, description, quantity, unit, rate) {
    const po = getPurchaseOrderShipToPoPage(this);
    await po.addLineItemManuallyForShipToFlow({
      itemName: name,
      description,
      quantity,
      unitLabel: unit,
      rate,
    });
  }
);

When(
  'I compose and send the purchase order email for ship to flow',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderShipToPoPage(this);
    await po.composeAndSendEmailForShipToFlow();
  }
);
