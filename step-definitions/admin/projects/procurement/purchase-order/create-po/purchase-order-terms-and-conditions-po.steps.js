const { When } = require('@cucumber/cucumber');
const PurchaseOrderTermsAndConditionsPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-terms-and-conditions-po.page');

function getPurchaseOrderTermsAndConditionsPoPage(world) {
  if (!world.purchaseOrderTermsAndConditionsPoPage) {
    world.purchaseOrderTermsAndConditionsPoPage =
      new PurchaseOrderTermsAndConditionsPoPage(world.page);
  }
  return world.purchaseOrderTermsAndConditionsPoPage;
}

When(
  'I fill purchase order terms and conditions with a random comment',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderTermsAndConditionsPoPage(this);
    const comment = po.randomTermsAndConditionsComment();
    this.poTermsAndConditionsComment = comment;
    await po.fillPurchaseOrderTermsAndConditions(comment);
  }
);
// just to merge the branch
When(
  'I fill purchase order terms and conditions with {string}',
  { timeout: 180000 },
  async function (text) {
    const po = getPurchaseOrderTermsAndConditionsPoPage(this);
    this.poTermsAndConditionsComment = text;
    await po.fillPurchaseOrderTermsAndConditions(text);
  }
);
