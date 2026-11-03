const { When } = require('@cucumber/cucumber');
const testData = require('../../../../../../utils/testData');
const {
  PurchaseOrderVendorMailinatorPage,
  mailinatorLocalPart,
} = require('../../../../../../pages/admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-mailinator.page');

function resolveGoodsReceiptMailinatorEmail(world) {
  return String(
    world.vendorMailinatorEmail ||
      process.env.PO_VENDOR_MAILINATOR_EMAIL ||
      testData.vendor?.goodsReceiptMailinator?.email ||
      'bhavani123456@mailinator.com'
  )
    .trim()
    .toLowerCase();
}

When(
  'I add the Mailinator vendor from the vendor modal',
  { timeout: 240000 },
  async function () {
    const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
    if (
      !this.purchaseOrderCreatePoPage ||
      this.purchaseOrderCreatePoPage.page !== this.page
    ) {
      this.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(this.page);
    }
    const email = resolveGoodsReceiptMailinatorEmail(this);
    const searchHint =
      testData.vendor?.goodsReceiptMailinator?.searchHint || 'Mailinator';
    const fromRow = await this.purchaseOrderCreatePoPage.addVendorDetailsWithFirstVendorRadio({
      preferEmail: email,
      searchHint,
    });
    this.vendorMailinatorEmail = fromRow || email;
    this.vendorYopmailEmail = this.vendorMailinatorEmail;
    console.log(
      `[GoodsReceipt] Vendor for Mailinator inbox: ${this.vendorMailinatorEmail}`
    );
  }
);

When(
  'I open the purchase order compose email and set the Mailinator recipient',
  { timeout: 360000 },
  async function () {
    const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
    if (
      !this.purchaseOrderCreatePoPage ||
      this.purchaseOrderCreatePoPage.page !== this.page
    ) {
      this.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(this.page);
    }
    const po = this.purchaseOrderCreatePoPage;
    await po.openActionMenuAndComposeEmail();
    const email = resolveGoodsReceiptMailinatorEmail(this);
    await po.ensureComposeRecipientEmail(email);
    this.vendorMailinatorEmail = email;
    this.vendorYopmailEmail = email;
    console.log(`[GoodsReceipt] Compose To for Mailinator: ${email}`);
  }
);

When(
  'I open Mailinator for the vendor and baseline the inbox',
  { timeout: 120000 },
  async function () {
    this.adminPage = this.adminPage || this.page;
    const email = resolveGoodsReceiptMailinatorEmail(this);
    const localPart = mailinatorLocalPart(email);

    this.mailinatorPage = await this.context.newPage();
    const mp = new PurchaseOrderVendorMailinatorPage(this.mailinatorPage);
    // Open Mailinator → enter bhavani123456 → GO → baseline
    await mp.gotoInboxForLocalPart(localPart);
    this.mailinatorBaseline = await mp.snapshotInboxState(localPart);
    this.vendorMailinatorEmail = email;
    console.log(
      `[Mailinator] Ready inbox "${localPart}" baseline rows=${this.mailinatorBaseline.count}`
    );
  }
);

When(
  'I wait for the purchase order email in Mailinator open View PO for the vendor portal',
  { timeout: 240000 },
  async function () {
    if (!this.mailinatorPage || this.mailinatorPage.isClosed()) {
      throw new Error('Mailinator tab missing — open Mailinator baseline step first.');
    }
    await this.mailinatorPage.bringToFront().catch(() => {});
    this.page = this.mailinatorPage;

    const email = resolveGoodsReceiptMailinatorEmail(this);
    const mp = new PurchaseOrderVendorMailinatorPage(this.mailinatorPage);

    // enter id → GO → click just-received mail → View PO → vendor portal
    this.vendorPortalPage = await mp.waitOpenPoMessageAndClickViewPo({
      inbox: email,
      baseline: this.mailinatorBaseline || { fingerprints: [], ids: [], count: 0 },
      expectedPoTitle: this.lastPoTitle || '',
    });
    this.page = this.vendorPortalPage;
  }
);
