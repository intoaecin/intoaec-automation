const { When } = require('@cucumber/cucumber');
const PurchaseOrderPreviewPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-preview-po.page');

function getPurchaseOrderPreviewPoPage(world) {
  if (!world.purchaseOrderPreviewPoPage) {
    world.purchaseOrderPreviewPoPage = new PurchaseOrderPreviewPoPage(world.page);
  }
  return world.purchaseOrderPreviewPoPage;
}

When(
  'I download the purchase order from the full screen preview',
  { timeout: 240000 },
  async function () {
    const po = getPurchaseOrderPreviewPoPage(this);
    this.poDownloadedFilename = await po.downloadPurchaseOrderFromPreview();
  }
);

