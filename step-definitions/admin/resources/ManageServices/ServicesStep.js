const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const ServicesPage = require('../../../../pages/admin/resources/ManageServices/ServicesPage');

/** Per AGENTS.md: cucumber timeout aligned with page-object defaultTimeout. */
setDefaultTimeout(60000);

const SERVICES_TEST_CASE_LOG = {
  TC06: 'TC-06 — Add service Construction / Project Management as Fixed Price',
  TC07: 'TC-07 — Edit 6th service to Maintenance / Building Maintenance',
  TC08: 'TC-08 — Delete 6th service from Service List',
};

Before({ tags: '@services' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && SERVICES_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${SERVICES_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getServicesPage(world) {
  if (!world.servicesPage || world.servicesPage.page !== world.page) {
    world.servicesPage = new ServicesPage(world.page);
  }
  return world.servicesPage;
}

When('I navigate to Manage Services', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.navigateToManageServices();
});

When('I click the services Add Service button', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.clickAddService();
});

Then('the Add Service form should be displayed', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectAddServiceFormDisplayed();
});

When('I select the service category {string}', async function (category) {
  const servicesPage = getServicesPage(this);
  await servicesPage.selectServiceCategory(category);
});

When('I select the service type {string}', async function (type) {
  const servicesPage = getServicesPage(this);
  await servicesPage.selectServiceType(type);
});

When('I fill the service description with {string}', async function (description) {
  const servicesPage = getServicesPage(this);
  await servicesPage.fillServiceDescription(description);
});

When('I select the service pricing module {string}', async function (moduleName) {
  const servicesPage = getServicesPage(this);
  await servicesPage.selectPricingModule(moduleName);
});

When('I fill the service price with {string}', async function (price) {
  const servicesPage = getServicesPage(this);
  await servicesPage.fillServicePrice(price);
});

When('I enable the service Taxable option', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.enableTaxable();
});

Then('the Add Service form should show the entered details', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectEnteredServiceDetailsDisplayed();
});

Then('the Edit Service form should show the updated details', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectEnteredServiceDetailsDisplayed();
});

When('I click the services Save button', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.clickSave();
});

Then('I should see services success toast {string}', async function (message) {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectSuccessToast(message);
});

When('I refresh the services list', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.refreshServicesList();
});

Then('the newly added service should be displayed in the Services List', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectServiceInList();
});

Then(
  'the services list row should show the selected category, type, description, pricing module, price, and taxable status',
  async function () {
    const servicesPage = getServicesPage(this);
    await servicesPage.expectServiceDetailsInList();
  }
);

Then('the services Service List should be displayed', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectServiceListDisplayed();
});

When('I click the services Edit button for the 6th row', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.clickEditForNthRow(6);
});

Then('the Edit Service form should be displayed with existing details', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectEditServiceFormDisplayed();
});

When('I click the services Update button', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.clickUpdate();
});

Then('the 6th service should show the updated details in the Service List', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectUpdatedServiceDetailsInList();
});

When('I click the services Delete button for the 6th row', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.clickDeleteForNthRow(6);
});

Then('the services Delete Service confirmation popup should be displayed', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectDeleteServicePopupDisplayed();
});

When('I enter the services deletion reason {string}', async function (reason) {
  const servicesPage = getServicesPage(this);
  await servicesPage.fillServiceDeletionReason(reason);
});

When('I enter {string} in the services deletion confirmation field', async function (value) {
  const servicesPage = getServicesPage(this);
  await servicesPage.fillServiceDeletionConfirmation(value);
});

When('I click the services Delete Service confirm button', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.clickDeleteServiceConfirm();
});

Then('the deleted service should not be displayed in the Service List', async function () {
  const servicesPage = getServicesPage(this);
  await servicesPage.expectDeletedServiceNotInList();
});
