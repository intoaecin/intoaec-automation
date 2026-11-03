const { When, Then } = require('@cucumber/cucumber');
const WorkOrderCreatePage = require('../../../../../../pages/admin/projects/procurement/work-order/create-wo/work-order-create.page');

function getWorkOrderCreatePage(world) {
  if (!world.workOrderCreatePage) {
    world.workOrderCreatePage = new WorkOrderCreatePage(world.page);
  }
  return world.workOrderCreatePage;
}

When(
  'I ensure the Work Order list has finished loading',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    await wo.ensureWorkOrderListReady();
  }
);

When(
  'I start creating a work order from scratch',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    await wo.openWorkOrderCreateFormFromScratch();
  }
);

When(
  'I open the work order create form from scratch and fill title with {string}',
  { timeout: 240000 },
  async function (title) {
    const wo = getWorkOrderCreatePage(this);
    await wo.openWorkOrderCreateFormFromScratchAndFillTitle(title);
  }
);

When(
  'I open the work order create form from scratch and fill the work order title with a random value',
  { timeout: 240000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    this.lastWorkOrderTitle =
      await wo.openWorkOrderCreateFormFromScratchAndFillRandomTitle();
    // eslint-disable-next-line no-console
    console.log(`[WO create] Random title: ${this.lastWorkOrderTitle}`);
  }
);

When(
  'I fill work order title with {string}',
  { timeout: 120000 },
  async function (title) {
    const wo = getWorkOrderCreatePage(this);
    await wo.fillWorkOrderTitle(title);
  }
);

When(
  'I fill the work order title with a random value',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    this.lastWorkOrderTitle = await wo.fillWorkOrderTitleWithRandomValue();
    // eslint-disable-next-line no-console
    console.log(`[WO create] Random title: ${this.lastWorkOrderTitle}`);
  }
);

When(
  'I add the first vendor from the work order vendor modal',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    await wo.addWorkOrderVendorFromModal();
  }
);

When(
  'I add a work order manual labour line item with random description quantity unit and rate',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    this.lastWoLineItem = await wo.addWorkOrderLabourLineItemWithRandomDetails();
    // eslint-disable-next-line no-console
    console.log(`[WO create] Labour line item: ${JSON.stringify(this.lastWoLineItem)}`);
  }
);

When(
  'I add a work order manual line item with random scope description quantity unit and rate',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    this.lastWoLineItem = await wo.addWorkOrderLineItemManuallyWithRandomDetails();
    // eslint-disable-next-line no-console
    console.log(`[WO create] Random line item: ${JSON.stringify(this.lastWoLineItem)}`);
  }
);

When(
  'I add a work order manual line item with scope of work {string} description {string} quantity {string} unit rate {string}',
  { timeout: 120000 },
  async function (scopeOfWork, description, quantity, unitRate) {
    const wo = getWorkOrderCreatePage(this);
    await wo.addWorkOrderLineItemManually({
      scopeOfWork,
      description,
      quantity,
      unitRate,
    });
  }
);

When(
  'I add a work order manual line item with scope of work {string} description {string} quantity {string} unit {string} and random rate',
  { timeout: 120000 },
  async function (scopeOfWork, description, quantity, unitLabel) {
    const wo = getWorkOrderCreatePage(this);
    this.lastWoLineItemRate = await wo.addWorkOrderLineItemManuallyWithRandomRate({
      scopeOfWork,
      description,
      quantity,
      unitLabel,
    });
    // eslint-disable-next-line no-console
    console.log(`[WO create] Random line item rate: ${this.lastWoLineItemRate}`);
  }
);

Then(
  'I should see the work order create form displayed',
  { timeout: 120000 },
  async function () {
    const wo = getWorkOrderCreatePage(this);
    await wo.expectWorkOrderCreateFormDisplayed();
  }
);
