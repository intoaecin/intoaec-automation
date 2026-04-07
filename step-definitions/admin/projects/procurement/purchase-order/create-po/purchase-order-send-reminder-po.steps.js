const { When, Then } = require('@cucumber/cucumber');
const PurchaseOrderSendReminderPoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-send-reminder-po.page');

function getPurchaseOrderSendReminderPoPage(world) {
  if (!world.purchaseOrderSendReminderPoPage) {
    world.purchaseOrderSendReminderPoPage = new PurchaseOrderSendReminderPoPage(
      world.page
    );
  }
  return world.purchaseOrderSendReminderPoPage;
}

When(
  'I open the send menu on the first purchase order card',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderSendReminderPoPage(this);
    await po.openSendMenuOnFirstPurchaseOrderCard();
  }
);

When(
  'I click send reminder in the purchase order send menu',
  { timeout: 120000 },
  async function () {
    const po = getPurchaseOrderSendReminderPoPage(this);
    await po.clickSendReminderInPurchaseOrderSendMenu();
  }
);

Then(
  'I should see the purchase order compose email dialog for reminder',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderSendReminderPoPage(this);
    await po.expectPurchaseOrderComposeEmailDialogReady();
  }
);

When(
  'I click send email in the purchase order compose dialog',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderSendReminderPoPage(this);
    await po.clickSendEmailInPurchaseOrderComposeDialog();
  }
);

Then(
  'I should see the purchase order reminder email sent toast',
  { timeout: 180000 },
  async function () {
    const po = getPurchaseOrderSendReminderPoPage(this);
    await po.expectPurchaseOrderReminderEmailSentToast();
  }
);
