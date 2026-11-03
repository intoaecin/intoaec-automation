const { When } = require('@cucumber/cucumber');
const WorkOrderTermsTemplatePage = require('../../../../../../pages/admin/projects/procurement/work-order/create-wo/work-order-terms-template.page');

function getWorkOrderTermsTemplatePage(world) {
  if (!world.workOrderTermsTemplatePage) {
    world.workOrderTermsTemplatePage = new WorkOrderTermsTemplatePage(world.page);
  }
  return world.workOrderTermsTemplatePage;
}

When(
  'I complete the work order action create with terms template journey with title {string}',
  { timeout: 360000 },
  async function (title) {
    const wo = getWorkOrderTermsTemplatePage(this);
    await wo.completeWorkOrderActionCreateWithTermsTemplateJourney(title);
  }
);

When(
  'I add work order terms and conditions from the first template',
  { timeout: 240000 },
  async function () {
    const wo = getWorkOrderTermsTemplatePage(this);
    await wo.addWorkOrderTermsFromFirstTemplate();
  }
);
