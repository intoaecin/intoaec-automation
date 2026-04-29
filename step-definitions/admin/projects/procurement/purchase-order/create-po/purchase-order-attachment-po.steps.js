const { When } = require('@cucumber/cucumber');
const PurchaseOrderAttachmentPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-attachment-po.page');

function getPurchaseOrderAttachmentPoPage(world) {
  if (!world.purchaseOrderAttachmentPoPage) {
    world.purchaseOrderAttachmentPoPage = new PurchaseOrderAttachmentPoPage(
      world.page
    );
  }
  return world.purchaseOrderAttachmentPoPage;
}

When(
  'I add a purchase order attachment before compose',
  { timeout: 600000 },
  async function () {
    const po = getPurchaseOrderAttachmentPoPage(this);
    await po.addPurchaseOrderAttachmentBeforeCompose();
  }
);
