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
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderShipToPoPage(this);
    await po.checkShipToCheckbox();
  }
);

