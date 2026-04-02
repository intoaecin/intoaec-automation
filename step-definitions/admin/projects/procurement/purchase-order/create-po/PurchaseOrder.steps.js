const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const PurchaseOrderCreatePage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchaseorder.page');

function getPoCreatePage(world) {
  if (!world.purchaseOrderCreatePage) {
    world.purchaseOrderCreatePage = new PurchaseOrderCreatePage(world.page);
  }
  return world.purchaseOrderCreatePage;
}

When(
  'I ensure the Purchase Order list has finished loading',
  { timeout: 120000 },
  async function () {
    const po = getPoCreatePage(this);
    await po.ensurePurchaseOrderListReady();
  }
);

When(
  'I start creating a purchase order from scratch',
  { timeout: 120000 },
  async function () {
    const po = getPoCreatePage(this);
    await po.openCreatePurchaseOrderStartDialog();
    await po.startFromScratchAndProceed();
  }
);

When(
  'I fill mandatory purchase order details with title {string}',
  { timeout: 120000 },
  async function (title) {
    const po = getPoCreatePage(this);
    await po.fillPurchaseOrderTitle(title);
  }
);

When(
  'I fill purchase order title with {string}',
  { timeout: 120000 },
  async function (title) {
    const po = getPoCreatePage(this);
    await po.fillPurchaseOrderTitle(title);
  }
);

When(
  'I add the first vendor from the vendor modal',
  { timeout: 180000 },
  async function () {
    const po = getPoCreatePage(this);
    await po.addVendorDetailsWithFirstVendorRadio();
  }
);

When(
  'I add a manual line item with name {string} description {string} quantity {string} unit {string} rate {string}',
  { timeout: 120000 },
  async function (name, description, quantity, unit, rate) {
    const po = getPoCreatePage(this);
    await po.addLineItemManually({
      itemName: name,
      description,
      quantity,
      unitLabel: unit,
      rate,
    });
  }
);

When(
  'I compose and send the purchase order email',
  { timeout: 180000 },
  async function () {
    const po = getPoCreatePage(this);
    await po.openActionMenuAndComposeEmail();
    await po.sendEmailFromComposeModal();
  }
);

Then(
  'I should see the purchase order created and sent success toast',
  { timeout: 180000 },
  async function () {
    const po = getPoCreatePage(this);
    await po.expectPoCreatedAndSentToast();
  }
);
