const { When } = require('@cucumber/cucumber');
const WorkOrderMultiLineItemPage = require('../../../../../../pages/admin/projects/procurement/work-order/create-wo/work-order-multi-line-item.page');

function getWorkOrderMultiLineItemPage(world) {
  if (!world.workOrderMultiLineItemPage) {
    world.workOrderMultiLineItemPage = new WorkOrderMultiLineItemPage(world.page);
  }
  return world.workOrderMultiLineItemPage;
}

When(
  'I complete the work order compose send multi line journey with title {string} and {int} manual line items',
  { timeout: 900000 },
  async function (title, count) {
    const wo = getWorkOrderMultiLineItemPage(this);
    await wo.completeWorkOrderComposeSendMultiLineJourney(title, count);
  }
);

When(
  'I add {int} manual work order line items with random fields',
  { timeout: 900000 },
  async function (count) {
    const wo = getWorkOrderMultiLineItemPage(this);
    await wo.addManyManualWorkOrderLineItemsWithRandomDetails(count);
  }
);
