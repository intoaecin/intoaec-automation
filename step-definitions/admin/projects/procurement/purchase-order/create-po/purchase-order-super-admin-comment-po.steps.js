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
  { timeout: 300000 },
  async function () {
    const po = getSuperAdminCommentPoPage(this);
    const text = po.buildRandomSuperAdminCommentText();
    this.superAdminPreviewLineCommentText = text;
    await po.submitRandomSuperAdminPreviewLineComment(text);
  }
);

Then(
  'I should see the super admin preview line comment on the page',
  { timeout: 120000 },
  async function () {
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
