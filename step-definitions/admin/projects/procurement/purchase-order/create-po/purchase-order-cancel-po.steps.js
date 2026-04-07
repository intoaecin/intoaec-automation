const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderCancelPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-cancel-po.page');

function getPurchaseOrderCancelPoPage(world) {
  if (!world.purchaseOrderCancelPoPage) {
    world.purchaseOrderCancelPoPage = new PurchaseOrderCancelPoPage(world.page);
  }
  return world.purchaseOrderCancelPoPage;
}

When(
  'I open the three dot menu on the first purchase order card for cancel',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCancelPoPage(this);
    await po.openThreeDotMenuOnFirstPurchaseOrderCardForCancel();
  }
);

When(
  'I click cancel in the purchase order card menu',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCancelPoPage(this);
    await po.clickCancelInPurchaseOrderCardMenu();
  }
);

Then(
  'I should see the purchase order cancel success toast',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCancelPoPage(this);
    await po.expectPurchaseOrderCancelSuccessToast();
  }
);
