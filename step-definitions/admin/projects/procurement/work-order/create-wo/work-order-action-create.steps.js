const { When, Then } = require('@cucumber/cucumber');
const WorkOrderActionCreatePage = require('../../../../../../pages/admin/projects/procurement/work-order/create-wo/work-order-action-create.page');

function getWorkOrderActionCreatePage(world) {
  if (!world.workOrderActionCreatePage) {
    world.workOrderActionCreatePage = new WorkOrderActionCreatePage(world.page);
  }
  return world.workOrderActionCreatePage;
}

When(
  'I complete the work order action create from library journey with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderActionCreatePage(this);
    await wo.completeWorkOrderActionCreateFromLibraryJourney(title);
  }
);

When(
  'I complete the work order action create journey with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderActionCreatePage(this);
    await wo.completeWorkOrderActionCreateJourney(title);
  }
);

When(
  'I complete the work order create action menu flow with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderActionCreatePage(this);
    await wo.completeWorkOrderActionCreateFlow(title);
  }
);

When(
  'I open the work order action menu and choose create',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderActionCreatePage(this);
    await wo.openActionMenuAndChooseCreate();
  }
);

When(
  'I create the work order from the action menu',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderActionCreatePage(this);
    await wo.openActionMenuAndChooseCreate();
  }
);

Then(
  'I should see the work order created from action menu success toast',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderActionCreatePage(this);
    await wo.expectWorkOrderCreatedFromActionMenuToast();
  }
);
