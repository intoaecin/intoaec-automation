const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const CustomerSupportPage = require('../../../../pages/admin/crm/CustomerSupport/CustomerSupportPage');

/** Per AGENTS.md: cucumber timeout aligned with page-object defaultTimeout. */
setDefaultTimeout(60000);

const CUSTOMER_SUPPORT_TEST_CASE_LOG = {
  TC01: 'TC-01 — Support Desk loads / page title visible',
  TC02: 'TC-02 — Switch list and kanban views',
  TC03: 'TC-03 — Open create ticket offcanvas and see title/lead/summary fields',
  TC04: 'TC-04 — Open filter menu',
  TC05: 'TC-05 — Navigate to Ticket Statuses customize tab via feature sidebar',
};

Before({ tags: '@customer-support' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && CUSTOMER_SUPPORT_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${CUSTOMER_SUPPORT_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getCustomerSupportPage(world) {
  if (!world.customerSupportPage || world.customerSupportPage.page !== world.page) {
    world.customerSupportPage = new CustomerSupportPage(world.page);
  }
  return world.customerSupportPage;
}

When('I navigate to Customer Support', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.navigateToCustomerSupport();
});

When('I wait for the customer support module to load', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.waitForModuleToLoad();
});

Then('the Support Desk page title should be visible', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.expectSupportDeskLoaded();
});

When('I switch customer support to list view', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.switchToListView();
});

When('I switch customer support to kanban view', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.switchToKanbanView();
});

When('I open the customer support create ticket offcanvas', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.openCreateOffcanvas();
});

Then('the customer support create ticket offcanvas should show title lead and summary fields', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.expectCreateOffcanvasFields();
});

When('I open the customer support filter menu', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.openFilter();
});

When('I open the customer support Ticket Statuses tab', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.openStatusesTab();
});

Then('the customer support Ticket Statuses page should be visible', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.expectTicketStatusesVisible();
});
