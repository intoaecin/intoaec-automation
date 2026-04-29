const { When } = require('@cucumber/cucumber');
const PurchaseOrderDefaultTermsTemplatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-default-terms-template-po.page');

function getPurchaseOrderDefaultTermsTemplatePoPage(world) {
  if (!world.purchaseOrderDefaultTermsTemplatePoPage) {
    world.purchaseOrderDefaultTermsTemplatePoPage =
      new PurchaseOrderDefaultTermsTemplatePoPage(world.page);
  }
  return world.purchaseOrderDefaultTermsTemplatePoPage;
}

When(
  'I add purchase order terms and conditions from the first template',
  { timeout: 240000 },
  async function () {
    const po = getPurchaseOrderDefaultTermsTemplatePoPage(this);
    await po.addPurchaseOrderTermsFromFirstTemplate();
  }
);
