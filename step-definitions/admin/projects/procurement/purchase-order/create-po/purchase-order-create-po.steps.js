const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');

function getPurchaseOrderCreatePoPage(world) {
  if (
    !world.purchaseOrderCreatePoPage ||
    world.purchaseOrderCreatePoPage.page !== world.page
  ) {
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
    this.lastPoTitle = String(title || '').trim();
  }
);

When(
  'I add the first vendor from the vendor modal',
  { timeout: 240000 },
  async function () {
    const testData = require('../../../../../../utils/testData');
    const vendorPoSession = require('../../../../../../support/vendor-po-session');
    const po = getPurchaseOrderCreatePoPage(this);
    const preferEmail = String(testData.vendor?.rfqUser?.email || 'praveen@yopmail.com').trim();
    const yopmailFromRow = await po.addVendorDetailsWithFirstVendorRadio({ preferEmail });
    if (yopmailFromRow) {
      this.vendorYopmailEmail = yopmailFromRow;
      this.vendorRfqLoginEmail = yopmailFromRow;
      po.lastAddedVendorEmail = yopmailFromRow;
    }
    if (!this.vendorYopmailEmail) {
      this.vendorYopmailEmail =
        process.env.PO_VENDOR_YOPMAIL_ID ||
        process.env.PO_VENDOR_YOPMAIL_LOGIN ||
        preferEmail ||
        null;
    }
    if (this.vendorYopmailEmail) {
      this.vendorRfqLoginEmail = this.vendorYopmailEmail;
      vendorPoSession.setVendorEmail(this.vendorYopmailEmail);
    }
    console.log(
      `[PO] Selected vendor for portal login: ${this.vendorYopmailEmail || '(none)'} (same pattern as RFQ)`
    );
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
  { timeout: 180000 },
  async function (name, description, quantity, unit, rate) {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.addLineItemManually({
      itemName: name,
      description,
      quantity,
      unitLabel: unit,
      rate,
      useFirstUnitOption: false,
    });
  }
);

When(
  'I compose and send the purchase order email',
  { timeout: 360000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.openActionMenuAndComposeEmail();
    await po.sendEmailFromComposeModal();
  }
);

When(
  'I compose and send the purchase order email capturing vendor Yopmail from the To field',
  { timeout: 360000 },
  async function () {
    const testData = require('../../../../../../utils/testData');
    const po = getPurchaseOrderCreatePoPage(this);
    await po.openActionMenuAndComposeEmail();
    const fromCompose = await po.readYopmailAddressFromComposeDialog({
      preferEmail: this.vendorYopmailEmail || testData.vendor?.rfqUser?.email,
      excludeEmails: [
        testData.admin?.validUser?.email,
        'kumar@diy.in',
        'testintoaec@gmail.com',
      ],
    });
    this.vendorYopmailEmail = fromCompose || this.vendorYopmailEmail;
    console.log(`[PO] Vendor Yopmail for inbox: ${this.vendorYopmailEmail}`);
    await po.sendEmailFromComposeModal();
    this.poEmailSentAtMs = Date.now();
  }
);

When(
  'I open the purchase order compose email and capture vendor Yopmail from the To field',
  { timeout: 360000 },
  async function () {
    const testData = require('../../../../../../utils/testData');
    const po = getPurchaseOrderCreatePoPage(this);
    await po.openActionMenuAndComposeEmail();
    const fromCompose = await po.readYopmailAddressFromComposeDialog({
      preferEmail: this.vendorYopmailEmail || testData.vendor?.rfqUser?.email,
      excludeEmails: [
        testData.admin?.validUser?.email,
        'kumar@diy.in',
        'testintoaec@gmail.com',
      ],
    });
    // Never replace a good vendor-modal address with admin / missing compose value.
    this.vendorYopmailEmail = fromCompose || this.vendorYopmailEmail;
    if (!this.vendorYopmailEmail) {
      throw new Error(
        'Vendor Yopmail unknown after compose open. Select a vendor with *@yopmail.com (not the admin login).'
      );
    }
    console.log(
      `[PO] Captured vendor Yopmail (compose open, not sent yet): ${this.vendorYopmailEmail}`
    );
  }
);

When(
  'I send the purchase order email from the open compose dialog',
  { timeout: 360000 },
  async function () {
    // Compose was opened on the Admin tab; Yopmail may have stolen focus.
    const adminPage = this.adminPage || this.page;
    if (adminPage && !adminPage.isClosed()) {
      await adminPage.bringToFront().catch(() => {});
      this.page = adminPage;
      this.purchaseOrderCreatePoPage = null;
    }
    const po = getPurchaseOrderCreatePoPage(this);
    await po.sendEmailFromComposeModal();
    this.poEmailSentAtMs = Date.now();
    console.log('[PO] Sent purchase order email from open compose dialog');
  }
);

Then(
  'I should see the purchase order created and sent success toast',
  { timeout: 180000 },
  async function () {
    if (this.purchaseOrderEditPoPage?.poCreatedAndSentSuccessObserved) {
      return;
    }
    if (this.purchaseOrderShipToPoPage?.poCreatedAndSentSuccessObserved) {
      return;
    }
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

When(
  'I open Add Items on the Purchase Order form',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.openAddItemsSectionAfterVendor();
  }
);

When(
  'I select {int} products from the Purchase Order Product Item dropdown',
  { timeout: 240000 },
  async function (count) {
    const po = getPurchaseOrderCreatePoPage(this);
    const selected = await po.selectProductsFromItemDropdown(count);
    this.lastPoSelectedProducts = selected;
    this.lastPoTitle = this.lastPoTitle || 'New PO 1';
  }
);

When(
  'I select {int} different products from the Purchase Order Product Item dropdown',
  { timeout: 240000 },
  async function (count) {
    const po = getPurchaseOrderCreatePoPage(this);
    const selected = await po.selectProductsFromItemDropdown(count);
    this.lastPoSelectedProducts = selected;
    this.lastPoTitle = this.lastPoTitle || 'New PO 1';
  }
);

When(
  'I create {int} new Material products in the Purchase Order cost catalog',
  { timeout: 240000 },
  async function (count) {
    const po = getPurchaseOrderCreatePoPage(this);
    this.lastPoSelectedProducts = await po.createProductsInCatalog(count);
    this.lastPoTitle = this.lastPoTitle || 'New PO 1';
  }
);

Then(
  'I should see {int} selected products added to the Purchase Order',
  { timeout: 120000 },
  async function (count) {
    const po = getPurchaseOrderCreatePoPage(this);
    if (this.lastPoSelectedProducts) {
      po.lastPoSelectedProducts = this.lastPoSelectedProducts;
    }
    await po.expectSelectedProductsAddedToPo(count);
  }
);

When(
  'I enter quantities 1 and 2 for the selected Purchase Order products',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    if (this.lastPoSelectedProducts) {
      po.lastPoSelectedProducts = this.lastPoSelectedProducts;
    }
    await po.enterQuantitiesForSelectedPoProducts(['1', '2']);
  }
);

When(
  'I enter quantities 1, 2 and 3 for the selected Purchase Order products',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    if (this.lastPoSelectedProducts) {
      po.lastPoSelectedProducts = this.lastPoSelectedProducts;
    }
    await po.enterQuantitiesForSelectedPoProducts(['1', '2', '3']);
  }
);

When(
  'I select unit {string} for each selected Purchase Order product',
  { timeout: 120000 },
  async function (unit) {
    const po = getPurchaseOrderCreatePoPage(this);
    if (this.lastPoSelectedProducts) {
      po.lastPoSelectedProducts = this.lastPoSelectedProducts;
    }
    await po.selectUnitForSelectedPoProducts(unit);
  }
);

When('I fill remaining required purchase order details', { timeout: 180000 }, async function () {
  const po = getPurchaseOrderCreatePoPage(this);
  if (this.lastPoSelectedProducts) {
    po.lastPoSelectedProducts = this.lastPoSelectedProducts;
  }
  await po.fillRemainingRequiredPoDetails();
});

Then(
  'I should see the purchase order titled {string} in the Purchase Order list',
  { timeout: 180000 },
  async function (title) {
    const po = getPurchaseOrderCreatePoPage(this);
    const wanted = String(this.lastPoTitle || title || '').trim();
    this.lastPoTitle = wanted;
    await po.expectPurchaseOrderTitleVisibleOnList(wanted);
    if (po.lastPoNumber) {
      this.lastPoNumber = po.lastPoNumber;
    }
  }
);
