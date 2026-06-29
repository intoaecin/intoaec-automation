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
