const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderAddFromLibraryPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-add-from-library-po.page');
const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');

function getPurchaseOrderAddFromLibraryPoPage(world) {
  if (!world.purchaseOrderAddFromLibraryPoPage) {
    world.purchaseOrderAddFromLibraryPoPage =
      new PurchaseOrderAddFromLibraryPoPage(world.page);
  }
  return world.purchaseOrderAddFromLibraryPoPage;
}

function getPurchaseOrderCreatePoPage(world) {
  if (!world.purchaseOrderCreatePoPage) {
    world.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(world.page);
  }
  return world.purchaseOrderCreatePoPage;
}

When(
  'I store the purchase order line item row count as baseline',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    this.poLineItemBaseline = await po.getPoLineItemsTableRowCount();
  }
);

When(
  'I click add from library on the purchase order form',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderAddFromLibraryPoPage(this);
    await po.clickAddFromLibraryOnPurchaseOrderForm();
  }
);

Then(
  'I should see the purchase order library drawer',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderAddFromLibraryPoPage(this);
    await po.expectPurchaseOrderLibraryDrawerVisible();
  }
);

When(
  'I select the first two rows in the purchase order library grid',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderAddFromLibraryPoPage(this);
    await po.selectFirstTwoRowsInPurchaseOrderLibraryGrid();
  }
);

When(
  'I click add in the purchase order library drawer',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderAddFromLibraryPoPage(this);
    await po.clickAddInPurchaseOrderLibraryDrawer();
  }
);

Then(
  'the purchase order line item row count should exceed the baseline',
  { timeout: 180000 },
  async function () {
    if (
      this.poLineItemBaseline === undefined ||
      this.poLineItemBaseline === null
    ) {
      throw new Error(
        'Missing baseline: run "I store the purchase order line item row count as baseline" first.'
      );
    }
    const po = getPurchaseOrderCreatePoPage(this);
    await po.expectPoLineItemsRowCountGreaterThan(this.poLineItemBaseline);
  }
);

When(
  'I open the purchase order action menu and choose compose email',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderAddFromLibraryPoPage(this);
    await po.openPurchaseOrderActionMenuAndChooseComposeEmailOnly();
  }
);

Then(
  'I should see the purchase order compose email dialog from action menu',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.expectPurchaseOrderComposeEmailDialogFromActionMenu();
  }
);
