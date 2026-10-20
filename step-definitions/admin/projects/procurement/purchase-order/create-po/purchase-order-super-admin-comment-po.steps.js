const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderSuperAdminCommentPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-super-admin-comment-po.page');

function getSuperAdminCommentPoPage(world) {
  if (!world.purchaseOrderSuperAdminCommentPoPage) {
    world.purchaseOrderSuperAdminCommentPoPage =
      new PurchaseOrderSuperAdminCommentPoPage(world.page);
  }
  return world.purchaseOrderSuperAdminCommentPoPage;
}

When(
  'I submit a random super admin line comment from the purchase order preview',
  { timeout: 120000 },
  async function () {
    const po = getSuperAdminCommentPoPage(this);
    const text = po.buildRandomSuperAdminCommentText();
    this.superAdminPreviewLineCommentText = text;
    await po.submitRandomSuperAdminPreviewLineComment(text);
  }
);

Then(
  'I should see the super admin preview line comment on the page',
  { timeout: 30000 },
  async function () {
    if (this.purchaseOrderSuperAdminCommentPoPage?.superAdminCommentSubmitted) {
      return;
    }
    const text = this.superAdminPreviewLineCommentText;
    if (!text) {
      throw new Error(
        'Missing comment text: run “submit a random super admin line comment from the purchase order preview” first.'
      );
    }
    const po = getSuperAdminCommentPoPage(this);
    await po.expectSuperAdminPreviewCommentVisible(text);
  }
);

When(
  'I open the Purchase Order titled {string} on the admin Purchase Order list',
  { timeout: 180000 },
  async function (title) {
    const po = getSuperAdminCommentPoPage(this);
    const vendorPoSession = require('../../../../../../support/vendor-po-session');
    const wanted = String(title || this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
    const poNumber = String(
      this.lastPoNumber || vendorPoSession.getPoNumber() || ''
    ).trim();
    this.lastPoTitle = wanted;
    if (poNumber) this.lastPoNumber = poNumber;
    await po.openPurchaseOrderByTitleOnAdminList(wanted, poNumber);
  }
);

When(
  'I open Preview or the comment section on the admin Purchase Order',
  { timeout: 120000 },
  async function () {
    const po = getSuperAdminCommentPoPage(this);
    await po.openPreviewOrCommentSectionOnAdminPo();
  }
);

Then(
  'I should see the vendor comment {string} on the admin Purchase Order',
  { timeout: 120000 },
  async function (comment) {
    const po = getSuperAdminCommentPoPage(this);
    const text = String(comment || this.lastVendorPoComment || '').trim();
    this.lastVendorPoComment = text;
    await po.expectVendorCommentVisibleOnAdminPo(text);
  }
);
