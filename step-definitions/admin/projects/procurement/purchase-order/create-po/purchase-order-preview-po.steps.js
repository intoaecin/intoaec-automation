const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderPreviewPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-preview-po.page');

function getPurchaseOrderPreviewPoPage(world) {
  if (!world.purchaseOrderPreviewPoPage) {
    world.purchaseOrderPreviewPoPage = new PurchaseOrderPreviewPoPage(world.page);
  }
  return world.purchaseOrderPreviewPoPage;
}

When(
  'I open the three dot menu on the first purchase order card',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderPreviewPoPage(this);
    await po.openThreeDotMenuOnFirstPurchaseOrderCard();
  }
);

When(
  'I click preview in the purchase order card menu',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderPreviewPoPage(this);
    await po.clickPreviewInPurchaseOrderCardMenu();
  }
);

Then(
  'I should see the purchase order full screen preview',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderPreviewPoPage(this);
    await po.expectPurchaseOrderFullScreenPreviewVisible();
  }
);

When(
  'I close the purchase order full screen preview',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderPreviewPoPage(this);
    await po.closePurchaseOrderFullScreenPreview();
  }
);

Then(
  'I should be on the purchase order list with create action visible',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderPreviewPoPage(this);
    await po.expectPurchaseOrderListWithCreateActionVisible();
  }
);
