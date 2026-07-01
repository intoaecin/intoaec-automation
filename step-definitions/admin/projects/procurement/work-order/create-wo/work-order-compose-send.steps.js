const { When, Then } = require('@cucumber/cucumber');
const WorkOrderComposeSendPage = require('../../../../../../pages/admin/projects/procurement/work-order/create-wo/work-order-compose-send.page');

function getWorkOrderComposeSendPage(world) {
  if (!world.workOrderComposeSendPage) {
    world.workOrderComposeSendPage = new WorkOrderComposeSendPage(world.page);
  }
  return world.workOrderComposeSendPage;
}

When(
  'I complete the work order compose send from library journey with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.completeWorkOrderComposeSendFromLibraryJourney(title);
  }
);

When(
  'I complete the work order compose send journey with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.completeWorkOrderComposeSendJourney(title);
  }
);

When(
  'I complete the work order compose send journey with line item quantity {string} and title {string}',
  { timeout: 360000 },
  async function (quantity, title) {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.completeWorkOrderComposeSendJourneyWithLineQty(title, quantity);
  }
);

When(
  'I complete the work order create compose send flow with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.completeWorkOrderComposeSendFlow(title);
  }
);

When(
  'I compose and send the work order email',
  { timeout: 360000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.composeAndSendWorkOrderEmail();
  }
);

When(
  'I open the work order action menu and choose compose email',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.openWorkOrderActionComposeEmail();
  }
);

Then(
  'I should see the work order compose email dialog',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.expectComposeEmailDialogVisible();
  }
);

When(
  'I click send email in the work order compose dialog',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.clickSendEmailInComposeDialog();
  }
);

Then(
  'I should see the work order email sent successfully',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.expectWorkOrderEmailSentSuccessfully();
  }
);

When(
  'I complete the work order compose send preview journey with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.completeWorkOrderComposeSendPreviewJourney(title);
  }
);

When(
  'I wait for the work order list after compose send redirect',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.waitForWorkOrderListAfterComposeSendRedirect();
  }
);

When(
  'I open the three dot menu on the first work order card',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.openThreeDotMenuOnFirstWorkOrderCard();
  }
);

When(
  'I click preview in the work order card menu',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.clickPreviewInWorkOrderCardMenu();
  }
);

Then(
  'I should see the work order full screen preview',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.expectWorkOrderFullScreenPreviewVisible();
  }
);

When(
  'I close the work order full screen preview',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.closeWorkOrderFullScreenPreview();
  }
);

Then(
  'I should be on the work order list with create action visible',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.expectWorkOrderListWithCreateActionVisible();
  }
);

When(
  'I click update progress in the work order card menu',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.clickUpdateProgressInWorkOrderCardMenu();
  }
);

Then(
  'I should see the work order update progress off canvas',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.expectWorkOrderUpdateProgressOffCanvasVisible();
  }
);

When(
  'I fill completed quantity {string} on the work order update progress table',
  { timeout: 120000 },
  async function (completedQty) {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.fillWorkOrderUpdateProgressCompletedQty(completedQty);
  }
);

When(
  'I close the work order update progress off canvas',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderComposeSendPage(this);
    await wo.closeWorkOrderUpdateProgressOffCanvas();
  }
);
