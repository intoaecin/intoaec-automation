const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderImportPdfPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/import-po/purchase-order-import-pdf.page');
const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');

function getPurchaseOrderImportPdfPage(world) {
  if (!world.purchaseOrderImportPdfPage) {
    world.purchaseOrderImportPdfPage = new PurchaseOrderImportPdfPage(
      world.page
    );
  }
  return world.purchaseOrderImportPdfPage;
}

function getPurchaseOrderCreatePoPage(world) {
  if (!world.purchaseOrderCreatePoPage) {
    world.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(world.page);
  }
  return world.purchaseOrderCreatePoPage;
}

When(
  'I open the create purchase order dialog from the list',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderImportPdfPage(this);
    await po.openCreatePurchaseOrderStartDialog();
  }
);

When(
  'I upload the import purchase order PDF and click proceed',
  { timeout: 720000 },
  async function () {
    const po = getPurchaseOrderImportPdfPage(this);
    await po.uploadPdfInGetStartedDialogAndProceed();
  }
);

Then(
  'I should see the purchase order create form loaded after PDF import',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderImportPdfPage(this);
    await po.expectPurchaseOrderCreateFormAfterPdfImport();
  }
);

When(
  'I fill the purchase order title with a random import title',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderImportPdfPage(this);
    this.importPoTitle = await po.fillPurchaseOrderTitleWithRandomValue();
    this.poYopmailSubjectHint = this.importPoTitle;
  }
);

When(
  'I add the first vendor from the vendor modal for import PO',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderImportPdfPage(this);
    await po.addVendorDetailsWithFirstVendorRadio();
  }
);

Then(
  'I should see the purchase order vendor ready after import flow',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderImportPdfPage(this);
    await po.expectVendorAddedAfterImportFlow();
  }
);

When(
  'I prepare purchase order line item units before compose email',
  { timeout: 720000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.preparePoLineUnitsBeforeComposeEmailImportFlow();
  }
);

When(
  'I compose and send the purchase order email for the import flow',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderCreatePoPage(this);
    await po.dismissVisibleToastNotifications();
    await po.openActionMenuAndComposeEmail();
    await po.sendEmailFromComposeModal({ prioritizeEmailSentToast: true });
  }
);
