const { When } = require('@cucumber/cucumber');
const PurchaseOrderMultiLineItemPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-multi-line-item-po.page');

function getPurchaseOrderMultiLineItemPoPage(world) {
  if (!world.purchaseOrderMultiLineItemPoPage) {
    world.purchaseOrderMultiLineItemPoPage = new PurchaseOrderMultiLineItemPoPage(
      world.page
    );
  }
  return world.purchaseOrderMultiLineItemPoPage;
}

When(
  'I fill purchase order title with a random multi line purchase order label',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderMultiLineItemPoPage(this);
    const title = `PO-multi-line-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    this.poYopmailSubjectHint = title;
    await po.fillPurchaseOrderTitle(title);
  }
);

When(
  'I add {int} manual purchase order line items with random fields',
  { timeout: 600000 },
  async function (count) {
    const po = getPurchaseOrderMultiLineItemPoPage(this);
    await po.addManyManualLineItemsWithRandomDetails(count);
  }
);
