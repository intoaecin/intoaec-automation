const { When } = require('@cucumber/cucumber');
const PurchaseOrderDownloadPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-download-po.page');

function getPurchaseOrderDownloadPoPage(world) {
  if (!world.purchaseOrderDownloadPoPage) {
    world.purchaseOrderDownloadPoPage = new PurchaseOrderDownloadPoPage(
      world.page
    );
  }
  return world.purchaseOrderDownloadPoPage;
}

When(
  'I download the purchase order from the full screen preview',
  { timeout: 240000 },
  async function () {
    const po = getPurchaseOrderDownloadPoPage(this);
    this.poDownloadedFilename = await po.downloadPurchaseOrderFromPreview();
  }
);

