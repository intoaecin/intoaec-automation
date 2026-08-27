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
    const po = getPurchaseOrderCreatePoPage(this);
    const yopmailFromRow = await po.addVendorDetailsWithFirstVendorRadio();
    if (yopmailFromRow) {
      this.vendorYopmailEmail = yopmailFromRow;
    }
    if (!this.vendorYopmailEmail) {
      this.vendorYopmailEmail =
        process.env.PO_VENDOR_YOPMAIL_ID ||
        process.env.PO_VENDOR_YOPMAIL_LOGIN ||
        testData.vendor?.rfqUser?.email ||
        null;
    }
    console.log(`[PO] Vendor Yopmail for later inbox: ${this.vendorYopmailEmail || '(none)'}`);
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
        'aadhi@yopmail.com',
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
        'aadhi@yopmail.com',
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
