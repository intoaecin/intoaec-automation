const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderActionCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-action-create-po.page');

function getPurchaseOrderActionCreatePoPage(world) {
  if (!world.purchaseOrderActionCreatePoPage) {
    world.purchaseOrderActionCreatePoPage = new PurchaseOrderActionCreatePoPage(
      world.page
    );
  }
  return world.purchaseOrderActionCreatePoPage;
}

When(
  'I create the purchase order from the action menu',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderActionCreatePoPage(this);
    await po.openActionMenuAndChooseCreate();
  }
);

Then(
  'I should see the purchase order created from action menu success toast',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderActionCreatePoPage(this);
    await po.expectPurchaseOrderCreatedFromActionMenuToast();
  }
);
