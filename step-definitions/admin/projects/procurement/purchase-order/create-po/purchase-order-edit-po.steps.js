const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderEditPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-edit-po.page');

function getPurchaseOrderEditPoPage(world) {
  if (!world.purchaseOrderEditPoPage) {
    world.purchaseOrderEditPoPage = new PurchaseOrderEditPoPage(world.page);
  }
  return world.purchaseOrderEditPoPage;
}

When(
  'I open the three dot menu on the first purchase order card for edit',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderEditPoPage(this);
    await po.openThreeDotMenuOnFirstPurchaseOrderCardForEdit();
  }
);

When(
  'I click edit in the purchase order card menu',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderEditPoPage(this);
    await po.clickEditInPurchaseOrderCardMenu();
  }
);

Then(
  'I should see the purchase order edit form loaded',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderEditPoPage(this);
    await po.expectPurchaseOrderEditFormLoaded();
  }
);

When(
  'I click add manually on the purchase order form',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderEditPoPage(this);
    await po.clickAddManuallyOnPurchaseOrderForm();
  }
);

When(
  'I fill the new PO line item with name {string} description {string} quantity {string} unit {string} rate {string}',
  { timeout: 120000 },
  async function (name, description, quantity, unit, rate) {
    const po = getPurchaseOrderEditPoPage(this);
    await po.fillLastPoLineItemRow({
      itemName: name,
      description,
      quantity,
      unitLabel: unit,
      rate,
    });
  }
);

When(
  'I open the purchase order action menu and choose update',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderEditPoPage(this);
    await po.openActionMenuAndChooseUpdate();
  }
);

Then(
  'I should see the purchase order updated success toast',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderEditPoPage(this);
    await po.expectPurchaseOrderUpdatedSuccessToast();
  }
);

When(
  'I wait for the purchase order list after update redirect',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderEditPoPage(this);
    await po.waitForPurchaseOrderListAfterUpdateRedirect();
  }
);
