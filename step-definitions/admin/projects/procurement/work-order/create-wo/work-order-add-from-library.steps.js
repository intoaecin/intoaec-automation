const { When, Then } = require('@cucumber/cucumber');
const WorkOrderAddFromLibraryPage = require('../../../../../../pages/admin/projects/procurement/work-order/create-wo/work-order-add-from-library.page');

function getWorkOrderAddFromLibraryPage(world) {
  if (!world.workOrderAddFromLibraryPage) {
    world.workOrderAddFromLibraryPage = new WorkOrderAddFromLibraryPage(world.page);
  }
  return world.workOrderAddFromLibraryPage;
}

When(
  'I click add from library on the work order form',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderAddFromLibraryPage(this);
    await wo.clickAddFromLibraryOnWorkOrderForm();
  }
);

Then(
  'I should see the work order library drawer',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderAddFromLibraryPage(this);
    await wo.expectWorkOrderLibraryDrawerVisible();
  }
);

When(
  'I select the first radio in the work order library drawer',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderAddFromLibraryPage(this);
    await wo.selectFirstRadioInWorkOrderLibraryDrawer();
  }
);

When(
  'I click add in the work order library drawer',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderAddFromLibraryPage(this);
    await wo.clickAddInWorkOrderLibraryDrawer();
  }
);

When(
  'I add the first work order line item from library',
  { timeout: 180000 },
  async function () {
    const wo = getWorkOrderAddFromLibraryPage(this);
    await wo.addWorkOrderLineItemFromLibraryFirstRadio();
  }
);
