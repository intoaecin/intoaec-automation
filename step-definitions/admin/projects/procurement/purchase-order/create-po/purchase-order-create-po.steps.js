const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');

function getPurchaseOrderCreatePoPage(world) {
  if (!world.purchaseOrderCreatePoPage) {
    world.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(world.page);
  }
  return world.purchaseOrderCreatePoPage;
}

When(
  'I ensure the Purchase Order list has finished loading',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.ensurePurchaseOrderListReady();
  }
);

When(
  'I start creating a purchase order from scratch',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.openCreatePurchaseOrderStartDialog();
    await po.startFromScratchAndProceed();
  }
);

When(
  'I fill mandatory purchase order details with title {string}',
  { timeout: 120000 },
  async function (title) {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.fillPurchaseOrderTitle(title);
  }
);

When(
  'I fill purchase order title with {string}',
  { timeout: 120000 },
  async function (title) {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.fillPurchaseOrderTitle(title);
  }
);

When(
  'I add the first vendor from the vendor modal',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.addVendorDetailsWithFirstVendorRadio();
  }
);

When(
  'I ensure all purchase order line item units are filled',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.ensureAllPoLineItemUnitsFilled();
  }
);

When(
  'I ensure all purchase order line item units are filled after vendor',
  { timeout: 240000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.ensureAllPoLineItemUnitsFilled({ settleFirst: true });
  }
);

When(
  'I add a manual line item with name {string} description {string} quantity {string} unit {string} rate {string}',
  { timeout: 120000 },
  async function (name, description, quantity, unit, rate) {
    const po = getPurchaseOrderCreatePoPage(this);
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
    const po = getPurchaseOrderCreatePoPage(this);
    await po.openActionMenuAndComposeEmail();
    await po.sendEmailFromComposeModal();
  }
);

When(
  'I compose and send the purchase order email capturing vendor Yopmail from the To field',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.openActionMenuAndComposeEmail();
    this.vendorYopmailEmail = await po.readYopmailAddressFromComposeDialog();
    await po.sendEmailFromComposeModal();
  }
);

Then(
  'I should see the purchase order created and sent success toast',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.expectPoCreatedAndSentToast();
  }
);

When(
  'I wait for the purchase order list after create and send redirect',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.waitForPurchaseOrderListAfterCreateRedirect();
  }
);
